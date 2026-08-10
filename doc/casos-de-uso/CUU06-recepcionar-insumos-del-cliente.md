# CUU06 — Recepcionar Insumos del Cliente

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU06` |
| Nombre | Recepcionar insumos del cliente |
| Actor principal | Operario/admin |
| Actores secundarios | Cliente / Productor (entrega), Administrador (validación) |
| Módulo | Insumos |
| Requerimiento(s) asociado(s) | R014 |
| Complejidad | Media |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Registrar la cantidad de producto entregado por el cliente con fotografía de respaldo, notificar al administrador y validar la entrada para habilitar el stock.

## Disparador

El cliente entrega productos en el campo/lote.

## Precondiciones

- Debe existir un cliente con lote asociado (R014).

## Flujo principal

_Flujo por desarrollar._

1. <!-- Pendiente de desarrollar -->

## Flujos alternativos

- CUU06 no define flujos alternativos en el documento original.

## Postcondiciones

- Tras la validación del administrador, el stock se ingresa al sistema (R014).

## Reglas de negocio

- El registro debe incluir cantidad entregada y foto de los productos (R014).
- La entrada solo se habilita tras validación del administrador (R014).

## Escenarios de prueba

_Flujo pendiente de validar con el cliente._