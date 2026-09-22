import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/repositories/drift_reception_repository.dart';
import 'package:mobile/data/services/app_database.dart' hide Reception, ReceptionItem;
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

  test('create + watchAll refleja la recepción (solo lectura)', () async {
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

    final all = await sut.watchAll().first;
    expect(all, hasLength(1));
    expect(all.first.status, ReceptionStatus.PENDING_VALIDATION);
  });

  test('watchSummaries resuelve clientName por join', () async {
    await sut.create(
      Reception(
        clientId: 'client-1',
        date: DateTime(2026, 6, 15),
        status: ReceptionStatus.VALIDATED,
      ),
      [
        const ReceptionItem(inputId: 'input-1', quantity: 100, unit: 'L'),
      ],
    );

    final result = await sut.watchSummaries().first;
    expect(result, hasLength(1));
    expect(result.first.clientName, 'Cliente Test');
  });
}
