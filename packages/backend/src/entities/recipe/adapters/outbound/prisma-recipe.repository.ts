import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RecipeRepositoryPort } from '../../application/recipe.ports';
import {
  CreateRecipeData,
  RecipeRecord,
  UpdateRecipeData,
} from '../../application/recipe.types';
import { EntityNotFoundError } from '../../domain/errors';
import {
  RECIPE_ITEM_INCLUDE,
  toRecipeRecord,
} from './recipe.mapper';

@Injectable()
export class PrismaRecipeRepository implements RecipeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRecipeData): Promise<RecipeRecord> {
    const recipe = await this.prisma.recipe.create({
      data: {
        lotId: data.lotId,
        ...(data.taskId !== undefined ? { taskId: data.taskId } : {}),
        date: data.date,
        status: data.status,
        ...(data.pest !== undefined ? { pest: data.pest } : {}),
        ...(data.crop !== undefined ? { crop: data.crop } : {}),
        observations: data.observations,
        sprayVolume: data.sprayVolume,
        sprayVolumeUnit: data.sprayVolumeUnit,
        ...(data.reapplicationIntervalDays !== undefined
          ? { reapplicationIntervalDays: data.reapplicationIntervalDays }
          : {}),
        ...(data.reapplicationDate !== undefined
          ? { reapplicationDate: data.reapplicationDate }
          : {}),
        items: {
          create: data.items.map((item) => ({
            inputId: item.inputId,
            dose: item.dose,
            ...(item.dosageBasis !== undefined
              ? { dosageBasis: item.dosageBasis }
              : {}),
            unit: item.unit,
            loadOrder: item.loadOrder,
          })),
        },
      },
      include: { items: RECIPE_ITEM_INCLUDE },
    });

    return toRecipeRecord(recipe);
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateRecipeData,
  ): Promise<RecipeRecord> {
    const existing = await this.prisma.recipe.findFirst({
      where: { id, lot: { farm: { client: { tenantId } } } },
      select: { id: true },
    });

    if (!existing) {
      throw new EntityNotFoundError(`Recipe with id ${id} not found`);
    }

    const recipe = await this.prisma.recipe.update({
      where: { id: existing.id },
      data: {
        ...(data.date !== undefined ? { date: data.date } : {}),
        ...(data.pest !== undefined ? { pest: data.pest } : {}),
        ...(data.crop !== undefined ? { crop: data.crop } : {}),
        ...(data.observations !== undefined
          ? { observations: data.observations }
          : {}),
        ...(data.sprayVolume !== undefined
          ? { sprayVolume: data.sprayVolume }
          : {}),
        ...(data.sprayVolumeUnit !== undefined
          ? { sprayVolumeUnit: data.sprayVolumeUnit }
          : {}),
        ...(data.reapplicationIntervalDays !== undefined
          ? { reapplicationIntervalDays: data.reapplicationIntervalDays }
          : {}),
        ...(data.reapplicationDate !== undefined
          ? { reapplicationDate: data.reapplicationDate }
          : {}),
        ...(data.items !== undefined
          ? {
              items: {
                deleteMany: {},
                create: data.items.map((item) => ({
                  inputId: item.inputId,
                  dose: item.dose,
                  ...(item.dosageBasis !== undefined
                    ? { dosageBasis: item.dosageBasis }
                    : {}),
                  unit: item.unit,
                  loadOrder: item.loadOrder,
                })),
              },
            }
          : {}),
      },
      include: { items: RECIPE_ITEM_INCLUDE },
    });

    return toRecipeRecord(recipe);
  }

  async findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<RecipeRecord | null> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, lot: { farm: { client: { tenantId } } } },
      include: {
        items: RECIPE_ITEM_INCLUDE,
        lot: { select: { area: true } },
      },
    });

    return recipe ? toRecipeRecord(recipe) : null;
  }

  async findByTaskId(
    taskId: string,
    tenantId: string,
  ): Promise<RecipeRecord | null> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { taskId, lot: { farm: { client: { tenantId } } } },
      include: { items: RECIPE_ITEM_INCLUDE },
    });

    return recipe ? toRecipeRecord(recipe) : null;
  }

  async findAllByLotForTenant(
    lotId: string,
    tenantId: string,
  ): Promise<RecipeRecord[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: { lotId, lot: { farm: { client: { tenantId } } } },
      include: { items: RECIPE_ITEM_INCLUDE },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });

    return recipes.map((recipe) => toRecipeRecord(recipe));
  }
}
