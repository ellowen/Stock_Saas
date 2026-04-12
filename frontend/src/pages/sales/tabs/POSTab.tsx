import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { Tooltip } from "../../../components/Tooltip";
import { IconCurrency, IconShoppingCart } from "../../../components/Icons";
import { ProductSearch } from "../components/ProductSearch";
import { CartItem } from "../components/CartItem";
import { PaymentModal } from "../components/PaymentModal";
import { ReceiptView } from "../components/ReceiptView";
import { CustomerSearchInput } from "../components/CustomerSearchInput";
import { DocumentPreviewModal } from "../../../components/documents/DocumentPreviewModal";
import type { DocumentData, CompanyInfo } from "../../../components/documents/DocumentTemplate";
import { useCart } from "../hooks/useCart";
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
  onCreateSale: (params: CreateSaleParams) => Promise<void>;
};

export function POSTab({
  branches,
  branchId,
  onBranchChange,
  inventory,
  submitting,
  inventoryError,
  onCreateSale,
}: Props) {
  const { t } = useTranslation();
  const { company } = useAuth();
  const { showToast } = useToast();
  const { cart, addToCart, updateCartQty, updateCartDiscount, removeFromCart, clearCart } = useCart();
  const [globalDiscount, setGlobalDiscount] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string; taxId: string | null; phone: string | null } | null>(null);

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
    return s + (parseFloat(v.price) - itemDiscount) * item.quantity;
  }, 0);
  const globalDiscountNum = Math.max(0, parseFloat(globalDiscount) || 0);
  const totalAmount = Math.max(0, subtotalBeforeGlobal - globalDiscountNum);
  const totalRounded = Math.round(totalAmount * 100) / 100;

  // Focus search on tab mount / branch change
  useEffect(() => {
    if (typeof branchId === "number") {
      searchInputRef.current?.focus();
    }
  }, [branchId]);

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
      await onCreateSale({
        branchId: Number(branchId),
        method: paymentMethod,
        cart,
        mixedBreakdown: paymentMethod === "MIXED" ? { cash: cashNum, card: cardNum } : undefined,
        customerId: selectedCustomer?.id ?? null,
        discountTotal: globalDiscountNum > 0 ? globalDiscountNum : undefined,
      });

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
        const unitPrice = v ? parseFloat(v.price) : 0;
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
            unitPrice: v ? parseFloat(v.price) : 0,
          };
        })
      );

      clearCart();
      setSelectedCustomer(null);
      setGlobalDiscount("");
      setShowPaymentModal(false);
      setMixedCash("");
      setMixedCard("");
      setCashReceived("");
      setMixedCashReceived("");
      searchInputRef.current?.focus();
      setTimeout(() => setSuccess(null), 5000);
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
      const token = localStorage.getItem("accessToken");
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
    <div className="flex flex-col gap-8 max-w-2xl rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600">
      {/* Branch selector */}
      <div className="space-y-6">
        <Tooltip content={t("sales.branchTooltip")}>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t("sales.branchLabel")}
            </label>
            <select
              value={branchId === "" ? "" : String(branchId)}
              onChange={(e) => onBranchChange(e.target.value ? Number(e.target.value) : "")}
              className="input-minimal max-w-xs text-base py-2.5 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
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
                      onIncrease={() => updateCartQty(i, 1)}
                      onDecrease={() => updateCartQty(i, -1)}
                      onRemove={() => removeFromCart(i)}
                      onDiscountChange={(d) => updateCartDiscount(i, d)}
                    />
                  );
                })}
              </ul>
            )}
          </div>

          {cart.length > 0 && (
            <>
              <div className="border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-5 py-4 space-y-3">
                {/* Global discount */}
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
              <div className="p-5 border-t border-slate-200 dark:border-slate-600">
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
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">{t("sales.chargeKeyboardHint")}</p>
              </div>
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

      {/* Payment modal */}
      <PaymentModal
        open={showPaymentModal}
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
    </div>
  );
}
