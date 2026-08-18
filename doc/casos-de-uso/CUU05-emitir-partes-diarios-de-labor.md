# CUU05 — Emitir Partes Diarios de Labor

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU05` |
| Nombre | Emitir partes diarios de labor |
| Actor principal | Administrador / Dueño |
| Actores secundarios | Operario a Campo (carga inicial), Operativo Administrativo, Ingeniero Agrónomo (receta previa) |
| Rol(es) de la app | Operario a Campo (móvil), Administrador / Dueño (web), Operativo Administrativo |
| Módulo | Producción |
| Requerimiento(s) asociado(s) | R007, R008, R017 (referencia: R009, R021, R023, R032) |
| Complejidad | Alta |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Emitir y aprobar los partes diarios de labor cargados por los operarios desde el móvil (online u offline), validando la información bajo el criterio de un mutuo acuerdo entre quien entrega el parte y quien lo recibe. La aprobación dispara en cascada el descuento de stock de insumos, el cálculo de haberes por destajo, la acumulación de horas/hectáreas por máquina y la generación de costos para rentabilidad.

## Disparador

Un operario a campo carga un parte diario de labor desde el móvil (online u offline) y el parte queda pendiente de aprobación en la bandeja del administrador.

## Precondiciones

- El operario debe contar con el rol Operario a Campo y permisos de carga de partes (R007).
- Debe existir un lote delimitado (CUU02) asociado a un cliente y a una firma/razón social.
- El lote debe contar con una receta agronómica cargada por el ingeniero agrónomo (R009) para habilitar el trabajo y posibilitar el cálculo del consumo teórico.
- El parte debe incluir fecha, cliente/firma, lote, hectáreas, tarea/labor y, si corresponde, cantidades de insumos consumidas.

## Flujo principal

1. El operario abre la app móvil y crea un parte diario (formulario "Parte Diario Express"): selecciona `Cliente → Firma → Campo → Lote → Labor`.
2. Ingresa fecha, hectáreas trabajadas y horas/jornada.
3. Para cada insumo aplicado agrega un ítem de consumo: insumo del catálogo + cantidad real consumida (L/kg/unidad), de carga manual.
4. Adjunta hasta 5 fotografías opcionales del cuaderno o constancia física como respaldo (R008).
5. Si no hay conectividad, el parte se almacena localmente y queda en cola de sincronización; al recuperar señal se sincroniza con el backend (R007). Con el parte sincronizado, el sistema lo marca como `Pendiente de aprobación`.
6. El administrador/dueño abre la bandeja de partes pendientes en el web y selecciona el parte.
7. El sistema presenta los datos del parte, las fotografías adjuntas y el impacto de stock que generaría sobre el cliente.
8. El administrador aprueba el parte (se completa el mutuo acuerdo) y el sistema registra fecha/hora de aprobación e inicia en cascada:
   - Descuento automático del stock de insumos del cliente (R017).
   - Cálculo de haberes por destajo del operario, si corresponde a su esquema de pago (R023).
   - Acumulación de horas de uso y hectáreas por máquina (R021).
   - Generación de costos para el cálculo de rentabilidad (R032).
9. Fin: el parte queda `Aprobado` y su información queda disponible para el cliente auditor.

## Flujos alternativos

### A1: Rechazo del parte

1. El administrador considera que los datos o las fotografías no respaldan el parte.
2. El administrador rechaza el parte indicando motivo; el sistema registra el rechazo con motivo y fecha (trazabilidad).
3. El sistema NO descuenta stock ni genera cálculos (quedan pendientes).
4. El parte pasa a estado `Rechazado` y se reabre el mismo registro para corrección por parte del operario, conservando el historial de rechazos (motivos y fechas).
5. El operario recibe el aviso, corrige los datos sobre el mismo parte abierto y lo reenvía.
6. El parte vuelve a quedar `Pendiente de aprobación`, iniciando un nuevo ciclo de mutuo acuerdo.

## Postcondiciones

- **Éxito:** el parte queda aprobado con fecha/hora de aprobación; el stock del cliente se descuenta (R017) y se generan los cálculos de haberes (R023), horas/hectáreas por máquina (R021) y costos (R032); el parte queda visible para el cliente auditor.
- **Excepción (rechazo):** el parte queda rechazado con motivo y fecha registrados, reabierto para corrección; no se descuenta stock ni se generan cálculos.

## Reglas de negocio

- Todo lote que se vaya a trabajar debe contar con una receta agronómica previa (R009); sin receta no se habilita la carga del parte. [Regla transversal del negocio]
- El parte diario corresponde a una unidad de: un operario + una jornada + un lote + una labor (R007).
- El consumo de insumos se carga de forma manual por parte del operario, referenciando el catálogo de insumos (clase/tabla con ID, descripción y unidad).
- El parte puede cargarse en modo offline y sincronizarse posteriormente (R007).
- La aprobación es un mutuo acuerdo entre quien entrega el parte (operario) y quien lo recibe y valida (administrador/dueño).
- El rechazo de un parte queda registrado con motivo y fecha; durante el rechazo el descuento de stock queda pendiente.
- La aprobación del parte descuenta automáticamente el stock de insumos del cliente (R017).
- La aprobación también dispara el cálculo de haberes por destajo (R023), la acumulación de horas/hectáreas por máquina (R021) y la generación de costos para rentabilidad (R032).
- Las fotografías de respaldo son opcionales y pueden adjuntarse hasta 5 por parte (R008).

## Escenarios de prueba

### Escenario: Carga de parte diario sin conexión

- GIVEN un operario móvil sin conectividad
- WHEN carga el parte diario con fecha, cliente, lote, hectáreas, tarea e ítems de consumo de insumos
- THEN el sistema almacena localmente el parte para su sincronización posterior (R007)

### Escenario: Aprobación con descuento de stock

- GIVEN un parte pendiente de aprobación con ítems de consumo cargados
- WHEN el administrador aprueba el parte
- THEN el sistema descuenta el stock de insumos del cliente (R017), genera haberes por destajo (R023), acumula horas/hectáreas por máquina (R021) y deja el parte `Aprobado`

### Escenario: Rechazo sin descuento de stock

- GIVEN un parte pendiente de aprobación
- WHEN el administrador lo rechaza indicando motivo
- THEN el sistema registra el rechazo con motivo y fecha, no descuenta stock y reabre el parte para corrección

### Escenario: Reenvío tras rechazo

- GIVEN un parte rechazado reabierto para corrección
- WHEN el operario corrige los datos y lo reenvía
- THEN el parte vuelve a quedar `Pendiente de aprobación` conservando el historial de rechazos

## Pendientes

- [ ] Definir la política de sincronización y resolución de conflictos al recuperar señal (R007).
- [ ] Confirmar el canal de notificación al operario en caso de rechazo (in-app asumido; confirmar email/push).
- [ ] Confirmar si el parte requiere como mínimo un ítem de consumo de insumos o puede cargarse solo con horas/hectáreas.
- [ ] Definir si existe un tope de intentos de reenvío tras rechazo (actualmente sin límite).
- [ ] Confirmar el origen del costo por parte (tarifario por firma) para la rentabilidad (R032).