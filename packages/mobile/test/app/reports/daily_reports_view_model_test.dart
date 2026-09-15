import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/reports/daily_reports_view_model.dart';
import 'package:mobile/domain/models/daily_report.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/usecases/list_daily_reports_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  late FakeDailyReportRepository reportRepo;
  late ListDailyReportsUseCase listUseCase;
  late DailyReportsViewModel sut;

  setUp(() {
    reportRepo = FakeDailyReportRepository();
    listUseCase = ListDailyReportsUseCase(reportRepo);
    sut = DailyReportsViewModel(listUseCase);
  });

  test('reports devuelve stream de todos los partes sin firma', () async {
    await reportRepo.create(
      DailyReport(
        operatorId: 'op-1',
        companyId: 'company-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        date: DateTime(2026, 1, 1),
        hectares: 10,
        hours: 8,
        status: DailyReportStatus.PENDING_APPROVAL,
      ),
      [],
    );

    final result = await sut.reports.first;
    expect(result, hasLength(1));
  });

  test('setCompany notifica listeners y cambia el filtro', () {
    var notified = false;
    sut.addListener(() => notified = true);

    sut.setCompany('company-1');

    expect(notified, isTrue);
    expect(sut.companyId, 'company-1');
  });

  test('setCompany con el mismo valor no notifica', () {
    sut.setCompany('company-1');

    var notified = false;
    sut.addListener(() => notified = true);

    sut.setCompany('company-1');
    expect(notified, isFalse);
  });
}
