import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/machinery/machine_activity_form_view.dart';
import 'package:mobile/app/machinery/machine_activity_form_view_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/domain/usecases/register_machine_activity_usecase.dart';
import 'package:mobile/presentation/components/buttons/primary_button.dart';
import 'package:mobile/presentation/components/selectors/activity_type_selector.dart';

import '../../domain/usecases/fakes.dart';

Widget _buildTestable(MachineActivityFormViewModel vm) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: MachineActivityFormView(viewModel: vm),
  );
}

void main() {
  late FakeMachineActivityRepository activityRepo;
  late FakeMachineReader machineReader;
  late FakeCompanyReader companyReader;
  late MachineActivityFormViewModel viewModel;

  setUp(() {
    activityRepo = FakeMachineActivityRepository();
    machineReader = FakeMachineReader();
    companyReader = FakeCompanyReader();
    final registerUseCase = RegisterMachineActivityUseCase(activityRepo);
    viewModel = MachineActivityFormViewModel(
      registerUseCase: registerUseCase,
      machineReader: machineReader,
      companyReader: companyReader,
    );
  });

  group('CUU08 — MachineActivityFormView', () {
    testWidgets('renderiza los componentes principales', (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      expect(find.text('Actividad de Maquinaria'), findsOneWidget);
      expect(find.text('Máquina'), findsAtLeastNWidgets(1));
      expect(find.byType(ActivityTypeSelector), findsOneWidget);
      expect(find.byType(PrimaryButton), findsOneWidget);
      expect(find.text('Guardar actividad'), findsOneWidget);
    });

    testWidgets('sin máquina seleccionada muestra error al guardar',
        (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      await tester.tap(find.byType(PrimaryButton));
      await tester.pumpAndSettle();

      expect(find.text('Seleccioná la máquina.'), findsOneWidget);
    });

    testWidgets('muestra campos dinámicos de tipo seleccionado',
        (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      // Inicialmente muestra texto de selección de tipo.
      expect(
        find.text('Seleccioná un tipo de actividad para ver los campos.'),
        findsOneWidget,
      );
    });
  });
}
