import { Test, TestingModule } from '@nestjs/testing';
import { LivestockMovementService } from './livestock-movement.service';
import { LIVESTOCK_MOVEMENT_REPOSITORY } from './ports/livestock-movement.repository';

// Contract-locking spec (REQ-T-01/02/03): congela el contrato observable de
// livestock-movement contra el puerto mockeado (plain objects + jest.fn(), sin
// librería de test-doubles — REQ-T-03).
// El legacy livestock-movement.service.ts NO tiene try/catch ni validaciones:
// findAll/findOne/create delegan directo a Prisma. Por lo tanto el rechazo del
// puerto SIEMPRE llega crudo al caller (sin envolver en mensajes genéricos) —
// eso es lo que estos tests congelan (REQ-C-03, byte-identical).
// RED por diseño: ./ports/* aún no existe (se crea en T-F2-65).

const baseMovement = {
  id: 'movement-uuid-1',
  livestockId: 'livestock-uuid-1',
  lotId: 'lot-uuid-1',
  movementDate: new Date('2024-05-20T10:00:00.000Z'),
  observations: 'Movimiento a corral norte',
  createdAt: new Date('2024-05-20T10:00:00.000Z'),
};

describe('LivestockMovementService', () => {
  let service: LivestockMovementService;
  let livestockMovementRepository: any;

  beforeEach(async () => {
    livestockMovementRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LivestockMovementService,
        {
          provide: LIVESTOCK_MOVEMENT_REPOSITORY,
          useValue: livestockMovementRepository,
        },
      ],
    }).compile();

    service = moduleRef.get<LivestockMovementService>(LivestockMovementService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar todas las filas del puerto', async () => {
      livestockMovementRepository.findAll.mockResolvedValue([baseMovement]);

      const result = await service.findAll();

      expect(result).toEqual([baseMovement]);
      expect(livestockMovementRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('debería PROPAGAR CRUDO el error del puerto (sin try/catch en legacy)', async () => {
      // El legacy delega directo a Prisma sin try/catch: el rechazo llega crudo.
      livestockMovementRepository.findAll.mockRejectedValue(new Error('boom'));

      await expect(service.findAll()).rejects.toThrow('boom');
    });
  });

  describe('findOne', () => {
    it('debería retornar la fila si existe', async () => {
      livestockMovementRepository.findById.mockResolvedValue(baseMovement);

      const result = await service.findOne(baseMovement.id);

      expect(result).toEqual(baseMovement);
      expect(livestockMovementRepository.findById).toHaveBeenCalledWith(
        baseMovement.id,
      );
    });

    it('debería retornar null si no existe', async () => {
      livestockMovementRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('missing-uuid')).resolves.toBeNull();
    });

    it('debería PROPAGAR CRUDO el error del puerto (sin try/catch en legacy)', async () => {
      livestockMovementRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.findOne(baseMovement.id)).rejects.toThrow('boom');
    });
  });

  describe('create', () => {
    const validBody = {
      livestockId: 'livestock-uuid-1',
      lotId: 'lot-uuid-1',
      movementDate: new Date('2024-05-21T08:00:00.000Z'),
      observations: 'Cambio de lote',
    };

    it('debería crear el movimiento pasando los datos crudos al puerto', async () => {
      livestockMovementRepository.create.mockResolvedValue({
        ...baseMovement,
        ...validBody,
      });

      const result = await service.create(validBody);

      expect(livestockMovementRepository.create).toHaveBeenCalledWith(validBody);
      expect(result).toEqual({ ...baseMovement, ...validBody });
    });

    it('debería PROPAGAR CRUDO el error del puerto (sin try/catch en legacy)', async () => {
      // Sin validaciones ni try/catch: cualquier rechazo del puerto (p. ej. FK
      // violada por livestockId inexistente) llega crudo al caller.
      livestockMovementRepository.create.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow('boom');
      expect(livestockMovementRepository.create).toHaveBeenCalledWith(validBody);
    });
  });
});
