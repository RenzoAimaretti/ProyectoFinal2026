import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/receptions/receptions_view_model.dart';
import 'package:mobile/domain/usecases/list_pending_receptions_usecase.dart';
import 'package:mobile/domain/usecases/validate_reception_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  late FakeReceptionRepository receptionRepo;
  late ReceptionsViewModel sut;

  setUp(() {
    receptionRepo = FakeReceptionRepository();
    final listUseCase = ListPendingReceptionsUseCase(receptionRepo);
    final validateUseCase = ValidateReceptionUseCase(receptionRepo);
    sut = ReceptionsViewModel(listUseCase, validateUseCase);
  });

  test('pendingReceptions devuelve stream de recepciones', () async {
    final result = await sut.pendingReceptions.first;
    expect(result, isEmpty);
  });

  test('validate delega a ValidateReceptionUseCase', () async {
    await sut.validate('rec-1', validatedBy: 'admin-1');

    expect(receptionRepo.validateCalled, isTrue);
    expect(receptionRepo.lastValidatedId, 'rec-1');
  });
}
