# CUU06 — Recepcionar Insumos del Cliente

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU06` |
| Nombre | Recepcionar insumos del cliente |
| Actor principal | Operario/admin |
| Actores secundarios | Cliente / Productor (indica la cantidad entregada), Administrador / Contratista (validación) |
| Rol(es) de la app | Operario a Campo (móvil), Administrador / Dueño (web), Cliente / Productor (indicación y auditoría) |
| Módulo | Insumos y Recepción de Stock |
| Requerimiento(s) asociado(s) | R014 |
| Complejidad | Media |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Registrar la cantidad de insumos que el cliente indica haber adquirido y entregado en el campo, validarla bajo un mutuo acuerdo con el contratista/administrador y, tras la validación, ingresar el stock atribuido al cliente.

## Disparador

El cliente adquiere insumos y los entrega en el campo/lote, indicando la cantidad de cada insumo adquirido.

## Precondiciones

- Debe existir un cliente con lote(s) asociado(s) y firma/razón social (R014).
- Los insumos deben existir en el catálogo de insumos (clase/tabla con ID, descripción y unidad).

## Flujo principal

1. El cliente entrega los insumos en el campo e indica la cantidad de cada insumo adquirido.
2. El operario/admin abre el formulario de recepción (móvil o web) y selecciona el cliente. ## ACA LO CARGA EL OPERARIO O EL CLIENTE?
3. Para cada insumo agrega un ítem: insumo del catálogo + cantidad + unidad.
4. Adjunta hasta 5 fotografías opcionales de los productos/bidones recibidos.
5. Confirma la recepción; el sistema registra la recepción con estado `Pendiente de validación` y notifica al administrador/contratista.
6. El administrador/contratista valida la recepción (mutuo acuerdo con lo indicado por el cliente).
7. Tras la validación, el sistema ingresa el stock atribuido al cliente y la recepción queda `Validada`, disponible para el cliente auditor.

## Flujos alternativos

### A1: Rechazo de la recepción

1. El administrador/contratista no valida la cantidad y/o las fotografías y rechaza la recepción indicando motivo.
2. El sistema registra el rechazo con motivo y fecha (trazabilidad) y NO ingresa stock.
3. El sistema emite una alerta de aviso al cliente.
4. El producto físico debe volver con el cliente. Ante una nueva entrega acordada, se genera una nueva recepción corregida.

### A2: Recepción en modo offline

1. El operario/admin carga la recepción desde el móvil sin conectividad.
2. El sistema almacena la recepción localmente y la sincroniza al recuperar señal.
3. Tras la sincronización, la recepción queda `Pendiente de validación` y continúa el flujo principal.

## Postcondiciones

- **Éxito:** la recepción queda `Validada`, el stock se ingresa atribuido al cliente y la información queda disponible para la auditoría del cliente.
- **Excepción (rechazo):** la recepción queda rechazada con motivo y fecha registrados, sin ingreso de stock, con alerta al cliente y devolución del producto físico.

## Reglas de negocio

- Los insumos son adquiridos por el cliente; el cliente indica la cantidad de insumos adquiridos, y dicha indicación debe ser validada por el contratista/administrador.
- El stock se ingresa atribuido al cliente a nivel global (suma para todos sus lotes), no por lote individual.
- El registro de la recepción incluye: insumo del catálogo + cantidad + unidad y fotografía de los productos (opcional, hasta 5) (R014). No requiere número de remito.
- La entrada de stock solo se habilita tras la validación del administrador (mutuo acuerdo) (R014).
- El rechazo queda registrado con motivo y fecha; en ese caso el producto físico vuelve con el cliente y se alerta al cliente.

## Escenarios de prueba

### Escenario: Registro de producto del cliente

- GIVEN un cliente que entrega producto en el campo
- WHEN el operario/admin registra la cantidad recibida con foto de los productos
- THEN el sistema registra la recepción `Pendiente de validación` y notifica al administrador para que valide la entrada

### Escenario: Validación e ingreso de stock

- GIVEN una recepción pendiente de validación
- WHEN el administrador la valida
- THEN el sistema ingresa el stock atribuido al cliente y la recepción queda `Validada`

### Escenario: Rechazo de la recepción

- GIVEN una recepción pendiente de validación
- WHEN el administrador la rechaza indicando motivo
- THEN el sistema registra el rechazo con motivo y fecha, no ingresa stock, alerta al cliente y el producto vuelve con el cliente

## Pendientes

- [ ] Confirmar el canal de notificación al administrador (in-app asumido; confirmar email/push).
- [ ] Confirmar si la indicación de cantidad del cliente se realiza por un canal interno (app/portal) o externo (whatsapp/documento) que deba registrarse como referencia.
- [ ] Confirmar el canal de la alerta de rechazo al cliente (in-app asumido; confirmar email).