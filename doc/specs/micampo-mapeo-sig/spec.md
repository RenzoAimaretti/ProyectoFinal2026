# Spec: Mi Campo & Mapeo SIG

## Purpose

Gestión territorial: delimitación de polígonos geo-referenciados de lotes, historial productivo por lote, y datos meteorológicos de apoyo para la toma de decisiones de trabajo a campo.

## Requirements

### Requirement: R001 — Delimitar polígonos de lotes

El sistema DEBE permitir delimitar polígonos geo-referenciados de lotes para facilitar la gestión territorial y la asignación de tareas a campo.

#### Scenario: Delimitación de un lote

- GIVEN un usuario contratista o productor con acceso al módulo Mi Campo
- WHEN delimita un polígono geo-referenciado sobre un lote
- THEN el sistema almacena el polígono y lo asocia al lote para su gestión

> ⚠️ Pendiente: Definir método de captura/importación del polígono (dibujo en mapa, archivo, GPS).

### Requirement: R002 — Historial productivo y rotaciones por lote

El sistema DEBE permitir que el usuario (contratista o productor) visualice el historial productivo y las rotaciones de cultivo por lote para la toma de decisiones agronómicas.

#### Scenario: Consulta de historial del lote

- GIVEN un lote con historial productivo y rotaciones registradas
- WHEN el usuario consulta el lote
- THEN el sistema presenta el historial productivo y las rotaciones de cultivo del lote

### Requirement: R003 — Datos meteorológicos en tiempo real

El sistema DEBE presentar datos meteorológicos y pronósticos climáticos en tiempo real para planificar las jornadas laborales.

#### Scenario: Consulta de pronóstico

- GIVEN el sistema conectado a una fuente meteorológica
- WHEN el usuario consulta el clima
- THEN el sistema presenta datos actuales y pronóstico en tiempo real

### Requirement: R004 — Alertas de radar de lluvia

El sistema DEBE alertar al usuario sobre radares de lluvia activos para anticipar interrupciones por tormentas.

#### Scenario: Alerta por tormenta

- GIVEN un radar de lluvia activo sobre la zona de trabajo
- WHEN el sistema detecta la actividad
- THEN el sistema emite una alerta al usuario para anticipar la interrupción

### Requirement: R005 — Velocidad y dirección del viento (Windy)

El sistema DEBE permitir que el operario o contratista controle la velocidad y dirección del viento (en nudos/Windy) para validar las condiciones regulatorias antes de fumigar.

#### Scenario: Validación de condiciones antes de fumigar

- GIVEN un operario o contratista previo a una fumigación
- WHEN consulta la velocidad y dirección del viento en nudos/Windy
- THEN el sistema presenta la velocidad y dirección para validar condiciones regulatorias

### Requirement: R006 — Cotizaciones de dólar y pizarra de cereales

El sistema DEBE permitir que el usuario consulte las cotizaciones actualizadas del dólar oficial y la pizarra de cereales para la toma de decisiones comerciales.

#### Scenario: Consulta de cotizaciones

- GIVEN el sistema con cotizaciones actualizadas
- WHEN el usuario consulta el dólar oficial y la pizarra de cereales
- THEN el sistema presenta las cotizaciones vigentes

> ⚠️ Pendiente: En el PDF no existen requerimientos R016 ni R040+; la numeración pasa de R015 a R017 en Insumos (ver `specs/insumos/spec.md`). Verificar si hubo renumeración.