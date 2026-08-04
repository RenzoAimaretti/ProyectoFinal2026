import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { USER_REPOSITORY } from './ports/user.repository';
import { COMPANY_REPOSITORY } from '../company/ports/company.repository';
import { UserRole } from './domain/user-role';

// Contract-locking spec (REQ-T-01/02/03): congela el contrato observable actual de
// user (validación, empresa-exists, unicidad email/username, hashing argon2) contra
// puertos mockeados (plain objects + jest.fn(), sin librería de test-doubles).
// RED por diseño: ./ports/user.repository y ./domain/user-role no existen aún
// (se crean en T-F2-24/25).
// Nota wrap-vs-raw (T-F2-27, byte-identical): a diferencia de farm, TODAS las
// lecturas cruzadas (empresa + unicidad) corren DENTRO del try/catch del create —
// sus rechazos se envuelven en 500 'Error creating user'; solo las excepciones de
// dominio (400/404/409) se re-lanzan crudas. El P2002 del create lo convierte el
// adapter en ConflictException (T-F2-26): este spec fija que el service re-lanza
// ese ConflictException sin envolver. El hashing argon2 vive en el service (el
// import legacy de @prisma/client/runtime/client queda SOLO en el adapter, REQ-F0-03).

const baseUser = {
  id: 'user-uuid-1',
  companyId: 'company-uuid-1',
  username: 'operario1',
  email: 'operario1@example.com',
  passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$hash-de-prueba',
  role: UserRole.OPERARIO,
  failedLoginAttempts: 0,
  lockedUntil: null,
  active: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

const baseCompany = {
  id: 'company-uuid-1',
  name: 'Estancia La Esperanza',
  cuit: '30-71234567-8',
  active: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  version: 1,
  deleted: false,
};

describe('UserService', () => {
  let service: UserService;
  let userRepository: any;
  let companyRepository: any;

  beforeEach(async () => {
    userRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    companyRepository = {
      findById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: COMPANY_REPOSITORY, useValue: companyRepository },
      ],
    }).compile();

    service = moduleRef.get<UserService>(UserService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debería retornar todos los usuarios del puerto', async () => {
      userRepository.findAll.mockResolvedValue([baseUser]);

      const result = await service.findAll();

      expect(result).toEqual([baseUser]);
      expect(userRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('debería envolver errores inesperados en 500 "Error fetching users"', async () => {
      userRepository.findAll.mockRejectedValue(new Error('boom'));

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findAll()).rejects.toThrow('Error fetching users');
    });
  });

  describe('findOne', () => {
    it('debería retornar el usuario si existe', async () => {
      userRepository.findById.mockResolvedValue(baseUser);

      const result = await service.findOne(baseUser.id);

      expect(result).toEqual(baseUser);
      expect(userRepository.findById).toHaveBeenCalledWith(baseUser.id);
    });

    it('debería lanzar 404 "User with id X not found" si no existe', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        'User with id missing-uuid not found',
      );
    });

    it('debería re-lanzar NotFound sin envolver y envolver el resto en 500', async () => {
      userRepository.findById.mockRejectedValue(
        new NotFoundException('User with id X not found'),
      );

      await expect(service.findOne('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );

      userRepository.findById.mockRejectedValue(new Error('boom'));
      await expect(service.findOne(baseUser.id)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findOne(baseUser.id)).rejects.toThrow(
        'Error fetching user',
      );
    });
  });

  describe('create', () => {
    const validBody = {
      companyId: 'company-uuid-1',
      username: 'nuevo-operario',
      email: 'nuevo@example.com',
      password: 'password123',
      role: UserRole.OPERARIO,
    };

    it('debería validar la empresa, la unicidad email/username y crear normalizando email/active y hasheando password (REQ-C-07)', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      const created = {
        ...baseUser,
        id: 'user-uuid-2',
        username: 'nuevo-operario',
        email: 'nuevo@example.com',
      };
      userRepository.create.mockResolvedValue(created);

      const result = await service.create(validBody);

      expect(companyRepository.findById).toHaveBeenCalledWith('company-uuid-1');
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'nuevo@example.com',
      );
      expect(userRepository.findByUsername).toHaveBeenCalledWith(
        'nuevo-operario',
      );
      const payload = userRepository.create.mock.calls[0][0];
      expect(payload).toEqual({
        companyId: 'company-uuid-1',
        email: 'nuevo@example.com',
        username: 'nuevo-operario',
        passwordHash: expect.any(String),
        role: UserRole.OPERARIO,
        active: true,
      });
      expect(payload.passwordHash).not.toBe('password123');
      expect(result).toEqual(created);
    });

    it('debería usar username como email cuando no se provee email', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      const created = {
        ...baseUser,
        id: 'user-uuid-3',
        username: 'solo-username',
        email: 'solo-username',
      };
      userRepository.create.mockResolvedValue(created);

      const result = await service.create({
        companyId: 'company-uuid-1',
        username: 'solo-username',
        password: 'password123',
        role: UserRole.OPERARIO,
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith('solo-username');
      expect(userRepository.create).toHaveBeenCalledWith({
        companyId: 'company-uuid-1',
        email: 'solo-username',
        username: 'solo-username',
        passwordHash: expect.any(String),
        role: UserRole.OPERARIO,
        active: true,
      });
      expect(result).toEqual(created);
    });

    it('debería lanzar 400 "companyId is required" si falta companyId', async () => {
      await expect(
        service.create({ ...validBody, companyId: '' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...validBody, companyId: '' }),
      ).rejects.toThrow('companyId is required');
      expect(companyRepository.findById).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 "email or username is required" si faltan ambos', async () => {
      await expect(
        service.create({ ...validBody, email: undefined, username: undefined }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...validBody, email: undefined, username: undefined }),
      ).rejects.toThrow('email or username is required');
      expect(companyRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 "password is required" si falta password', async () => {
      await expect(
        service.create({ ...validBody, password: '' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...validBody, password: '' }),
      ).rejects.toThrow('password is required');
      expect(companyRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 "role must be one of: ..." si el rol no es válido', async () => {
      await expect(
        service.create({ ...validBody, role: 'GOD' as UserRole }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ ...validBody, role: 'GOD' as UserRole }),
      ).rejects.toThrow(
        'role must be one of: ADMIN, OPERARIO, PRODUCTOR, CONTRATISTA, VETERINARIO',
      );
      expect(companyRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "Company with id X not found" si la empresa no existe', async () => {
      companyRepository.findById.mockResolvedValue(null);

      await expect(service.create(validBody)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Company with id company-uuid-1 not found',
      );
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 409 "User with this email already exists" si el email está duplicado', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      userRepository.findByEmail.mockResolvedValue(baseUser);

      await expect(service.create(validBody)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'User with this email already exists',
      );
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar 409 "User with this username already exists" si el username está duplicado', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(baseUser);

      await expect(service.create(validBody)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'User with this username already exists',
      );
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('debería re-lanzar sin envolver el ConflictException del puerto (P2002 convertido por el adapter, T-F2-26)', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.create.mockRejectedValue(
        new ConflictException(
          'A user with this username or email already exists',
        ),
      );

      await expect(service.create(validBody)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'A user with this username or email already exists',
      );
    });

    it('debería envolver en 500 "Error creating user" el rechazo de la lectura de empresa (DENTRO del try, byte-identical)', async () => {
      companyRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating user',
      );
    });

    it('debería envolver en 500 "Error creating user" el rechazo de la lectura de unicidad (DENTRO del try, byte-identical)', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      userRepository.findByEmail.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating user',
      );
    });

    it('debería envolver errores inesperados del create del puerto en 500 "Error creating user"', async () => {
      companyRepository.findById.mockResolvedValue(baseCompany);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.create.mockRejectedValue(new Error('boom'));

      await expect(service.create(validBody)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(validBody)).rejects.toThrow(
        'Error creating user',
      );
    });
  });

  describe('update', () => {
    it('debería actualizar solo los campos provistos cuando el usuario existe (sin chequear email en update)', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      const updated = { ...baseUser, active: false };
      userRepository.update.mockResolvedValue(updated);

      const result = await service.update(baseUser.id, { active: false });

      expect(userRepository.findById).toHaveBeenCalledWith(baseUser.id);
      expect(userRepository.update).toHaveBeenCalledWith(baseUser.id, {
        active: false,
      });
      expect(userRepository.findByEmail).not.toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('debería hashear el password antes de actualizar', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      const updated = { ...baseUser };
      userRepository.update.mockResolvedValue(updated);

      const result = await service.update(baseUser.id, {
        password: 'nueva-clave',
      });

      const payload = userRepository.update.mock.calls[0][1];
      expect(payload).toEqual({
        passwordHash: expect.any(String),
      });
      expect(payload.passwordHash).not.toBe('nueva-clave');
      expect(result).toEqual(updated);
    });

    it('debería lanzar 400 "No data provided for update" si el body está vacío', async () => {
      await expect(service.update(baseUser.id, {})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(baseUser.id, {})).rejects.toThrow(
        'No data provided for update',
      );
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar 404 "User with id X not found" si no existe', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('missing-uuid', { active: true }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('missing-uuid', { active: true }),
      ).rejects.toThrow('User with id missing-uuid not found');
    });

    it('debería lanzar 409 "User with this username already exists" si el username pertenece a otro usuario', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      userRepository.findByUsername.mockResolvedValue({
        ...baseUser,
        id: 'user-uuid-2',
      });

      await expect(
        service.update(baseUser.id, { username: 'operario1' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.update(baseUser.id, { username: 'operario1' }),
      ).rejects.toThrow('User with this username already exists');
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('debería permitir el username propio (mismo id no genera conflicto)', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      userRepository.findByUsername.mockResolvedValue(baseUser);
      const updated = { ...baseUser };
      userRepository.update.mockResolvedValue(updated);

      const result = await service.update(baseUser.id, {
        username: 'operario1',
      });

      expect(userRepository.update).toHaveBeenCalledWith(baseUser.id, {
        username: 'operario1',
      });
      expect(result).toEqual(updated);
    });

    it('debería lanzar 400 "username is required" si el username es vacío', async () => {
      userRepository.findById.mockResolvedValue(baseUser);

      await expect(
        service.update(baseUser.id, { username: '' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(baseUser.id, { username: '' }),
      ).rejects.toThrow('username is required');
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('debería lanzar 400 "role must be one of: ..." si el rol no es válido', async () => {
      userRepository.findById.mockResolvedValue(baseUser);

      await expect(
        service.update(baseUser.id, { role: 'GOD' as UserRole }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(baseUser.id, { role: 'GOD' as UserRole }),
      ).rejects.toThrow(
        'role must be one of: ADMIN, OPERARIO, PRODUCTOR, CONTRATISTA, VETERINARIO',
      );
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('debería envolver errores inesperados del findById en 500 "Error updating user"', async () => {
      userRepository.findById.mockRejectedValue(new Error('boom'));

      await expect(
        service.update(baseUser.id, { active: true }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(baseUser.id, { active: true }),
      ).rejects.toThrow('Error updating user');
    });

    it('debería envolver el rechazo del update del puerto en 500 "Error updating user"', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      userRepository.update.mockRejectedValue(new Error('boom'));

      await expect(
        service.update(baseUser.id, { active: true }),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(baseUser.id, { active: true }),
      ).rejects.toThrow('Error updating user');
    });

    it('debería re-lanzar sin envolver el ConflictException del puerto en update', async () => {
      userRepository.findById.mockResolvedValue(baseUser);
      userRepository.update.mockRejectedValue(
        new ConflictException('User with this username already exists'),
      );

      await expect(
        service.update(baseUser.id, { username: 'operario1' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.update(baseUser.id, { username: 'operario1' }),
      ).rejects.toThrow('User with this username already exists');
    });
  });
});
