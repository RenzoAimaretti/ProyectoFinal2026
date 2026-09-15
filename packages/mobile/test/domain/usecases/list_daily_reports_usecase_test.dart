import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/models/daily_report.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/usecases/list_daily_reports_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeDailyReportRepository reportRepo;
  late ListDailyReportsUseCase sut;

  setUp(() {
    reportRepo = FakeDailyReportRepository();
    sut = ListDailyReportsUseCase(reportRepo);
  });

  test('execute delega a watchByFilter', () async {
    final result = await sut.execute().first;
    expect(result, isEmpty);
  });

  test('watchByCompany con null devuelve todos (sin filtro)', () async {
    final result = await sut.watchByCompany(null).first;
    expect(result, isEmpty);
  });

  test('watchByCompany con id filtra por firma', () async {
    // Populamos el repo con un parte de company-1.
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

    final filtered = await sut.watchByCompany('company-1').first;
    expect(filtered, hasLength(1));

    final empty = await sut.watchByCompany('company-99').first;
    expect(empty, isEmpty);
  });
}
