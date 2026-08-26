# CUU07 — Controlar Sobrantes y Faltantes de Insumos

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU07` |
| Nombre | Controlar sobrantes y faltantes de insumos |
| Actor principal | Operario/admin |
| Actores secundarios | Administrador / Dueño, Cliente / Productor (auditor) |
| Rol(es) de la app | Administrador / Dueño (web), Cliente / Productor (dashboard auditor) |
| Módulo | Insumos y Recepción de Stock |
| Requerimiento(s) asociado(s) | R015 (referencia: R009, R014, R017) |
| Complejidad | Media |
| Prioridad | Alta |
| Estado | Revisado |

## Propósito

Comparar, por cliente y por insumo, el stock ingresado contra el consumo real, y el consumo teórico contra el consumo real, para identificar y alertar sobre sobrantes o faltantes de insumos al completar un lote o cerrar una campaña, manteniendo la trazabilidad para la auditoría del cliente.

## Disparador

Se completa un lote o se cierra una campaña (verificación automática), o el administrador consulta el reporte bajo demanda.

## Precondiciones

- Deben existir recepciones validadas de insumos (CUU06 / R014) y partes aprobados con consumos registrados (CUU05 / R017) para el cliente.
- Los lotes trabajados deben contar con una receta agronómica (R009) para el cálculo del consumo teórico.
- El usuario esta registrado con el rol correspondiente.

## Flujo principal

1. Se inicia una verificación: automáticamente al completar un lote o cerrar una campaña, o bajo demanda desde el reporte interactivo.
2. El sistema agrupa por cliente (y firma) y por insumo los datos:
   - **Stock ingresado** = suma de cantidades de las recepciones validadas (CUU06 / R014).
   - **Consumo real** = suma de cantidades cargadas en los partes aprobados (CUU05 / R017).
   - **Consumo teórico** = suma de (dosis de la receta del insumo × hectáreas de los partes) (R009).
3. El sistema presenta la tabla `Cliente → Producto → Ingresado vs. Consumido vs. Sobrante`.
4. Calcula el sobrante o faltante de stock físico: stock ingresado − consumo real.
   - Sobrante: ingresado > consumo real (queda producto sin usar).
   - Faltante: consumo real > ingresado (se consumió más de lo entregado).
5. Calcula el desvío de aplicación: consumo real vs. consumo teórico (alerta de eficiencia).
6. Si existe sobrante o faltante (sin umbral de tolerancia), el sistema emite la alerta a administrador/dueño y al cliente auditor.

## Flujos alternativos

### A1: Lote o insumo sin receta agronómica

1. Un lote o insumo no tiene receta cargada (R009).
2. El sistema no puede calcular el consumo teórico para ese ítem.
3. El sistema marca el ítem en el reporte y calcula únicamente el stock físico (ingresado vs. consumido real) para ese caso.

### A2: Consulta bajo demanda

1. El administrador/dueño abre el reporte interactivo de insumos por cliente.
2. Filtra por cliente, firma, producto y/o campaña.
3. El sistema presenta la tabla y los cálculos de sobrantes/faltantes y desvíos para la selección, en línea con el flujo principal.

## Postcondiciones

- **Éxito:** el reporte presenta sobrantes, faltantes y desvíos por cliente e insumo, y las alertas correspondientes se emitieron a administrador/dueño y cliente auditor.
- **Excepción (sin receta):** el ítem queda marcado sin consumo teórico; el stock físico se informa igualmente.

## Reglas de negocio

- El consumo teórico se calcula a partir de la receta agronómica: dosis por insumo × hectáreas reportadas en los partes aprobados (R009).
- El consumo real se toma de las cantidades cargadas manualmente en los partes aprobados (R017).
- El stock ingresado se toma de las recepciones validadas (R014).
- El sobrante/faltante de stock físico se calcula como ingresado − consumo real (R015).
- El desvío de aplicación se calcula comparando consumo real contra consumo teórico (R015).
- Las alertas se emiten sin umbral de tolerancia: cualquier sobrante o faltante dispara el aviso a administrador/dueño y al cliente auditor.
- La verificación se ejecuta automáticamente al completar un lote o cerrar una campaña (R015).
- Todo lote que se vaya a trabajar requiere receta agronómica previa (R009). [Regla transversal del negocio]

## Escenarios de prueba

### Escenario: Detección de sobrante

- GIVEN un cliente con stock ingresado mayor al consumo real registrado
- WHEN se ejecuta la verificación
- THEN el sistema alerta sobre el sobrante por producto y cliente

### Escenario: Detección de faltante

- GIVEN un cliente con consumo real mayor al stock ingresado
- WHEN se ejecuta la verificación
- THEN el sistema alerta sobre el faltante por producto y cliente

### Escenario: Desvío de aplicación (eficiencia)

- GIVEN un insumo cuyo consumo real difiere del consumo teórico según la receta
- WHEN se ejecuta la verificación
- THEN el sistema alerta sobre el desvío de aplicación

### Escenario: Verificación automática al cierre

- GIVEN un lote completado o una campaña cerrada
- WHEN el sistema ejecuta la verificación automáticamente
- THEN el sistema genera el reporte de sobrantes/faltantes por cliente y emite las alertas correspondientes

## Pendientes

- [ ] Definir la acción de negocio posterior a la alerta de sobrante/faltante (actualmente solo aviso; evaluar bloqueos o ajustes de stock).
- [ ] Confirmar si los sobrantes se arrastran a la próxima campaña o se cierran al finalizar la campaña.
- [ ] Confirmar el canal de la alerta (in-app asumido; confirmar email/push).