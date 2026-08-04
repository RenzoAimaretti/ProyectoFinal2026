// Puerto de task-type (REQ-A-01). El update con taskIds es el cross-read
// relacional (tasks: set) que el legacy hacía con prisma.task.findMany + update
// de la relación — el service valida los ids vía TASK_REPOSITORY exportado por
// task (T-F2-45) y el adapter materializa el set en el update (REQ-F2-04).

export const TASK_TYPE_REPOSITORY = Symbol('TASK_TYPE_REPOSITORY');

export interface TaskTypeEntity {
  id: string;
  name: string;
  description: string | null;
}

export interface CreateTaskTypeData {
  name: string;
  description?: string;
}

export interface UpdateTaskTypeData {
  name?: string;
  description?: string;
  taskIds?: string[];
}

export interface TaskTypeRepositoryPort {
  findAll(): Promise<TaskTypeEntity[]>;
  findById(id: string): Promise<TaskTypeEntity | null>;
  // findFirst({ where: { name } }) del legacy (unicidad en create)
  findByName(name: string): Promise<TaskTypeEntity | null>;
  create(data: CreateTaskTypeData): Promise<TaskTypeEntity>;
  update(id: string, data: UpdateTaskTypeData): Promise<TaskTypeEntity>;
  delete(id: string): Promise<TaskTypeEntity>;
}
