// frontend/src/components/catalog/__tests__/BrandAutocomplete.test.tsx
// Tests ciblés — cas critiques uniquement

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrandAutocomplete } from "../BrandAutocomplete";
import * as brandsService from "@/services/api/brands";

vi.mock("@/services/api/brands", async () => {
  const actual = await vi.importActual<typeof brandsService>("@/services/api/brands");
  return {
    ...actual,
    brandsApi: {
      autocomplete: vi.fn(),
      list: vi.fn(),
      detail: vi.fn(),
      propose: vi.fn(),
    },
  };
});

const mockedApi = brandsService.brandsApi as unknown as {
  autocomplete: ReturnType<typeof vi.fn>;
  propose: ReturnType<typeof vi.fn>;
};

const SAMSUNG = {
  id: 1,
  name: "Samsung",
  slug: "samsung",
  logo_url: null,
  is_verified: true,
};

describe("BrandAutocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche la marque sélectionnée avec badge Vérifiée", () => {
    render(<BrandAutocomplete value={SAMSUNG} onChange={() => {}} />);
    expect(screen.getByText("Samsung")).toBeInTheDocument();
    expect(screen.getByText("Vérifiée")).toBeInTheDocument();
  });

  it("efface la sélection au clic sur X", () => {
    const onChange = vi.fn();
    render(<BrandAutocomplete value={SAMSUNG} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Changer de marque"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("appelle propose() si le vendeur clique 'Créer la marque'", async () => {
    mockedApi.autocomplete.mockResolvedValue([]);
    mockedApi.propose.mockResolvedValue({
      ...SAMSUNG,
      id: 99,
      name: "NouvelleMarque",
      is_verified: false,
    });
    const onChange = vi.fn();

    render(<BrandAutocomplete value={null} onChange={onChange} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "NouvelleMarque" } });

    // Attendre le debounce + fetch vide
    await waitFor(() => {
      expect(screen.getByText(/Créer la marque/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Créer la marque/));
    await waitFor(() => {
      expect(mockedApi.propose).toHaveBeenCalledWith({ name: "NouvelleMarque" });
    });
  });
});