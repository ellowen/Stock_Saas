import type { ReceiptPrintData } from "../pages/sales/types";

// SerialPort is a Web API not yet in standard TS lib — declare minimal interface
declare class SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
}

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  INIT: [ESC, 0x40],
  CENTER: [ESC, 0x61, 0x01],
  LEFT: [ESC, 0x61, 0x00],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  CUT: [GS, 0x56, 0x00],
};

function bytes(...parts: (number[] | number)[]): Uint8Array {
  const arr: number[] = [];
  for (const p of parts) {
    if (Array.isArray(p)) arr.push(...p);
    else arr.push(p);
  }
  return new Uint8Array(arr);
}

function textBytes(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

function line(text: string): Uint8Array {
  return bytes([...textBytes(text), LF]);
}

function pad(left: string, right: string, width = 32): string {
  const space = width - left.length - right.length;
  return left + " ".repeat(Math.max(1, space)) + right;
}

class ThermalPrinter {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  isSupported(): boolean {
    return "serial" in navigator;
  }

  isConnected(): boolean {
    return this.port !== null && this.writer !== null;
  }

  async connect(): Promise<void> {
    if (!this.isSupported()) throw new Error("Web Serial API not supported");
    this.port = await (navigator as unknown as { serial: { requestPort(): Promise<SerialPort> } }).serial.requestPort();
    await this.port.open({ baudRate: 9600 });
    this.writer = this.port.writable!.getWriter();
  }

  async disconnect(): Promise<void> {
    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }

  async printReceipt(data: ReceiptPrintData): Promise<void> {
    if (!this.writer) throw new Error("Printer not connected");

    const chunks: Uint8Array[] = [];
    const push = (...parts: Uint8Array[]) => chunks.push(...parts);

    push(bytes(CMD.INIT));
    push(bytes(CMD.CENTER));
    push(bytes(CMD.BOLD_ON));
    push(line(data.companyName.toUpperCase().slice(0, 32)));
    push(bytes(CMD.BOLD_OFF));
    push(line(data.branchName));
    push(line(data.date));
    push(bytes(CMD.LEFT));
    push(line("--------------------------------"));

    for (const item of data.items) {
      const name = (item.name + (item.attributeLabel ? ` ${item.attributeLabel}` : "")).slice(0, 28);
      push(line(name));
      push(line(pad(`  ${item.qty}x $${item.unitPrice.toFixed(2)}`, `$${item.subtotal.toFixed(2)}`)));
    }

    push(line("--------------------------------"));
    push(bytes(CMD.BOLD_ON));
    push(line(pad("TOTAL", `$${data.total.toFixed(2)}`)));
    push(bytes(CMD.BOLD_OFF));
    push(line(pad("Pago", data.paymentLabel)));
    if (data.paid != null && data.change != null && data.change > 0) {
      push(line(pad("Pagado", `$${data.paid.toFixed(2)}`)));
      push(line(pad("Vuelto", `$${data.change.toFixed(2)}`)));
    }
    push(line(""));
    push(bytes(CMD.CENTER));
    push(line("--- GIRO ---"));
    push(line(""));
    push(line(""));
    push(bytes(CMD.CUT));

    const total = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
    let offset = 0;
    for (const c of chunks) {
      total.set(c, offset);
      offset += c.length;
    }
    await this.writer.write(total);
  }
}

export const thermalPrinter = new ThermalPrinter();
