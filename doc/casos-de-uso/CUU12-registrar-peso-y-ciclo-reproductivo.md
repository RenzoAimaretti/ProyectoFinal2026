# CUU12 — Registrar Peso y Ciclo Reproductivo

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU12` |
| Nombre | Registrar peso y ciclo reproductivo |
| Actor principal | Operario |
| Actores secundarios | Administrador / Dueño |
| Módulo | Ganadero de Precisión |
| Requerimiento(s) asociado(s) | R037 (referencia del PDF: RF-GAN-03) |
| Complejidad | Media |
| Prioridad | Media |
| Estado | Borrador |

## Propósito

Documentar el seguimiento de ganancia de peso diaria y la gestión de los ciclos reproductivos de un animal[cite: 6].

## Disparador

El animal ingresa a la balanza o es retenido en la manga para su control físico de rutina, motivando al Operario a abrir el módulo de seguimiento en su dispositivo móvil[cite: 6].

## Precondiciones (de sistema)

- El animal debe contar con una etiqueta RFID (caravana electrónica) y estar previamente registrado en el sistema[cite: 6].
- El Operario debe haber iniciado sesión en la aplicación móvil[cite: 6].

## Precondiciones (de negocio)

- El animal se encuentra encerrado o pasando por el brete/balanza para su pesaje y control físico[cite: 6].

## Flujo principal

1. El Operario selecciona la opción de actualizar métricas y escanea la caravana electrónica del animal utilizando el hardware RFID conectado al dispositivo móvil[cite: 6].
2. El sistema identifica el ID del animal y muestra por pantalla su ficha técnica, incluyendo sus datos actuales[cite: 6].
3. El Operario ingresa el peso actual del animal arrojado por la balanza y/o selecciona el estado correspondiente a su ciclo reproductivo[cite: 6].
4. El Operario confirma los datos[cite: 6].
5. El sistema vincula la información al ID del animal y actualiza su monitoreo de desarrollo productivo[cite: 6].

## Flujos alternativos

- **1.a El bastón lector RFID sufre una avería técnica, rotura o pérdida en el campo:**[cite: 6]
  - 1.a.1 El sistema permite al Operario utilizar un modo de carga manual como respaldo, digitando el número de la caravana del animal[cite: 6]. Continúa al paso 2[cite: 6].
- **4.a El dispositivo móvil carece de conexión a internet en la zona del brete:**[cite: 6]
  - 4.a.1 El sistema asume su arquitectura offline-first, almacenando el registro en la base de datos local[cite: 6].
  - 4.a.2 El motor de sincronización asíncrona transmitirá los datos automáticamente al recuperar la señal[cite: 6]. Fin del CU[cite: 6].

## Postcondiciones (de sistema)

- **Éxito:** El peso y el estado del ciclo reproductivo quedan registrados y vinculados al historial del animal[cite: 6].
- **Fracaso:** Los datos del animal no se actualizan[cite: 6].
- **Éxito alternativo:** La actualización del peso y ciclo reproductivo queda almacenada de forma temporal y segura en el dispositivo móvil hasta su sincronización con el servidor central[cite: 6].

## Postcondiciones (de negocio)

- **Éxito:** Se consolida la trazabilidad del desarrollo del animal, permitiendo generar indicadores precisos para el productor[cite: 6].
- **Fracaso:** Falla el registro, perdiéndose la continuidad en el seguimiento del animal[cite: 6].
- **Éxito alternativo:** La operatividad del contratista en el brete no se ve interrumpida por la falta de conectividad en la zona de trabajo rural[cite: 6].

## Reglas de negocio

- Se consolida la trazabilidad del desarrollo del animal, permitiendo generar indicadores precisos para el productor[cite: 6].
- La operatividad del contratista en el brete no se ve interrumpida por la falta de conectividad en la zona de trabajo rural[cite: 6].

## Escenarios de prueba

1. Dado un animal identificado por RFID y presente en la balanza, cuando el operario registra un peso y un ciclo reproductivo válido, entonces el sistema asocia esos datos al animal y actualiza su historial de seguimiento.
2. Dado un animal registrado en el sistema, cuando el operario ingresa el peso y el estado reproductivo correspondiente, entonces el sistema guarda la información para su consulta y análisis posterior.
3. Dado un bastón RFID averiado o perdido en el campo, cuando el operario intenta registrar el peso del animal, entonces el sistema permite cargar la caravana manualmente para continuar con la operación.
4. Dado un dispositivo móvil sin conexión a internet en el brete, cuando el operario registra el peso y el estado reproductivo, entonces el sistema almacena la información localmente y la sincroniza cuando vuelva la conectividad.
5. Dado un animal con datos incompletos o no válidos, cuando el operario intenta confirmar el registro, entonces el sistema rechaza la operación y solicita completar la información necesaria.
