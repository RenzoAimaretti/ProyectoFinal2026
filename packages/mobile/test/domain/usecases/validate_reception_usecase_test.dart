import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/usecases/validate_reception_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeReceptionRepository receptionRepo;
  late ValidateReceptionUseCase sut;

  setUp(() {
    receptionRepo = FakeReceptionRepository();
    sut = ValidateReceptionUseCase(receptionRepo);
  });

  test('delega a validateAndApplyStock', () async {
    await sut.execute('rec-1', 'admin-1');

    expect(receptionRepo.validateCalled, isTrue);
    expect(receptionRepo.lastValidatedId, 'rec-1');
  });
}
