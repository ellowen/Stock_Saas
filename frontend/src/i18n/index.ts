import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import es from "./locales/es.json";
import en from "./locales/en.json";

const resources = { es: { translation: es }, en: { translation: en } };

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "es",
    defaultNS: "translation",
    interpolation: { escapeValue: false },
    detection: {
      // Most of the UI is hardcoded in Spanish, so default to "es" instead of the browser language.
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: "giro_lang",
    },
  });

// English is incomplete (accounting, payroll, audit, sign-up are Spanish-only), so the ES/EN switch is hidden.
export const SHOW_LANGUAGE_SWITCH = false;

export default i18n;
