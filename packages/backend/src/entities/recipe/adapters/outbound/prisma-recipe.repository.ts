import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RecipeRepositoryPort } from '../../application/recipe.ports';
import {
  CreateRecipeData,
  RecipeItemRecord,
  RecipeRecord,
} from '../../application/recipe.types';
import { RecipeStatus } from '../../domain/recipe-status';
import { orderRecipeItemsByLoadOrder } from '../../domain/recipe.rules';

const RECIPE_ITEM_ORDER_BY = [
  { loadOrder: 'asc' as const },
  { id: 'asc' as const },
];

/**
 * Items are always read together with the catalogue name of their input so the
 * inbound adapter can expose `inputName` without an extra round trip.
 */
const RECIPE_ITEM_INCLUDE = {
  orderBy: RECIPE_ITEM_ORDER_BY,
  include: { input: { select: { name: true as const } } },
};

type RecipeRow = {
  id: string;
  lotId: string;
  date: Date;
  status: RecipeStatus;
  observations: string | null;
  sprayVolume: number;
  sprayVolumeUnit: string;
  createdAt: Date;
  updatedAt: Date;
  items: RecipeItemRow[];
};

type RecipeItemRow = {
  id: string;
  recipeId: string;
  inputId: string;
  dose: number;
  unit: string | null;
  loadOrder: number;
  input?: { name: string } | null;
};

@Injectable()
export class PrismaRecipeRepository implements RecipeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRecipeData): Promise<RecipeRecord> {
    const recipe = await this.prisma.recipe.create({
      data: {
        lotId: data.lotId,
        date: data.date,
        status: data.status,
        observations: data.observations,
        sprayVolume: data.sprayVolume,
        sprayVolumeUnit: data.sprayVolumeUnit,
        items: {
          create: data.items.map((item) => ({
            inputId: item.inputId,
            dose: item.dose,
            unit: item.unit,
            loadOrder: item.loadOrder,
          })),
        },
      },
      include: { items: RECIPE_ITEM_INCLUDE },
    });

    return this.toRecipeRecord(recipe);
  }

  async findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<RecipeRecord | null> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, lot: { farm: { client: { tenantId } } } },
      include: { items: RECIPE_ITEM_INCLUDE },
    });

    return recipe ? this.toRecipeRecord(recipe) : null;
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

    return recipes.map((recipe) => this.toRecipeRecord(recipe));
  }

  private toRecipeRecord(recipe: RecipeRow): RecipeRecord {
    return {
      id: recipe.id,
      lotId: recipe.lotId,
      date: recipe.date,
      status: recipe.status,
      observations: recipe.observations,
      sprayVolume: recipe.sprayVolume,
      sprayVolumeUnit: recipe.sprayVolumeUnit,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      items: orderRecipeItemsByLoadOrder(recipe.items).map(
        (item): RecipeItemRecord => ({
          id: item.id,
          recipeId: item.recipeId,
          inputId: item.inputId,
          dose: item.dose,
          unit: item.unit,
          loadOrder: item.loadOrder,
          inputName: item.input?.name,
        }),
      ),
    };
  }
}
