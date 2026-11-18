import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/models/input_compatibility.dart';

void main() {
  test('empty admitted set permits every input', () {
    expect(isInputCompatible('fertilizante', <String>{}), isTrue);
  });

  test('unknown input category remains compatible', () {
    expect(isInputCompatible(null, {'semilla'}), isTrue);
  });

  test('known out-of-set input is advisory incompatible', () {
    expect(isInputCompatible('fertilizante', {'semilla'}), isFalse);
    expect(isInputCompatible('semilla', {'semilla'}), isTrue);
  });
}
