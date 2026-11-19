import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/home/logout_button.dart';
import 'package:mobile/domain/errors.dart';

void main() {
  late List<bool> calls;
  late int pending;

  Future<void> onLogout({required bool discardPending}) async {
    calls.add(discardPending);
    if (!discardPending && pending > 0) {
      throw PendingSyncOnLogoutException(pending);
    }
  }

  Future<void> pumpButton(WidgetTester tester) {
    return tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          appBar: AppBar(actions: [LogoutButton(onLogout: onLogout)]),
        ),
      ),
    );
  }

  setUp(() {
    calls = [];
    pending = 0;
  });

  testWidgets('sin pendientes cierra sesión directo, sin diálogo', (tester) async {
    await pumpButton(tester);

    await tester.tap(find.byTooltip('Cerrar sesión'));
    await tester.pumpAndSettle();

    expect(calls, [false]);
    expect(find.byType(AlertDialog), findsNothing);
  });

  testWidgets('con pendientes avisa cuántos hay y "Descartar y salir" confirma el descarte',
      (tester) async {
    pending = 3;
    await pumpButton(tester);

    await tester.tap(find.byTooltip('Cerrar sesión'));
    await tester.pumpAndSettle();

    expect(find.byType(AlertDialog), findsOneWidget);
    expect(find.textContaining('3 registros sin sincronizar'), findsOneWidget);

    await tester.tap(find.text('Descartar y salir'));
    await tester.pumpAndSettle();

    expect(calls, [false, true]);
    expect(find.byType(AlertDialog), findsNothing);
  });

  testWidgets('"Cancelar" cierra el aviso sin cerrar sesión', (tester) async {
    pending = 1;
    await pumpButton(tester);

    await tester.tap(find.byTooltip('Cerrar sesión'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();

    expect(calls, [false]);
    expect(find.byType(AlertDialog), findsNothing);
  });
}
