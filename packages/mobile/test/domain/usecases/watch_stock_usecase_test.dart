import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/usecases/watch_stock_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeStockRepository stockRepo;
  late WatchStockUseCase sut;

  setUp(() {
    stockRepo = FakeStockRepository();
    sut = WatchStockUseCase(stockRepo);
  });

  test('execute delega a watchByClient', () async {
    await stockRepo.upsertIncrement('client-1', 'input-1', 100);

    final result = await sut.execute('client-1').first;
    expect(result, hasLength(1));
    expect(result.first.quantity, 100);
  });

  test('watchAll devuelve todo el stock', () async {
    await stockRepo.upsertIncrement('client-1', 'input-1', 100);
    await stockRepo.upsertIncrement('client-2', 'input-1', 50);

    final result = await sut.watchAll().first;
    expect(result, hasLength(2));
  });
}
