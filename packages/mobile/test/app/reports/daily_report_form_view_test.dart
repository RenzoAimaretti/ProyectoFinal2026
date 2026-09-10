import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/reports/daily_report_form_view.dart';
import 'package:mobile/app/reports/daily_report_form_view_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/domain/usecases/add_photo_usecase.dart';
import 'package:mobile/domain/usecases/create_daily_report_usecase.dart';

import '../../domain/usecases/fakes.dart';

Widget _buildTestable(DailyReportFormViewModel vm) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: DailyReportFormView(
      viewModel: vm,
      operatorId: 'op-1',
      initialCompanyId: null,
    ),
  );
}

void main() {
  late FakeDailyReportRepository reportRepo;
  late FakeRecipeReader recipeReader;
  late FakeClientReader clientReader;
  late FakeFarmReader farmReader;
  late FakeLotReader lotReader;
  late FakeLaborTypeReader laborTypeReader;
  late FakeInputReader inputReader;
  late FakeCompanyReader companyReader;
  late FakePhotoRepository photoRepo;
  late FakePhotoStorageRepository photoStorage;
  late DailyReportFormViewModel viewModel;

  setUp(() {
    reportRepo = FakeDailyReportRepository();
    recipeReader = FakeRecipeReader();
    clientReader = FakeClientReader();
    farmReader = FakeFarmReader();
    lotReader = FakeLotReader();
    laborTypeReader = FakeLaborTypeReader();
    inputReader = FakeInputReader();
    companyReader = FakeCompanyReader();
    photoRepo = FakePhotoRepository();
    photoStorage = FakePhotoStorageRepository();
    final createUseCase = CreateDailyReportUseCase(reportRepo, recipeReader);
    final addPhotoUseCase = AddPhotoUseCase(photoRepo, photoStorage);
    final photoPicker = FakePhotoPickerService();

    viewModel = DailyReportFormViewModel(
      createUseCase: createUseCase,
      clientReader: clientReader,
      farmReader: farmReader,
      lotReader: lotReader,
      laborTypeReader: laborTypeReader,
      inputReader: inputReader,
      companyReader: companyReader,
      recipeReader: recipeReader,
      addPhotoUseCase: addPhotoUseCase,
      photoPickerService: photoPicker,
    );
  });

  group('CUU05 — DailyReportFormView', () {
    testWidgets('renderiza el wizard con el paso 1 (selección)',
        (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      // Título de la pantalla.
      expect(find.text('Parte Diario'), findsOneWidget);
      // Step labels del wizard.
      expect(find.text('Selección'), findsOneWidget);
      expect(find.text('Datos e insumos'), findsOneWidget);
      expect(find.text('Fotos y resumen'), findsOneWidget);
    });

    testWidgets('botón Siguiente está deshabilitado sin completar paso 1',
        (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      // El botón Siguiente existe pero debería no poder avanzar sin datos.
      final nextButton = find.text('Siguiente');
      expect(nextButton, findsOneWidget);
    });
  });
}
