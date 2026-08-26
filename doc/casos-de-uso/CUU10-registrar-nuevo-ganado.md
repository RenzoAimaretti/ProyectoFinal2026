# CUU10 — Registrar Nuevo Ganado
### ACLARACION:   DE MOMENTO ESTA FUERA DE ALCANCE TODO EL MODULO DE GANADERIA RFID
## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU10` |
| Nombre | Registrar nuevo ganado |
| Actor principal | Operario |
| Actores secundarios | Administrador / Dueño |
| Rol(es) de la app | Operario / Administrador / Dueño |
| Módulo | Ganadero de Precisión |
| Requerimiento(s) asociado(s) | R035 (referencia del PDF: RF-GAN-01) |
| Complejidad | Media |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Registrar un nuevo animal a partir de la lectura RFID de su caravana electrónica, evitando la carga manual del identificador y dejando al animal disponible para su trazabilidad individual.

## Disparador

El Operario necesita dar de alta un animal en el rodeo y selecciona la opción de registro mediante escáner RFID en la app móvil.

## Precondiciones

- El dispositivo móvil debe estar vinculado al lector RFID (Bluetooth/USB) (R035).
- El usuario tiene rol Operario, Administrador o Dueño, está registrado y su sesión está activa.

## Flujo principal

1. El sistema confirma la conexión con el escáner RFID vinculado al dispositivo móvil.
2. El Operario pasa el lector por la caravana electrónica del animal. El sistema captura el código RFID leído automáticamente y valida que la caravana electrónica no esté vinculada a otro animal registrado.
3. El Operario completa los datos requeridos del animal. El sistema muestra la previsualización del alta con la caravana leída y los datos ingresados.
4. El Operario confirma el alta. El sistema registra el nuevo animal vinculado a su caravana electrónica.

## Flujos alternativos

### A1: Lector RFID no disponible

1. El sistema no detecta el lector RFID interno/externo del teléfono.
2. El sistema notifica al usuario que debe vincular un lector RFID antes de registrar el animal. Fin del caso de uso.

### A2: Lectura RFID fallida o inválida

1. El sistema no logra capturar una caravana electrónica válida.
2. El sistema informa el problema y permite reintentar la lectura. Si el usuario cancela, fin del caso de uso.

### A3: Caravana ya vinculada a otro animal

1. El sistema detecta que la caravana leída ya está vinculada a otro animal registrado.
2. El sistema muestra un mensaje de error y no permite continuar con el alta. Fin del caso de uso.

### A4: Datos requeridos incompletos o inválidos

1. El Operario intenta confirmar el alta con datos obligatorios incompletos o inválidos.
2. El sistema marca los campos a corregir y no registra el animal hasta que la información sea válida.

## Postcondiciones

- El animal queda registrado e identificado automáticamente por su caravana electrónica (R035).
- Si el caso de uso finaliza por error o cancelación, no se registra un animal nuevo ni se vincula la caravana.

## Reglas de negocio

- La identificación se realiza por RFID sin margen de error humano (R035).
- Una caravana electrónica no puede quedar vinculada a más de un animal activo.
- El código de caravana utilizado para el alta debe provenir de la lectura RFID, no de carga manual.
- Los datos requeridos del animal deben estar completos y ser válidos antes de confirmar el alta.

## Escenarios de prueba

### Escenario: Registrar animal con caravana RFID disponible

- GIVEN un operario autenticado y un dispositivo móvil con lector RFID conectado
- WHEN lee la caravana electrónica de un animal no registrado y confirma el alta con datos válidos
- THEN el sistema registra el animal y lo vincula con la caravana leída

### Escenario: Impedir alta con lector RFID no disponible

- GIVEN un operario autenticado sin lector RFID conectado
- WHEN intenta registrar un nuevo animal por RFID
- THEN el sistema informa que debe vincular el lector y no permite registrar el animal

### Escenario: Impedir alta con caravana duplicada

- GIVEN una caravana electrónica ya vinculada a un animal registrado
- WHEN el operario lee esa caravana para registrar un nuevo animal
- THEN el sistema muestra un error y no permite continuar con el alta

### Escenario: Validar datos requeridos antes del alta

- GIVEN una caravana RFID válida y no registrada
- WHEN el operario intenta confirmar el alta con datos obligatorios incompletos o inválidos
- THEN el sistema marca los campos a corregir y no registra el animal

## Pendientes

- [ ] Confirmar la correspondencia entre la referencia RF-GAN-01 del PDF y el requerimiento R035.
- [ ] Definir en el diccionario de datos cuáles son los campos obligatorios para el alta del animal.
- [ ] Confirmar si el alta de hacienda mencionada en CUU13 queda separada de este caso de uso o si CUU13 debe referenciar a CUU10 para altas de animales nuevos.
