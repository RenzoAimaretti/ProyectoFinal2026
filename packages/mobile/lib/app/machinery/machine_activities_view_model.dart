import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../domain/models/machine_activity.dart';
import '../../domain/usecases/list_machine_activities_usecase.dart';

/// ViewModel del historial de actividades de maquinaria (CUU08, lista).
///
/// Expone un `Stream<List<MachineActivity>>` alimentado por el `watch` de
/// drift: la vista se refresca sola ante cada insert. Es un [ChangeNotifier]
/// porque la firma activa puede cambiar (selector global post-login) y, al
/// hacerlo, emite un stream nuevo filtrado por esa firma.
class MachineActivitiesViewModel extends ChangeNotifier {
  MachineActivitiesViewModel(this._listUseCase);

  final ListMachineActivitiesUseCase _listUseCase;

  String? _companyId;

  /// Firma activa (null = sin filtro, se muestran todas las actividades).
  String? get companyId => _companyId;

  /// Actividades de la firma activa (o todas si es null), ordenadas por fecha
  /// descendente.
  Stream<List<MachineActivity>> get activities =>
      _listUseCase.watchByCompany(_companyId);

  /// Cambia la firma activa y notifica para que la vista resuscriba el stream.
  void setCompany(String? companyId) {
    if (_companyId == companyId) return;
    _companyId = companyId;
    notifyListeners();
  }
}
