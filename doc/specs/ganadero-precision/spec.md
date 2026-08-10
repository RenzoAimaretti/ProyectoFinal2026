# Spec: Ganadero de Precisión (RFID)

## Purpose

Gestión ganadera con identificación por radiofrecuencia: captura de caravanas electrónicas, historial clínico y sanitario individual, control de peso y ciclo reproductivo, y gestión de traslados/altas/bajas de hacienda.

## Requirements

### Requirement: R035 — Captura de caravana electrónica por RFID

El sistema DEBE permitir que la app móvil capture la caravana electrónica mediante receptores RFID para identificar automáticamente a cada animal sin margen de error humano.

#### Scenario: Lectura de caravana electrónica

- GIVEN un dispositivo móvil con lector RFID conectado (Bluetooth/USB)
- WHEN captura una caravana electrónica
- THEN el sistema identifica automáticamente al animal sin margen de error humano

### Requirement: R036 — Eventos sanitarios y vacunaciones por caravana

El sistema DEBE permitir que el usuario agregue eventos sanitarios y vacunaciones al historial clínico de la caravana leída para certificar la trazabilidad individual de la hacienda.

#### Scenario: Registro de evento sanitario

- GIVEN una caravana leída por RFID
- WHEN el usuario agrega un evento sanitario o vacunación
- THEN el sistema actualiza el historial clínico de la caravana

### Requirement: R037 — Peso y ciclo reproductivo

El sistema DEBE permitir que el usuario cargue el peso y ciclo reproductivo del animal para realizar el seguimiento del desarrollo biológico y ganancia de peso.

#### Scenario: Carga de peso del animal

- GIVEN un animal identificado por RFID
- WHEN el usuario carga el peso y ciclo reproductivo
- THEN el sistema registra los datos para el seguimiento de desarrollo y ganancia de peso

### Requirement: R038 — Traslados, altas y bajas de hacienda

El sistema DEBE permitir que el usuario registre los traslados de hacienda entre potreros y las altas/bajas para mantener actualizado el inventario del rodeo.

#### Scenario: Registro de traslado entre potreros

- GIVEN un animal identificado
- WHEN el usuario registra un traslado, alta o baja
- THEN el sistema actualiza el inventario del rodeo