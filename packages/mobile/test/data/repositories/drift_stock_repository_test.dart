import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_stock_repository.dart';
import 'package:mobile/data/services/app_database.dart';

import 'drift_test_helper.dart';

void main() {
  late AppDatabase db;
  late DriftStockRepository sut;

  setUp(() async {
    db = createTestDatabase();
    sut = DriftStockRepository(db);

    // Insertar cliente (FK de Stocks) e insumo (FK de Stocks).
    await db.into(db.clients).insert(ClientsCompanion.insert(
          id: Value('client-1'),
          name: 'Cliente Test',
        ));
    await db.into(db.inputs).insert(InputsCompanion.insert(
          id: Value('input-1'),
          name: 'Glifosato',
          unit: 'L',
        ));
    await db.into(db.inputs).insert(InputsCompanion.insert(
          id: Value('input-2'),
          name: 'Urea',
          unit: 'KG',
        ));
  });

  tearDown(() => db.close());

  test('upsertIncrement crea stock nuevo si no existe', () async {
    await sut.upsertIncrement('client-1', 'input-1', 100);

    final result = await sut.watchByClient('client-1').first;
    expect(result, hasLength(1));
    expect(result.first.quantity, 100);
  });

  test('upsertIncrement suma sobre stock existente', () async {
    await sut.upsertIncrement('client-1', 'input-1', 100);
    await sut.upsertIncrement('client-1', 'input-1', 50);

    final result = await sut.watchByClient('client-1').first;
    expect(result, hasLength(1));
    expect(result.first.quantity, 150);
  });

  test('UNIQUE(clientId, inputId) se respeta', () async {
    await sut.upsertIncrement('client-1', 'input-1', 100);
    await sut.upsertIncrement('client-1', 'input-2', 50);

    final result = await sut.watchByClient('client-1').first;
    expect(result, hasLength(2));
  });

  test('watchAll devuelve todo el stock', () async {
    await sut.upsertIncrement('client-1', 'input-1', 100);

    final result = await sut.watchAll().first;
    expect(result, hasLength(1));
  });
}
