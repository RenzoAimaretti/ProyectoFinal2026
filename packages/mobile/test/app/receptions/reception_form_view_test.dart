import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/receptions/reception_form_view.dart';
import 'package:mobile/app/receptions/reception_form_view_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/usecases/add_photo_usecase.dart';
import 'package:mobile/domain/usecases/create_reception_usecase.dart';
import 'package:mobile/presentation/components/buttons/primary_button.dart';

import '../../domain/usecases/fakes.dart';

Widget _buildTestable(ReceptionFormViewModel vm) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: ReceptionFormView(viewModel: vm),
  );
}

void main() {
  late FakeReceptionRepository receptionRepo;
  late FakeClientReader clientReader;
  late FakeInputReader inputReader;
  late FakePhotoRepository photoRepo;
  late FakePhotoStorageRepository photoStorage;
  late ReceptionFormViewModel viewModel;

  setUp(() {
    receptionRepo = FakeReceptionRepository();
    clientReader = FakeClientReader();
    inputReader = FakeInputReader();
    photoRepo = FakePhotoRepository();
    photoStorage = FakePhotoStorageRepository();
    final createUseCase = CreateReceptionUseCase(receptionRepo);
    final addPhotoUseCase = AddPhotoUseCase(photoRepo, photoStorage);
    final photoPicker = FakePhotoPickerService();

    viewModel = ReceptionFormViewModel(
      createUseCase: createUseCase,
      clientReader: clientReader,
      inputReader: inputReader,
      addPhotoUseCase: addPhotoUseCase,
      photoPickerService: photoPicker,
    );
  });

  group('CUU06 — ReceptionFormView', () {
    testWidgets('renderiza los componentes principales', (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      expect(find.text('Recepción de Insumos'), findsOneWidget);
      expect(find.text('Cliente'), findsAtLeastNWidgets(1));
      expect(find.text('Insumos recibidos'), findsOneWidget);
      expect(find.byType(PrimaryButton), findsOneWidget);
      expect(find.text('Guardar recepción'), findsOneWidget);
    });

    testWidgets('sin cliente seleccionado muestra error al guardar',
        (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      await tester.tap(find.byType(PrimaryButton));
      await tester.pumpAndSettle();

      expect(
        find.text('Seleccioná el cliente que entrega los insumos'),
        findsOneWidget,
      );
    });

    testWidgets(
        'R008: grilla de fotos muestra contador 0/5 y refleja 5 fotos al límite',
        (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      // Contador inicial 0/5.
      expect(find.text('0/5'), findsOneWidget);

      // Seteamos 5 fotos (máximo según R008).
      viewModel.setPickedPhotos([
        '/tmp/remito_1.jpg',
        '/tmp/remito_2.jpg',
        '/tmp/remito_3.jpg',
        '/tmp/remito_4.jpg',
        '/tmp/remito_5.jpg',
      ]);
      await tester.pumpAndSettle();

      // Contador ahora refleja 5/5.
      expect(find.text('5/5'), findsOneWidget);
    });

    testWidgets(
        'happy path: con cliente seleccionado permite guardar la recepción',
        (tester) async {
      clientReader.seed(const Client(id: 'client-1', name: 'Agropecuaria Sur'));

      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      // Seleccionar cliente del dropdown.
      await tester.tap(find.text('Seleccionar cliente...'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Agropecuaria Sur').last);
      await tester.pumpAndSettle();

      // Guardar recepción.
      await tester.tap(find.byType(PrimaryButton));
      await tester.pumpAndSettle();

      // Verifica que se haya guardado en el repositorio.
      final pending = await receptionRepo.watchPending().first;
      expect(pending, hasLength(1));
      expect(pending.first.clientId, 'client-1');
    });
  });
}
