# CUU00 — Iniciar Sesión

## Metadatos

| Campo | Valor |
|-------|-------|
| ID | `CUU00` |
| Nombre | Iniciar sesión |
| Actor principal | Todos los usuarios |
| Actores secundarios | — |
| Módulo | Plataforma |
| Requerimiento(s) asociado(s) | — |
| Complejidad | Baja |
| Prioridad | Alta |
| Estado | Borrador |

## Propósito

Permitir el acceso al sistema a todos los perfiles definidos (Administrador/Dueño, Operativo Administrativo, Operario a Campo, Ingeniero Agrónomo, Cliente/Productor).

## Disparador

El usuario ingresa al sistema sin sesión activa.

## Precondiciones

- El usuario debe tener una cuenta credenciales creadas en el sistema (Administrador/Dueño, Operativo, Operario, Ingeniero o Cliente).

## Flujo principal

_Flujo por desarrollar. Verificar credenciales, manejo de roles y multi-tenant en la autenticación._

1. <!-- Pendiente de desarrollar -->

## Flujos alternativos

- CUU00 no define flujos alternativos en el documento original.

## Postcondiciones

- El usuario accede conforme a su rol y tenant asignado.

## Reglas de negocio

- El acceso debe respetar el aislamiento multi-tenant del sistema.

## Escenarios de prueba

_Flujo pendiente de validar con el cliente._