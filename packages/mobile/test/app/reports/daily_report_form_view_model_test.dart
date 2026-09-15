import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/reports/daily_report_form_view_model.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/models/daily_report.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/usecases/add_photo_usecase.dart';
import 'package:mobile/domain/usecases/create_daily_report_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  late FakeDailyReportRepository reportRepo;
  late FakeRecipeReader recipeReader;
  late FakeClientReader clientReader;
  late FakeFarmReader farmReader;
  late FakeLotReader lotReader;
  late FakeLaborTypeReader laborTypeReader;
  late FakeInputReader inputReader;
  late FakeCompanyReader companyReader;
  late FakePhotoRepository photoRepo;
  late FakePhotoStorageRepository photoStorage;
  late FakePhotoPickerService photoPicker;
  late DailyReportFormViewModel sut;

  setUp(() {
    reportRepo = FakeDailyReportRepository();
    recipeReader = FakeRecipeReader();
    clientReader = FakeClientReader();
    farmReader = FakeFarmReader();
    lotReader = FakeLotReader();
    laborTypeReader = FakeLaborTypeReader();
    inputReader = FakeInputReader();
    companyReader = FakeCompanyReader();
    photoRepo = FakePhotoRepository();
    photoStorage = FakePhotoStorageRepository();
    photoPicker = FakePhotoPickerService();

    final createUseCase = CreateDailyReportUseCase(reportRepo, recipeReader);
    final addPhotoUseCase = AddPhotoUseCase(photoRepo, photoStorage);

    sut = DailyReportFormViewModel(
      createUseCase: createUseCase,
      clientReader: clientReader,
      farmReader: farmReader,
      lotReader: lotReader,
      laborTypeReader: laborTypeReader,
      inputReader: inputReader,
      companyReader: companyReader,
      recipeReader: recipeReader,
      addPhotoUseCase: addPhotoUseCase,
      photoPickerService: photoPicker,
    );
  });

  test('lotHasRecipe devuelve false si el lote no tiene receta (R009)', () async {
    final hasRecipe = await sut.lotHasRecipe('lot-without-recipe');
    expect(hasRecipe, isFalse);
  });

  test('lotHasRecipe devuelve true si el lote tiene receta', () async {
    recipeReader.seedRecipe(Recipe(
      id: 'rec-1',
      lotId: 'lot-with-recipe',
      date: DateTime(2026, 1, 1),
      status: 'ACTIVE',
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
    ));

    final hasRecipe = await sut.lotHasRecipe('lot-with-recipe');
    expect(hasRecipe, isTrue);
  });

  test('catálogos en cascada exponen streams correctos', () async {
    clientReader.seed(Client(
      id: 'c-1',
      name: 'Cliente 1',
      active: true,
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
      version: 1,
      deleted: false,
    ));
    farmReader.seed(Farm(
      id: 'f-1',
      clientId: 'c-1',
      name: 'Campo 1',
      surface: 100.0,
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
      version: 1,
      deleted: false,
    ));
    lotReader.seed(Lot(
      id: 'l-1',
      farmId: 'f-1',
      name: 'Lote 1',
      area: 50.0,
      active: true,
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
      version: 1,
      deleted: false,
    ));

    final clients = await sut.clients.first;
    expect(clients, hasLength(1));

    final farms = await sut.farmsByClient('c-1').first;
    expect(farms, hasLength(1));

    final lots = await sut.lotsByFarm('f-1').first;
    expect(lots, hasLength(1));
  });

  test('setPickedPhotos y reset manejan el estado de fotografías temporales', () {
    sut.setPickedPhotos(['/tmp/foto.jpg']);
    expect(sut.pickedPhotoPaths, ['/tmp/foto.jpg']);

    sut.reset();
    expect(sut.pickedPhotoPaths, isEmpty);
    expect(sut.isSaving, isFalse);
  });

  test('create delega a use case y persiste fotos adjuntas', () async {
    recipeReader.seedRecipe(Recipe(
      id: 'rec-1',
      lotId: 'l-1',
      date: DateTime(2026, 1, 1),
      status: 'ACTIVE',
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
    ));
    sut.setPickedPhotos(['/tmp/foto_cosecha.jpg']);

    await sut.create(
      operatorId: 'op-1',
      companyId: 'comp-1',
      lotId: 'l-1',
      laborTypeId: 'labor-1',
      date: DateTime(2026, 6, 15),
      hectares: 15.0,
      hours: 6.0,
      items: [
        const DailyReportItem(inputId: 'inp-1', quantity: 30, unit: 'L'),
      ],
    );

    final pending = await reportRepo.watchPending().first;
    expect(pending, hasLength(1));
    expect(pending.first.lotId, 'l-1');

    final photos = await photoRepo.watchByEntity(
      PhotoEntityType.DAILY_REPORT,
      pending.first.id!,
    ).first;
    expect(photos, hasLength(1));
    expect(photos.first.entityType, PhotoEntityType.DAILY_REPORT);

    expect(sut.pickedPhotoPaths, isEmpty);
    expect(sut.isSaving, isFalse);
  });
}
