# Spec: Gestión de Personal

## Purpose

Administración de usuarios y personal: esquemas de pago por operario (destajo, porcentaje o jornal), cálculo automático de haberes, roles y permisos, y alertas de certificaciones obligatorias.

> ⚠️ **Nota técnica del documento original:** "Crea usuarios y le asigna un rol → habría que cambiar el modelo de dominio definiendo tipos de usuario." El modelo de dominio actual necesita ser revisado para contemplar tipos de usuario.

## Requirements

### Requirement: R022 — Esquema de pago por operario

El sistema DEBE permitir que el administrador defina el esquema de pago (destajo, porcentaje o jornal diario) por operario para estructurar las liquidaciones de trabajo.

#### Scenario: Configuración de esquema de pago

- GIVEN un administrador autenticado
- WHEN define el esquema de pago de un operario (destajo, porcentaje o jornal)
- THEN el sistema registra el esquema para las liquidaciones de trabajo

### Requirement: R023 — Cálculo automático de montos por destajo

El sistema DEBE calcular automáticamente los montos a pagar por destajo según las hectáreas reportadas en los partes aprobados para agilizar el cálculo de haberes.

> ⚠️ **Pendiente:** El documento original anota "(Si va este)" junto a este requerimiento, y en R029 "(este no iría. Preguntar bien)". Confirmar alcance de ambos con el cliente.

#### Scenario: Cálculo de haberes por destajo

- GIVEN partes aprobados con hectáreas reportadas por un operario a destajo
- WHEN el sistema computa el monto a pagar
- THEN el sistema calcula el monto según el esquema de destajo

### Requirement: R024 — Configuración de roles y permisos

El sistema DEBE permitir que el administrador configure roles y permisos específicos para limitar o habilitar el acceso a las funciones del sistema según el perfil de usuario.

#### Scenario: Configuración de permisos por rol

- GIVEN un administrador autenticado
- WHEN configura roles y permisos para un perfil de usuario
- THEN el sistema aplica las restricciones de acceso correspondientes

### Requirement: R025 — Alertas de vencimiento de certificaciones

El sistema DEBE emitir avisos sobre el vencimiento de certificaciones obligatorias del personal para mantener al día los permisos regulatorios a campo.

#### Scenario: Alerta por certificación vencida

- GIVEN una certificación obligatoria de un operario
- WHEN la certificación está próxima a vencer o vencida
- THEN el sistema emite un aviso de vencimiento