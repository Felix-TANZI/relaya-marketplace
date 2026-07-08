// frontend/src/components/catalog/__tests__/CategoryTreePicker.test.tsx
 
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CategoryTreePicker } from "../CategoryTreePicker";
import * as categoriesService from "@/services/api/categories";
 
vi.mock("@/services/api/categories", async () => {
  const actual = await vi.importActual<typeof categoriesService>("@/services/api/categories");
  return {
    ...actual,
    categoriesApi: {
      tree: vi.fn(),
      flat: vi.fn(),
    },
  };
});
 
const mockedApi = categoriesService.categoriesApi as unknown as {
  tree: ReturnType<typeof vi.fn>;
};
 
const TREE = [
  {
    id: 1,
    name: "Electronics",
    slug: "electronics",
    level: 0,
    icon_name: "",
    description: "",
    display_order: 0,
    is_active: true,
    is_deprecated: false,
    requires_admin_approval: false,
    children: [
      {
        id: 2,
        name: "Téléphonie",
        slug: "electronics-phones",
        level: 1,
        icon_name: "Smartphone",
        description: "",
        display_order: 0,
        is_active: true,
        is_deprecated: false,
        requires_admin_approval: false,
        children: [
          {
            id: 3,
            name: "Smartphones iOS",
            slug: "electronics-phones-smartphones-ios",
            level: 2,
            icon_name: "Smartphone",
            description: "",
            display_order: 0,
            is_active: true,
            is_deprecated: false,
            requires_admin_approval: false,
            children: [],
          },
        ],
      },
      {
        id: 4,
        name: "Deprecated cat",
        slug: "deprecated",
        level: 1,
        icon_name: "",
        description: "",
        display_order: 1,
        is_active: true,
        is_deprecated: true,   // Deprecated → doit être masquée
        requires_admin_approval: false,
        children: [],
      },
    ],
  },
];
 
describe("CategoryTreePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.tree.mockResolvedValue(TREE);
  });
 
  it("charge et affiche la racine", async () => {
    render(<CategoryTreePicker value={null} onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
    });
  });
 
  it("descend dans un sous-arbre au clic sur un parent (leavesOnly)", async () => {
    render(<CategoryTreePicker value={null} onChange={() => {}} leavesOnly />);
    await waitFor(() => screen.getByText("Electronics"));
    fireEvent.click(screen.getByText("Electronics"));
    await waitFor(() => {
      expect(screen.getByText("Téléphonie")).toBeInTheDocument();
    });
  });
 
  it("filtre les catégories deprecated", async () => {
    render(<CategoryTreePicker value={null} onChange={() => {}} />);
    await waitFor(() => screen.getByText("Electronics"));
    fireEvent.click(screen.getByText("Electronics"));
    await waitFor(() => {
      expect(screen.getByText("Téléphonie")).toBeInTheDocument();
      expect(screen.queryByText("Deprecated cat")).not.toBeInTheDocument();
    });
  });
 
  it("sélectionne une feuille et appelle onChange", async () => {
    const onChange = vi.fn();
    render(<CategoryTreePicker value={null} onChange={onChange} leavesOnly />);
    await waitFor(() => screen.getByText("Electronics"));
    fireEvent.click(screen.getByText("Electronics"));
    await waitFor(() => screen.getByText("Téléphonie"));
    fireEvent.click(screen.getByText("Téléphonie"));
    await waitFor(() => screen.getByText("Smartphones iOS"));
    fireEvent.click(screen.getByText("Smartphones iOS"));
    expect(onChange).toHaveBeenCalledWith(3, expect.objectContaining({ id: 3 }));
  });
});