import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/domain/errors.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/photo.dart';
import 'package:mobile/domain/usecases/delete_photo_usecase.dart';

import 'fakes.dart';

void main() {
  late FakePhotoRepository photoRepo;
  late FakePhotoStorageRepository storage;
  late DeletePhotoUseCase sut;

  setUp(() {
    photoRepo = FakePhotoRepository();
    storage = FakePhotoStorageRepository();
    sut = DeletePhotoUseCase(photoRepo, storage);
  });

  test('foto persistida: borra la fila y el archivo', () async {
    // Precondición: foto con id.
    const photo = Photo(
      id: 'photo-1',
      entityType: PhotoEntityType.DAILY_REPORT,
      entityId: 'dr-1',
      localPath: '/app-docs/photo.jpg',
    );

    await sut.execute(photo);

    expect(storage.deletedPaths, contains('/app-docs/photo.jpg'));
  });

  test('foto sin id → DomainException', () {
    const photo = Photo(
      entityType: PhotoEntityType.RECEPTION,
      entityId: 'rec-1',
      localPath: '/tmp/photo.jpg',
    );

    expect(
      () => sut.execute(photo),
      throwsA(isA<DomainException>()),
    );
  });
}
