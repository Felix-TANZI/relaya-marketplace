import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr";
import en from "./en";

const savedLang =
  typeof window !== "undefined"
    ? window.localStorage.getItem("relaya.lang")
    : null;

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: savedLang || "fr",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
