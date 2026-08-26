# Documentación del Sistema — Plataforma SaaS Agro-Trazabilidad

> **Single Source of Truth de la documentación del proyecto.**
> Base de trabajo sobre la documentación original (PDF) migrada a Markdown. Esta documentación **no es la versión final**: se va a trabajar y evolucionar sobre ella.

## Origen de esta documentación

La documentación fue migrada desde los siguientes documentos PDF de referencia:

| Documento fuente | Ubicación | Descripción |
|------------------|-----------|-------------|
| `Documento Único de Visión y Requerimientos del Sistema.pdf` | `doc/` | Visión del negocio, alcance, arquitectura y requerimientos funcionales (R001-R038) |
| `Casos de Uso.pdf` | `doc/` | Índice de casos de uso del sistema (CUU00-CUU13) |

**Regla de oro:** Todo lo referido a negocio y dominio proviene exclusivamente de estos PDFs. No se inventó contenido. Las secciones incompletas o con dudas del PDF se marcaron explícitamente como *pendientes de resolver*.

## Estructura de la documentación

```
doc/
├── README.md                        <- Este índice
├── vision.md                        <- Visión general del negocio (SaaS, roles, módulos)
├── specs/                           <- Specs por dominio de negocio (formato SDD)
│   ├── micampo-mapeo-sig/spec.md
│   ├── produccion/spec.md
│   ├── insumos/spec.md
│   ├── maquinaria-combustible/spec.md
│   ├── gestion-personal/spec.md
│   ├── finanzas-administracion/spec.md
│   └── ganadero-precision/spec.md
└── casos-de-uso/
    ├── README.md                    <- Índice de casos de uso
    ├── _plantilla-caso-de-uso.md    <- Plantilla en blanco para nuevos casos de uso
    ├── CUU00-iniciar-sesion.md
    ├── CUU01-registrar-actividad-en-lote.md
    ├── CUU02-delimitar-poligono-lote.md
    ├── CUU03-cargar-receta-agronomica.md
    ├── CUU04-importar-archivo-de-trabajo.md
    ├── CUU05-emitir-partes-diarios-de-labor.md
    ├── CUU06-recepcionar-insumos-del-cliente.md
    ├── CUU07-controlar-sobrantes-y-faltantes.md
    ├── CUU08-registrar-actividades-sobre-maquinaria.md
    ├── CUU09-registrar-facturacion-cobro.md
    ├── CUU10-registrar-nuevo-ganado.md
    ├── CUU11-registrar-evento-sanitario.md
    ├── CUU12-registrar-peso-y-ciclo-reproductivo.md
    └── CUU13-registrar-traslado-alta-baja.md
```

## Mapa de módulos ↔ specs ↔ casos de uso

| # | Módulo del sistema | Spec | Casos de uso |
|---|--------------------|------|--------------|
| 1 | Mi Campo & Mapeo SIG | `specs/micampo-mapeo-sig/` | CUU01, CUU02 |
| 2 | Producción (Siembra, Aplicaciones, Cosecha) | `specs/produccion/` | CUU03, CUU04, CUU05 |
| 3 | Insumos y Recepción de Stock | `specs/insumos/` | CUU06, CUU07 |
| 4 | Maquinaria & Combustible | `specs/maquinaria-combustible/` | CUU08 |
| 5 | Gestión de Personal | `specs/gestion-personal/` | — |
| 6 | Finanzas & Administración | `specs/finanzas-administracion/` | CUU09 |
| 7 | Ganadero de Precisión (RFID) | `specs/ganadero-precision/` | CUU10-CUU13 |
| — | Autenticación / Plataforma | — | CUU00 |

## Convenciones de trabajo

- Los **specs por dominio** siguen el formato SDD: propósito, requerimientos con keywords RFC 2119, y escenarios Given/When/Then cuando corresponda.
- Los **casos de uso** usan la plantilla `_plantilla-caso-de-uso.md` con una estructura uniforme (actores, disparador, precondiciones, flujo principal, postcondiciones, reglas de negocio).
- Los **requerimientos** se codificaron como `R0XX` (funcionales) tal como vienen del PDF original.
- Los **casos de uso** se codificaron como `CUU0X` o `CUUXX` tal como vienen del PDF original.
- Las dudas e inconsistencias del PDF original se preservaron con la marca `> ⚠️ Pendiente:` para resolución futura.