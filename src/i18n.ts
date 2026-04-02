import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslation from "./locales/en.json";
import idTranslation from "./locales/id.json";
import jwTranslation from "./locales/jw.json";
import suTranslation from "./locales/su.json";
import makTranslation from "./locales/mak.json";
import madTranslation from "./locales/mad.json";

const resources = {
  en: { translation: enTranslation },
  id: { translation: idTranslation },
  jw: { translation: jwTranslation },
  su: { translation: suTranslation },
  mak: { translation: makTranslation },
  mad: { translation: madTranslation },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Initialize language from localStorage on client side
if (typeof window !== "undefined") {
  const savedLanguage = localStorage.getItem("language");
  if (savedLanguage && i18n.language !== savedLanguage) {
    i18n.changeLanguage(savedLanguage);
  }
}

export default i18n;
