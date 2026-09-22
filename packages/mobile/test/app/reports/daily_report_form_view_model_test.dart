import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/reports/daily_report_form_view_model.dart';
import 'package:mobile/domain/models/catalogs.dart';
import 'package:mobile/domain/models/daily_report.dart';
import 'package:mobile/domain/models/enums.dart';
import 'package:mobile/domain/models/task.dart';
import 'package:mobile/domain/usecases/add_photo_usecase.dart';
import 'package:mobile/domain/usecases/create_daily_report_usecase.dart';

import '../../domain/usecases/fakes.dart';

void main() {
  late FakeDailyReportRepository reportRepo;
  late FakeRecipeReader recipeReader;
  late FakeTaskReader taskReader;
  late FakeInputReader inputReader;
  late FakeLotReader lotReader;
  late FakeLaborTypeReader laborTypeReader;
  late FakePhotoRepository photoRepo;
  late FakePhotoStorageRepository photoStorage;
  late FakePhotoPickerService photoPicker;
  late DailyReportFormViewModel sut;

  setUp(() {
    reportRepo = FakeDailyReportRepository();
    recipeReader = FakeRecipeReader();
    taskReader = FakeTaskReader();
    inputReader = FakeInputReader();
    lotReader = FakeLotReader();
    laborTypeReader = FakeLaborTypeReader();
    photoRepo = FakePhotoRepository();
    photoStorage = FakePhotoStorageRepository();
    photoPicker = FakePhotoPickerService();

    final createUseCase =
        CreateDailyReportUseCase(reportRepo, recipeReader, taskReader);
    final addPhotoUseCase = AddPhotoUseCase(photoRepo, photoStorage);

    sut = DailyReportFormViewModel(
      createUseCase: createUseCase,
      inputReader: inputReader,
      lotReader: lotReader,
      laborTypeReader: laborTypeReader,
      addPhotoUseCase: addPhotoUseCase,
      photoPickerService: photoPicker,
    );
  });

  test('inputs expone el stream de insumos', () async {
    final inputs = await sut.inputs.first;
    expect(inputs, isEmpty);
  });

  test('lotName y laborName resuelven nombres del catálogo (o caen al id)',
      () async {
    lotReader.seed(Lot(
      id: 'l-1',
      farmId: 'f-1',
      name: 'Lote 14',
      area: 50.0,
      active: true,
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
      version: 1,
      deleted: false,
    ));
    laborTypeReader.seed(LaborType(
      id: 'labor-1',
      name: 'Fumigación',
      createdAt: DateTime(2026, 1, 1),
      updatedAt: DateTime(2026, 1, 1),
      version: 1,
      deleted: false,
    ));

    expect(await sut.lotName('l-1'), 'Lote 14');
    expect(await sut.laborName('labor-1'), 'Fumigación');
    expect(await sut.lotName('inexistente'), 'inexistente');
  });

  test('setPickedPhotos y reset manejan el estado de fotografías temporales',
      () {
    sut.setPickedPhotos(['/tmp/foto.jpg']);
    expect(sut.pickedPhotoPaths, ['/tmp/foto.jpg']);

    sut.reset();
    expect(sut.pickedPhotoPaths, isEmpty);
    expect(sut.isSaving, isFalse);
  });

  test('create delega al use case (hereda lote/labor de la tarea) y persiste fotos',
      () async {
    taskReader.seed(Task(
      id: 'task-1',
      lotId: 'l-1',
      laborTypeId: 'labor-1',
      status: TaskStatus.PENDING,
    ));
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
      taskId: 'task-1',
      date: DateTime(2026, 6, 15),
      hectares: 15.0,
      hours: 6.0,
      items: [
        const DailyReportItem(inputId: 'inp-1', quantity: 30, unit: 'L'),
      ],
    );

    final reports = reportRepo.reports;
    expect(reports, hasLength(1));
    expect(reports.first.lotId, 'l-1');
    expect(reports.first.laborTypeId, 'labor-1');
    expect(reports.first.taskId, 'task-1');

    final photos = await photoRepo
        .watchByEntity(PhotoEntityType.DAILY_REPORT, reports.first.id!)
        .first;
    expect(photos, hasLength(1));
    expect(photos.first.entityType, PhotoEntityType.DAILY_REPORT);

    expect(sut.pickedPhotoPaths, isEmpty);
    expect(sut.isSaving, isFalse);
  });
}
