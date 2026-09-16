import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./fr";
import en from "./en";

import cl1Fr from "./domains/cl1.fr";
import cl1En from "./domains/cl1.en";
import cl2Fr from "./domains/cl2.fr";
import cl2En from "./domains/cl2.en";
import cl3Fr from "./domains/cl3.fr";
import cl3En from "./domains/cl3.en";
import cl4Fr from "./domains/cl4.fr";
import cl4En from "./domains/cl4.en";
import cl5Fr from "./domains/cl5.fr";
import cl5En from "./domains/cl5.en";
import cl6Fr from "./domains/cl6.fr";
import cl6En from "./domains/cl6.en";
import cl7Fr from "./domains/cl7.fr";
import cl7En from "./domains/cl7.en";

import sl1Fr from "./domains/sl1.fr";
import sl1En from "./domains/sl1.en";
import sl2Fr from "./domains/sl2.fr";
import sl2En from "./domains/sl2.en";
import sl3Fr from "./domains/sl3.fr";
import sl3En from "./domains/sl3.en";
import sl4Fr from "./domains/sl4.fr";
import sl4En from "./domains/sl4.en";

import cr1Fr from "./domains/cr1.fr";
import cr1En from "./domains/cr1.en";
import do1Fr from "./domains/do1.fr";
import do1En from "./domains/do1.en";

import rl1Fr from "./domains/rl1.fr";
import rl1En from "./domains/rl1.en";
import rl2Fr from "./domains/rl2.fr";
import rl2En from "./domains/rl2.en";

import ad1Fr from "./domains/ad1.fr";
import ad1En from "./domains/ad1.en";
import ad2Fr from "./domains/ad2.fr";
import ad2En from "./domains/ad2.en";
import ad3Fr from "./domains/ad3.fr";
import ad3En from "./domains/ad3.en";
import ad4Fr from "./domains/ad4.fr";
import ad4En from "./domains/ad4.en";
import ad5aFr from "./domains/ad5a.fr";
import ad5aEn from "./domains/ad5a.en";
import ad5bFr from "./domains/ad5b.fr";
import ad5bEn from "./domains/ad5b.en";
import ad6Fr from "./domains/ad6.fr";
import ad6En from "./domains/ad6.en";

import pm1Fr from "./domains/pm1.fr";
import pm1En from "./domains/pm1.en";
import pm2Fr from "./domains/pm2.fr";
import pm2En from "./domains/pm2.en";

import misc1Fr from "./domains/misc1.fr";
import misc1En from "./domains/misc1.en";

const savedLang =
  typeof window !== "undefined"
    ? window.localStorage.getItem("relaya.lang")
    : null;

/*
 * The domain modules below were produced by an internal-portals i18n migration
 * (seller/courier/delivery-org/relay/admin/payments + remaining client pages),
 * each isolated behind a unique namespace prefix to guarantee zero key
 * collisions when merged here alongside the original fr/en dictionaries.
 */
const mergedFr = {
  ...fr,
  ...cl1Fr, ...cl2Fr, ...cl3Fr, ...cl4Fr, ...cl5Fr, ...cl6Fr, ...cl7Fr,
  ...sl1Fr, ...sl2Fr, ...sl3Fr, ...sl4Fr,
  ...cr1Fr, ...do1Fr,
  ...rl1Fr, ...rl2Fr,
  ...ad1Fr, ...ad2Fr, ...ad3Fr, ...ad4Fr, ...ad5aFr, ...ad5bFr, ...ad6Fr,
  ...pm1Fr, ...pm2Fr,
  ...misc1Fr,
};

const mergedEn = {
  ...en,
  ...cl1En, ...cl2En, ...cl3En, ...cl4En, ...cl5En, ...cl6En, ...cl7En,
  ...sl1En, ...sl2En, ...sl3En, ...sl4En,
  ...cr1En, ...do1En,
  ...rl1En, ...rl2En,
  ...ad1En, ...ad2En, ...ad3En, ...ad4En, ...ad5aEn, ...ad5bEn, ...ad6En,
  ...pm1En, ...pm2En,
  ...misc1En,
};

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: mergedFr },
    en: { translation: mergedEn },
  },
  lng: savedLang || "fr",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
