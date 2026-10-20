// frontend/src/test/setup.ts
// Charge les matchers jest-dom (toBeInTheDocument, toBeDisabled, ...)
// et nettoie le DOM après CHAQUE test — sinon les rendus s'accumulent
// et getByRole trouve plusieurs éléments identiques.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
// Initialise i18next (langue par défaut fr) pour que useTranslation()/t()
// résolvent les vraies chaînes en test, comme dans l'app réelle — sans ça,
// tout composant migré vers t() affiche la clé brute au lieu du texte.
import "@/i18n/index";

afterEach(() => {
  cleanup();
});