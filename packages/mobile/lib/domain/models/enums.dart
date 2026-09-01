/// Enums de dominio.
///
/// Los valores están en mayúsculas y coinciden con las `TextColumn` de drift:
/// `EnumName.name` produce exactamente el string persistido, por lo que el
/// dominio no necesita serialización extra (los converters viven en `data/`).
library;

enum DailyReportStatus {
  PENDING_APPROVAL,
  APPROVED,
  REJECTED,
}

enum ReceptionStatus {
  PENDING_VALIDATION,
  VALIDATED,
  REJECTED,
}

enum MachineActivityType {
  FUEL,
  MAINTENANCE,
  REPAIR,
  FIELD_USAGE,
}

enum MachineStatus {
  ACTIVE,
  OUT_OF_SERVICE,
}

enum PhotoEntityType {
  DAILY_REPORT,
  RECEPTION,
}

enum SyncOperation {
  CREATE,
  UPDATE,
  DELETE,
}

enum SyncStatus {
  PENDING,
  PROCESSING,
  DONE,
  FAILED,
}

/// Roles de usuario.
///
/// El backend envía el rol como texto plano (sin catálogo cerrado garantizado
/// en el contrato), por lo que el dominio lo conserva como `String` y expone
/// las constantes conocidas para comparaciones legibles. Se evita un enum
/// cerrado que rompería ante un valor nuevo del backend.
abstract final class UserRole {
  static const String admin = 'ADMIN';
  static const String operario = 'OPERARIO';
  static const String supervisor = 'SUPERVISOR';
}
