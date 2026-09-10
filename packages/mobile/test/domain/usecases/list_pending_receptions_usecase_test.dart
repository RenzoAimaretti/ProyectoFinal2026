import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/usecases/list_pending_receptions_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeReceptionRepository receptionRepo;
  late ListPendingReceptionsUseCase sut;

  setUp(() {
    receptionRepo = FakeReceptionRepository();
    sut = ListPendingReceptionsUseCase(receptionRepo);
  });

  test('delega a watchPending', () async {
    final result = await sut.execute().first;
    expect(result, isEmpty);
  });
}
