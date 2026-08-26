# Casos de Uso — Plataforma SaaS Agro-Trazabilidad

> Índice de casos de uso del sistema, migrado de `Casos de Uso.pdf` (fecha de relevamiento: 22/07/2025). Documento en construcción.

## Índice de casos de uso

| ID | Actor principal | Módulo | Nombre | Archivo |
|----|-----------------|--------|--------|---------|
| CUU00 | Todos los usuarios | Plataforma | Iniciar sesión | [CUU00-iniciar-sesion.md](./CUU00-iniciar-sesion.md) |
| CUU01 | Ingeniero Agrónomo | Mi Campo & Mapeo SIG | Registrar actividad en lote | [CUU01-registrar-actividad-en-lote.md](./CUU01-registrar-actividad-en-lote.md) |
| CUU02 | — | Mi Campo & Mapeo SIG | Delimitar polígono lote | [CUU02-delimitar-poligono-lote.md](./CUU02-delimitar-poligono-lote.md) |
| CUU03 | Ingeniero Agrónomo | Producción | Cargar receta agronómica | [CUU03-cargar-receta-agronomica.md](./CUU03-cargar-receta-agronomica.md) |
| CUU04 | Operario | Producción | Importar archivo de trabajo de maquinaria | [CUU04-importar-archivo-de-trabajo.md](./CUU04-importar-archivo-de-trabajo.md) |
| CUU05 | admin/dueño | Producción | Emitir partes diarios de labor | [CUU05-emitir-partes-diarios-de-labor.md](./CUU05-emitir-partes-diarios-de-labor.md) |
| CUU06 | Operario/admin | Insumos | Recepcionar insumos del cliente | [CUU06-recepcionar-insumos-del-cliente.md](./CUU06-recepcionar-insumos-del-cliente.md) |
| CUU07 | Operario/admin | Insumos | Controlar sobrantes y faltantes de insumos | [CUU07-controlar-sobrantes-y-faltantes.md](./CUU07-controlar-sobrantes-y-faltantes.md) |
| CUU08 | Operario | Maquinaria & Combustible | Registrar actividades sobre maquinaria | [CUU08-registrar-actividades-sobre-maquinaria.md](./CUU08-registrar-actividades-sobre-maquinaria.md) |
| CUU09 | Dueño | Finanzas & Administración | Registrar facturación/cobro de cliente | [CUU09-registrar-facturacion-cobro.md](./CUU09-registrar-facturacion-cobro.md) |
| CUU10 | Operario | Ganadero de Precisión | Registrar nuevo ganado | [CUU10-registrar-nuevo-ganado.md](./CUU10-registrar-nuevo-ganado.md) |
| CUU11 | Operario | Ganadero de Precisión | Registrar evento sanitario/vacunación | [CUU11-registrar-evento-sanitario.md](./CUU11-registrar-evento-sanitario.md) |
| CUU12 | Operario | Ganadero de Precisión | Registrar peso y ciclo reproductivo | [CUU12-registrar-peso-y-ciclo-reproductivo.md](./CUU12-registrar-peso-y-ciclo-reproductivo.md) |
| CUU13 | Operario | Ganadero de Precisión | Registrar traslado / alta / baja de hacienda | [CUU13-registrar-traslado-alta-baja.md](./CUU13-registrar-traslado-alta-baja.md) |

## Trazabilidad con requerimientos

| Caso de uso | Requerimiento(s) asociado(s) |
|-------------|------------------------------|
| CUU00 | — |
| CUU01 | R001, R002 |
| CUU02 | R001 |
| CUU03 | R009 |
| CUU04 | R012 |
| CUU05 | R007, R008, R017 |
| CUU06 | R014 |
| CUU07 | R015 |
| CUU08 | R018, R019, R020, R021 (ref. RF-MAQ-01/02/03 en PDF) |
| CUU09 | R026, R027, R028, R029, R030 |
| CUU10 | R035 (ref. RF-GAN-01 en PDF) |
| CUU11 | R036 (ref. RF-GAN-02 en PDF) |
| CUU12 | R037 (ref. RF-GAN-03 en PDF) |
| CUU13 | R038 (ref. RF-GAN-04 en PDF) |

> ⚠️ **Pendientes del documento original:**
> - **CUU02** no indica actor principal explícito en la tabla del PDF. Verificar con el cliente (posible herencia de CUU01: Ingeniero Agrónomo).
> - Los IDs `RF-MAQ-01/02/03` y `RF-GAN-01..04` presentes en el PDF como referencia de requerimientos no existen en la numeración `R0XX`. Confirmar si son la misma serie o referencias a otro artefacto.
> - Cada caso de uso se creó con la [plantilla estándar](./_plantilla-caso-de-uso.md); el flujo de cada uno está pendiente de desarrollo y validación con el cliente.

## Cómo usar

Cada caso de uso es un archivo independiente que sigue la [plantilla](./_plantilla-caso-de-uso.md) uniforme. Para crear uno nuevo, copiar `_plantilla-caso-de-uso.md`, renombrarlo con el prefijo `CUUXX-` y completar las secciones.