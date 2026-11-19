import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/presentation/components/inputs/custom_text_field.dart';

void main() {
  Future<void> pumpField(WidgetTester tester, CustomTextField field) {
    return tester.pumpWidget(MaterialApp(home: Scaffold(body: field)));
  }

  testWidgets('sin onSuffixTap el ícono final es decorativo', (tester) async {
    await pumpField(
      tester,
      const CustomTextField(label: 'Campo', suffixIcon: Icons.search),
    );

    expect(find.byIcon(Icons.search), findsOneWidget);
    expect(find.byType(IconButton), findsNothing);
  });

  testWidgets('con onSuffixTap el ícono final es un botón con tooltip', (tester) async {
    var taps = 0;
    await pumpField(
      tester,
      CustomTextField(
        label: 'Campo',
        suffixIcon: Icons.visibility_outlined,
        suffixTooltip: 'Mostrar',
        onSuffixTap: () => taps++,
      ),
    );

    await tester.tap(find.byTooltip('Mostrar'));

    expect(taps, 1);
  });
}
