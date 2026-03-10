import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { IconGiroLogo, IconPackage, IconShoppingCart, IconTransfer, IconChart, IconBuilding, IconSun, IconMoon } from "../components/Icons";

const FEATURE_KEYS = [
  { titleKey: "landing.feature1Title", descKey: "landing.feature1Desc", Icon: IconPackage },
  { titleKey: "landing.feature2Title", descKey: "landing.feature2Desc", Icon: IconShoppingCart },
  { titleKey: "landing.feature3Title", descKey: "landing.feature3Desc", Icon: IconTransfer },
  { titleKey: "landing.feature4Title", descKey: "landing.feature4Desc", Icon: IconChart },
  { titleKey: "landing.feature5Title", descKey: "landing.feature5Desc", Icon: IconBuilding },
];

export function LandingPage() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            <span className="text-indigo-600 dark:text-indigo-400">
              <IconGiroLogo className="w-8 h-8" />
            </span>
            GIRO
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label={theme === "dark" ? "Tema claro" : "Tema oscuro"}
            >
              {theme === "dark" ? <IconSun /> : <IconMoon />}
            </button>
            <Link to="/login" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200">
              {t("landing.enter")}
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-4 dark:bg-indigo-500 dark:hover:bg-indigo-600">
              {t("landing.createAccountFree")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-16 sm:mb-20">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {t("landing.heroSubtitle")}
            </p>
            <p className="mt-4 text-base text-slate-500 dark:text-slate-400">
              {t("landing.heroStart")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary py-3 px-8 text-base font-semibold inline-block dark:bg-indigo-500 dark:hover:bg-indigo-600">
                {t("landing.createAccountFree")}
              </Link>
              <Link to="/login" className="btn-secondary py-3 px-8 text-base font-medium inline-block dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:border-slate-600">
                {t("landing.haveAccount")}
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              {t("landing.ctaFree")}
            </p>
          </section>

          <section className="mb-16 sm:mb-20">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-center mb-10">
              {t("landing.whatIsGiro")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {FEATURE_KEYS.map(({ titleKey, descKey, Icon }) => (
                <div
                  key={titleKey}
                  className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <span className="rounded-lg bg-indigo-100 dark:bg-indigo-900/40 p-2.5 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Icon className="w-6 h-6" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t(titleKey)}</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t(descKey)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("landing.pwaNote")}
            </p>
          </section>

          <section className="mb-16 sm:mb-20 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-4">
              {t("landing.whyTitle")}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              {t("landing.whyDesc")}
            </p>
            <p className="mt-3 text-slate-700 dark:text-slate-300 font-medium">
              {t("landing.whyTagline")}
            </p>
          </section>

          <section className="text-center">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t("landing.ctaFree")}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary py-3 px-8 text-base font-semibold inline-block dark:bg-indigo-500 dark:hover:bg-indigo-600">
                {t("landing.createAccountFree")}
              </Link>
              <Link to="/login" className="btn-secondary py-3 px-8 text-base font-medium inline-block dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:border-slate-600">
                {t("landing.haveAccount")}
              </Link>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:text-slate-700 dark:hover:text-slate-300">{t("landing.footerHome")}</Link>
          <Link to="/login" className="hover:text-slate-700 dark:hover:text-slate-300">{t("landing.footerEnter")}</Link>
          <Link to="/register" className="hover:text-slate-700 dark:hover:text-slate-300">{t("landing.footerCreate")}</Link>
          <span>{t("landing.footerTagline")}</span>
        </div>
      </footer>
    </div>
  );
}
