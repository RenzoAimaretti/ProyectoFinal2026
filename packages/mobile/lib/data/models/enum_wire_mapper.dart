import '../../domain/models/enums.dart';

/// Boundary mapper de enums EN (móvil) ↔ ES (backend) — design §2.5.
///
/// Los enums del backend permanecen en español y **nunca** se migran; el mapeo
/// ocurre en el borde de la capa `data`. `toWire` es total (enum cerrado, no
/// falla); `fromWire` devuelve `null` ante valores desconocidos —incluidos los
/// extra del backend que el móvil no modela (`ACTIVIDAD_MAQUINARIA` y
/// `MANTENIMIENTO`)— para que el caller los ignore (spec D).

// ─── DailyReportStatus ────────────────────────────────────────────────────────

String dailyReportStatusToWire(DailyReportStatus e) => switch (e) {
      DailyReportStatus.PENDING_APPROVAL => 'PENDIENTE_APROBACION',
      DailyReportStatus.APPROVED => 'APROBADO',
      DailyReportStatus.REJECTED => 'RECHAZADO',
    };

DailyReportStatus? dailyReportStatusFromWire(String value) => switch (value) {
      'PENDIENTE_APROBACION' => DailyReportStatus.PENDING_APPROVAL,
      'APROBADO' => DailyReportStatus.APPROVED,
      'RECHAZADO' => DailyReportStatus.REJECTED,
      _ => null,
    };

// ─── ReceptionStatus ──────────────────────────────────────────────────────────

String receptionStatusToWire(ReceptionStatus e) => switch (e) {
      ReceptionStatus.PENDING_VALIDATION => 'PENDIENTE_VALIDACION',
      ReceptionStatus.VALIDATED => 'VALIDADA',
      ReceptionStatus.REJECTED => 'RECHAZADA',
    };

ReceptionStatus? receptionStatusFromWire(String value) => switch (value) {
      'PENDIENTE_VALIDACION' => ReceptionStatus.PENDING_VALIDATION,
      'VALIDADA' => ReceptionStatus.VALIDATED,
      'RECHAZADA' => ReceptionStatus.REJECTED,
      _ => null,
    };

// ─── MachineActivityType ──────────────────────────────────────────────────────

String machineActivityTypeToWire(MachineActivityType e) => switch (e) {
      MachineActivityType.FUEL => 'COMBUSTIBLE',
      MachineActivityType.MAINTENANCE => 'MANTENIMIENTO',
      MachineActivityType.REPAIR => 'REPARACION',
      MachineActivityType.FIELD_USAGE => 'USO_CAMPO',
    };

MachineActivityType? machineActivityTypeFromWire(String value) =>
    switch (value) {
      'COMBUSTIBLE' => MachineActivityType.FUEL,
      'MANTENIMIENTO' => MachineActivityType.MAINTENANCE,
      'REPARACION' => MachineActivityType.REPAIR,
      'USO_CAMPO' => MachineActivityType.FIELD_USAGE,
      _ => null,
    };

// ─── MachineStatus ────────────────────────────────────────────────────────────

String machineStatusToWire(MachineStatus e) => switch (e) {
      MachineStatus.ACTIVE => 'ACTIVA',
      MachineStatus.OUT_OF_SERVICE => 'FUERA_SERVICIO',
    };

MachineStatus? machineStatusFromWire(String value) => switch (value) {
      'ACTIVA' => MachineStatus.ACTIVE,
      'FUERA_SERVICIO' => MachineStatus.OUT_OF_SERVICE,
      // `MANTENIMIENTO` existe en el backend pero el móvil no lo modela.
      _ => null,
    };

// ─── PhotoEntityType ──────────────────────────────────────────────────────────

String photoEntityTypeToWire(PhotoEntityType e) => switch (e) {
      PhotoEntityType.DAILY_REPORT => 'PARTE_DIARIO',
      PhotoEntityType.RECEPTION => 'RECEPCION',
    };

PhotoEntityType? photoEntityTypeFromWire(String value) => switch (value) {
      'PARTE_DIARIO' => PhotoEntityType.DAILY_REPORT,
      'RECEPCION' => PhotoEntityType.RECEPTION,
      // `ACTIVIDAD_MAQUINARIA` existe en el backend pero el móvil no lo modela.
      _ => null,
    };
