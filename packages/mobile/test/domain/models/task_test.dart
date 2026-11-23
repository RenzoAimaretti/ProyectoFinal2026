import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/task.dart';

void main() {
  Task task({String? id = 'task-1', String? lotName, String? laborTypeName}) =>
      Task(
        id: id,
        lotId: 'lot-1',
        laborTypeId: 'labor-1',
        status: TaskStatus.PENDING,
        lotName: lotName,
        laborTypeName: laborTypeName,
      );

  test('la etiqueta usa los nombres de labor y lote', () {
    expect(task(lotName: 'Lote 1', laborTypeName: 'Siembra').displayLabel, 'Siembra · Lote 1');
  });

  test('con un solo nombre muestra ese nombre', () {
    expect(task(lotName: 'Lote 1').displayLabel, 'Lote 1');
    expect(task(laborTypeName: ' Siembra ').displayLabel, 'Siembra');
  });

  test('sin nombres cae a un id corto, nunca al UUID completo', () {
    expect(task(id: '1234567890').displayLabel, 'Tarea 12345678');
    expect(task(id: 'abc').displayLabel, 'Tarea abc');
    expect(task(id: null).displayLabel, 'Tarea');
  });
}
