import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/reception.dart';
import 'package:mobile/domain/usecases/create_reception_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeReceptionRepository receptionRepo;
  late CreateReceptionUseCase sut;

  setUp(() {
    receptionRepo = FakeReceptionRepository();
    sut = CreateReceptionUseCase(receptionRepo);
  });

  test('crea recepción con ítems válidos → PENDING_VALIDATION', () async {
    final id = await sut.execute(
      clientId: 'client-1',
      date: DateTime(2026, 6, 15),
      items: [
        const ReceptionItem(inputId: 'input-1', quantity: 100, unit: 'KG'),
      ],
    );

    expect(id, isNotEmpty);
  });

  test('cantidad de ítem ≤ 0 → InvalidItemQuantityException', () async {
    expect(
      () => sut.execute(
        clientId: 'client-1',
        date: DateTime(2026, 6, 15),
        items: [
          const ReceptionItem(inputId: 'input-1', quantity: 0, unit: 'KG'),
        ],
      ),
      throwsA(isA<InvalidItemQuantityException>()),
    );
  });

  test('cantidad negativa → InvalidItemQuantityException', () async {
    expect(
      () => sut.execute(
        clientId: 'client-1',
        date: DateTime(2026, 6, 15),
        items: [
          const ReceptionItem(inputId: 'input-1', quantity: -5, unit: 'L'),
        ],
      ),
      throwsA(isA<InvalidItemQuantityException>()),
    );
  });
}
