/* Datos compartidos entre la pantalla de pago (cliente) y /api/pay (servidor) */
export type Method = "card" | "pse" | "nequi";

export const PSE_BANKS = [
  "Banco que aprueba (pruebas)",
  "Banco que rechaza (pruebas)",
  "Bancolombia",
  "Banco de Bogotá",
  "Davivienda",
  "BBVA Colombia",
  "Banco de Occidente",
  "Banco Popular",
  "Banco AV Villas",
  "Banco Caja Social",
  "Scotiabank Colpatria",
  "Banco Agrario de Colombia",
  "Banco Falabella",
  "Banco Pichincha",
  "Itaú",
];
export const PSE_DECLINE_BANK = "Banco que rechaza (pruebas)";

export const PERSON_TYPES = ["Natural", "Jurídica"] as const;
export const DOC_TYPES = ["CC", "CE", "NIT", "Pasaporte"] as const;

// Números de prueba de Nequi (solo demo)
export const NEQUI_OK = "3991111111";
export const NEQUI_DECLINED = "3992222222";