# CUU09 — Registrar Facturación / Cobro de Cliente

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU09` |
| Nombre | Registrar facturación/cobro de cliente |
| Actor principal | Dueño |
| Actores secundarios | Operativo Administrativo / Data Entry, Cliente |
| Rol(es) de la app | Dueño / Operativo Administrativo / Data Entry |
| Módulo | Finanzas & Administración |
| Requerimiento(s) asociado(s) | R026, R027, R028, R029, R030 |
| Complejidad | Alta |
| Prioridad | Alta |
| Estado | Revisado |

## Propósito

Registrar la facturación y cobros de los clientes, clasificando ingresos (facturados/informales), asociando la cotización del dólar del día y controlando cheques físicos/eCheqs.

## Disparador

Se presta un servicio a un cliente y se genera la factura/cobro asociado.

## Precondiciones

- Deben existir tareas de un cliente vinculadas a las labores realizadas (R026).
- Debe existir la cotización del dólar Banco Nación del día (R030).
- El usuario tiene rol Dueño, Operativo Administrativo o Data Entry, está registrado y su sesión está activa.

## Flujo principal

1. El usuario selecciona el cliente y las tareas realizadas a facturar. El sistema muestra las tareas emitidas pendientes de facturación.
2. El usuario completa los datos de la factura o cobro asociado. El sistema asocia la cotización del dólar Banco Nación del día a la operación cuando corresponde.
3. El usuario clasifica el cobro o ingreso como facturado o informal.
4. Si la operación involucra cheques físicos o eCheqs, el usuario registra su control o conciliación según corresponda. El sistema registra la factura y el cobro asociados al cliente, y actualiza el control contable.

## Flujos alternativos

### A1: Operación con cheque pendiente de control

1. Luego de registrar la operación, el sistema detecta que existe un cheque físico o eCheq con eventos pendientes de control, acreditación o débito.
2. El sistema notifica al usuario para evitar omisiones en el seguimiento del valor. Fin del caso de uso.

## Postcondiciones

- La factura queda registrada para el control contable del servicio (R026).
- El cobro queda clasificado (facturado/informal) con su valor real en pesos (R027, R030).
- Los cheques físicos/eCheqs quedan controlados (R028, R029).

## Reglas de negocio

- Los cobros e ingresos se clasifican en facturados e informales (R027).
- El valor de los servicios se calcula con la cotización del dólar del día (R030).
- Las facturas se vinculan a tareas realizadas para el cliente (R026).
- Los cheques físicos y eCheqs deben quedar disponibles para control o conciliación cuando estén dentro del alcance definido (R028, R029).

## Escenarios de prueba

### Escenario: Registrar factura de cliente

- GIVEN un administrativo autenticado y tareas realizadas para un cliente
- WHEN emite o ingresa una factura vinculada a esas tareas
- THEN el sistema registra la factura para el control contable del servicio

### Escenario: Clasificar cobro recibido

- GIVEN un cobro o ingreso recibido de un cliente
- WHEN el usuario lo clasifica como facturado o informal
- THEN el sistema registra el cobro en la categoría correspondiente

### Escenario: Controlar cheque físico

- GIVEN un cheque físico recibido
- WHEN el usuario registra el cheque para su seguimiento
- THEN el sistema lo deja disponible para controlar su flujo y eventos asociados

### Escenario: Aplicar cotización del día

- GIVEN una operación financiera de un servicio convenido
- WHEN el sistema calcula su valor real en pesos
- THEN aplica la cotización del dólar Banco Nación del día

## Pendientes

- [ ] Confirmar si la conciliación de eCheqs (R029) queda dentro del alcance, porque el PDF anota "este no iría. Preguntar bien".
