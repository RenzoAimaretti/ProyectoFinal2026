import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/receptions/receptions_view.dart';
import 'package:mobile/app/receptions/receptions_view_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/reception.dart';
import 'package:mobile/domain/usecases/list_receptions_usecase.dart';

import '../../domain/usecases/fakes.dart';

Widget _buildTestable(ReceptionsViewModel vm) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: Scaffold(
      body: ReceptionsView(viewModel: vm),
    ),
  );
}

void main() {
  late FakeReceptionRepository receptionRepo;
  late ReceptionsViewModel viewModel;

  setUp(() {
    receptionRepo = FakeReceptionRepository();
    viewModel = ReceptionsViewModel(ListReceptionsUseCase(receptionRepo));
  });

  group('CUU06 — ReceptionsView (solo lectura)', () {
    testWidgets('lista las recepciones con nombre de cliente y estado',
        (tester) async {
      await receptionRepo.create(
        Reception(
          clientId: 'client-1',
          date: DateTime(2026, 6, 15),
          status: ReceptionStatus.PENDING_VALIDATION,
        ),
        [],
      );

      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      expect(find.text('Cliente client-1'), findsOneWidget);
      // Solo lectura: no existe el botón "Validar".
      expect(find.text('Validar'), findsNothing);
    });

    testWidgets('sin recepciones muestra el estado vacío', (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      expect(find.text('Aún no hay recepciones'), findsOneWidget);
    });
  });
}
