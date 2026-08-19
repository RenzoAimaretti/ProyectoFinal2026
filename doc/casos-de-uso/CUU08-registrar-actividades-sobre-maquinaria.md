# CUU08 — Registrar Actividades sobre Maquinaria

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU08` |
| Nombre | Registrar actividades sobre maquinaria |
| Actor principal | Operario |
| Actores secundarios | Administrador / Operativo Adminis
| Rol(es) de la app | Operario / Administrador / Operativo Administrativo |
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
- El usuario tiene rol Operario, Administrador u Operativo Administrativo, está registrado y su sesión está activa.

## Flujo principal

1. El usuario selecciona la máquina y el tipo de actividad a registrar. El sistema muestra el formulario con los campos correspondientes al tipo de actividad seleccionada.
3. El usuario completa los datos de la actividad realizada sobre la máquina.

<!-- Por mas que cumpla el formato es redundante poner que se hace en una misma accion con diferentes inputs, va directo a diccionario de datos --> 
<!-- 
4. Si la actividad corresponde a combustible, el usuario informa litros, comprobante y firma/razón social asociada (R018, R019).
5. Si la actividad corresponde a mantenimiento o reparación, el usuario informa costos y repuestos asociados (R020).
6. Si la actividad corresponde a uso en campo, el usuario informa horas de uso y hectáreas trabajadas (R021).
 -->
7. El sistema registra la actividad, actualiza el historial de la máquina y recalcula sus indicadores de uso.

## Flujos alternativos

### A1: Alerta de mantenimiento preventivo

1. Luego de registrar la actividad, el sistema detecta que la máquina alcanzó un umbral de mantenimiento preventivo según sus horas de uso o hectáreas acumuladas.
2. El sistema notifica al usuario que corresponde revisar o planificar el mantenimiento preventivo. Fin del caso de uso.

## Postcondiciones

- Se actualiza el historial de la máquina (costos, repuestos, horas, hectáreas) (R020, R021).
- Los gastos de combustible quedan discriminados por firma/razón social (R019).

## Reglas de negocio

- El gasto de combustible se asigna por firma o razón social (R019).
- Las horas de uso y hectáreas acumuladas alimentan alertas de mantenimiento preventivo (R021).

## Escenarios de prueba

### Escenario: Registrar compra de combustible

- GIVEN un operario o administrativo autenticado y una máquina registrada
- WHEN registra la compra o ingreso de litros con comprobante y firma/razón social asociada
- THEN el sistema registra el combustible y discrimina el costo por firma/razón social

### Escenario: Registrar mantenimiento o reparación

- GIVEN un administrativo autenticado y una máquina registrada
- WHEN registra un mantenimiento preventivo o reparación con sus costos y repuestos
- THEN el sistema actualiza el historial de costos y repuestos de la máquina

### Escenario: Alertar mantenimiento preventivo por uso acumulado

- GIVEN una máquina con horas de uso y hectáreas acumuladas
- WHEN una actividad registrada alcanza el umbral de mantenimiento preventivo
- THEN el sistema alerta al usuario sobre el mantenimiento preventivo correspondiente

## Pendientes

- [ ] Confirmar la correspondencia entre la referencia RF-MAQ-01/02/03 del PDF y los requerimientos R018-R021.
- [ ] Definir umbrales de horas/hectáreas por tipo de máquina para las alertas de mantenimiento preventivo.