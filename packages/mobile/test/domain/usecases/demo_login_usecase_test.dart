import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/usecases/demo_login_usecase.dart';

import 'fakes.dart';

void main() {
  late FakeSessionRepository sessionRepository;
  late DemoLoginUseCase sut;

  setUp(() {
    sessionRepository = FakeSessionRepository();
    sut = DemoLoginUseCase(sessionRepository);
  });

  test('crea sesión demo y la persiste', () async {
    final session = await sut.execute();

    expect(session.userId, 'demo-operario');
    expect(session.email, 'operario@demo.com');
    expect(sessionRepository.saveCalled, isTrue);

    final stored = await sessionRepository.current();
    expect(stored, isNotNull);
    expect(stored!.userId, 'demo-operario');
  });
}
