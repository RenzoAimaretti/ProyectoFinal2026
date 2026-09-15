import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../domain/models/daily_report.dart';
import '../../domain/usecases/list_daily_reports_usecase.dart';

/// ViewModel de la bandeja de partes diarios (CUU05, lista).
///
/// Expone un `Stream<List<DailyReport>>` alimentado por el `watch` de drift:
/// la vista se refresca sola ante cada insert/update (p. ej. al volver de
/// guardar un parte nuevo). Es un [ChangeNotifier] porque la firma activa
/// puede cambiar (selector global post-login) y, al hacerlo, emite un stream
/// nuevo filtrado por esa firma.
class DailyReportsViewModel extends ChangeNotifier {
  DailyReportsViewModel(this._listUseCase);

  final ListDailyReportsUseCase _listUseCase;

  String? _companyId;

  /// Firma activa (null = sin filtro, se muestran todos los partes).
  String? get companyId => _companyId;

  /// Partes diarios de la firma activa (o todos si es null), ordenados por
  /// fecha descendente.
  Stream<List<DailyReport>> get reports =>
      _listUseCase.watchByCompany(_companyId);

  /// Cambia la firma activa y notifica para que la vista resuscriba el stream.
  void setCompany(String? companyId) {
    if (_companyId == companyId) return;
    _companyId = companyId;
    notifyListeners();
  }
}
