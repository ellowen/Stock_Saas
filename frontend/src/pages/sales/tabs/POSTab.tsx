import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAccessToken } from "../../../lib/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { Tooltip } from "../../../components/Tooltip";
import { IconCurrency, IconShoppingCart } from "../../../components/Icons";
import { ProductSearch } from "../components/ProductSearch";
import { CartItem } from "../components/CartItem";
import { PaymentPanel } from "../components/PaymentPanel";
import { ReceiptView } from "../components/ReceiptView";
import { CustomerSearchInput, type Customer } from "../components/CustomerSearchInput";
import { HeldSalesPanel } from "../components/HeldSalesPanel";
import { DocumentPreviewModal } from "../../../components/documents/DocumentPreviewModal";
import type { DocumentData, CompanyInfo } from "../../../components/documents/DocumentTemplate";
import { useCart } from "../hooks/useCart";
import { useHeldSales } from "../hooks/useHeldSales";
import { thermalPrinter } from "../../../lib/thermal-printer";
import {
  formatAttributes,
  playSuccessSound,
  PAYMENT_LABELS,
  type Branch,
  type InventoryRow,
  type PaymentMethod,
  type ReceiptPrintData,
  type VariantWithStock,
} from "../types";
import type { CreateSaleParams } from "../hooks/useSales";

type Props = {
  branches: Branch[];
  branchId: number | "";
  onBranchChange: (id: number | "") => void;
  inventory: InventoryRow[];
  submitting: boolean;
  inventoryError: string | null;
  onCreateSale: (params: CreateSaleParams) => Promise<{ id: number }>;
  onSendReceiptEmail: (saleId: number, email: string) => Promise<void>;
};

export function POSTab({
  branches,
  branchId,
  onBranchChange,
  inventory,
  submitting,
  inventoryError,
  onCreateSale,
  onSendReceiptEmail,
}: Props) {
  const { t } = useTranslation();
  const { company, hasPermission } = useAuth();
  const canDiscount = hasPermission("SALES_DISCOUNT");
  const canOverridePrice = hasPermission("SALES_PRICE_OVERRIDE");
  const { showToast } = useToast();
  const { cart, addToCart, updateCartQty, updateCartDiscount, updateCartPriceOverride, removeFromCart, clearCart, restoreCart } = useCart();
  const { heldSales, loading: heldSalesLoading, loadHeldSales, holdSale, resumeSale, discardSale } = useHeldSales();
  const [globalDiscount, setGlobalDiscount] = useState("");
  // Promos automaticas (2x1, % por categoria/producto) — el cajero no las
  // calcula, se traen del backend en cuanto cambia el carrito.
  const [autoDiscounts, setAutoDiscounts] = useState<Record<number, number>>({});
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  // En desktop arranca expandido; en mobile colapsado para priorizar la
  // busqueda y el carrito sin scroll (ver toggle mas abajo).
  const [showDetails, setShowDetails] = useState(
    () => typeof window === "undefined" || window.matchMedia("(min-width: 640px)").matches
  );

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionHighlightIndex, setSuggestionHighlightIndex] = useState(-1);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [mixedCash, setMixedCash] = useState("");
  const [mixedCard, setMixedCard] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [mixedCashReceived, setMixedCashReceived] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ total: number; paid: number; change: number } | null>(null);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<ReceiptPrintData | null>(null);
  const [docPreview, setDocPreview] = useState<{ data: DocumentData; company: CompanyInfo } | null>(null);
  const [lastSaleItems, setLastSaleItems] = useState<Array<{ variantId?: number; description: string; quantity: number; unitPrice: number }>>([]);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [lastSaleCustomer, setLastSaleCustomer] = useState<{ email: string | null; phone: string | null } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const cobrarButtonRef = useRef<HTMLButtonElement>(null);

  const variantsWithStock: VariantWithStock[] = useMemo(() => {
    return inventory
      .filter((row) => row.quantity > 0)
      .map((row) => ({
        productVariantId: row.variant.id,
        productName: row.variant.product.name,
        sku: row.variant.sku,
        barcode: row.variant.barcode,
        attributes: row.variant.attributes ?? [],
        price:
          typeof row.variant.price === "object" &&
          row.variant.price !== null &&
          "toString" in row.variant.price
            ? (row.variant.price as { toString(): string }).toString()
            : String(row.variant.price),
        availableQty: row.quantity,
      }));
  }, [inventory]);

  const totalItems = cart.reduce((s, x) => s + x.quantity, 0);
  const subtotalBeforeGlobal = cart.reduce((s, item) => {
    const v = variantsWithStock.find((x) => x.productVariantId === item.productVariantId);
    if (!v) return s;
    const itemDiscount = item.discount ?? 0;
    const promoDiscount = autoDiscounts[item.productVariantId] ?? 0;
    const unitPrice = item.unitPriceOverride ?? parseFloat(v.price);
    return s + (unitPrice - itemDiscount - promoDiscount) * item.quantity;
  }, 0);
  const globalDiscountNum = Math.max(0, parseFloat(globalDiscount) || 0);
  const couponDiscountNum = appliedCoupon?.discount ?? 0;
  const totalAmount = Math.max(0, subtotalBeforeGlobal - globalDiscountNum - couponDiscountNum);
  const totalRounded = Math.round(totalAmount * 100) / 100;

  // Preview de promos automaticas (2x1, % por categoria/producto): se
  // recalcula cada vez que cambia el carrito, debounced, solo para mostrar
  // — el calculo real y autoritativo se hace de nuevo en el servidor al
  // crear la venta, sin confiar en nada de esto.
  useEffect(() => {
    if (cart.length === 0) { setAutoDiscounts({}); return; }
    const timer = setTimeout(async () => {
      try {
        const token = getAccessToken();
        const items = cart.map((c) => {
          const v = variantsWithStock.find((x) => x.productVariantId === c.productVariantId);
          return {
            productVariantId: c.productVariantId,
            quantity: c.quantity,
            unitPrice: c.unitPriceOverride ?? (v ? parseFloat(v.price) : 0),
          };
        });
        const res = await fetch("/api/promotions/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items }),
        });
        if (res.ok) {
          const data = await res.json();
          const parsed: Record<number, number> = {};
          for (const [k, v] of Object.entries(data.discounts ?? {})) parsed[Number(k)] = Number(v);
          setAutoDiscounts(parsed);
        }
      } catch {
        // silencioso: es solo un preview, no bloquea la venta
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- variantsWithStock cambia con inventory, no hace falta re-disparar por eso
  }, [cart]);

  const handleApplyCoupon = useCallback(async () => {
    if (!couponInput.trim()) return;
    setCouponChecking(true);
    setCouponError(null);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/promotions/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: couponInput.trim(), subtotal: subtotalBeforeGlobal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("sales.couponInvalid"));
      setAppliedCoupon({ code: couponInput.trim().toUpperCase(), discount: Number(data.discount) });
    } catch (e) {
      setAppliedCoupon(null);
      setCouponError(e instanceof Error ? e.message : t("sales.couponInvalid"));
    } finally {
      setCouponChecking(false);
    }
  }, [couponInput, subtotalBeforeGlobal, t]);

  // Focus search on tab mount / branch change
  useEffect(() => {
    if (typeof branchId === "number") {
      searchInputRef.current?.focus();
    }
  }, [branchId]);

  // Cargar ventas en espera de esta sucursal
  useEffect(() => {
    if (typeof branchId === "number") {
      loadHeldSales(branchId);
    }
  }, [branchId, loadHeldSales]);

  const handleHoldSale = useCallback(async () => {
    if (cart.length === 0 || typeof branchId !== "number") return;
    try {
      await holdSale({
        branchId,
        customerId: selectedCustomer?.id ?? null,
        cart,
        discountTotal: globalDiscountNum > 0 ? globalDiscountNum : undefined,
      });
      clearCart();
      setSelectedCustomer(null);
      setGlobalDiscount("");
      setAutoDiscounts({});
      setAppliedCoupon(null);
      setCouponInput("");
      setCouponError(null);
      loadHeldSales(branchId);
      showToast(t("sales.heldSaleSaved"), "success");
      searchInputRef.current?.focus();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("sales.heldSaleError"), "error");
    }
  }, [cart, branchId, selectedCustomer, globalDiscountNum, holdSale, clearCart, loadHeldSales, showToast, t]);

  const handleResumeHeldSale = useCallback(async (id: number) => {
    try {
      const held = await resumeSale(id);
      restoreCart(held.cart);
      setSelectedCustomer(held.customer ?? null);
      setGlobalDiscount(Number(held.discountTotal) > 0 ? String(held.discountTotal) : "");
      if (typeof branchId === "number") loadHeldSales(branchId);
      showToast(t("sales.heldSaleResumed"), "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("sales.heldSaleError"), "error");
    }
  }, [resumeSale, restoreCart, branchId, loadHeldSales, showToast, t]);

  const handleDiscardHeldSale = useCallback(async (id: number) => {
    try {
      await discardSale(id);
      if (typeof branchId === "number") loadHeldSales(branchId);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("sales.heldSaleError"), "error");
    }
  }, [discardSale, branchId, loadHeldSales, showToast, t]);

  const openPaymentModal = useCallback(() => {
    setPaymentMethod("CASH");
    setMixedCash("");
    setMixedCard("");
    setCashReceived(totalRounded.toFixed(2));
    setMixedCashReceived("");
    setShowPaymentModal(true);
  }, [totalRounded]);

  const closePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
    setCashReceived("");
    setMixedCashReceived("");
    // Al volver de pago al carrito, la busqueda vuelve a ser lo primero
    // que el cajero necesita — igual que al terminar una venta.
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  const handleConfirmSale = useCallback(async () => {
    if (cart.length === 0 || !branchId) return;
    setError(null);
    setSuccess(null);

    const cashNum = parseFloat(mixedCash) || 0;
    const cardNum = parseFloat(mixedCard) || 0;
    const cashReceivedNum = parseFloat(cashReceived) || 0;
    const cashChange = Math.round((cashReceivedNum - totalRounded) * 100) / 100;
    const mixedCashReceivedNum = parseFloat(mixedCashReceived) || 0;
    const mixedCashChange = Math.round((mixedCashReceivedNum - cashNum) * 100) / 100;

    const paid = paymentMethod === "CASH" ? cashReceivedNum : totalRounded;
    const changeVal =
      paymentMethod === "CASH"
        ? cashChange
        : paymentMethod === "MIXED"
        ? mixedCashChange
        : 0;

    try {
      const createdSale = await onCreateSale({
        branchId: Number(branchId),
        method: paymentMethod,
        cart,
        mixedBreakdown: paymentMethod === "MIXED" ? { cash: cashNum, card: cardNum } : undefined,
        customerId: selectedCustomer?.id ?? null,
        discountTotal: globalDiscountNum > 0 ? globalDiscountNum : undefined,
        couponCode: appliedCoupon?.code,
      });
      setLastSaleId(createdSale?.id ?? null);
      setLastSaleCustomer(
        selectedCustomer ? { email: selectedCustomer.email, phone: selectedCustomer.phone } : null
      );

      let msg = t("sales.saleSuccess", { total: totalRounded.toFixed(2) });
      if (paymentMethod === "MIXED") {
        msg += t("sales.saleSuccessMixed", { cash: cashNum.toFixed(2), card: cardNum.toFixed(2) });
      }
      if (paymentMethod === "CASH" && cashChange > 0) {
        msg += t("sales.saleSuccessChange", { change: cashChange.toFixed(2) });
      }
      if (paymentMethod === "MIXED" && mixedCashChange > 0) {
        msg += t("sales.saleSuccessMixedChange", { change: mixedCashChange.toFixed(2) });
      }
      setSuccess(msg);
      playSuccessSound();

      const receiptData = { total: totalRounded, paid, change: changeVal };
      setReceipt(receiptData);

      const branch = branches.find((b) => b.id === Number(branchId));
      const receiptItems = cart.map((c) => {
        const v = variantsWithStock.find((x) => x.productVariantId === c.productVariantId);
        const unitPrice = c.unitPriceOverride ?? (v ? parseFloat(v.price) : 0);
        return {
          name: v?.productName ?? "—",
          sku: v?.sku ?? "",
          attributeLabel: v ? formatAttributes(v.attributes) : "",
          qty: c.quantity,
          unitPrice,
          subtotal: unitPrice * c.quantity,
        };
      });
      setLastSaleReceipt({
        companyName: company?.name ?? "Empresa",
        branchName: branch?.name ?? "—",
        date: new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }),
        items: receiptItems,
        total: totalRounded,
        paymentLabel: PAYMENT_LABELS[paymentMethod] ?? paymentMethod,
        paid: receiptData.paid,
        change: receiptData.change,
      });

      // Auto-print on thermal printer if connected
      if (thermalPrinter.isConnected()) {
        const printData = {
          companyName: company?.name ?? "Empresa",
          branchName: branch?.name ?? "—",
          date: new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }),
          items: receiptItems,
          total: totalRounded,
          paymentLabel: PAYMENT_LABELS[paymentMethod] ?? paymentMethod,
          paid: receiptData.paid,
          change: receiptData.change,
        };
        thermalPrinter.printReceipt(printData).catch(console.error);
      }

      // Save items for post-sale document generation
      setLastSaleItems(
        cart.map((c) => {
          const v = variantsWithStock.find((x) => x.productVariantId === c.productVariantId);
          return {
            variantId: c.productVariantId,
            description: v ? `${v.productName}${v.attributes?.length ? ` (${v.attributes.map((a) => a.value).join("/")})` : ""}` : `ID ${c.productVariantId}`,
            quantity: c.quantity,
            unitPrice: c.unitPriceOverride ?? (v ? parseFloat(v.price) : 0),
          };
        })
      );

      clearCart();
      setSelectedCustomer(null);
      setGlobalDiscount("");
      setAutoDiscounts({});
      setAppliedCoupon(null);
      setCouponInput("");
      setCouponError(null);
      setShowPaymentModal(false);
      setMixedCash("");
      setMixedCard("");
      setCashReceived("");
      setMixedCashReceived("");
      searchInputRef.current?.focus();
      // El banner de exito (con los botones de imprimir/descargar/whatsapp/email)
      // queda visible hasta la proxima venta, no se auto-cierra: mandar un
      // email a mano necesita mas de 5 segundos. Solo el modal de "recibo
      // rapido" (con el vuelto) se cierra solo.
      setTimeout(() => setReceipt(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("sales.saleError"));
    }
  }, [
    cart,
    branchId,
    paymentMethod,
    mixedCash,
    mixedCard,
    cashReceived,
    mixedCashReceived,
    totalRounded,
    variantsWithStock,
    branches,
    company,
    onCreateSale,
    clearCart,
    selectedCustomer,
    globalDiscountNum,
  ]);

  // Global keyboard shortcuts: F2, F4, Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" && !showPaymentModal && typeof branchId === "number") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (
        e.key === "F4" &&
        !showPaymentModal &&
        typeof branchId === "number" &&
        cart.length > 0
      ) {
        e.preventDefault();
        openPaymentModal();
        return;
      }
      if (e.key === "Escape" && !showPaymentModal && showSuggestions) {
        setShowSuggestions(false);
        setSuggestionHighlightIndex(-1);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showPaymentModal, showSuggestions, branchId, cart.length, openPaymentModal]);

  const handleGenerateDocument = useCallback(async (docType: "REMITO" | "INVOICE") => {
    if (!branchId || lastSaleItems.length === 0) return;
    try {
      const token = getAccessToken();
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: docType,
          branchId,
          items: lastSaleItems,
          ...(selectedCustomer != null && { customerId: selectedCustomer.id }),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const created = await res.json();
      const branch = branches.find((b) => b.id === Number(branchId));
      setDocPreview({
        data: {
          type: docType,
          number: created.number,
          date: created.date ?? new Date().toISOString(),
          subtotal: Number(created.subtotal),
          taxTotal: Number(created.taxTotal),
          discountTotal: Number(created.discountTotal),
          total: Number(created.total),
          branch,
          items: (created.items ?? lastSaleItems).map((item: any) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount ?? 0),
            taxAmount: Number(item.taxAmount ?? 0),
            totalPrice: Number(item.totalPrice ?? (Number(item.unitPrice) * Number(item.quantity))),
          })),
        },
        company: {
          name: company?.name ?? "",
          legalName: company?.legalName ?? undefined,
          taxId: company?.taxId ?? undefined,
          address: company?.address ?? undefined,
          city: company?.city ?? undefined,
          phone: company?.phone ?? undefined,
          email: company?.email ?? undefined,
          currency: company?.currency ?? "ARS",
        },
      });
    } catch (e: any) {
      showToast(e.message ?? t("documents.saveError"), "error");
    }
  }, [branchId, lastSaleItems, branches, company, t, showToast, selectedCustomer]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full sm:max-w-2xl rounded-2xl p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600">
      {/* En mobile, sucursal/cliente/en-espera van colapsados detras de un
          toggle para que la busqueda quede arriba de todo sin scroll —
          en desktop siempre estan visibles (sm:block se impone al estado). */}
      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="sm:hidden flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300 px-1"
      >
        <span>
          {branches.find((b) => b.id === branchId)?.name ?? t("sales.branchLabel")}
          {selectedCustomer ? ` · ${selectedCustomer.name}` : ""}
        </span>
        <span className="text-indigo-600 dark:text-indigo-400">
          {showDetails ? t("sales.detailsHide") : t("sales.detailsShow")}
        </span>
      </button>

      <div className={`${showDetails ? "flex" : "hidden"} sm:flex flex-col gap-4 sm:gap-6`}>
        <Tooltip content={t("sales.branchTooltip")}>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t("sales.branchLabel")}
            </label>
            <select
              value={branchId === "" ? "" : String(branchId)}
              onChange={(e) => onBranchChange(e.target.value ? Number(e.target.value) : "")}
              className="input-minimal w-full sm:max-w-xs text-base py-2.5 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
            >
              <option value="">{t("sales.selectBranchPlaceholder")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </Tooltip>

        {typeof branchId === "number" && (
          <HeldSalesPanel
            heldSales={heldSales}
            loading={heldSalesLoading}
            onResume={handleResumeHeldSale}
            onDiscard={handleDiscardHeldSale}
          />
        )}

        {typeof branchId === "number" && (
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t("sales.customerLabel")}
            </label>
            <CustomerSearchInput
              selectedCustomer={selectedCustomer}
              onSelect={setSelectedCustomer}
            />
          </div>
        )}
      </div>

      <div className="space-y-6">
        {typeof branchId === "number" && (
          <ProductSearch
            variants={variantsWithStock}
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            showSuggestions={showSuggestions}
            onShowSuggestionsChange={setShowSuggestions}
            suggestionHighlightIndex={suggestionHighlightIndex}
            onHighlightChange={setSuggestionHighlightIndex}
            onAddVariant={(id) => addToCart(id, 1)}
            inputRef={searchInputRef}
          />
        )}
      </div>

      {/* Cart */}
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          {showPaymentModal ? (
            <PaymentPanel
              itemCount={totalItems}
              totalAmount={totalAmount}
              hasCustomer={!!selectedCustomer}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={(m) => {
                setPaymentMethod(m);
                if (m === "CASH") setCashReceived(totalRounded.toFixed(2));
              }}
              cashReceived={cashReceived}
              onCashReceivedChange={setCashReceived}
              mixedCash={mixedCash}
              onMixedCashChange={setMixedCash}
              mixedCard={mixedCard}
              onMixedCardChange={setMixedCard}
              mixedCashReceived={mixedCashReceived}
              onMixedCashReceivedChange={setMixedCashReceived}
              submitting={submitting}
              onConfirm={handleConfirmSale}
              onCancel={closePaymentModal}
            />
          ) : (
            <>
              <div className="bg-slate-50 dark:bg-slate-700/50 px-5 py-4 border-b border-slate-200 dark:border-slate-600 flex items-center gap-3">
                <IconShoppingCart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t("sales.cartTitle")}</h2>
                {totalItems > 0 && (
                  <span className="ml-auto text-base font-medium text-slate-500 dark:text-slate-400">
                    {t("sales.cartItems", { count: totalItems })}
                  </span>
                )}
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="px-5 py-14 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 mb-4">
                      <IconShoppingCart className="w-8 h-8" />
                    </div>
                    <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                      {t("sales.emptyCartMessage")}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-600">
                    {cart.map((item, i) => {
                      const v = variantsWithStock.find((x) => x.productVariantId === item.productVariantId);
                      const price = v ? parseFloat(v.price) : 0;
                      return (
                        <CartItem
                          key={`${item.productVariantId}-${i}`}
                          productName={v ? v.productName : `ID ${item.productVariantId}`}
                          sku={v?.sku ?? ""}
                          attributeLabel={v ? formatAttributes(v.attributes) : ""}
                          price={price}
                          quantity={item.quantity}
                          discount={item.discount ?? 0}
                          priceOverride={item.unitPriceOverride}
                          promoDiscount={autoDiscounts[item.productVariantId] ?? 0}
                          canDiscount={canDiscount}
                          canOverridePrice={canOverridePrice}
                          onIncrease={() => updateCartQty(i, 1)}
                          onDecrease={() => updateCartQty(i, -1)}
                          onRemove={() => removeFromCart(i)}
                          onDiscountChange={(d) => updateCartDiscount(i, d)}
                          onPriceOverrideChange={(p) => updateCartPriceOverride(i, p)}
                        />
                      );
                    })}
                  </ul>
                )}
              </div>

              {cart.length > 0 && (
                <>
                  <div className="border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-5 py-4 space-y-3">
                    {/* Global discount — requiere permiso SALES_DISCOUNT */}
                    {canDiscount && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex-1">{t("sales.discountGlobalLabel")}</span>
                        <span className="text-sm text-slate-400">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={globalDiscount}
                          placeholder="0"
                          onChange={(e) => setGlobalDiscount(e.target.value)}
                          className="w-24 text-sm px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                    )}
                    {/* Cupon — cualquier cajero puede tomarlo, no requiere SALES_DISCOUNT */}
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          {t("sales.couponApplied", { amount: appliedCoupon.discount.toFixed(2) })}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setAppliedCoupon(null); setCouponInput(""); setCouponError(null); }}
                          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {t("sales.customerDetach")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex-1">{t("sales.couponLabel")}</span>
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                          placeholder={t("sales.couponPlaceholder")}
                          className="w-28 text-sm px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponChecking || !couponInput.trim()}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50"
                        >
                          {couponChecking ? "..." : t("sales.couponApply")}
                        </button>
                      </div>
                    )}
                    {couponError && !appliedCoupon && (
                      <p className="text-xs text-red-600 dark:text-red-400">{couponError}</p>
                    )}
                    {globalDiscountNum > 0 && (
                      <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                        <span>{t("sales.subtotal")}</span>
                        <span>${subtotalBeforeGlobal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-base font-medium text-slate-600 dark:text-slate-400">
                        {t("sales.totalToCharge")}
                      </span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        ${totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 border-t border-slate-200 dark:border-slate-600 space-y-2">
                    <Tooltip content={t("sales.checkoutTooltip")}>
                      <button
                        ref={cobrarButtonRef}
                        type="button"
                        onClick={openPaymentModal}
                        disabled={submitting || cart.length === 0 || !branchId}
                        className="btn-primary w-full py-4 text-lg font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-keyshortcuts="F4"
                      >
                        <IconCurrency className="w-6 h-6" />
                        {t("sales.chargeButton")}
                      </button>
                    </Tooltip>
                    <button
                      type="button"
                      onClick={handleHoldSale}
                      disabled={submitting || cart.length === 0}
                      className="btn-secondary w-full py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("sales.heldSaleHold")}
                    </button>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">{t("sales.chargeKeyboardHint")}</p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {inventoryError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-base text-red-700 dark:text-red-300">
            {inventoryError}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-base text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <ReceiptView
          receipt={receipt}
          lastSaleReceipt={lastSaleReceipt}
          successMessage={success}
          onGenerateDocument={handleGenerateDocument}
          saleId={lastSaleId}
          customerEmail={lastSaleCustomer?.email ?? null}
          customerPhone={lastSaleCustomer?.phone ?? null}
          onSendEmail={onSendReceiptEmail}
        />
      </div>

      {/* Document preview modal (post-sale) */}
      {docPreview && (
        <DocumentPreviewModal
          open
          document={docPreview.data}
          company={docPreview.company}
          onClose={() => setDocPreview(null)}
        />
      )}
    </div>
  );
}
