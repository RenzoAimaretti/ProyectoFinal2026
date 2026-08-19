# CUU11 — Registrar Evento Sanitario / Vacunación

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU11` |
| Nombre | Registrar evento sanitario/vacunación |
| Actor principal | Operario |
| Actores secundarios | Ingeniero Agrónomo / Veterinario (posible) |
| Módulo | Ganadero de Precisión |
| Requerimiento(s) asociado(s) | R036 (referencia del PDF: RF-GAN-02) |
| Complejidad | Media |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Registrar el historial sanitario del animal, detallando vacunas o tratamientos, asociado a su ID[cite: 5].

## Disparador

El animal se encuentra retenido en la manga o brete para recibir un tratamiento sanitario o vacunación, lo que motiva al Operario a preparar la medicación y abrir el módulo de registro sanitario en su dispositivo móvil[cite: 5].

## Precondiciones (de sistema)

- El animal debe estar registrado en el sistema y contar con una caravana electrónica[cite: 5].
- El Operario debe estar logueado en la aplicación móvil[cite: 5].

## Precondiciones (de negocio)

- El animal debe estar encerrado y pasando por la manga o el brete para recibir la aplicación de la vacuna o el control sanitario[cite: 5].

## Flujo principal

1. El Operario selecciona la opción de nuevo evento sanitario y escanea la caravana del animal utilizando el hardware periférico lector (antena/bastón RFID) conectado vía Bluetooth o USB al dispositivo móvil[cite: 5].
2. El sistema identifica el ID del animal y muestra los datos básicos junto a su historial clínico[cite: 5].
3. El Operario selecciona e ingresa los datos del evento sanitario correspondiente a vacunas o tratamientos[cite: 5].
4. El Operario confirma el registro[cite: 5].
5. El sistema asocia el evento sanitario al ID del animal y lo guarda para mantener la trazabilidad del control sanitario digital[cite: 5].

## Flujos alternativos

- **1.a Falla la lectura automatizada por rotura o pérdida del hardware periférico RFID en el campo:**[cite: 5]
  - 1.a.1 El sistema permite al Operario recurrir a un modo de carga manual como respaldo para ingresar el número de caravana[cite: 5]. Continúa al paso 2[cite: 5].
- **4.a El dispositivo no tiene conexión a internet en la zona de trabajo:**[cite: 5]
  - 4.a.1 El sistema almacena el registro sanitario localmente en el dispositivo móvil y lo sincroniza de manera asíncrona mediante el motor bidireccional al recuperar la señal[cite: 5]. Fin del CU[cite: 5].

## Postcondiciones (de sistema)

- **Éxito:** Evento sanitario registrado e inmutablemente vinculado al ID del animal en la base de datos central[cite: 5].
- **Fracaso:** Evento sanitario no registrado[cite: 5].
- **Éxito alternativo:** Registro sanitario almacenado temporalmente en la base de datos local incrustada del dispositivo móvil, pendiente de sincronización[cite: 5].

## Postcondiciones (de negocio)

- **Éxito:** Se certifica digitalmente la trazabilidad del estado de salud y el ciclo de vida del ganado[cite: 5].
- **Fracaso:** El historial clínico del animal queda incompleto o desactualizado[cite: 5].
- **Éxito alternativo:** El Operario puede continuar trabajando con la hacienda sin interrupciones generadas por la falta de conectividad[cite: 5].

## Reglas de negocio

- Se debe certificar digitalmente la trazabilidad del estado de salud y el ciclo de vida del ganado[cite: 5].
- El Operario puede continuar trabajando con la hacienda sin interrupciones generadas por la falta de conectividad[cite: 5].

## Escenarios de prueba

_Flujo pendiente de validar con el cliente._

## Reglas de negocio

- El evento se agrega al historial clínico de la caravana leída y queda asociado al animal identificado (R036).
- Todo evento sanitario o vacunación debe estar vinculado a una caravana o animal validado por RFID.
- La información del evento debe incluir al menos tipo, fecha y responsable para asegurar trazabilidad documental.
- La certificación de trazabilidad individual depende de la integridad y completitud del historial clínico del animal (R036).
- El sistema debe preservar la secuencia temporal de los eventos para permitir auditoría del estado sanitario del rodeo.

## Escenarios de prueba

1. Dado un animal identificado mediante RFID, cuando el operario registra una vacunación con sus datos correspondientes, entonces el sistema guarda el evento en el historial clínico de la caravana.
2. Dado un animal identificado, cuando el operario registra un tratamiento sanitario con fecha, producto y observaciones, entonces el sistema lo asocia al historial del animal y permite su consulta posterior.
3. Dado una caravana no identificada o inexistente, cuando el operario intenta registrar un evento, entonces el sistema rechaza la operación y solicita validar la identidad del animal.
4. Dado un formulario incompleto, cuando el operario intenta guardar el evento, entonces el sistema exige completar los campos obligatorios antes de confirmar.
