import { Test, TestingModule } from '@nestjs/testing';
import { ModuleEntityService } from './module-entity.service';
import { MODULE_ENTITY_REPOSITORY } from './ports/module-entity.repository';

// Contract-locking spec (REQ-T-01/02/03): congela las reglas de module-entity
// (validación de create/update + unicidad de nombre) contra el puerto mockeado
// (plain objects + jest.fn(), sin librería de test-doubles — REQ-T-03).
// Nota: los errores internos de validación son INTRAGABLES por el try/catch del
// service: el contrato observable es raw Error('Error creating module') /
// Error('Error updating module') en cualquier fallo (REQ-C-03, byte-identical).
// RED por diseño: ./ports/* aún no existe (se crea en T-F2-02).

const baseModule = {
  id: 'module-uuid-1',
  name: 'Módulo Gestión',
  price: 1500,
  version: '1.0.0',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};

describe('ModuleEntityService', () => {
  let service: ModuleEntityService;
  let moduleRepository: any;

  beforeEach(async () => {
    moduleRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleEntityService,
        { provide: MODULE_ENTITY_REPOSITORY, useValue: moduleRepository },
      ],
    }).compile();

    service = moduleRef.get<ModuleEntityService>(ModuleEntityService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar todas las filas del puerto', async () => {
      moduleRepository.findAll.mockResolvedValue([baseModule]);

      const result = await service.findAll();

      expect(result).toEqual([baseModule]);
      expect(moduleRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('debería retornar la fila si existe', async () => {
      moduleRepository.findById.mockResolvedValue(baseModule);

      const result = await service.findOne(baseModule.id);

      expect(result).toEqual(baseModule);
      expect(moduleRepository.findById).toHaveBeenCalledWith(baseModule.id);
    });

    it('debería retornar null si no existe', async () => {
      moduleRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('missing-uuid')).resolves.toBeNull();
    });
  });

  describe('findByName', () => {
    it('debería retornar la fila si existe', async () => {
      moduleRepository.findByName.mockResolvedValue(baseModule);

      const result = await service.findByName('Módulo Gestión');

      expect(result).toEqual(baseModule);
      expect(moduleRepository.findByName).toHaveBeenCalledWith(
        'Módulo Gestión',
      );
    });
  });

  describe('create', () => {
    const validBody = { name: 'Módulo Nuevo', price: 2500, version: '2.0.0' };

    it('debería crear el módulo cuando los datos son válidos y el nombre no existe', async () => {
      moduleRepository.findByName.mockResolvedValue(null);
      moduleRepository.create.mockResolvedValue({
        ...baseModule,
        ...validBody,
      });

      const result = await service.create(validBody);

      expect(moduleRepository.findByName).toHaveBeenCalledWith(validBody.name);
      expect(moduleRepository.create).toHaveBeenCalledWith(validBody);
      expect(result).toEqual({ ...baseModule, ...validBody });
    });

    it('debería lanzar Error("Error creating module") si faltan campos o price <= 0', async () => {
      await expect(service.create({ ...validBody, name: '' })).rejects.toThrow(
        'Error creating module',
      );
      await expect(service.create({ ...validBody, price: 0 })).rejects.toThrow(
        'Error creating module',
      );
      await expect(
        service.create({ ...validBody, version: '' }),
      ).rejects.toThrow('Error creating module');
      expect(moduleRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar Error("Error creating module") si el nombre ya existe', async () => {
      moduleRepository.findByName.mockResolvedValue({
        ...baseModule,
        id: 'other-uuid',
      });

      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating module',
      );
      expect(moduleRepository.create).not.toHaveBeenCalled();
    });

    it('debería PROPAGAR CRUDO el error del puerto (return sin await, byte-identical)', async () => {
      // El try/catch solo captura los throws síncronos de validación: el
      // `return this.repository.create(...)` (sin await) hace que el rechazo del
      // puerto ESCAPE del catch y llegue crudo al caller — comportamiento actual
      // verificado en vivo (REQ-C-03, sin mejoras de lógica en el refactor).
      moduleRepository.findByName.mockResolvedValue(null);
      moduleRepository.create.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow('boom');
      expect(moduleRepository.create).toHaveBeenCalledWith(validBody);
    });
  });

  describe('update', () => {
    const validBody = {
      name: 'Módulo Actualizado',
      price: 3000,
      version: '2.1.0',
    };

    it('debería actualizar el módulo cuando los datos son válidos', async () => {
      moduleRepository.update.mockResolvedValue({
        ...baseModule,
        ...validBody,
      });

      const result = await service.update(baseModule.id, validBody);

      expect(moduleRepository.update).toHaveBeenCalledWith(
        baseModule.id,
        validBody,
      );
      expect(result).toEqual({ ...baseModule, ...validBody });
    });

    it('debería lanzar Error("Error updating module") si faltan campos requeridos', async () => {
      await expect(
        service.update(baseModule.id, { ...validBody, name: '' }),
      ).rejects.toThrow('Error updating module');
      expect(moduleRepository.update).not.toHaveBeenCalled();
    });

    it('debería PROPAGAR CRUDO el error del puerto (return sin await, byte-identical)', async () => {
      // Mismo caso que create: `return this.repository.update(...)` sin await → el
      // rechazo del puerto escapa del try/catch (verificado en vivo, REQ-C-03).
      moduleRepository.update.mockRejectedValue(new Error('boom'));

      await expect(service.update(baseModule.id, validBody)).rejects.toThrow(
        'boom',
      );
      expect(moduleRepository.update).toHaveBeenCalledWith(
        baseModule.id,
        validBody,
      );
    });
  });
});
