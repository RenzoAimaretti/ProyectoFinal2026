# Spec: Maquinaria & Combustible

## Purpose

Gestión de flota: registro de compras e ingreso de combustible con comprobantes, discriminación de costos por firma/razón social, y mantenimiento preventivo con historial de costos y alertas.

## Requirements

### Requirement: R018 — Registro de compra de combustible

El sistema DEBE permitir que el operario o administrativo registre la compra e ingreso de litros de combustible y comprobantes asociados para controlar el consumo durante la campaña.

#### Scenario: Registro de compra de combustible

- GIVEN un operario o administrativo
- WHEN registra la compra e ingreso de litros con comprobantes asociados
- THEN el sistema registra el combustible para control de consumo

### Requirement: R019 — Discriminación de costos de combustible por firma

El sistema DEBE asignar el gasto de combustible por firma o razón social para evitar la mezcla de costos entre unidades de negocio.

#### Scenario: Asignación de gasto por firma

- GIVEN un gasto de combustible registrado
- WHEN se asigna al gasto o razón social correspondiente
- THEN el sistema discrimina el costo evitando mezcla entre unidades de negocio

### Requirement: R020 — Registro de mantenimientos y reparaciones

El sistema DEBE permitir que el administrativo registre mantenimientos preventivos y reparaciones para llevar el historial de costos y repuestos por máquina.

#### Scenario: Registro de mantenimiento

- GIVEN un administrativo autenticado
- WHEN registra un mantenimiento preventivo o reparación con sus repuestos
- THEN el sistema actualiza el historial de costos y repuestos por máquina

### Requirement: R021 — Horas de uso y hectáreas acumuladas por máquina

El sistema DEBE sumar las horas de uso y hectáreas acumuladas por máquina para alertar sobre futuros mantenimientos preventivos.

#### Scenario: Alerta de mantenimiento preventivo

- GIVEN una máquina con horas de uso y hectáreas acumuladas
- WHEN se alcanza el umbral de mantenimiento preventivo
- THEN el sistema alerta sobre el mantenimiento preventivo correspondiente

> ⚠️ Pendiente: Definir umbrales de horas/hectáreas por tipo de máquina.