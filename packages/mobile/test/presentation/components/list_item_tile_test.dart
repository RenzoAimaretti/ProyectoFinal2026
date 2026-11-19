import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_colors.dart';
import 'package:mobile/presentation/components/cards/list_item_tile.dart';

void main() {
  Future<void> pumpTile(WidgetTester tester, {VoidCallback? onTap}) {
    return tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ListView(
            children: [
              ListItemTile(
                leading: const Icon(Icons.schedule),
                title: const Text('Pendiente'),
                subtitle: const Text('Siembra · Lote 1'),
                trailing: const Text('badge'),
                onTap: onTap,
              ),
            ],
          ),
        ),
      ),
    );
  }

  testWidgets('muestra leading, título, subtítulo y trailing', (tester) async {
    await pumpTile(tester);

    expect(find.byIcon(Icons.schedule), findsOneWidget);
    expect(find.text('Pendiente'), findsOneWidget);
    expect(find.text('Siembra · Lote 1'), findsOneWidget);
    expect(find.text('badge'), findsOneWidget);
  });

  testWidgets(
      'pinta su fondo en un Material propio y recortado, no en el del Scaffold '
      '(si no, al hacer scroll se dibuja sobre el encabezado)', (tester) async {
    await pumpTile(tester);

    final listTile = tester.widget<ListTile>(find.byType(ListTile));
    expect(listTile.tileColor, isNull);

    final nearestMaterial = tester.widget<Material>(
      find
          .ancestor(of: find.byType(ListTile), matching: find.byType(Material))
          .first,
    );
    expect(nearestMaterial.color, AppColors.surface);
    expect(nearestMaterial.clipBehavior, Clip.antiAlias);
    expect(nearestMaterial.shape, isA<RoundedRectangleBorder>());

    // El Material más cercano está dentro del ListView (el scroll lo recorta).
    expect(
      find.ancestor(
        of: find.byWidget(nearestMaterial),
        matching: find.byType(ListView),
      ),
      findsOneWidget,
    );
  });

  testWidgets('el tap llega al callback', (tester) async {
    var taps = 0;
    await pumpTile(tester, onTap: () => taps++);

    await tester.tap(find.text('Pendiente'));

    expect(taps, 1);
  });
}
