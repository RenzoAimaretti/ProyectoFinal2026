import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/reception.dart';
import 'package:mobile/domain/usecases/list_receptions_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeReceptionRepository receptionRepo;
  late ListReceptionsUseCase sut;

  setUp(() {
    receptionRepo = FakeReceptionRepository();
    sut = ListReceptionsUseCase(receptionRepo);
  });

  Reception newReception({ReceptionStatus status = ReceptionStatus.PENDING_VALIDATION}) =>
      Reception(
        clientId: 'client-1',
        date: DateTime(2026, 6, 15),
        status: status,
      );

  test('execute devuelve todas las recepciones (watchAll)', () async {
    await receptionRepo.create(newReception(), []);
    await receptionRepo.create(
      newReception(status: ReceptionStatus.VALIDATED),
      [],
    );

    final result = await sut.execute().first;
    expect(result, hasLength(2));
  });

  test('watchSummaries resuelve clientName para listados', () async {
    await receptionRepo.create(newReception(), []);

    final result = await sut.watchSummaries().first;
    expect(result, hasLength(1));
    expect(result.first.clientName, 'Cliente client-1');
  });

  test('sin recepciones el stream está vacío', () async {
    final result = await sut.execute().first;
    expect(result, isEmpty);
  });
}
