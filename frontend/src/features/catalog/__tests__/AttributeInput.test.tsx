// frontend/src/components/catalog/__tests__/AttributeInput.test.tsx

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttributeInput } from "../AttributeInput";
 
const BASE_ATTR = {
  id: 1,
  slug: "test-slug",
  name: "Stockage",
  attribute_type: "SIZE" as const,
  values: [] as (string | number)[],
  unit: "",
  is_universal: false,
  category: null,
  category_name: null,
  display_order: 0,
};
 
describe("AttributeInput dispatch", () => {
  it("rend un select pour values_type=SELECT", () => {
    render(
      <AttributeInput
        attribute={{
          ...BASE_ATTR,
          role: "AXE",
          values_type: "SELECT",
          values: ["128", "256", "512"],
          unit: "GB",
        }}
        value=""
        onChange={() => {}}
      />,
    );
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("128 GB")).toBeInTheDocument();
  });
 
  it("rend un input number pour values_type=NUMBER", () => {
    render(
      <AttributeInput
        attribute={{
          ...BASE_ATTR,
          role: "SPEC",
          values_type: "NUMBER",
          unit: "mAh",
        }}
        value={5000}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("spinbutton")).toHaveValue(5000);
    expect(screen.getByText("mAh")).toBeInTheDocument();
  });
 
  it("rend un toggle pour values_type=BOOL", () => {
    render(
      <AttributeInput
        attribute={{
          ...BASE_ATTR,
          role: "SPEC",
          values_type: "BOOL",
        }}
        value={true}
        onChange={() => {}}
      />,
    );
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });
 
  it("appelle onChange au toggle du BOOL", () => {
    const onChange = vi.fn();
    render(
      <AttributeInput
        attribute={{
          ...BASE_ATTR,
          role: "SPEC",
          values_type: "BOOL",
        }}
        value={false}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});