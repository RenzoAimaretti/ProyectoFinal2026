/**
 * Landing copy and demonstration data.
 *
 * Everything numeric or operational here is a labelled example. The product
 * behaviour is real; the ledger, figures, lots and module rows are not. Keep
 * that distinction explicit when replacing this file with production data.
 */

export type StampTone = "red" | "green" | "amber";

export const NAV = [
  { label: "Campaña", href: "#campania" },
  { label: "Recorrido", href: "#recorrido" },
  { label: "Módulos", href: "#modulos" },
  { label: "Campo", href: "#movil" },
  { label: "Consultas", href: "#consultas" },
] as const;

export const HERO_TITLE =
  "El almanaque de la campaña: cada labor del lote, trazada de la firma al cliente.";

export const HERO_WORDS = [
  "El",
  "almanaque",
  "de",
  "la",
  "campaña:",
  "cada",
  "labor",
  "del",
  "lote,",
  "trazada",
  "de",
  "la",
  "firma",
  "al",
  "cliente.",
];

export const HERO_LEDE =
  "Agro Trazabilidad reúne mapeo, producción, partes de trabajo, insumos, maquinaria, personal, ganadería y finanzas en una sola plataforma. El operario anota en el móvil aunque no haya señal, y el dato llega a la oficina y al cliente sin volver a tipearlo.";

export type TraceEntry = {
  date: string;
  stage: string;
  title: string;
  detail: string;
  stamp: string;
  tone: StampTone;
  rotate: number;
  delay: number;
  note?: string;
};

export const TRACE: TraceEntry[] = [
  {
    date: "06/10",
    stage: "Campo",
    title: "Parte diario PD-0001 · Pulverización",
    detail: "Lote 4 · Norte · 48,5 ha · 6,5 h",
    stamp: "Sin señal",
    tone: "red",
    rotate: -2.5,
    delay: 1550,
    note: "Anotado en el móvil sin conexión y guardado en el dispositivo.",
  },
  {
    date: "06/10",
    stage: "Oficina",
    title: "Revisión del parte y validación de insumos",
    detail: "Glifosato 66,2 % (L-2291) · Coadyuvante siliconado (L-2310)",
    stamp: "Aprobado",
    tone: "green",
    rotate: 1.8,
    delay: 1850,
  },
  {
    date: "07/10",
    stage: "Cliente",
    title: "Certificación disponible en el panel del productor",
    detail: "Auditoría de labores e insumos sobre sus lotes.",
    stamp: "CERT-2026-0042",
    tone: "green",
    rotate: -1.5,
    delay: 2150,
  },
];

export const TRACE_DATA = [
  { label: "Labor", value: "Pulverización" },
  { label: "Lote", value: "4 · Norte (Soja)" },
  { label: "Superficie", value: "48,5 ha" },
  { label: "Horas", value: "6,5 h" },
  { label: "Insumos", value: "2 · L-2291 · L-2310" },
  { label: "Certificado", value: "CERT-2026-0042" },
];

export const STATS = [
  { value: 12480, label: "Hectáreas trazadas" },
  { value: 3206, label: "Partes sincronizados" },
  { value: 214, label: "Lotes mapeados" },
  { value: 7, label: "Firmas en la plataforma" },
];

export const VALUE_PROPS = [
  {
    title: "Offline-first de verdad",
    text: "El operario carga en el lote sin señal y la app sincroniza sola al recuperar cobertura.",
  },
  {
    title: "Trazabilidad por lote",
    text: "Cada labor, insumo y parte queda atado al campo y al lote que lo generó.",
  },
  {
    title: "Varias firmas, datos aislados",
    text: "Cada razón social opera con sus datos separados y su propio alcance, sobre la misma plataforma.",
  },
  {
    title: "Datos para decidir y rendir",
    text: "Partes, recepciones y estado de insumos en tableros listos para rendir.",
  },
];

export type NarrativeStage = {
  stamp: string;
  tone: StampTone;
  rotate: number;
  note: string;
  timeline: string;
};

export const NARRATIVE_STAGES: NarrativeStage[] = [
  {
    stamp: "Sin señal",
    tone: "red",
    rotate: -3,
    note: "Anotado en el móvil sin conexión y guardado en el dispositivo.",
    timeline: "Campo · 06/10",
  },
  {
    stamp: "Aprobado",
    tone: "green",
    rotate: 2,
    note: "Revisado en la oficina. Insumos validados contra las recepciones.",
    timeline: "Oficina · 06/10",
  },
  {
    stamp: "CERT-2026-0042",
    tone: "green",
    rotate: -2,
    note: "Disponible en el panel de auditoría del productor.",
    timeline: "Cliente · 07/10",
  },
];

export const NARRATIVE_STEPS = [
  {
    stage: "Campo",
    title: "Cargar en el lote",
    text: "El operario registra el parte diario desde el móvil, con la foto del cuaderno, aunque esté sin señal.",
  },
  {
    stage: "Oficina",
    title: "Aprobar en la oficina",
    text: "El administrativo revisa cada parte en la bandeja, valida insumos y aprueba o rechaza con trazabilidad.",
  },
  {
    stage: "Cliente",
    title: "Auditar y rendir",
    text: "El productor sigue sus lotes y el dueño cierra finanzas y rentabilidad por firma con la información ya cargada.",
  },
];

export const NARRATIVE_FIELDS = [
  { label: "Cliente", value: "Productor Demo" },
  { label: "Campo", value: "La Esperanza" },
  { label: "Lote", value: "4 · Norte" },
  { label: "Labor", value: "Pulverización" },
  { label: "Hectáreas", value: "48,5 ha" },
  { label: "Horas", value: "6,5 h" },
];

export const NARRATIVE_INSUMOS = [
  { name: "Glifosato 66,2 %", code: "L-2291" },
  { name: "Coadyuvante siliconado", code: "L-2310" },
];

export type Lot = {
  id: string;
  number: string;
  name: string;
  points: string;
  cx: number;
  cy: number;
};

export const LOTS: Lot[] = [
  { id: "1", number: "1", name: "Loma", points: "20,22 150,18 156,104 24,112", cx: 88, cy: 62 },
  { id: "2", number: "2", name: "Bajo", points: "150,18 285,26 290,116 156,104", cx: 222, cy: 64 },
  { id: "3", number: "3", name: "Este", points: "285,26 400,20 398,108 290,116", cx: 343, cy: 66 },
  { id: "4", number: "4", name: "Norte", points: "24,112 156,104 152,256 22,250", cx: 89, cy: 176 },
  { id: "5", number: "5", name: "Aguada", points: "156,104 290,116 288,248 152,256", cx: 222, cy: 180 },
  { id: "6", number: "6", name: "Monte", points: "290,116 398,108 402,252 288,248", cx: 344, cy: 178 },
];

export const LOT_STATUS = [
  "Sin labor",
  "Barbecho",
  "Sembrado",
  "En cultivo",
  "Cosechado",
];

export type CampaignMonth = {
  short: string;
  title: string;
  text: string;
  statuses: number[];
};

export const CAMPAIGN_MONTHS: CampaignMonth[] = [
  {
    short: "Sep",
    title: "Septiembre · Barbecho",
    text: "Barbecho químico en tres lotes. Cada aplicación queda atada al lote que la recibió.",
    statuses: [1, 1, 0, 1, 0, 0],
  },
  {
    short: "Oct",
    title: "Octubre · Siembra",
    text: "Siembra y primeras pulverizaciones. El 06/10 se aplicó en el Lote 4 · Norte, con parte aprobado en la oficina.",
    statuses: [2, 2, 1, 2, 1, 0],
  },
  {
    short: "Nov",
    title: "Noviembre · Cultivo en desarrollo",
    text: "Más lotes en cultivo. Los insumos consumidos se validan contra las recepciones.",
    statuses: [3, 3, 2, 3, 2, 1],
  },
  {
    short: "Dic",
    title: "Diciembre · Seguimiento",
    text: "Cinco lotes en cultivo. El productor sigue las labores desde su panel.",
    statuses: [3, 3, 3, 3, 3, 2],
  },
  {
    short: "Ene",
    title: "Enero · Monitoreo",
    text: "Todos los lotes en cultivo, con aplicaciones y horas de maquinaria registradas.",
    statuses: [3, 3, 3, 3, 3, 3],
  },
  {
    short: "Feb",
    title: "Febrero · Última aplicación",
    text: "Cierre de aplicaciones. El consumo de combustible queda atado a cada labor.",
    statuses: [3, 3, 3, 3, 3, 3],
  },
  {
    short: "Mar",
    title: "Marzo · Cosecha",
    text: "Los lotes tempranos pasan a cosechado. Se registran rindes por lote.",
    statuses: [4, 3, 4, 3, 4, 3],
  },
  {
    short: "Abr",
    title: "Abril · Cierre de campaña",
    text: "Todos los lotes cosechados. Finanzas y rentabilidad por firma con la información ya cargada.",
    statuses: [4, 4, 4, 4, 4, 4],
  },
];

export const PHONE_POINTS = [
  {
    title: "Carga guiada",
    text: "Cliente, campo, lote y labor en listas desplegables para cargar rápido y sin errores.",
  },
  {
    title: "Foto del cuaderno",
    text: "Cada parte puede adjuntar la foto del respaldo físico como verificación.",
  },
  {
    title: "Estado de sincronización",
    text: "El operario ve siempre cuántos partes quedan pendientes de subir.",
  },
  {
    title: "RFID a futuro",
    text: "La lectura de caravanas electrónicas está prevista para el módulo ganadero.",
  },
];

export const PHONE_FIELDS = [
  { label: "Cliente", value: "Productor Demo" },
  { label: "Campo", value: "La Esperanza" },
] as const;

export const PHONE_TYPED_FIELDS = [
  { key: "lote", label: "Lote", value: "4 · Norte" },
  { key: "labor", label: "Labor", value: "Pulverización" },
  { key: "ha", label: "Hectáreas", value: "48,5 ha" },
  { key: "hs", label: "Horas", value: "6,5 h" },
] as const;

export const PHONE_ITEMS = [
  { code: "PD-0001", detail: "Pulverización · Lote 4" },
  { code: "PD-0002", detail: "Siembra · Lote 2" },
  { code: "PD-0003", detail: "Fertilización · Lote 5" },
];

export type ModuleRow = {
  label: string;
  value: string;
  pct?: number;
};

export type ProductModule = {
  id: string;
  name: string;
  description: string;
  previewTitle: string;
  kind: "map" | "rows";
  rows?: ModuleRow[];
  soon?: boolean;
};

export const MODULES: ProductModule[] = [
  {
    id: "campo",
    name: "Mi Campo & Mapeo",
    description:
      "Lotes y polígonos por estado, con color sobre el visor de la campaña.",
    previewTitle: "Visor de la campaña",
    kind: "map",
  },
  {
    id: "produccion",
    name: "Producción",
    description:
      "Tareas del día ordenadas por campo, lote y estado de avance.",
    previewTitle: "Tareas de hoy",
    kind: "rows",
    rows: [
      { label: "Lote 4 · Norte · Pulverización", value: "Completa", pct: 100 },
      { label: "Lote 2 · Bajo · Siembra", value: "En curso", pct: 64 },
      { label: "Lote 5 · Aguada · Fertilización", value: "Por iniciar", pct: 18 },
    ],
  },
  {
    id: "partes",
    name: "Partes de trabajo",
    description:
      "Bandeja de aprobación con la foto del cuaderno cargada desde el móvil.",
    previewTitle: "Bandeja de aprobación",
    kind: "rows",
    rows: [
      { label: "PD-0001 · Pulverización", value: "Aprobado" },
      { label: "PD-0002 · Siembra", value: "Pendiente de revisión" },
      { label: "PD-0003 · Fertilización", value: "Pendiente de revisión" },
    ],
  },
  {
    id: "insumos",
    name: "Insumos por cliente",
    description:
      "Ingresado, consumido y sobrante por cliente, con validación de recepciones.",
    previewTitle: "Productor Demo",
    kind: "rows",
    rows: [
      { label: "Glifosato 66,2 %", value: "940 de 1.200 l", pct: 78 },
      { label: "Coadyuvante siliconado", value: "120 de 300 l", pct: 40 },
      { label: "Semilla de soja", value: "512 de 800 bolsas", pct: 64 },
    ],
  },
  {
    id: "maquinaria",
    name: "Maquinaria & combustible",
    description:
      "Equipos y consumo de combustible atados a cada labor.",
    previewTitle: "Consumo por labor",
    kind: "rows",
    rows: [
      { label: "Pulverizadora · Lote 4", value: "212 l", pct: 70 },
      { label: "Tractor · Siembra Lote 2", value: "180 l", pct: 60 },
      { label: "Tractor · Fertilización Lote 5", value: "95 l", pct: 32 },
    ],
  },
  {
    id: "personal",
    name: "Gestión de personal",
    description:
      "Cuadrillas, roles y asignaciones por firma y por campo.",
    previewTitle: "Cuadrillas",
    kind: "rows",
    rows: [
      { label: "Cuadrilla Norte", value: "4 personas · La Esperanza" },
      { label: "Cuadrilla Siembra", value: "6 personas · 2 campos" },
      { label: "Técnicos", value: "2 ingenieros agrónomos" },
    ],
  },
  {
    id: "ganadero",
    name: "Ganadero de precisión",
    description:
      "Eventos sanitarios, pesajes y movimientos; lectura RFID en camino.",
    previewTitle: "Eventos del rodeo",
    kind: "rows",
    rows: [
      { label: "Vacunación · Rodeo 3", value: "148 animales" },
      { label: "Pesaje · Corral 2", value: "Promedio 412 kg", pct: 72 },
      { label: "Movimiento · Corral 2 a Potrero 5", value: "Registrado" },
    ],
  },
  {
    id: "finanzas",
    name: "Finanzas multi-firma",
    description: "Facturas, cheques y rentabilidad por razón social.",
    previewTitle: "Por razón social",
    kind: "rows",
    soon: true,
    rows: [
      { label: "Firma Norte S.A.", value: "Margen 18,4 %", pct: 62 },
      { label: "Firma Sur S.R.L.", value: "Margen 12,1 %", pct: 41 },
      { label: "Cheques a vencer", value: "7 este mes" },
    ],
  },
];

export const PRODUCT_CAPTURES = [
  { label: "Tablero", note: "Vista general de la campaña" },
  { label: "Mapa de lotes", note: "Estados por mes" },
  { label: "Bandeja de aprobación", note: "Partes pendientes" },
];

export const ROLES = [
  {
    access: "Consolidado",
    title: "Administrador / dueño",
    text: "Visión total de la operación: finanzas, asignación de tareas, aprobaciones y márgenes por firma.",
  },
  {
    access: "Oficina",
    title: "Operativo administrativo",
    text: "Carga rápida de facturas, recibos y remitos, con conciliación de comprobantes y cheques.",
  },
  {
    access: "Móvil",
    title: "Operario a campo",
    text: "Partes diarios, fotos de respaldo y consumo de combustible desde el móvil.",
  },
  {
    access: "Técnico",
    title: "Ingeniero agrónomo",
    text: "Recetas fitosanitarias, dosis por hectárea y planificación de rotaciones.",
  },
  {
    access: "Auditoría",
    title: "Cliente / productor",
    text: "Panel exclusivo de auditoría para seguir labores, insumos y certificaciones sobre sus lotes.",
  },
  {
    access: "Acceso",
    title: "Permisos por rol",
    text: "Cada perfil accede solo a los módulos y datos que le corresponden.",
  },
];

export const FAQ_ITEMS = [
  {
    q: "¿Cómo conviven varias firmas en la misma plataforma?",
    a: "Cada razón social opera con sus datos separados y su propio alcance, sobre la misma plataforma. El dueño ve el consolidado y cada firma ve solo lo suyo.",
  },
  {
    q: "¿Qué pasa si el operario carga un parte sin señal?",
    a: "La app guarda el parte en el dispositivo y lo sincroniza sola al recuperar cobertura. El operario ve en todo momento cuántos partes quedan pendientes.",
  },
  {
    q: "¿Quién ve la información de cada cliente?",
    a: "La oficina ve el conjunto según su rol. El productor entra a un panel de auditoría exclusivo, con las labores, insumos y certificaciones de sus lotes.",
  },
  {
    q: "¿Cómo se protege la información de cada productor?",
    a: "Los datos de cada razón social están aislados y cada perfil accede solo a los módulos y datos que le corresponden por rol.",
  },
  {
    q: "¿Qué módulos incluye la plataforma?",
    a: "Mi Campo & Mapeo, Producción, Partes de trabajo, Insumos por cliente, Maquinaria & combustible, Gestión de personal y Ganadero de precisión. Finanzas multi-firma está en preparación.",
  },
];

export type PlateSpec = {
  src: string;
  alt: string;
  index: string;
  caption: string;
  sizes: string;
};

export const PLATES: Record<"hero" | "map" | "close", PlateSpec> = {
  hero: {
    src: "/almanac/campania-lote-pulverizacion.jpg",
    alt: "Pulverizadora trabajando un lote de la campaña con las hileras del cultivo visibles.",
    index: "Placa 01",
    caption:
      "Pulverización en el Lote 4 · Norte. El parte se anota en el lote y viaja al tablero.",
    sizes: "(max-width: 1000px) 100vw, 40vw",
  },
  map: {
    src: "/almanac/labor-siembra.jpg",
    alt: "Tractor con sembradora abriendo surcos en un lote durante la siembra.",
    index: "Placa 02",
    caption:
      "Labor de siembra. La secuencia de la campaña se registra labor por labor.",
    sizes: "(max-width: 1000px) 100vw, 34vw",
  },
  close: {
    src: "/almanac/tranquera-atardecer.jpg",
    alt: "Tranquera de un establecimiento agropecuario al atardecer, con el campo de fondo.",
    index: "Placa 04",
    caption: "La tranquera. El cierre de la campaña, con el dato ya cargado.",
    sizes: "(max-width: 1000px) 100vw, 38vw",
  },
};

export const FOOTER_GROUPS = [
  {
    title: "Producto",
    links: [
      { label: "Campaña", href: "#campania" },
      { label: "Recorrido", href: "#recorrido" },
      { label: "Módulos", href: "#modulos" },
    ],
  },
  {
    title: "Acceso",
    links: [
      { label: "Ver el demo", href: "/demo" },
      { label: "Iniciar sesión", href: "/login" },
      { label: "Hablar por WhatsApp", href: "whatsapp" },
    ],
  },
  {
    title: "Módulos",
    links: [
      { label: "Mi Campo & Mapeo", href: "#modulos" },
      { label: "Producción", href: "#modulos" },
      { label: "Partes de trabajo", href: "#modulos" },
      { label: "Insumos por cliente", href: "#modulos" },
    ],
  },
];
