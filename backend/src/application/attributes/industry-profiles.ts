export interface AttributeProfile {
  name: string;
  type: "TEXT" | "NUMBER" | "SELECT";
  options?: string[];
  sortOrder: number;
}

export interface IndustryProfile {
  label: string;
  attributes: AttributeProfile[];
}

export const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  GENERIC: {
    label: "Genérico",
    attributes: [],
  },
  CLOTHING: {
    label: "Indumentaria / Ropa",
    attributes: [
      { name: "Talle", type: "SELECT", options: ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Único"], sortOrder: 0 },
      { name: "Color", type: "TEXT", sortOrder: 1 },
    ],
  },
  HARDWARE: {
    label: "Ferretería / Construcción",
    attributes: [
      { name: "Medida", type: "TEXT", sortOrder: 0 },
      { name: "Material", type: "SELECT", options: ["Acero", "Hierro", "Aluminio", "PVC", "Madera", "Plástico", "Cobre", "Bronce"], sortOrder: 1 },
      { name: "Color", type: "TEXT", sortOrder: 2 },
    ],
  },
  PAINT: {
    label: "Pinturería",
    attributes: [
      { name: "Color", type: "TEXT", sortOrder: 0 },
      { name: "Litros", type: "SELECT", options: ["0.25", "0.5", "1", "2", "4", "10", "20"], sortOrder: 1 },
      { name: "Acabado", type: "SELECT", options: ["Mate", "Satinado", "Brillante", "Semibrillante", "Texturado"], sortOrder: 2 },
    ],
  },
  PHARMACY: {
    label: "Farmacia / Salud",
    attributes: [
      { name: "Presentación", type: "SELECT", options: ["Comprimidos", "Jarabe", "Crema", "Inyectable", "Gotas", "Cápsulas", "Parche", "Spray"], sortOrder: 0 },
      { name: "Dosis", type: "TEXT", sortOrder: 1 },
      { name: "Laboratorio", type: "TEXT", sortOrder: 2 },
    ],
  },
  FOOD: {
    label: "Alimentos / Bebidas",
    attributes: [
      { name: "Peso/Volumen", type: "TEXT", sortOrder: 0 },
      { name: "Sabor", type: "TEXT", sortOrder: 1 },
    ],
  },
  STATIONERY: {
    label: "Librería / Papelería",
    attributes: [
      { name: "Color", type: "TEXT", sortOrder: 0 },
      { name: "Tamaño", type: "SELECT", options: ["A4", "A5", "A3", "Carta", "Oficio", "Cuarto"], sortOrder: 1 },
    ],
  },
  ELECTRONICS: {
    label: "Electrónica / Tecnología",
    attributes: [
      { name: "Capacidad/Modelo", type: "TEXT", sortOrder: 0 },
      { name: "Color", type: "TEXT", sortOrder: 1 },
    ],
  },
  FOOTWEAR: {
    label: "Calzado",
    attributes: [
      { name: "Número", type: "SELECT", options: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"], sortOrder: 0 },
      { name: "Color", type: "TEXT", sortOrder: 1 },
    ],
  },
  AUTOMOTIVE: {
    label: "Automotriz / Repuestos",
    attributes: [
      { name: "Marca Compatible", type: "TEXT", sortOrder: 0 },
      { name: "Medida", type: "TEXT", sortOrder: 1 },
    ],
  },
};
