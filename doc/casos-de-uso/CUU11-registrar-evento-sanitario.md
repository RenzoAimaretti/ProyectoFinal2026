# CUU11 — Registrar Evento Sanitario / Vacunación

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU11` |
| Nombre | Registrar evento sanitario/vacunación |
| Actor principal | Operario |
| Actores secundarios | Ingeniero Agrónomo / Veterinario (posible) |
| Módulo | Ganadero de Precisión |
| Requerimiento(s) asociado(s) | R036 (referencia del PDF: RF-GAN-02) |
| Complejidad | Media |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Agregar eventos sanitarios y vacunaciones al historial clínico de la caravana leída, certificando la trazabilidad individual de la hacienda.

## Disparador

Ocurre un evento sanitario o una vacunación sobre un animal identificado.

## Precondiciones

- El animal debe haber sido identificado mediante lectura RFID (R035).

## Flujo principal

_Flujo por desarrollar._

1. <!-- Pendiente de desarrollar -->

## Flujos alternativos

- CUU11 no define flujos alternativos en el documento original.

## Postcondiciones

- El evento sanitario/vacunación queda registrado en el historial clínico de la caravana (R036).

## Reglas de negocio

- El evento se agrega al historial clínico de la caravana leída (R036).
- La certificación de trazabilidad individual depende del historial completo (R036).

## Escenarios de prueba

_Flujo pendiente de validar con el cliente._

> ⚠️ **Pendiente (documento original):** La referencia RF-GAN-02 figura en el PDF junto a CUU11 pero no existe en la numeración R0XX. Confirmar la correspondencia con R036.