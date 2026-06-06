// frontend/src/components/ui/Button.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("affiche son libellé", () => {
    render(<Button>Valider</Button>);
    expect(screen.getByRole("button", { name: "Valider" })).toBeInTheDocument();
  });

  it("déclenche onClick au clic", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>OK</Button>);
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("affiche l'état de chargement et se désactive", () => {
    render(<Button isLoading>Envoyer</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("Chargement...");
  });
});