import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/usecases/add_photo_usecase.dart';

import 'fakes.dart';

void main() {
  late FakePhotoRepository photoRepo;
  late FakePhotoStorageRepository storage;
  late AddPhotoUseCase sut;

  setUp(() {
    photoRepo = FakePhotoRepository();
    storage = FakePhotoStorageRepository();
    sut = AddPhotoUseCase(photoRepo, storage);
  });

  test('adjunta foto con menos de 5 existentes → copia y persiste', () async {
    final photo = await sut.execute(
      entityType: PhotoEntityType.DAILY_REPORT,
      entityId: 'dr-1',
      sourcePath: '/tmp/photo.jpg',
    );

    expect(photo.localPath, contains('photo.jpg'));
    expect(storage.copiedPaths, hasLength(1));
  });

  test('R008: 5 fotos existentes → MaxPhotosExceededException', () async {
    // Precargar 5 fotos.
    for (var i = 0; i < 5; i++) {
      await sut.execute(
        entityType: PhotoEntityType.DAILY_REPORT,
        entityId: 'dr-1',
        sourcePath: '/tmp/photo$i.jpg',
      );
    }

    // La 6.ª debe fallar.
    expect(
      () => sut.execute(
        entityType: PhotoEntityType.DAILY_REPORT,
        entityId: 'dr-1',
        sourcePath: '/tmp/photo6.jpg',
      ),
      throwsA(isA<MaxPhotosExceededException>()),
    );
  });

  test('fotos de entidades distintas no se cuentan juntas', () async {
    // 5 fotos de dr-1.
    for (var i = 0; i < 5; i++) {
      await sut.execute(
        entityType: PhotoEntityType.DAILY_REPORT,
        entityId: 'dr-1',
        sourcePath: '/tmp/photo$i.jpg',
      );
    }

    // dr-2 puede recibir fotos independientemente.
    final photo = await sut.execute(
      entityType: PhotoEntityType.DAILY_REPORT,
      entityId: 'dr-2',
      sourcePath: '/tmp/extra.jpg',
    );
    expect(photo.entityId, 'dr-2');
  });
}
