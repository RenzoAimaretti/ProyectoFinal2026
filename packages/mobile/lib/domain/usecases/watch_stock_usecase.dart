import 'dart:async';

import '../models/stock.dart';
import '../repositories/stock_repository.dart';

/// CUU06: stock por cliente para el KPI del dashboard (stream).
class WatchStockUseCase {
  WatchStockUseCase(this._stockRepository);

  final StockRepository _stockRepository;

  Stream<List<Stock>> execute(String clientId) =>
      _stockRepository.watchByClient(clientId);
}
