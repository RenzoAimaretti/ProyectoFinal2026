import { Inject, Injectable } from '@nestjs/common';
import {
  CreateLivestockMovementData,
  LivestockMovementEntity,
  LIVESTOCK_MOVEMENT_REPOSITORY,
  LivestockMovementRepositoryPort,
} from './ports/livestock-movement.repository';

@Injectable()
export class LivestockMovementService {
  constructor(
    @Inject(LIVESTOCK_MOVEMENT_REPOSITORY)
    private readonly repository: LivestockMovementRepositoryPort,
  ) {}

  findAll(): Promise<LivestockMovementEntity[]> {
    return this.repository.findAll();
  }

  findOne(id: string): Promise<LivestockMovementEntity | null> {
    return this.repository.findById(id);
  }

  create(data: CreateLivestockMovementData): Promise<LivestockMovementEntity> {
    return this.repository.create(data);
  }
}
