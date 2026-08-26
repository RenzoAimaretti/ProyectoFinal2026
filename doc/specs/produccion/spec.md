# Spec: Producción (Labores Agrícolas)

## Purpose

Registro de labores agrícolas: partes diarios de labor cargados desde el móvil en modo offline, recetas agronómicas, condiciones climáticas de aplicación, importación de archivos de trabajo de maquinaria y registro de campaña en cosecha.

## Requirements

### Requirement: R007 — Parte diario de labor en modo offline

El sistema DEBE permitir que el operario móvil cargue el parte diario de labor (fecha, cliente, lote, hectáreas y tarea) en modo offline para reemplazar la anotación manual sin depender de la conectividad (rol de operario).

#### Scenario: Carga de parte diario sin conexión

- GIVEN un operario móvil sin conectividad
- WHEN carga el parte diario con fecha, cliente, lote, hectáreas y tarea
- THEN el sistema almacena localmente el parte para su sincronización posterior

> ⚠️ Pendiente: Definir política de sincronización y de conflictos al recuperar la señal.

### Requirement: R008 — Fotografías de respaldo del parte diario

El sistema DEBE permitir que el operario móvil suba fotografías del cuaderno o constancias físicas de trabajo para validar los datos ingresados en el parte diario.

#### Scenario: Adjuntar foto de respaldo

- GIVEN un parte diario cargado
- WHEN el operario adjunta una fotografía del cuaderno o constancia física
- THEN el sistema asocia la foto al parte para su validación

### Requirement: R009 — Recetas agronómicas

El sistema DEBE permitir que el ingeniero agrónomo ingrese recetas agronómicas con dosis, volumen de caldo y orden de carga para instruir la preparación de productos al contratista (rol de ingeniero).

#### Scenario: Carga de receta agronómica

- GIVEN un ingeniero agrónomo autenticado
- WHEN ingresa una receta con dosis, volumen de caldo y orden de carga
- THEN el sistema registra la receta para instruir la preparación de productos

### Requirement: R010 — Alertas de re-aplicación / doble golpe

El sistema DEBE enviar alertas de re-aplicación o "doble golpe" para dar seguimiento al control fitosanitario según la receta agronómica.

#### Scenario: Alerta de re-aplicación

- GIVEN una receta con plan de re-aplicación
- WHEN se cumple la condición de seguimiento según la receta
- THEN el sistema envía la alerta de re-aplicación o doble golpe

### Requirement: R011 — Condiciones climáticas del momento de pulverización

El sistema DEBE registrar las condiciones climáticas del momento exacto de la pulverización para respaldar legal y ambientalmente la aplicación realizada.

#### Scenario: Respaldo climático de la aplicación

- GIVEN una operación de pulverización
- WHEN se registra la aplicación
- THEN el sistema captura y almacena las condiciones climáticas del momento exacto

### Requirement: R012 — Importación de archivos de trabajo desde USB

El sistema DEBE permitir que el usuario o sistema cargue archivos de trabajo mediante dispositivos USB (pendrive) desde las computadoras de la maquinaria para consolidar el historial real del lote.

#### Scenario: Importación desde pendrive

- GIVEN un archivo de trabajo generado por la maquinaria
- WHEN el usuario lo importa desde un pendrive
- THEN el sistema consolida los datos en el historial del lote

### Requirement: R013 — Registro de cosecha (rinde, humedad, descargas)

El sistema DEBE permitir que el operario cargue el rinde, porcentaje de humedad y descargas en cosecha para monitorear el desempeño del cultivo y la logística de transporte.

#### Scenario: Carga de datos de cosecha

- GIVEN una operación de cosecha
- WHEN el operario carga rinde, humedad y descargas
- THEN el sistema registra los datos para monitoreo de cultivo y logística