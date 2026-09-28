export const APP_KEYS = ["linia-temps", "definicions"] as const;
export type AppKey = (typeof APP_KEYS)[number];

export const APP_LABELS: Record<AppKey, string> = {
  "linia-temps": "Línia del temps",
  definicions: "Definicions de tecnologia",
};

export const APP_STATUSES = [
  "OCULT",
  "EDITABLE",
  "EDITAR_TECNOLOGIES",
  "EDITAR_METODOLOGIES",
  "CONSULTA",
] as const;
export type AppStatus = (typeof APP_STATUSES)[number];

export const APP_STATUS_LABELS: Record<AppStatus, string> = {
  OCULT: "Ocult",
  EDITABLE: "Visible per editar",
  EDITAR_TECNOLOGIES: "Editar tecnologies",
  EDITAR_METODOLOGIES: "Editar metodologies",
  CONSULTA: "Visible per consultar",
};

// La línia de temps separa l'edició en dues fases (tecnologies i
// metodologies SAMR/STEEP); definicions manté un únic estat editable.
export const APP_STATUS_OPTIONS: Record<AppKey, readonly AppStatus[]> = {
  "linia-temps": ["OCULT", "EDITAR_TECNOLOGIES", "EDITAR_METODOLOGIES", "CONSULTA"],
  definicions: ["OCULT", "EDITABLE", "CONSULTA"],
};

export const DEFAULT_APP_STATUS: Record<AppKey, AppStatus> = {
  "linia-temps": "EDITAR_TECNOLOGIES",
  definicions: "EDITABLE",
};

// Missatge orientat a l'alumnat que explica, en llenguatge planer, què pot
// fer ara mateix a la línia del temps (diferent de l'etiqueta tècnica que
// veu el professor al desplegable d'administració).
export const LINIA_TEMPS_PHASE_MESSAGES: Partial<Record<AppStatus, string>> = {
  EDITAR_TECNOLOGIES:
    "El que se us demana ara és que afegiu tecnologies a la línia del temps.",
  EDITAR_METODOLOGIES:
    "El que se us demana ara és que apliqueu les metodologies SAMR i STEEP a les tecnologies que veieu.",
  CONSULTA:
    "L'activitat ha finalitzat: el que se us demana ara és que consulteu la línia del temps i les anàlisis de la classe.",
};
