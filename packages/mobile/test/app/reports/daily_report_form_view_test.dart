import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/reports/daily_report_form_view.dart';
import 'package:mobile/app/reports/daily_report_form_view_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/usecases/add_photo_usecase.dart';
import 'package:mobile/domain/usecases/create_daily_report_usecase.dart';
import 'package:mobile/presentation/components/buttons/primary_button.dart';

import '../../domain/usecases/fakes.dart';

Widget _buildTestable(DailyReportFormViewModel vm, {String? initialCompanyId}) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: DailyReportFormView(
      viewModel: vm,
      operatorId: 'op-1',
      initialCompanyId: initialCompanyId,
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

      final nextButtonFinder = find.widgetWithText(PrimaryButton, 'Siguiente');
      expect(nextButtonFinder, findsOneWidget);
      final nextButton = tester.widget<PrimaryButton>(nextButtonFinder);
      expect(nextButton.onPressed, isNull);
    });

    testWidgets(
        'bloqueo R009: al seleccionar lote sin receta muestra advertencia y bloquea Siguiente',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      addTearDown(tester.view.resetPhysicalSize);

      // Sembrar datos de catálogo sin receta.
      companyReader.seed(Company(
        id: 'comp-1',
        name: 'AgroEmpresa SA',
        cuit: '30-11111111-1',
        active: true,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        version: 1,
        deleted: false,
      ));
      clientReader.seed(Client(
        id: 'c-1',
        name: 'Cliente Los Pinos',
        active: true,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        version: 1,
        deleted: false,
      ));
      farmReader.seed(Farm(
        id: 'f-1',
        clientId: 'c-1',
        name: 'Campo Norte',
        surface: 100.0,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        version: 1,
        deleted: false,
      ));
      lotReader.seed(Lot(
        id: 'l-1',
        farmId: 'f-1',
        name: 'Lote 14',
        area: 50.0,
        active: true,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        version: 1,
        deleted: false,
      ));
      laborTypeReader.seed(LaborType(
        id: 'lab-1',
        name: 'Fumigación',
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        version: 1,
        deleted: false,
      ));
      // No sembramos receta en recipeReader para l-1.

      await tester.pumpWidget(_buildTestable(viewModel, initialCompanyId: 'comp-1'));
      await tester.pumpAndSettle();

      // Seleccionar cliente.
      await tester.ensureVisible(find.text('Seleccionar cliente...'));
      await tester.tap(find.text('Seleccionar cliente...'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cliente Los Pinos').last);
      await tester.pumpAndSettle();

      // Seleccionar campo.
      await tester.ensureVisible(find.text('Seleccionar campo...'));
      await tester.tap(find.text('Seleccionar campo...'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Campo Norte').last);
      await tester.pumpAndSettle();

      // Seleccionar lote.
      await tester.ensureVisible(find.text('Seleccionar lote...'));
      await tester.tap(find.text('Seleccionar lote...'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lote 14').last);
      await tester.pumpAndSettle();

      // Debe aparecer el banner de advertencia R009.
      expect(
        find.text(
          'Este lote no tiene una receta agronómica asociada. '
          'No se puede cargar el parte sin receta (R009).',
        ),
        findsOneWidget,
      );

      // El botón Siguiente debe seguir deshabilitado por el bloqueo R009.
      final nextButton = tester.widget<PrimaryButton>(
        find.widgetWithText(PrimaryButton, 'Siguiente'),
      );
      expect(nextButton.onPressed, isNull);
    });

    testWidgets(
        'happy path R009: al seleccionar lote con receta válida no muestra advertencia',
        (tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      addTearDown(tester.view.resetPhysicalSize);

      companyReader.seed(Company(
        id: 'comp-1',
        name: 'AgroEmpresa SA',
        cuit: '30-11111111-1',
        active: true,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        version: 1,
        deleted: false,
      ));
      clientReader.seed(Client(
        id: 'c-1',
        name: 'Cliente Los Pinos',
        active: true,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        version: 1,
        deleted: false,
      ));
      farmReader.seed(Farm(
        id: 'f-1',
        clientId: 'c-1',
        name: 'Campo Norte',
        surface: 100.0,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        version: 1,
        deleted: false,
      ));
      lotReader.seed(Lot(
        id: 'l-1',
        farmId: 'f-1',
        name: 'Lote 14',
        area: 50.0,
        active: true,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        version: 1,
        deleted: false,
      ));
      laborTypeReader.seed(LaborType(
        id: 'lab-1',
        name: 'Fumigación',
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
        version: 1,
        deleted: false,
      ));
      // Sembramos la receta para l-1.
      recipeReader.seedRecipe(Recipe(
        id: 'rec-1',
        lotId: 'l-1',
        date: DateTime(2026, 1, 1),
        status: 'ACTIVE',
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
      ));

      await tester.pumpWidget(_buildTestable(viewModel, initialCompanyId: 'comp-1'));
      await tester.pumpAndSettle();

      // Seleccionar cliente.
      await tester.ensureVisible(find.text('Seleccionar cliente...'));
      await tester.tap(find.text('Seleccionar cliente...'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cliente Los Pinos').last);
      await tester.pumpAndSettle();

      // Seleccionar campo.
      await tester.ensureVisible(find.text('Seleccionar campo...'));
      await tester.tap(find.text('Seleccionar campo...'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Campo Norte').last);
      await tester.pumpAndSettle();

      // Seleccionar lote.
      await tester.ensureVisible(find.text('Seleccionar lote...'));
      await tester.tap(find.text('Seleccionar lote...'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lote 14').last);
      await tester.pumpAndSettle();

      // No debe existir el warning de R009.
      expect(
        find.text(
          'Este lote no tiene una receta agronómica asociada. '
          'No se puede cargar el parte sin receta (R009).',
        ),
        findsNothing,
      );
    });
  });
}
