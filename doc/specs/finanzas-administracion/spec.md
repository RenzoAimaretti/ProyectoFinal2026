# Spec: Finanzas & Administración

## Purpose

Gestión financiera multi-firma: facturación, cobros (facturados e informales), control de cheques físicos y electrónicos (eCheqs), cotización en dólar y "kilos de cereal", rentabilidad por lote/campaña, contabilidad aislada por razón social y exportación a sistemas contables.

## Requirements

### Requirement: R026 — Emisión e ingreso de facturas por cliente

El sistema DEBE permitir que el administrativo emita e ingrese las facturas vinculadas a las tareas de cada cliente para llevar el control contable de los servicios prestados.

#### Scenario: Registro de factura

- GIVEN un administrativo autenticado
- WHEN emite e ingresa una factura vinculada a tareas de un cliente
- THEN el sistema registra la factura para el control contable

### Requirement: R027 — Clasificación de cobros en facturados e informales

El sistema DEBE diferenciar que el administrativo clasifique los cobros e ingresos en facturados e informales para mantener una contabilidad financiera real y ordenada.

#### Scenario: Clasificación de un cobro

- GIVEN un cobro o ingreso recibido
- WHEN el administrativo lo clasifica como facturado o informal
- THEN el sistema lo registra en su categoría correspondiente

### Requirement: R028 — Control de cheques físicos

El sistema DEBE permitir que el administrativo cargue y controle el flujo de cheques físicos (número, vencimiento, emisor) para evitar la pérdida o el traspaso involuntario de valores.

#### Scenario: Alta de cheque físico

- GIVEN un cheque físico recibido
- WHEN el administrativo lo carga con número, vencimiento y emisor
- THEN el sistema controla el flujo y alerta eventos del mismo

### Requirement: R029 — Conciliación de cheques electrónicos (eCheqs)

El sistema DEBE permitir que el administrativo gestione y concilie cheques electrónicos (eCheqs) para evitar omisiones en las fechas de acreditación o débito.

> ⚠️ **Pendiente:** El documento original anota "(este no iría. Preguntar bien)". Confirmar con el cliente si eCheqs quedan en el alcance.

#### Scenario: Conciliación de eCheq

- GIVEN un eCheq emitido o recibido
- WHEN el administrativo gestiona su conciliación
- THEN el sistema evita omisiones en fechas de acreditación o débito

### Requirement: R030 — Cotización del dólar del día en operaciones

El sistema DEBE aplicar la cotización del dólar (Banco Nación) del día a cada operación financiera para calcular el valor real en pesos de los servicios convenidos.

#### Scenario: Aplicación de cotización del día

- GIVEN una operación financiera de un servicio convenido
- WHEN se calcula su valor
- THEN el sistema aplica la cotización del dólar Banco Nación del día

### Requirement: R031 — Indexación de tarifas en "kilos de cereal"

El sistema DEBE convertir el valor de una tarifa agrícola a su equivalente en "kilos de cereal" para actualizar automáticamente los precios pactados en especie.

#### Scenario: Conversión de tarifa a kilos de cereal

- GIVEN una tarifa agrícola pactada
- WHEN se actualiza su valor
- THEN el sistema convierte el valor a su equivalente en kilos de cereal

### Requirement: R032 — Rentabilidad por lote/campaña

El sistema DEBE cruzar los ingresos cobrados contra los costos operativos por lote para presentar el margen bruto y la rentabilidad real de la campaña.

#### Scenario: Cálculo de margen por lote

- GIVEN ingresos cobrados y costos operativos de un lote
- WHEN el sistema cruza ambos valores
- THEN el sistema presenta el margen bruto y la rentabilidad de la campaña

### Requirement: R033 — Contabilidades aisladas por firma

El sistema DEBE mantener contabilidades aisladas por cada firma o razón social para evitar el solapamiento de balances entre entidades del mismo grupo.

#### Scenario: Aislamiento de balances por firma

- GIVEN múltiples firmas dentro del grupo
- WHEN el sistema registra operaciones financieras
- THEN el sistema mantiene contabilidades separadas por firma o razón social

### Requirement: R034 — Exportación a sistema contable externo

El sistema DEBE permitir que el administrativo genere archivos estandarizados con los datos de gestión para compartirlos con el sistema contable externo o estudio contable.

#### Scenario: Exportación de datos de gestión

- GIVEN un administrativo autenticado
- WHEN solicita exportar datos de gestión
- THEN el sistema genera archivos estandarizados para el sistema contable externo

> ⚠️ Pendiente: Definir formato de exportación (AFIP, planillas, otros).