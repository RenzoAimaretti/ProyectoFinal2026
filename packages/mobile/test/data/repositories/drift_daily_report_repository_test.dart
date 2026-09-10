import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_daily_report_repository.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/domain/models/daily_report.dart';
import 'package:mobile/domain/models/enums.dart';

import 'drift_test_helper.dart';

void main() {
  late AppDatabase db;
  late DriftDailyReportRepository sut;

  setUp(() async {
    db = createTestDatabase();
    sut = DriftDailyReportRepository(db);

    // Insertar FKs requeridas por DailyReports.
    await db.into(db.companies).insert(CompaniesCompanion.insert(
          id: Value('company-1'),
          name: 'Firma Test',
          cuit: '30-12345678-9',
        ));
    await db.into(db.clients).insert(ClientsCompanion.insert(
          id: Value('client-1'),
          name: 'Cliente Test',
        ));
    await db.into(db.farms).insert(FarmsCompanion.insert(
          id: Value('farm-1'),
          clientId: 'client-1',
          name: 'Campo Test',
          surface: 500.0,
        ));
    await db.into(db.lots).insert(LotsCompanion.insert(
          id: Value('lot-1'),
          farmId: 'farm-1',
          name: 'Lote 1',
          area: 100.0,
        ));
    await db.into(db.laborTypes).insert(LaborTypesCompanion.insert(
          id: Value('labor-1'),
          name: 'Siembra',
        ));
    await db.into(db.inputs).insert(InputsCompanion.insert(
          id: Value('input-1'),
          name: 'Glifosato',
          unit: 'L',
        ));
  });

  tearDown(() => db.close());

  test('create cabecera + items en transacción devuelve id', () async {
    final report = DailyReport(
      operatorId: 'op-1',
      companyId: 'company-1',
      lotId: 'lot-1',
      laborTypeId: 'labor-1',
      date: DateTime(2026, 6, 15),
      hectares: 10.0,
      hours: 8.0,
      status: DailyReportStatus.PENDING_APPROVAL,
    );
    final items = [
      const DailyReportItem(inputId: 'input-1', quantity: 5, unit: 'L'),
    ];

    final id = await sut.create(report, items);

    expect(id, isNotEmpty);
  });

  test('watchByFilter refleja los partes creados', () async {
    await sut.create(
      DailyReport(
        operatorId: 'op-1',
        companyId: 'company-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        date: DateTime(2026, 6, 15),
        hectares: 10.0,
        hours: 8.0,
        status: DailyReportStatus.PENDING_APPROVAL,
      ),
      [],
    );

    final result = await sut.watchByFilter().first;
    expect(result, hasLength(1));
    expect(result.first.status, DailyReportStatus.PENDING_APPROVAL);
  });

  test('create encola en SyncQueue', () async {
    await sut.create(
      DailyReport(
        operatorId: 'op-1',
        companyId: 'company-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        date: DateTime(2026, 6, 15),
        hectares: 10.0,
        hours: 8.0,
        status: DailyReportStatus.PENDING_APPROVAL,
      ),
      [],
    );

    final pendingCount = await db.syncQueueDao.watchPendingCount().first;
    expect(pendingCount, greaterThan(0));
  });
}
