import '../../domain/models/enums.dart';

/// Converters enum de dominio ↔ texto persistido en las `TextColumn` de drift.
///
/// Los valores de los enums están en mayúsculas y `EnumName.name` produce
/// exactamente el string persistido, así que serializar es `.name` y
/// deserializar es `values.byName`. No se usan `TypeConverter` de drift: las
/// columnas son `text()` y el mapeo ocurre en los mappers de `data/models/`.

DailyReportStatus dailyReportStatusFromText(String value) =>
    DailyReportStatus.values.byName(value);
String dailyReportStatusToText(DailyReportStatus value) => value.name;

ReceptionStatus receptionStatusFromText(String value) =>
    ReceptionStatus.values.byName(value);
String receptionStatusToText(ReceptionStatus value) => value.name;

MachineActivityType machineActivityTypeFromText(String value) =>
    MachineActivityType.values.byName(value);
String machineActivityTypeToText(MachineActivityType value) => value.name;

MachineStatus machineStatusFromText(String value) =>
    MachineStatus.values.byName(value);
String machineStatusToText(MachineStatus value) => value.name;

PhotoEntityType photoEntityTypeFromText(String value) =>
    PhotoEntityType.values.byName(value);
String photoEntityTypeToText(PhotoEntityType value) => value.name;

SyncOperation syncOperationFromText(String value) =>
    SyncOperation.values.byName(value);
String syncOperationToText(SyncOperation value) => value.name;

SyncStatus syncStatusFromText(String value) =>
    SyncStatus.values.byName(value);
String syncStatusToText(SyncStatus value) => value.name;
