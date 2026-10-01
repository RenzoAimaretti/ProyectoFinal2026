import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/models/enum_wire_mapper.dart';
import 'package:mobile/domain/models/enums.dart';

/// 6.2 — round-trip EN↔ES total + valores no modelados → null (spec D).
void main() {
  group('DailyReportStatus', () {
    test('toWire mapea todo el enum', () {
      expect(dailyReportStatusToWire(DailyReportStatus.PENDING_APPROVAL),
          'PENDIENTE_APROBACION');
      expect(dailyReportStatusToWire(DailyReportStatus.APPROVED), 'APROBADO');
      expect(dailyReportStatusToWire(DailyReportStatus.REJECTED), 'RECHAZADO');
    });

    test('fromWire round-trip + desconocido → null', () {
      for (final e in DailyReportStatus.values) {
        expect(dailyReportStatusFromWire(dailyReportStatusToWire(e)), e);
      }
      expect(dailyReportStatusFromWire('BASURA'), isNull);
    });
  });

  group('ReceptionStatus', () {
    test('round-trip total', () {
      for (final e in ReceptionStatus.values) {
        expect(receptionStatusFromWire(receptionStatusToWire(e)), e);
      }
      expect(receptionStatusFromWire('NOPE'), isNull);
    });
  });

  group('MachineActivityType', () {
    test('round-trip total', () {
      for (final e in MachineActivityType.values) {
        expect(machineActivityTypeFromWire(machineActivityTypeToWire(e)), e);
      }
      expect(machineActivityTypeToWire(MachineActivityType.FUEL), 'COMBUSTIBLE');
      expect(
          machineActivityTypeToWire(MachineActivityType.MAINTENANCE), 'MANTENIMIENTO');
      expect(machineActivityTypeToWire(MachineActivityType.FIELD_USAGE), 'USO_CAMPO');
    });
  });

  group('MachineStatus', () {
    test('round-trip + MANTENIMIENTO (no modelado) → null', () {
      expect(machineStatusToWire(MachineStatus.ACTIVE), 'ACTIVA');
      expect(machineStatusToWire(MachineStatus.OUT_OF_SERVICE), 'FUERA_SERVICIO');
      expect(machineStatusFromWire('ACTIVA'), MachineStatus.ACTIVE);
      expect(machineStatusFromWire('FUERA_SERVICIO'), MachineStatus.OUT_OF_SERVICE);
      // El backend tiene `MANTENIMIENTO` que el móvil no modela.
      expect(machineStatusFromWire('MANTENIMIENTO'), isNull);
    });
  });

  group('PhotoEntityType', () {
    test('round-trip + ACTIVIDAD_MAQUINARIA (no modelado) → null', () {
      expect(photoEntityTypeToWire(PhotoEntityType.DAILY_REPORT), 'PARTE_DIARIO');
      expect(photoEntityTypeToWire(PhotoEntityType.RECEPTION), 'RECEPCION');
      expect(photoEntityTypeFromWire('PARTE_DIARIO'), PhotoEntityType.DAILY_REPORT);
      expect(photoEntityTypeFromWire('RECEPCION'), PhotoEntityType.RECEPTION);
      // El backend tiene `ACTIVIDAD_MAQUINARIA` que el móvil no modela.
      expect(photoEntityTypeFromWire('ACTIVIDAD_MAQUINARIA'), isNull);
      expect(photoEntityTypeFromWire('basura'), isNull);
    });
  });
}
