# CUU02 — Delimitar Polígono de Lote

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU02` |
| Nombre | Delimitar polígono lote |
| Actor principal | Sin indicar en el documento original (posible herencia: Ingeniero Agrónomo) |
| Actores secundarios | Administrador / Dueño |
| Módulo | Mi Campo & Mapeo SIG |
| Requerimiento(s) asociado(s) | R001 |
| Complejidad | Media |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Delimitar el polígono geo-referenciado de un lote para habilitar su gestión territorial y la asignación de tareas.

## Disparador

Se crea un nuevo lote o se ajusta la delimitación de uno existente.

## Precondiciones

- El usuario debe tener permiso de delimitación en el módulo Mi Campo & Mapeo SIG.

## Flujo principal

_Flujo por desarrollar. Definir método de captura/importación del polígono (dibujo en mapa, GPS, archivo)._

1. <!-- Pendiente de desarrollar -->

## Flujos alternativos

- CUU02 no define flujos alternativos en el documento original.

## Postcondiciones

- El lote queda delimitado y disponible para asignación de tareas (R001).

## Reglas de negocio

- El polígono debe ser geo-referenciado (R001).

## Escenarios de prueba

_Flujo pendiente de validar con el cliente._

> ⚠️ **Pendiente (documento original):** El PDF no indica el actor principal de CUU02. Confirmar con el cliente si es Ingeniero Agrónomo (herencia de CUU01) u otro rol.