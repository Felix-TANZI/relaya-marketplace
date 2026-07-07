// frontend/src/test/setup.ts
// Charge les matchers jest-dom (toBeInTheDocument, toBeDisabled, ...)
// et nettoie le DOM après CHAQUE test — sinon les rendus s'accumulent
// et getByRole trouve plusieurs éléments identiques.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});