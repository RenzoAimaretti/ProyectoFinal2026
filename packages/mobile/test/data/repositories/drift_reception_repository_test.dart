import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_reception_repository.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/reception.dart';

import 'drift_test_helper.dart';

void main() {
  late AppDatabase db;
  late DriftReceptionRepository sut;

  setUp(() async {
    db = createTestDatabase();
    sut = DriftReceptionRepository(db);

    // Insertar FKs requeridas.
    await db.into(db.clients).insert(ClientsCompanion.insert(
          id: Value('client-1'),
          name: 'Cliente Test',
        ));
    await db.into(db.inputs).insert(InputsCompanion.insert(
          id: Value('input-1'),
          name: 'Glifosato',
          unit: 'L',
        ));
  });

  tearDown(() => db.close());

  test('create + watchPending refleja la recepción', () async {
    final reception = Reception(
      clientId: 'client-1',
      date: DateTime(2026, 6, 15),
      status: ReceptionStatus.PENDING_VALIDATION,
    );
    final items = [
      const ReceptionItem(inputId: 'input-1', quantity: 100, unit: 'L'),
    ];

    final id = await sut.create(reception, items);
    expect(id, isNotEmpty);

    final pending = await sut.watchPending().first;
    expect(pending, hasLength(1));
    expect(pending.first.status, ReceptionStatus.PENDING_VALIDATION);
  });

  test('validateAndApplyStock cambia status y encola sync', () async {
    final id = await sut.create(
      Reception(
        clientId: 'client-1',
        date: DateTime(2026, 6, 15),
        status: ReceptionStatus.PENDING_VALIDATION,
      ),
      [
        const ReceptionItem(inputId: 'input-1', quantity: 100, unit: 'L'),
      ],
    );

    await sut.validateAndApplyStock(id, 'admin-1');

    // Tras validar la recepción ya no debería estar pendiente.
    final pending = await sut.watchPending().first;
    expect(pending, isEmpty);

    // El stock debería haberse incrementado.
    final stocks = await db.stocksDao.watchAll().first;
    expect(stocks, hasLength(1));
    expect(stocks.first.quantity, 100.0);
  });
}
