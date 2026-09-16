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
    parent: null,
    level: 0,
    icon_name: "",
    image_url: "https://cdn.test/electronics.webp",
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
        parent: 1,
        level: 1,
        icon_name: "Smartphone",
        image_url: null,
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
            parent: 2,
            level: 2,
            icon_name: "Smartphone",
            image_url: null,
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
        parent: 1,
        level: 1,
        icon_name: "",
        image_url: null,
        description: "",
        display_order: 1,
        is_active: true,
        is_deprecated: true,   // Deprecated → doit être masquée
        requires_admin_approval: false,
        children: [],
      },
    ],
  },
  {
    id: 5,
    name: "Sport",
    slug: "sport",
    parent: null,
    level: 0,
    icon_name: "",
    image_url: null,
    description: "",
    display_order: 1,
    is_active: true,
    is_deprecated: false,
    requires_admin_approval: false,
    children: [],
  },
];

/** Ouvre la liste déroulante en cliquant sur le champ (sa flèche). */
async function openPicker(name: RegExp = /Choisir une catégorie/) {
  const field = await screen.findByRole("button", { name });
  fireEvent.click(field);
  return field;
}

describe("CategoryTreePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.tree.mockResolvedValue(TREE);
  });

  it("reste fermé tant qu'on ne clique pas sur la flèche", async () => {
    render(<CategoryTreePicker value={null} onChange={() => {}} />);
    const field = await screen.findByRole("button", { name: /Choisir une catégorie/ });
    expect(field).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ouvre la liste des catégories de l'admin, avec leurs images", async () => {
    const { container } = render(<CategoryTreePicker value={null} onChange={() => {}} />);
    const field = await openPicker();
    expect(field).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("option", { name: /Electronics/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Sport/ })).toBeInTheDocument();
    expect(screen.getByText("1 sous-catégorie")).toBeInTheDocument();
    expect(container.querySelector('img[src="https://cdn.test/electronics.webp"]')).not.toBeNull();
  });

  it("descend dans une catégorie qui a des sous-catégories et masque les deprecated", async () => {
    render(<CategoryTreePicker value={null} onChange={() => {}} leavesOnly />);
    await openPicker();
    fireEvent.click(await screen.findByRole("option", { name: /Electronics/ }));
    expect(await screen.findByRole("option", { name: /Téléphonie/ })).toBeInTheDocument();
    expect(screen.getByText(/Sous-catégories de/)).toBeInTheDocument();
    expect(screen.queryByText("Deprecated cat")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remonter d'un niveau" }));
    expect(await screen.findByRole("option", { name: /Sport/ })).toBeInTheDocument();
  });

  it("sélectionne une sous-catégorie finale, appelle onChange et referme la liste", async () => {
    const onChange = vi.fn();
    render(<CategoryTreePicker value={null} onChange={onChange} leavesOnly />);
    await openPicker();
    fireEvent.click(await screen.findByRole("option", { name: /Electronics/ }));
    fireEvent.click(await screen.findByRole("option", { name: /Téléphonie/ }));
    fireEvent.click(await screen.findByRole("option", { name: /Smartphones iOS/ }));
    expect(onChange).toHaveBeenCalledWith(3, expect.objectContaining({ id: 3 }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("sélectionne directement une catégorie sans sous-catégorie", async () => {
    const onChange = vi.fn();
    render(<CategoryTreePicker value={null} onChange={onChange} leavesOnly />);
    await openPicker();
    fireEvent.click(await screen.findByRole("option", { name: /Sport/ }));
    expect(onChange).toHaveBeenCalledWith(5, expect.objectContaining({ id: 5 }));
  });

  it("trouve une sous-catégorie par la recherche (sans tenir compte des accents)", async () => {
    const onChange = vi.fn();
    render(<CategoryTreePicker value={null} onChange={onChange} leavesOnly />);
    await openPicker();
    fireEvent.change(screen.getByLabelText("Rechercher une catégorie"), { target: { value: "iós" } });
    fireEvent.click(await screen.findByRole("option", { name: /Smartphones iOS/ }));
    expect(onChange).toHaveBeenCalledWith(3, expect.objectContaining({ id: 3 }));
  });

  it("se pilote au clavier : flèches, Entrée, Échap", async () => {
    const onChange = vi.fn();
    render(<CategoryTreePicker value={null} onChange={onChange} leavesOnly />);
    await openPicker();
    const search = await screen.findByLabelText("Rechercher une catégorie");
    await screen.findByRole("option", { name: /Sport/ });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(5, expect.objectContaining({ id: 5 }));

    await openPicker();
    fireEvent.keyDown(await screen.findByLabelText("Rechercher une catégorie"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("se referme au clic à l'extérieur", async () => {
    render(
      <div>
        <p>Ailleurs</p>
        <CategoryTreePicker value={null} onChange={() => {}} />
      </div>,
    );
    await openPicker();
    await screen.findByRole("listbox");
    fireEvent.mouseDown(screen.getByText("Ailleurs"));
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("affiche la catégorie déjà choisie et rouvre sa branche", async () => {
    render(<CategoryTreePicker value={3} onChange={() => {}} leavesOnly />);
    // Champ fermé : nom de la catégorie + chemin, et où l'acheteur la trouvera.
    expect(await screen.findByText("Visible chez les acheteurs dans :")).toBeInTheDocument();
    expect(screen.getAllByText("Electronics › Téléphonie › Smartphones iOS").length).toBeGreaterThan(0);

    await openPicker(/Smartphones iOS/);
    expect(await screen.findByRole("option", { name: /Smartphones iOS/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/Sous-catégories de/)).toBeInTheDocument();
  });
});
