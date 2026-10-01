import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/reports/daily_report_form_view.dart';
import 'package:mobile/app/reports/daily_report_form_view_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/task.dart';
import 'package:mobile/domain/usecases/add_photo_usecase.dart';
import 'package:mobile/domain/usecases/create_daily_report_usecase.dart';
import 'package:mobile/presentation/components/buttons/primary_button.dart';

import '../../domain/usecases/fakes.dart';

Widget _buildTestable(DailyReportFormViewModel vm, Task task) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: DailyReportFormView(
      viewModel: vm,
      task: task,
      companyId: 'comp-1',
      operatorId: 'op-1',
    ),
  );
}

void main() {
  late FakeDailyReportRepository reportRepo;
  late FakeRecipeReader recipeReader;
  late FakeTaskReader taskReader;
  late FakeInputReader inputReader;
  late FakeLotReader lotReader;
  late FakeLaborTypeReader laborTypeReader;
  late FakePhotoRepository photoRepo;
  late FakePhotoStorageRepository photoStorage;
  late DailyReportFormViewModel viewModel;

  final task = Task(
    id: 'task-1',
    lotId: 'l-1',
    laborTypeId: 'labor-1',
    status: TaskStatus.PENDING,
  );

  setUp(() {
    reportRepo = FakeDailyReportRepository();
    recipeReader = FakeRecipeReader();
    taskReader = FakeTaskReader();
    inputReader = FakeInputReader();
    lotReader = FakeLotReader();
    laborTypeReader = FakeLaborTypeReader();
    photoRepo = FakePhotoRepository();
    photoStorage = FakePhotoStorageRepository();
    final createUseCase =
        CreateDailyReportUseCase(reportRepo, recipeReader, taskReader);
    final addPhotoUseCase = AddPhotoUseCase(photoRepo, photoStorage);
    final photoPicker = FakePhotoPickerService();

    viewModel = DailyReportFormViewModel(
      createUseCase: createUseCase,
      inputReader: inputReader,
      lotReader: lotReader,
      laborTypeReader: laborTypeReader,
      addPhotoUseCase: addPhotoUseCase,
      photoPickerService: photoPicker,
    );
  });

  group('CUU05 — DailyReportFormView', () {
    testWidgets('renderiza el wizard con el encabezado de tarea',
        (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel, task));
      await tester.pumpAndSettle();

      expect(find.text('Parte Diario'), findsOneWidget);
      // "Jornada" aparece como label del stepper y como título de la sección 1.
      expect(find.text('Jornada'), findsNWidgets(2));
      expect(find.text('Insumos'), findsOneWidget);
      expect(find.text('Fotos y resumen'), findsOneWidget);
      // Encabezado resumen de la tarea (solo lectura).
      expect(find.text('Tarea'), findsOneWidget);
      expect(find.text('Lote'), findsOneWidget);
      expect(find.text('Labor'), findsOneWidget);
    });

    testWidgets('Siguiente habilitado por defecto (fecha hoy válida)',
        (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel, task));
      await tester.pumpAndSettle();

      final nextButton = tester.widget<PrimaryButton>(
        find.widgetWithText(PrimaryButton, 'Siguiente'),
      );
      expect(nextButton.onPressed, isNotNull);
    });

    testWidgets('bloquea fechas futuras (C1)', (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel, task));
      await tester.pumpAndSettle();

      final tomorrow = DateTime.now().add(const Duration(days: 1));
      final dd = tomorrow.day.toString().padLeft(2, '0');
      final mm = tomorrow.month.toString().padLeft(2, '0');
      final futureDate = '$dd/$mm/${tomorrow.year}';

      await tester.enterText(find.byType(TextField).first, futureDate);
      await tester.pumpAndSettle();

      expect(find.text('No se permiten fechas futuras'), findsOneWidget);
    });
  });
}
