# CUU08 — Registrar Actividades sobre Maquinaria

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU08` |
| Nombre | Registrar actividades sobre maquinaria |
| Actor principal | Operario |
| Actores secundarios | Administrador / Operativo Administrativo |
| Módulo | Maquinaria & Combustible |
| Requerimiento(s) asociado(s) | R018, R019, R020, R021 (referencia del PDF: RF-MAQ-01/02/03) |
| Complejidad | Alta |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Registrar las actividades sobre maquinaria: consumo/compra de combustible, mantenimientos preventivos, reparaciones y uso (horas/hectáreas) por máquina, discriminando costos por firma o razón social.

## Disparador

Ocurre una actividad de maquinaria (carga de combustible, mantenimiento, reparación o uso en campo).

## Precondiciones

- Debe existir la máquina registrada y la firma/razón social asignada.

## Flujo principal

_Flujo por desarrollar._

1. <!-- Pendiente de desarrollar -->

## Flujos alternativos

- CUU08 no define flujos alternativos en el documento original.

## Postcondiciones

- Se actualiza el historial de la máquina (costos, repuestos, horas, hectáreas) (R020, R021).
- Los gastos de combustible quedan discriminados por firma/razón social (R019).

## Reglas de negocio

- El gasto de combustible se asigna por firma o razón social (R019).
- Las horas de uso y hectáreas acumuladas alimentan alertas de mantenimiento preventivo (R021).

## Escenarios de prueba

_Flujo pendiente de validar con el cliente._

> ⚠️ **Pendiente (documento original):** La referencia RF-MAQ-01/02/03 figura en el PDF junto a CUU08 pero no existe en la numeración R0XX. Confirmar la correspondencia con los requerimientos R018-R021.