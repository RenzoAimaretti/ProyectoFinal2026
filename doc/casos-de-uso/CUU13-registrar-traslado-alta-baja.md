# CUU13 — Registrar Traslado / Alta / Baja de Hacienda

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU13` |
| Nombre | Registrar traslado / alta / baja de hacienda |
| Actor principal | Operario |
| Actores secundarios | Administrador / Dueño |
| Módulo | Ganadero de Precisión |
| Requerimiento(s) asociado(s) | R038 (referencia del PDF: RF-GAN-04) |
| Complejidad | Media |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Registrar traslados de hacienda entre potreros y las altas/bajas de animales para mantener actualizado el inventario del rodeo.

## Disparador

Un animal cambia de potrero, ingresa al rodeo (alta) o egresa (baja).

## Precondiciones

- El animal debe haber sido identificado mediante lectura RFID (R035).

## Flujo principal

_Flujo por desarrollar._

1. <!-- Pendiente de desarrollar -->

## Flujos alternativos

- CUU13 no define flujos alternativos en el documento original.

## Postcondiciones

- El inventario del rodeo queda actualizado (R038).

## Reglas de negocio

- Traslados, altas y bajas mantienen actualizado el inventario del rodeo (R038).

## Escenarios de prueba

_Flujo pendiente de validar con el cliente._

> ⚠️ **Pendiente (documento original):** La referencia RF-GAN-04 figura en el PDF junto a CUU13 pero no existe en la numeración R0XX. Confirmar la correspondencia con R038.