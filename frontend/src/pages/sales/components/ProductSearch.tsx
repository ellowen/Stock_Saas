import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { IconSearch } from "../../../components/Icons";
import { formatAttributes, MAX_SUGGESTIONS } from "../types";
import type { VariantWithStock } from "../types";

type Props = {
  variants: VariantWithStock[];
  searchInput: string;
  onSearchChange: (val: string) => void;
  showSuggestions: boolean;
  onShowSuggestionsChange: (val: boolean) => void;
  suggestionHighlightIndex: number;
  onHighlightChange: (idx: number) => void;
  onAddVariant: (variantId: number) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

export function ProductSearch({
  variants,
  searchInput,
  onSearchChange,
  showSuggestions,
  onShowSuggestionsChange,
  suggestionHighlightIndex,
  onHighlightChange,
  onAddVariant,
  inputRef,
}: Props) {
  const { t } = useTranslation();
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const suggestionButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const searchTerm = searchInput.trim().toLowerCase();

  const suggestions = (() => {
    if (!searchTerm) return variants.slice(0, MAX_SUGGESTIONS);
    return variants
      .filter(
        (v) =>
          v.productName.toLowerCase().includes(searchTerm) ||
          v.sku.toLowerCase().includes(searchTerm) ||
          (v.barcode && v.barcode.toLowerCase().includes(searchTerm))
      )
      .slice(0, MAX_SUGGESTIONS);
  })();

  // Scroll highlighted item into view
  useEffect(() => {
    if (suggestionHighlightIndex >= 0 && suggestionButtonsRef.current[suggestionHighlightIndex]) {
      suggestionButtonsRef.current[suggestionHighlightIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [suggestionHighlightIndex]);

  // Reset highlight when search term or suggestions change
  useEffect(() => {
    if (!searchTerm || suggestions.length === 0) {
      onHighlightChange(-1);
    } else {
      onHighlightChange(
        suggestionHighlightIndex < 0 || suggestionHighlightIndex >= suggestions.length ? 0 : suggestionHighlightIndex
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, suggestions.length]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(ev.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(ev.target as Node)
      ) {
        onShowSuggestionsChange(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputRef, onShowSuggestionsChange]);

  const selectVariant = (variantId: number) => {
    onAddVariant(variantId);
    onSearchChange("");
    onShowSuggestionsChange(false);
    onHighlightChange(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onShowSuggestionsChange(true);
      if (suggestions.length === 0) return;
      onHighlightChange(
        suggestionHighlightIndex < suggestions.length - 1
          ? suggestionHighlightIndex + 1
          : suggestions.length - 1
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onShowSuggestionsChange(true);
      if (suggestions.length === 0) return;
      onHighlightChange(suggestionHighlightIndex <= 0 ? 0 : suggestionHighlightIndex - 1);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onShowSuggestionsChange(false);
      onHighlightChange(-1);
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();

    // highlighted item
    if (suggestionHighlightIndex >= 0 && suggestionHighlightIndex < suggestions.length) {
      selectVariant(suggestions[suggestionHighlightIndex].productVariantId);
      return;
    }

    if (!searchTerm) return;

    // exact barcode scan
    const byBarcode = variants.find(
      (v) => v.barcode && v.barcode.trim().toLowerCase() === searchTerm
    );
    if (byBarcode) {
      selectVariant(byBarcode.productVariantId);
      return;
    }

    // single match
    if (suggestions.length === 1) {
      selectVariant(suggestions[0].productVariantId);
      return;
    }

    // open dropdown
    if (suggestions.length > 1) {
      onShowSuggestionsChange(true);
      onHighlightChange(0);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
        {t("sales.searchLabel")}
      </label>
      <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">
        {t("sales.searchHint")}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
        {t("sales.searchShortcuts")}
      </p>
      <div className="relative">
        <div className="relative">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            ref={inputRef}
            id="pos-search-input"
            type="text"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls="search-suggestions-list"
            aria-activedescendant={
              suggestionHighlightIndex >= 0 && suggestions[suggestionHighlightIndex]
                ? `suggestion-${suggestions[suggestionHighlightIndex].productVariantId}`
                : undefined
            }
            value={searchInput}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onShowSuggestionsChange(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => onShowSuggestionsChange(true)}
            placeholder={t("sales.searchPlaceholder")}
            className="input-minimal w-full pl-12 pr-5 py-4 text-lg rounded-xl dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
            autoComplete="off"
            aria-label={t("sales.searchLabel")}
          />
        </div>
        <div
          ref={suggestionsRef}
          id="search-suggestions-list"
          className={`absolute top-full left-0 right-0 z-20 mt-2 rounded-xl border shadow-xl max-h-80 overflow-y-auto
            border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
            ${showSuggestions ? "block" : "hidden"}`}
        >
          {searchTerm ? (
            suggestions.length === 0 ? (
              <div className="px-5 py-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                {t("sales.searchNoMatch")}
              </div>
            ) : (
              <ul className="p-2 space-y-1" role="listbox" aria-label={t("sales.searchLabel")}>
                {suggestions.map((v, index) => {
                  const attrLabel = formatAttributes(v.attributes);
                  return (
                    <li
                      key={v.productVariantId}
                      role="option"
                      id={`suggestion-${v.productVariantId}`}
                      aria-selected={index === suggestionHighlightIndex}
                    >
                      <button
                        ref={(el) => {
                          suggestionButtonsRef.current[index] = el;
                        }}
                        type="button"
                        onClick={() => selectVariant(v.productVariantId)}
                        className={`w-full text-left px-4 py-3 rounded-lg border flex justify-between items-center gap-4 transition-colors text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 ${
                          index === suggestionHighlightIndex
                            ? "bg-indigo-100 dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700"
                            : "hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                        }`}
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {v.productName}
                          {attrLabel && (
                            <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                              · {attrLabel}
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                          ${v.price} · Stock: {v.availableQty}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            <div className="px-5 py-5 text-sm text-slate-500 dark:text-slate-400">
              {t("sales.searchTypeToSearch")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
