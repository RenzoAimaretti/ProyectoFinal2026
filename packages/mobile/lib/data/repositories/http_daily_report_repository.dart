import '../../domain/errors.dart';
import '../../domain/models/daily_report.dart' as domain;
import '../../domain/repositories/daily_report_remote_repository.dart';
import '../services/daily_report_api_service.dart';

/// Implementación HTTP del puerto [DailyReportRemoteRepository].
///
/// Arma el payload wire `{id, taskId, date, hectares, hours, items[]}` —sin
/// `lotId`/`taskTypeId`/`companyId`/`operatorId`, que deriva el backend— y
/// delega el transporte en [DailyReportApiService].
class HttpDailyReportRepository implements DailyReportRemoteRepository {
  HttpDailyReportRepository({DailyReportApiService? apiService})
      : _apiService = apiService ?? DailyReportApiService();

  final DailyReportApiService _apiService;

  @override
  Future<void> push(
    domain.DailyReport report,
    List<domain.DailyReportItem> items, {
    required String token,
  }) {
    final id = report.id;
    if (id == null) {
      // No debería ocurrir: el handler resuelve un parte ya persistido en drift.
      throw const SyncPermanentException('El parte diario no tiene id');
    }

    return _apiService.create(
      token: token,
      payload: {
        'id': id,
        'taskId': report.taskId,
        'date': report.date.toIso8601String(),
        'hectares': report.hectares,
        'hours': report.hours,
        'items': [
          for (final item in items)
            {
              'inputId': item.inputId,
              'quantity': item.quantity,
              'unit': item.unit,
            },
        ],
      },
    );
  }
}
