# Spec: Insumos y Recepción de Stock

## Purpose

Gestión de insumos por cliente: registro de la cantidad de producto entregado por el cliente con fotografía, notificación y validación por el administrador, control de sobrantes/faltantes y descuento automático de stock al aprobar partes diarios.

## Requirements

### Requirement: R014 — Registro de ingreso de insumos por cliente con foto

El sistema DEBE permitir que el cliente ingrese cuánto producto dejó, junto con foto de los productos, en el sistema y notificar al administrador para que valide la entrada y se ingrese el stock.

#### Scenario: Registro de producto del cliente

- GIVEN un cliente que entrega producto en el campo
- WHEN el cliente registra la cantidad dejada con foto de los productos
- THEN el sistema notifica al administrador para que valide la entrada
- AND el sistema ingresa el stock tras la validación

### Requirement: R015 — Control de sobrantes y faltantes

El sistema DEBE comparar el consumo teórico contra el insumo consumido real para identificar y alertar sobre sobrantes o faltantes por cliente.

#### Scenario: Detección de sobrante/faltante

- GIVEN insumos ingresados y consumos registrados
- WHEN el sistema compara consumo teórico contra consumo real por cliente
- THEN el sistema alerta sobre sobrantes o faltantes identificados

### Requirement: R017 — Descuento automático de stock por parte aprobado

El sistema DEBE reducir automáticamente el stock de insumos tras la aprobación de cada parte diario para mantener el inventario actualizado.

#### Scenario: Descuento de stock tras aprobación

- GIVEN un parte diario aprobado que consume insumos
- WHEN el parte es aprobado
- THEN el sistema descuenta el stock de insumos automáticamente

> ⚠️ Pendiente: El documento original no define el requerimiento **R016** (salta de R015 a R017). Puede tratarse de un ID eliminado o renumerado. Confirmar con el cliente.