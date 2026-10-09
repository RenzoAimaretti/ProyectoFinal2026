import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/data/services/app_database.dart';

import '../../data/repositories/drift_test_helper.dart';

/// Covers what the version 4 schema declares: the two new tables, the new
/// nullable column on `inputs`, and the fact that foreign keys are enforced at
/// runtime.
///
/// NOT covered here: the `onUpgrade` step that moves an existing version 3
/// install to version 4. Reproducing a version 3 database faithfully needs
/// drift's schema-verification setup (`drift_dev schema` plus a `schema_dir`
/// and `SchemaVerifier`), which this project does not have configured, and a
/// hand-rolled rollback does not work: SQLite refuses `ALTER TABLE ... DROP
/// COLUMN` on a column that participates in a foreign key, which `category_id`
/// does. Rather than fake it, the gap is stated here. Setting that tooling up is
/// its own task.
void main() {
  late AppDatabase db;

  setUp(() => db = createTestDatabase());
  tearDown(() => db.close());

  Future<List<String>> tableNames() async {
    final rows = await db
        .customSelect(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        )
        .get();
    return rows.map((row) => row.data['name']! as String).toList();
  }

  test('version 4 declares the categories and the labour link', () async {
    expect(
      await tableNames(),
      containsAll(<String>['input_categories', 'labor_type_categories']),
    );

    final categoryColumns = await db
        .customSelect('PRAGMA table_info(input_categories)')
        .get();
    expect(
      categoryColumns.map((row) => row.data['name']),
      containsAll(<String>['id', 'name', 'active', 'version', 'deleted']),
    );

    final joinColumns = await db
        .customSelect('PRAGMA table_info(labor_type_categories)')
        .get();
    expect(
      joinColumns.map((row) => row.data['name']),
      containsAll(<String>['labor_type_id', 'category_id']),
    );
  });

  test('an input category link is nullable, because cached rows predate it', () async {
    final columns = await db.customSelect('PRAGMA table_info(inputs)').get();
    final categoryId = columns.firstWhere(
      (row) => row.data['name'] == 'category_id',
    );

    expect(categoryId.data['notnull'], 0);
    expect(categoryId.data['dflt_value'], isNull);
  });

  test('an input cannot reference a category that does not exist', () async {
    await db.customStatement(
      "INSERT INTO inputs (id, name, unit, active, created_at, updated_at) "
      "VALUES ('in-1', 'Glifosato', 'L', 1, 0, 0)",
    );

    await expectLater(
      db.customStatement(
        "UPDATE inputs SET category_id = 'does-not-exist' WHERE id = 'in-1'",
      ),
      throwsA(anything),
    );
  });

  test('an input may keep a null category, which is the pre-upgrade state', () async {
    await db.customStatement(
      "INSERT INTO inputs (id, name, unit, active, created_at, updated_at) "
      "VALUES ('in-1', 'Glifosato', 'L', 1, 0, 0)",
    );

    final row = await db
        .customSelect("SELECT category_id FROM inputs WHERE id = 'in-1'")
        .getSingle();

    expect(row.data['category_id'], isNull);
  });
}
