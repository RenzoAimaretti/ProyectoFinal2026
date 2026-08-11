import {
  CreateLivestockEventData,
  CreateLivestockEventInput,
  LivestockEventRecord,
  UpdateLivestockEventData,
  UpdateLivestockEventInput,
} from './livestock-event.types';

export const LIVESTOCK_EVENT_REPOSITORY = Symbol('LIVESTOCK_EVENT_REPOSITORY');
export const LIVESTOCK_READER = Symbol('LIVESTOCK_READER');
export const USER_READER = Symbol('USER_READER');

export interface LivestockEventRepositoryPort {
  findAll(): Promise<LivestockEventRecord[]>;
  findById(id: string): Promise<LivestockEventRecord | null>;
  create(data: CreateLivestockEventData): Promise<LivestockEventRecord>;
  update(id: string, data: UpdateLivestockEventData): Promise<LivestockEventRecord>;
}

export interface LivestockReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}

export interface UserReaderPort {
  findById(id: string): Promise<{ id: string } | null>;
}
