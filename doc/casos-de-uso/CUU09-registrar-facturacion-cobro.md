# CUU09 — Registrar Facturación / Cobro de Cliente

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU09` |
| Nombre | Registrar facturación/cobro de cliente |
| Actor principal | Dueño |
| Actores secundarios | Operativo Administrativo / Data Entry, Cliente |
| Módulo | Finanzas & Administración |
| Requerimiento(s) asociado(s) | R026, R027, R028, R029, R030 |
| Complejidad | Alta |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Registrar la facturación y cobros de los clientes, clasificando ingresos (facturados/informales), asociando la cotización del dólar del día y controlando cheques físicos/eCheqs.

## Disparador

Se presta un servicio a un cliente y se genera la factura/cobro asociado.

## Precondiciones

- Deben existir tareas de un cliente vinculadas a las labores realizadas (R026).
- Debe existir la cotización del dólar Banco Nación del día (R030).

## Flujo principal

_Flujo por desarrollar._

1. <!-- Pendiente de desarrollar -->

## Flujos alternativos

- CUU09 no define flujos alternativos en el documento original.

## Postcondiciones

- La factura queda registrada para el control contable del servicio (R026).
- El cobro queda clasificado (facturado/informal) con su valor real en pesos (R027, R030).
- Los cheques físicos/eCheqs quedan controlados (R028, R029).

## Reglas de negocio

- Los cobros e ingresos se clasifican en facturados e informales (R027).
- El valor de los servicios se calcula con la cotización del dólar del día (R030).

## Escenarios de prueba

_Flujo pendiente de validar con el cliente._

> ⚠️ **Pendiente (documento original):** El PDF anota "(este no iría. Preguntar bien)" junto a R029 (eCheqs). Confirmar alcance con el cliente.