import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/receptions/receptions_view_model.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/reception.dart';
import 'package:mobile/domain/usecases/list_receptions_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  late FakeReceptionRepository receptionRepo;
  late ReceptionsViewModel sut;

  setUp(() {
    receptionRepo = FakeReceptionRepository();
    final listUseCase = ListReceptionsUseCase(receptionRepo);
    sut = ReceptionsViewModel(listUseCase);
  });

  test('receptions devuelve stream de resúmenes (solo lectura)', () async {
    await receptionRepo.create(
      Reception(
        clientId: 'client-1',
        date: DateTime(2026, 6, 15),
        status: ReceptionStatus.PENDING_VALIDATION,
      ),
      [],
    );

    final result = await sut.receptions.first;
    expect(result, hasLength(1));
    expect(result.first.clientName, 'Cliente client-1');
  });

  test('sin recepciones el stream está vacío', () async {
    final result = await sut.receptions.first;
    expect(result, isEmpty);
  });
}
