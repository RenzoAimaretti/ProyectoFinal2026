import 'dart:async';

import '../errors.dart';
import '../models/daily_report.dart';
import '../models/enums.dart';
import '../repositories/daily_report_repository.dart';
import '../repositories/recipe_reader.dart';
import '../repositories/task_reader.dart';

/// CUU05: crea un parte diario (cabecera + ítems) con estado inicial
/// [DailyReportStatus.PENDING_APPROVAL]. El parte nace de una [Task] (R007):
/// hereda `lotId`/`laborTypeId` de ella y bloquea la carga si el lote no tiene
/// receta agronómica (R009).
class CreateDailyReportUseCase {
  CreateDailyReportUseCase(
    this._repository,
    this._recipeReader,
    this._taskReader,
  );

  final DailyReportRepository _repository;
  final RecipeReader _recipeReader;
  final TaskReader _taskReader;

  Future<String> execute({
    required String operatorId,
    required String companyId,
    required String taskId,
    required DateTime date,
    required double hectares,
    required double hours,
    required List<DailyReportItem> items,
  }) async {
    // R007: el parte hereda lote y labor de la tarea referenciada.
    final task = await _taskReader.getById(taskId);
    if (task == null) {
      throw TaskNotFoundException(taskId);
    }
    final lotId = task.lotId;
    final laborTypeId = task.laborTypeId;

    // R009: sin receta agronómica no se habilita la carga del parte.
    final recipes = await _recipeReader.watchByLot(lotId).first;
    if (recipes.isEmpty) {
      throw LotWithoutRecipeException(lotId);
    }

    // Jornada: hectáreas y horas son obligatorias y mayores a cero.
    if (hectares <= 0 || hours <= 0) {
      throw const InvalidWorkDataException(
        'Las hectáreas y las horas deben ser mayores a 0',
      );
    }

    // Cada ítem de consumo debe tener cantidad mayor a cero.
    for (final item in items) {
      if (item.quantity <= 0) {
        throw InvalidItemQuantityException(
          'La cantidad del insumo ${item.inputId} debe ser mayor a 0',
        );
      }
    }

    final report = DailyReport(
      operatorId: operatorId,
      companyId: companyId,
      taskId: taskId,
      lotId: lotId,
      laborTypeId: laborTypeId,
      date: date,
      hectares: hectares,
      hours: hours,
      status: DailyReportStatus.PENDING_APPROVAL,
    );

    // Devuelve el id del parte para que el formulario pueda asociar las fotos
    // (R008) a la entidad recién creada.
    return _repository.create(report, items);
  }
}
