# CUU05 — Emitir Partes Diarios de Labor

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU05` |
| Nombre | Emitir partes diarios de labor |
| Actor principal | admin/dueño |
| Actores secundarios | Operario a Campo (carga inicial), Operativo Administrativo |
| Módulo | Producción |
| Requerimiento(s) asociado(s) | R007, R008, R017 |
| Complejidad | Alta |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Emitir/aprobar los partes diarios de labor cargados por los operarios (incluso en modo offline), validando la información y disparando el descuento de stock de insumos.

## Disparador

Un operario carga un parte diario de labor desde el móvil (online u offline) y queda pendiente de aprobación.

## Precondiciones

- El operario debe tener permisos de carga de partes (R007).
- El parte debe incluir fecha, cliente, lote, hectáreas y tarea (R007).

## Flujo principal

_Flujo por desarrollar._

1. <!-- Pendiente de desarrollar -->

## Flujos alternativos

- CUU05 no define flujos alternativos en el documento original.

## Postcondiciones

- El parte se aprueba con la foto de respaldo verificada (R008).
- El sistema descuenta automáticamente el stock de insumos (R017).

## Reglas de negocio

- El parte diario puede cargarse en modo offline (R007).
- La aprobación de un parte descuenta stock de insumos (R017).

## Escenarios de prueba

_Flujo pendiente de validar con el cliente._