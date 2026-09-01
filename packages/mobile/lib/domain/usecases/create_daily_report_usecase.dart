import 'dart:async';

import '../errors.dart';
import '../models/daily_report.dart';
import '../models/enums.dart';
import '../repositories/daily_report_repository.dart';
import '../repositories/recipe_reader.dart';

/// CUU05: crea un parte diario (cabecera + ítems) con estado inicial
/// [DailyReportStatus.PENDING_APPROVAL]. Bloquea la carga si el lote no tiene
/// receta agronómica (R009).
class CreateDailyReportUseCase {
  CreateDailyReportUseCase(this._repository, this._recipeReader);

  final DailyReportRepository _repository;
  final RecipeReader _recipeReader;

  Future<void> execute({
    required String operatorId,
    required String companyId,
    required String lotId,
    required String laborTypeId,
    required DateTime date,
    required double hectares,
    required double hours,
    required List<DailyReportItem> items,
  }) async {
    // R009: sin receta agronómica no se habilita la carga del parte.
    final recipes = await _recipeReader.watchByLot(lotId).first;
    if (recipes.isEmpty) {
      throw LotWithoutRecipeException(lotId);
    }

    final report = DailyReport(
      operatorId: operatorId,
      companyId: companyId,
      lotId: lotId,
      laborTypeId: laborTypeId,
      date: date,
      hectares: hectares,
      hours: hours,
      status: DailyReportStatus.PENDING_APPROVAL,
    );

    await _repository.create(report, items);
  }
}
