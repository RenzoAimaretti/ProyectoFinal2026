import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// 8.5 — Import-boundary: domain/ NO importa `package:drift` ni
/// `package:flutter`.
///
/// Verifica las reglas de dependencia de `hexagonal-conventions.md`:
/// el dominio solo importa `dart:*` y código propio del domain.
void main() {
  test('domain/ no importa package:drift', () {
    final violations = _findViolations('package:drift');
    expect(violations, isEmpty,
        reason: 'domain/ no debe importar package:drift:\n'
            '${violations.join('\n')}');
  });

  test('domain/ no importa package:flutter', () {
    final violations = _findViolations('package:flutter');
    expect(violations, isEmpty,
        reason: 'domain/ no debe importar package:flutter:\n'
            '${violations.join('\n')}');
  });

  test('domain/ no importa data/ ni app/', () {
    final dataViolations = _findViolations("'../data/");
    final appViolations = _findViolations("'../app/");
    final all = [...dataViolations, ...appViolations];
    expect(all, isEmpty,
        reason: 'domain/ no debe importar data/ ni app/:\n'
            '${all.join('\n')}');
  });
}

/// Busca archivos `.dart` en `lib/domain/` que contengan [pattern] en una
/// sentencia import. Devuelve las violaciones como `file:line`.
List<String> _findViolations(String pattern) {
  final domainDir = Directory('lib/domain');
  if (!domainDir.existsSync()) {
    fail('lib/domain/ no existe');
  }

  final violations = <String>[];
  for (final entity in domainDir.listSync(recursive: true)) {
    if (entity is! File || !entity.path.endsWith('.dart')) continue;
    final lines = entity.readAsLinesSync();
    for (var i = 0; i < lines.length; i++) {
      final line = lines[i].trim();
      if (line.startsWith('import') && line.contains(pattern)) {
        violations.add('  ${entity.path}:${i + 1} → $line');
      }
    }
  }
  return violations;
}
