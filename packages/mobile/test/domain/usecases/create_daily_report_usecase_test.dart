import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/models/daily_report.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/task.dart';
import 'package:mobile/domain/usecases/create_daily_report_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeDailyReportRepository reportRepo;
  late FakeRecipeReader recipeReader;
  late FakeTaskReader taskReader;
  late CreateDailyReportUseCase sut;

  final now = DateTime(2026, 6, 15);

  setUp(() {
    reportRepo = FakeDailyReportRepository();
    recipeReader = FakeRecipeReader();
    taskReader = FakeTaskReader();
    sut = CreateDailyReportUseCase(reportRepo, recipeReader, taskReader);
  });

  /// Siembra una tarea (id por defecto `task-1`, lote `lot-1`) y devuelve su id.
  void seedTask({String id = 'task-1', String lotId = 'lot-1'}) {
    taskReader.seed(Task(
      id: id,
      lotId: lotId,
      laborTypeId: 'labor-1',
      status: TaskStatus.PENDING,
    ));
  }

  /// Siembra una receta agronómica para [lotId] (R009).
  void seedRecipe(String lotId) {
    recipeReader.seedRecipe(Recipe(
      id: 'recipe-1',
      lotId: lotId,
      date: now,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    ));
  }

  group('éxito', () {
    test('crea parte heredando lote/labor de la tarea → PENDING_APPROVAL',
        () async {
      seedTask();
      seedRecipe('lot-1');

      final id = await sut.execute(
        operatorId: 'op-1',
        companyId: 'company-1',
        taskId: 'task-1',
        date: now,
        hectares: 10.0,
        hours: 8.0,
        items: [
          const DailyReportItem(inputId: 'input-1', quantity: 5, unit: 'L'),
        ],
      );

      expect(id, isNotEmpty);
      expect(reportRepo.reports, hasLength(1));

      final report = reportRepo.reports.first;
      expect(report.status, equals(DailyReportStatus.PENDING_APPROVAL));
      // R007: hereda lote y labor de la tarea referenciada.
      expect(report.taskId, 'task-1');
      expect(report.lotId, 'lot-1');
      expect(report.laborTypeId, 'labor-1');
      // Firma heredada del selector global.
      expect(report.companyId, 'company-1');
    });
  });

  group('validaciones', () {
    test('tarea inexistente → TaskNotFoundException', () async {
      expect(
        () => sut.execute(
          operatorId: 'op-1',
          companyId: 'company-1',
          taskId: 'task-inexistente',
          date: now,
          hectares: 10.0,
          hours: 8.0,
          items: [],
        ),
        throwsA(isA<TaskNotFoundException>()),
      );
    });

    test('R009: lote sin receta → LotWithoutRecipeException', () async {
      seedTask(lotId: 'lot-sin-receta');

      expect(
        () => sut.execute(
          operatorId: 'op-1',
          companyId: 'company-1',
          taskId: 'task-1',
          date: now,
          hectares: 10.0,
          hours: 8.0,
          items: [],
        ),
        throwsA(isA<LotWithoutRecipeException>()),
      );
    });

    test('hectáreas ≤ 0 → InvalidWorkDataException', () async {
      seedTask();
      seedRecipe('lot-1');

      expect(
        () => sut.execute(
          operatorId: 'op-1',
          companyId: 'company-1',
          taskId: 'task-1',
          date: now,
          hectares: 0,
          hours: 8.0,
          items: [],
        ),
        throwsA(isA<InvalidWorkDataException>()),
      );
    });

    test('horas ≤ 0 → InvalidWorkDataException', () async {
      seedTask();
      seedRecipe('lot-1');

      expect(
        () => sut.execute(
          operatorId: 'op-1',
          companyId: 'company-1',
          taskId: 'task-1',
          date: now,
          hectares: 10.0,
          hours: 0,
          items: [],
        ),
        throwsA(isA<InvalidWorkDataException>()),
      );
    });

    test('cantidad de ítem ≤ 0 → InvalidItemQuantityException', () async {
      seedTask();
      seedRecipe('lot-1');

      expect(
        () => sut.execute(
          operatorId: 'op-1',
          companyId: 'company-1',
          taskId: 'task-1',
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
