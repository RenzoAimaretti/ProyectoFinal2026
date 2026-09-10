import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/models/daily_report.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/usecases/create_daily_report_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeDailyReportRepository reportRepo;
  late FakeRecipeReader recipeReader;
  late CreateDailyReportUseCase sut;

  final now = DateTime(2026, 6, 15);

  setUp(() {
    reportRepo = FakeDailyReportRepository();
    recipeReader = FakeRecipeReader();
    sut = CreateDailyReportUseCase(reportRepo, recipeReader);
  });

  Recipe _seedRecipe(String lotId) {
    final recipe = Recipe(
      id: 'recipe-1',
      lotId: lotId,
      date: now,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    );
    recipeReader.seedRecipe(recipe);
    return recipe;
  }

  group('éxito', () {
    test('crea parte con receta y datos válidos → PENDING_APPROVAL', () async {
      _seedRecipe('lot-1');

      final id = await sut.execute(
        operatorId: 'op-1',
        companyId: 'company-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        date: now,
        hectares: 10.0,
        hours: 8.0,
        items: [
          const DailyReportItem(inputId: 'input-1', quantity: 5, unit: 'L'),
        ],
      );

      expect(id, isNotEmpty);
      expect(reportRepo.reports, hasLength(1));
      expect(reportRepo.reports.first.status,
          equals(DailyReportStatus.PENDING_APPROVAL));
    });
  });

  group('validaciones', () {
    test('R009: lote sin receta → LotWithoutRecipeException', () async {
      expect(
        () => sut.execute(
          operatorId: 'op-1',
          companyId: 'company-1',
          lotId: 'lot-sin-receta',
          laborTypeId: 'labor-1',
          date: now,
          hectares: 10.0,
          hours: 8.0,
          items: [],
        ),
        throwsA(isA<LotWithoutRecipeException>()),
      );
    });

    test('hectáreas ≤ 0 → InvalidWorkDataException', () async {
      _seedRecipe('lot-1');

      expect(
        () => sut.execute(
          operatorId: 'op-1',
          companyId: 'company-1',
          lotId: 'lot-1',
          laborTypeId: 'labor-1',
          date: now,
          hectares: 0,
          hours: 8.0,
          items: [],
        ),
        throwsA(isA<InvalidWorkDataException>()),
      );
    });

    test('horas ≤ 0 → InvalidWorkDataException', () async {
      _seedRecipe('lot-1');

      expect(
        () => sut.execute(
          operatorId: 'op-1',
          companyId: 'company-1',
          lotId: 'lot-1',
          laborTypeId: 'labor-1',
          date: now,
          hectares: 10.0,
          hours: 0,
          items: [],
        ),
        throwsA(isA<InvalidWorkDataException>()),
      );
    });

    test('cantidad de ítem ≤ 0 → InvalidItemQuantityException', () async {
      _seedRecipe('lot-1');

      expect(
        () => sut.execute(
          operatorId: 'op-1',
          companyId: 'company-1',
          lotId: 'lot-1',
          laborTypeId: 'labor-1',
          date: now,
          hectares: 10.0,
          hours: 8.0,
          items: [
            const DailyReportItem(inputId: 'input-1', quantity: 0, unit: 'L'),
          ],
        ),
        throwsA(isA<InvalidItemQuantityException>()),
      );
    });
  });
}
