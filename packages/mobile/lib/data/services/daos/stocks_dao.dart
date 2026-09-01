import 'package:drift/drift.dart';

import '../app_database.dart';
import '../tables/stock_tables.dart';

part 'stocks_dao.g.dart';

@DriftAccessor(tables: [Stocks])
class StocksDao extends DatabaseAccessor<AppDatabase> with _$StocksDaoMixin {
  StocksDao(AppDatabase db) : super(db);

  Stream<List<Stock>> watchByClient(String clientId) {
    return (select(stocks)..where((t) => t.clientId.equals(clientId))).watch();
  }
}
