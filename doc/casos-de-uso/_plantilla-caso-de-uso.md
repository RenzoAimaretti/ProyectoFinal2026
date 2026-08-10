# Plantilla de Caso de Uso

> Copiar este archivo, renombrarlo como `CUUXX-<nombre-slug>.md` y completar las secciones. Eliminar las líneas de comentario (con `<!--`) antes de guardar.

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUUXX` |
| Nombre | <Nombre del caso de uso> |
| Actor principal | <Actor que inicia el caso de uso> |
| Actores secundarios | <Actores que participan sin iniciar> |
| Rol(es) de la app | <Roles del sistema que acceden> |
| Módulo | <Módulo del sistema> |
| Requerimiento(s) asociado(s) | <IDs R0XX de las specs> |
| Complejidad | <Alta / Media / Baja> |
| Prioridad | <Alta / Media / Baja> |
| Estado | <Borrador / Validado con cliente / Implementado> |

## Propósito

<!-- ¿Qué valor aporta este caso de uso al negocio? Descripción breve. -->

## Disparador

<!-- Evento o acción que inicia el caso de uso. -->

## Precondiciones

- <!-- Condiciones que deben cumplirse antes de iniciar. -->

## Flujo principal

1. <!-- Paso 1: el actor realiza... -->
2. <!-- Paso 2: el sistema ... -->

## Flujos alternativos

### <A1: Nombre del flujo alternativo>

<!-- En qué condición se activa y qué pasos sigue. -->

## Postcondiciones

- <!-- Estado del sistema al terminar el caso de uso (éxito). -->
- <!-- Estado en caso de excepción. -->

## Reglas de negocio

- <!-- Regla o validación de negocio (puede referenciar R0XX). -->

## Escenarios de prueba

<!-- Escenarios operativos Given/When/Then derivados de este caso de uso. Uno por escenario. -->

### Escenario: <Nombre>

- GIVEN <precondición>
- WHEN <acción>
- THEN <resultado esperado>

## Pendientes

- [ ] <!-- Dudas del documento original o a validar con el cliente, si las hay. -->