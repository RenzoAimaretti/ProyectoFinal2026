import 'dart:async';

import '../../domain/models/daily_report.dart';
import '../../domain/usecases/list_daily_reports_usecase.dart';

/// ViewModel de la bandeja de partes diarios (CUU05, lista).
///
/// Expone un `Stream<List<DailyReport>>` alimentado por el `watch` de drift:
/// la vista se refresca sola ante cada insert/update (p. ej. al volver de
/// guardar un parte nuevo).
class DailyReportsViewModel {
  DailyReportsViewModel(this._listUseCase);

  final ListDailyReportsUseCase _listUseCase;

  /// Partes diarios (todos los estados), ordenados por fecha descendente.
  Stream<List<DailyReport>> get reports => _listUseCase.execute();
}
