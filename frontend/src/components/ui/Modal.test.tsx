import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Modal } from "./Modal";

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("Modal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
  });

  // ── Visibilidad ───────────────────────────────────────────────────────────────

  it("no renderiza nada cuando open=false", () => {
    render(<Modal open={false} onClose={onClose}>contenido</Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza el dialog cuando open=true", () => {
    render(<Modal open={true} onClose={onClose}>contenido</Modal>);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("muestra el contenido hijo", () => {
    render(<Modal open={true} onClose={onClose}><p>Hola mundo</p></Modal>);
    expect(screen.getByText("Hola mundo")).toBeInTheDocument();
  });

  // ── Título ────────────────────────────────────────────────────────────────────

  it("muestra el título cuando se provee", () => {
    render(<Modal open={true} onClose={onClose} title="Nuevo producto">contenido</Modal>);
    expect(screen.getByText("Nuevo producto")).toBeInTheDocument();
  });

  it("no hay elemento de título si no se provee", () => {
    render(<Modal open={true} onClose={onClose} hideCloseButton>contenido</Modal>);
    // No debe haber un h2 con texto vacío
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  // ── Botón cerrar ──────────────────────────────────────────────────────────────

  it("muestra el botón de cerrar por defecto", () => {
    render(<Modal open={true} onClose={onClose}>contenido</Modal>);
    expect(screen.getByRole("button", { name: /cerrar/i })).toBeInTheDocument();
  });

  it("llama a onClose al hacer clic en el botón cerrar", () => {
    render(<Modal open={true} onClose={onClose}>contenido</Modal>);
    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("no muestra el botón cerrar cuando hideCloseButton=true", () => {
    render(<Modal open={true} onClose={onClose} hideCloseButton>contenido</Modal>);
    expect(screen.queryByRole("button", { name: /cerrar/i })).not.toBeInTheDocument();
  });

  // ── Tecla Escape ─────────────────────────────────────────────────────────────

  it("llama a onClose al presionar Escape", () => {
    render(<Modal open={true} onClose={onClose}>contenido</Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("no llama a onClose al presionar otra tecla", () => {
    render(<Modal open={true} onClose={onClose}>contenido</Modal>);
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── Footer ────────────────────────────────────────────────────────────────────

  it("renderiza el footer cuando se provee", () => {
    render(
      <Modal open={true} onClose={onClose} footer={<button>Guardar</button>}>
        contenido
      </Modal>
    );
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("no renderiza el área de footer si no se provee", () => {
    render(<Modal open={true} onClose={onClose}>contenido</Modal>);
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
  });

  // ── aria-modal ────────────────────────────────────────────────────────────────

  it("el dialog tiene aria-modal=true", () => {
    render(<Modal open={true} onClose={onClose}>contenido</Modal>);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });
});
