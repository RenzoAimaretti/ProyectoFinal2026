# CUU13 — Registrar Traslado / Alta / Baja de Hacienda

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU13` |
| Nombre | Registrar traslado / alta / baja de hacienda |
| Actor principal | Operario |
| Actores secundarios | Administrador / Dueño |
| Módulo | Ganadero de Precisión |
| Requerimiento(s) asociado(s) | R038 (referencia del PDF: RF-GAN-04) |
| Complejidad | Media |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Actualizar el inventario ganadero registrando el ingreso de nuevos animales, la mortandad o venta, y documentar el movimiento físico entre distintos potreros[cite: 7].

## Disparador

El Operario se posiciona en el brete o potrero ante la necesidad física de asentar un cambio en el inventario ganadero y abre el módulo correspondiente en su dispositivo móvil[cite: 7].

## Precondiciones (de sistema)

- El Operario se encuentra logueado en la aplicación móvil[cite: 7].
- Para traslados y bajas, el animal debe estar previamente registrado en el sistema[cite: 7].
- Para altas, la nueva etiqueta RFID (caravana electrónica) debe ser válida y no estar asignada[cite: 7].
- Los potreros de origen y destino deben existir en el sistema[cite: 7].

## Precondiciones (de negocio)

- Ocurre un evento físico en el campo: ingresa un nuevo animal al stock (alta), se registra la muerte/venta de un animal (baja), o se mueve un grupo de animales a otro sector del campo (traslado)[cite: 7]. 
- El animal es encerrado y pasado por la manga/brete para su lectura[cite: 7].

## Flujo principal

1. El Operario selecciona en la interfaz el tipo de operación específica que va a registrar (Alta, Baja o Traslado)[cite: 7].
2. El Operario escanea la caravana electrónica del animal utilizando el bastón lector RFID conectado al dispositivo móvil vía Bluetooth/USB[cite: 7].
3. El sistema valida la lectura y despliega un formulario dinámico según la operación seleccionada en el paso 1[cite: 7].
4. El Operario ingresa los datos requeridos (ej. potrero de destino para traslados; causa de baja para muertes/ventas; raza y fecha de nacimiento para altas)[cite: 7].
5. El Operario confirma la operación. El sistema actualiza el estado de la hacienda y asienta el registro en el historial inmutable para garantizar la trazabilidad[cite: 7].

## Flujos alternativos

- **2.a El hardware RFID se encuentra inoperativo, dañado o sin batería en el lote:**[cite: 7]
  - 2.a.1 El sistema provee un modo de contingencia que permite al Operario cargar manualmente el ID de la caravana del animal[cite: 7]. Continúa al paso 3[cite: 7].
- **5.a No hay cobertura de red 3G/4G en el potrero o manga donde se realiza la labor:**[cite: 7]
  - 5.a.1 Operando bajo la arquitectura "offline-first", el sistema almacena el traslado, alta o baja temporalmente en la base de datos local del móvil[cite: 7].
  - 5.a.2 El sistema sincroniza automáticamente los registros asíncronos con el servidor central al momento de recuperar la conectividad sin intervención humana[cite: 7]. Fin del CU[cite: 7].

## Postcondiciones (de sistema)

- **Éxito:** El estado del animal (activo/inactivo) o su ubicación geográfica (potrero) se actualizan en el historial de la base de datos central[cite: 7].
- **Fracaso:** La transacción es rechazada y el inventario ganadero no se modifica[cite: 7].
- **Éxito alternativo:** La actualización de stock o ubicación se guarda de forma segura en el almacenamiento local móvil del operario a la espera de señal[cite: 7].

## Postcondiciones (de negocio)

- **Éxito:** El dueño del campo cuenta con trazabilidad total y en tiempo real del ciclo de vida, cantidad y ubicación de su hacienda para posibles auditorías[cite: 7].
- **Fracaso:** El sistema genera una divergencia entre el stock físico de animales y el stock digital, perdiendo trazabilidad[cite: 7].
- **Éxito alternativo:** El trabajo del operario en la manga no se detiene por falta de internet, asegurando la captura de datos en origen[cite: 7].

## Reglas de negocio

- El dueño del campo debe contar con trazabilidad total y en tiempo real del ciclo de vida, cantidad y ubicación de su hacienda para posibles auditorías[cite: 7].
- El trabajo del operario en la manga no se detiene por falta de internet, asegurando la captura de datos en origen[cite: 7].

## Escenarios de prueba

1. Dado un animal registrado y presente en el sistema, cuando el operario registra un traslado entre potreros con una caravana identificada, entonces el sistema actualiza la ubicación del animal y mantiene la trazabilidad del inventario.
2. Dado un animal activo en el rodeo, cuando el operario registra una baja por venta o muerte, entonces el sistema marca al animal como inactivo y actualiza el stock de hacienda.
3. Dado un animal nuevo no registrado en el sistema, cuando el operario registra una alta con una etiqueta RFID válida y datos de nacimiento/raza, entonces el sistema lo incorpora al inventario ganadero.
4. Dado un lector RFID averiado o sin batería en el campo, cuando el operario intenta registrar un traslado, alta o baja, entonces el sistema permite cargar el ID de la caravana manualmente para continuar la operación.
5. Dado un dispositivo móvil sin conexión a internet en el potrero, cuando el operario registra un traslado, alta o baja, entonces el sistema guarda la operación localmente y la sincroniza cuando recupera conectividad.
6. Dado un animal o un potrero no válido, cuando el operario intenta confirmar la operación, entonces el sistema rechaza la transacción y no modifica el inventario.

