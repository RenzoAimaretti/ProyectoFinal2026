import '../models/daily_report.dart';

/// Puerto remoto del parte diario (push hacia el backend).
///
/// El adaptador HTTP arma el payload wire `{id, taskId, date, hectares, hours,
/// items[]}` (sin `lotId`/`taskTypeId`/`companyId`/`operatorId`: los deriva el
/// backend) y lanza las excepciones de sync ante 401/4xx/5xx/red.
abstract class DailyReportRemoteRepository {
  Future<void> push(
    DailyReport report,
    List<DailyReportItem> items, {
    required String token,
  });
}
