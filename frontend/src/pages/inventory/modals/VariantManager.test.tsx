import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { VariantManager } from "./VariantManager";
import type { AttributeDefinition, VariantForm } from "../types";
import i18n from "../../../i18n";

// idioma determinístico para no depender de la detección de navegador en jsdom
beforeAll(() => {
  i18n.changeLanguage("es");
});

function emptyVariant(overrides: Partial<VariantForm> = {}): VariantForm {
  return { size: "", color: "", sku: "", barcode: "", price: "", costPrice: "", attributes: [], ...overrides };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("VariantManager — modo legacy (sin Attribute configurados)", () => {
  it("muestra los campos Talle/Color en vez de atributos flexibles", () => {
    render(
      <VariantManager
        variants={[emptyVariant()]}
        attributeDefs={[]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onUpdateAttribute={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText("Ej. M")).toBeInTheDocument(); // Talle
    expect(screen.getByPlaceholderText("Ej. Negro")).toBeInTheDocument(); // Color
  });

  it("llama a onUpdate con field='size' al tipear en el campo Talle", () => {
    const onUpdate = vi.fn();
    render(
      <VariantManager
        variants={[emptyVariant()]}
        attributeDefs={[]}
        onAdd={vi.fn()}
        onUpdate={onUpdate}
        onUpdateAttribute={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Ej. M"), { target: { value: "XL" } });
    expect(onUpdate).toHaveBeenCalledWith(0, "size", "XL");
  });

  it("llama a onUpdate con field='color' al tipear en el campo Color", () => {
    const onUpdate = vi.fn();
    render(
      <VariantManager
        variants={[emptyVariant()]}
        attributeDefs={[]}
        onAdd={vi.fn()}
        onUpdate={onUpdate}
        onUpdateAttribute={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Ej. Negro"), { target: { value: "Fucsia" } });
    expect(onUpdate).toHaveBeenCalledWith(0, "color", "Fucsia");
  });

  it("llama a onAdd al hacer clic en 'Agregar variante'", () => {
    const onAdd = vi.fn();
    render(
      <VariantManager
        variants={[emptyVariant()]}
        attributeDefs={[]}
        onAdd={onAdd}
        onUpdate={vi.fn()}
        onUpdateAttribute={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Agregar variante" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("el botón de eliminar variante está deshabilitado si solo hay una", () => {
    render(
      <VariantManager
        variants={[emptyVariant()]}
        attributeDefs={[]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onUpdateAttribute={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Quitar variante 1" })).toBeDisabled();
  });

  it("llama a onRemove(0) al eliminar la primera variante cuando hay más de una", () => {
    const onRemove = vi.fn();
    render(
      <VariantManager
        variants={[emptyVariant(), emptyVariant()]}
        attributeDefs={[]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onUpdateAttribute={vi.fn()}
        onRemove={onRemove}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Quitar variante 1" }));
    expect(onRemove).toHaveBeenCalledWith(0);
  });
});

describe("VariantManager — modo atributos flexibles (empresa con Attribute configurados)", () => {
  const selectDef: AttributeDefinition = { id: 1, name: "Talle", type: "SELECT", options: ["S", "M", "L"] };
  const numberDef: AttributeDefinition = { id: 2, name: "Peso", type: "NUMBER" };

  it("no muestra los campos legacy Talle/Color cuando hay atributos configurados", () => {
    render(
      <VariantManager
        variants={[emptyVariant()]}
        attributeDefs={[selectDef]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onUpdateAttribute={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.queryByPlaceholderText("Ej. M")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ej. Negro")).not.toBeInTheDocument();
  });

  it("renderiza un <select> con las opciones del Attribute tipo SELECT", () => {
    render(
      <VariantManager
        variants={[emptyVariant()]}
        attributeDefs={[selectDef]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onUpdateAttribute={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(["", "S", "M", "L"]);
  });

  it("llama a onUpdateAttribute con (variantIndex, attributeId, value) al elegir una opción", () => {
    const onUpdateAttribute = vi.fn();
    render(
      <VariantManager
        variants={[emptyVariant()]}
        attributeDefs={[selectDef]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onUpdateAttribute={onUpdateAttribute}
        onRemove={vi.fn()}
      />
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "M" } });
    expect(onUpdateAttribute).toHaveBeenCalledWith(0, 1, "M");
  });

  it("renderiza un input type=number para un Attribute tipo NUMBER", () => {
    render(
      <VariantManager
        variants={[emptyVariant()]}
        attributeDefs={[numberDef]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onUpdateAttribute={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    const input = screen.getByPlaceholderText("Peso") as HTMLInputElement;
    expect(input.type).toBe("number");
  });

  it("llama a onUpdateAttribute al escribir en un Attribute tipo NUMBER", () => {
    const onUpdateAttribute = vi.fn();
    render(
      <VariantManager
        variants={[emptyVariant()]}
        attributeDefs={[numberDef]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onUpdateAttribute={onUpdateAttribute}
        onRemove={vi.fn()}
      />
    );
    fireEvent.change(screen.getByPlaceholderText("Peso"), { target: { value: "12.5" } });
    expect(onUpdateAttribute).toHaveBeenCalledWith(0, 2, "12.5");
  });

  it("precarga el value existente de la variante en el <select> del atributo", () => {
    render(
      <VariantManager
        variants={[emptyVariant({ attributes: [{ attributeId: 1, value: "L" }] })]}
        attributeDefs={[selectDef]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onUpdateAttribute={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("L");
  });

  it("renderiza un campo por cada Attribute cuando hay varios (SELECT + NUMBER)", () => {
    render(
      <VariantManager
        variants={[emptyVariant()]}
        attributeDefs={[selectDef, numberDef]}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onUpdateAttribute={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Peso")).toBeInTheDocument();
  });
});
