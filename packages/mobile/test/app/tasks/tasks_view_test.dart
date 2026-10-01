import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/tasks/tasks_view.dart';
import 'package:mobile/app/tasks/tasks_view_model.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/task.dart';
import 'package:mobile/domain/usecases/list_assigned_tasks_usecase.dart';

import '../../domain/usecases/fakes.dart';

Widget _buildTestable(TasksViewModel vm) {
  return MaterialApp(
    theme: AppTheme.lightTheme,
    home: Scaffold(
      body: TasksView(
        viewModel: vm,
        operatorId: 'op-1',
        onLoadTask: (_) {},
      ),
    ),
  );
}

void main() {
  late FakeTaskReader taskReader;
  late TasksViewModel viewModel;

  setUp(() {
    taskReader = FakeTaskReader();
    viewModel = TasksViewModel(
      ListAssignedTasksUseCase(taskReader),
      taskReader,
    );
  });

  group('CUU08 — TasksView', () {
    testWidgets('muestra las tareas asignadas con su estado', (tester) async {
      taskReader.seed(Task(
        id: 'task-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        status: TaskStatus.PENDING,
      ));

      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      expect(find.text('Pendiente'), findsWidgets);
      expect(find.text('Cargar sobre otra tarea'), findsOneWidget);
    });

    testWidgets('sin tareas asignadas muestra el estado vacío', (tester) async {
      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      expect(find.text('No tenés tareas asignadas'), findsOneWidget);
    });

    testWidgets('"Cargar sobre otra tarea" abre el selector A4', (tester) async {
      taskReader.seed(Task(
        id: 'task-1',
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        status: TaskStatus.PENDING,
      ));

      await tester.pumpWidget(_buildTestable(viewModel));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Cargar sobre otra tarea'));
      await tester.pumpAndSettle();

      expect(find.text('Seleccionar tarea'), findsOneWidget);
    });
  });
}
