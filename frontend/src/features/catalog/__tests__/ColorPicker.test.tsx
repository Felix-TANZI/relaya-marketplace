// frontend/src/components/catalog/__tests__/ColorPicker.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ColorPicker } from "../ColorPicker";
import * as colorsService from "@/services/api/colors";

vi.mock("@/services/api/colors", async () => {
  const actual = await vi.importActual<typeof colorsService>("@/services/api/colors");
  return {
    ...actual,
    colorsApi: {
      list: vi.fn(),
      grouped: vi.fn(),
    },
  };
});

const mockedApi = colorsService.colorsApi as unknown as {
  grouped: ReturnType<typeof vi.fn>;
};

const NOIR = {
  id: 1,
  family: "COLOR" as const,
  name: "Noir",
  name_en: "Black",
  slug: "color-noir",
  hex_code: "#000000",
  pattern_url: "",
  is_neutral: true,
  display_order: 10,
};

const ROUGE = {
  id: 2,
  family: "COLOR" as const,
  name: "Rouge",
  name_en: "Red",
  slug: "color-rouge",
  hex_code: "#DC2626",
  pattern_url: "",
  is_neutral: false,
  display_order: 100,
};

describe("ColorPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.grouped.mockResolvedValue({
      COLOR: [NOIR, ROUGE],
      FINISH: [],
    });
  });

  it("affiche les couleurs chargées depuis l'API", async () => {
    render(<ColorPicker value={null} onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByLabelText("Noir")).toBeInTheDocument();
      expect(screen.getByLabelText("Rouge")).toBeInTheDocument();
    });
  });

  it("filtre les non-neutres quand neutralOnly=true", async () => {
    render(<ColorPicker value={null} onChange={() => {}} neutralOnly />);
    await waitFor(() => {
      expect(screen.getByLabelText("Noir")).toBeInTheDocument();
      expect(screen.queryByLabelText("Rouge")).not.toBeInTheDocument();
    });
  });

  it("appelle onChange avec le slug lors de la sélection", async () => {
    const onChange = vi.fn();
    render(<ColorPicker value={null} onChange={onChange} />);
    await waitFor(() => screen.getByLabelText("Noir"));
    fireEvent.click(screen.getByLabelText("Noir"));
    expect(onChange).toHaveBeenCalledWith("color-noir", expect.objectContaining({ slug: "color-noir" }));
  });

  it("désélectionne quand on clique sur la couleur déjà sélectionnée", async () => {
    const onChange = vi.fn();
    render(<ColorPicker value="color-noir" onChange={onChange} />);
    await waitFor(() => screen.getByLabelText("Noir"));
    fireEvent.click(screen.getByLabelText("Noir"));
    expect(onChange).toHaveBeenCalledWith(null, null);
  });
});