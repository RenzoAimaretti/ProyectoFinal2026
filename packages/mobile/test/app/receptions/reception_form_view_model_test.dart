import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/receptions/reception_form_view_model.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/reception.dart';
import 'package:mobile/domain/usecases/add_photo_usecase.dart';
import 'package:mobile/domain/usecases/create_reception_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  late FakeReceptionRepository receptionRepo;
  late FakeClientReader clientReader;
  late FakeInputReader inputReader;
  late FakePhotoRepository photoRepo;
  late FakePhotoStorageRepository photoStorage;
  late FakePhotoPickerService photoPicker;
  late ReceptionFormViewModel sut;

  setUp(() {
    receptionRepo = FakeReceptionRepository();
    clientReader = FakeClientReader();
    inputReader = FakeInputReader();
    photoRepo = FakePhotoRepository();
    photoStorage = FakePhotoStorageRepository();
    photoPicker = FakePhotoPickerService();

    final createUseCase = CreateReceptionUseCase(receptionRepo);
    final addPhotoUseCase = AddPhotoUseCase(photoRepo, photoStorage);

    sut = ReceptionFormViewModel(
      createUseCase: createUseCase,
      clientReader: clientReader,
      inputReader: inputReader,
      addPhotoUseCase: addPhotoUseCase,
      photoPickerService: photoPicker,
    );
  });

  test('clients e inputs exponen streams de sus respectivos readers', () async {
    final clients = await sut.clients.first;
    expect(clients, isEmpty);

    final inputs = await sut.inputs.first;
    expect(inputs, isEmpty);
  });

  test('setPickedPhotos actualiza rutas y notifica listeners', () {
    final notifications = <int>[];
    sut.addListener(() => notifications.add(sut.pickedPhotoPaths.length));

    sut.setPickedPhotos(['/tmp/photo1.jpg', '/tmp/photo2.jpg']);

    expect(sut.pickedPhotoPaths, ['/tmp/photo1.jpg', '/tmp/photo2.jpg']);
    expect(notifications, contains(2));
  });

  test('reset limpia fotos capturadas y pone isSaving en false', () {
    sut.setPickedPhotos(['/tmp/photo1.jpg']);
    expect(sut.pickedPhotoPaths, isNotEmpty);

    sut.reset();

    expect(sut.pickedPhotoPaths, isEmpty);
    expect(sut.isSaving, isFalse);
  });

  test('create delega a use case, persiste fotos y limpia temporales', () async {
    sut.setPickedPhotos(['/tmp/remito.jpg']);

    final items = [
      const ReceptionItem(inputId: 'input-1', quantity: 50.0, unit: 'L'),
    ];

    await sut.create(
      clientId: 'client-1',
      date: DateTime(2026, 6, 15),
      items: items,
    );

    // Reception se creó en repo.
    final pending = await receptionRepo.watchPending().first;
    expect(pending, hasLength(1));
    expect(pending.first.clientId, 'client-1');

    // Foto se persistió en repo de fotos.
    final photos = await photoRepo.watchByEntity(
      PhotoEntityType.RECEPTION,
      pending.first.id!,
    ).first;
    expect(photos, hasLength(1));
    expect(photos.first.entityType, PhotoEntityType.RECEPTION);

    // Temporales limpiados.
    expect(sut.pickedPhotoPaths, isEmpty);
    expect(sut.isSaving, isFalse);
  });
}
