import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/services/app_database.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('MyApp smoke test', (WidgetTester tester) async {
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    await tester.pumpWidget(MyApp(database: db));
    expect(find.byType(MyApp), findsOneWidget);
    await tester.pumpAndSettle();
    await db.close();
  });
}
