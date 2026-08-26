# CUU03 — Cargar Receta Agronómica

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU03` |
| Nombre | Cargar receta agronómica |
| Actor principal | Ingeniero Agrónomo |
| Actores secundarios | Administrador / Dueño (destino de la instrucción) |
| Módulo | Producción |
| Requerimiento(s) asociado(s) | R009 |
| Complejidad | Media |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Registrar recetas agronómicas con dosis, volumen de caldo y orden de carga para instruir la preparación de productos al contratista.

## Disparador

El ingeniero agrónomo define una prescripción de aplicación para un lote/cultivo.

## Precondiciones

- El usuario debe contar con rol Ingeniero Agrónomo (R009).

## Flujo principal

_Flujo por desarrollar._

1. <!-- Pendiente de desarrollar -->

## Flujos alternativos

- CUU03 no define flujos alternativos en el documento original.

## Postcondiciones

- La receta queda disponible para instruir la preparación de productos al contratista (R009).

## Reglas de negocio

- La receta debe incluir dosis, volumen de caldo y orden de carga (R009).
- Puede gatillar alertas de re-aplicación / doble golpe (R010).

## Escenarios de prueba

_Flujo pendiente de validar con el cliente._