import { ListReapplicationAlertsUseCase } from './list-reapplication-alerts.use-case';
import { ReapplicationAlertReaderPort } from '../recipe.ports';
import { RecipeForReapplicationAlert } from '../recipe.types';

describe('ListReapplicationAlertsUseCase', () => {
  const fakeNow = new Date('2026-11-15T12:00:00Z');
  const clock = { now: () => fakeNow };

  const candidateBase: RecipeForReapplicationAlert = {
    id: 'recipe-1',
    lotId: 'lot-1',
    lotName: 'Lote Norte',
    farmName: 'Estancia La Paz',
    clientName: 'Agropecuaria El Ombú',
    taskId: 'task-1',
    taskStatus: 'EN_PROGRESO',
    date: new Date('2026-11-05T10:00:00Z'),
    pest: 'Oruga militar',
    crop: 'Soja',
    observations: 'Aplicar al atardecer',
    sprayVolume: 120,
    sprayVolumeUnit: 'L/ha',
    reapplicationIntervalDays: 10,
    reapplicationDate: null,
  };

  it('rejects empty or whitespace tenantId', async () => {
    const reader: ReapplicationAlertReaderPort = {
      findCandidateRecipesForAlerts: jest.fn(),
    };
    const useCase = new ListReapplicationAlertsUseCase(reader, clock);

    await expect(useCase.execute('')).rejects.toThrow('tenantId');
  });

  it('filters out recipes with cancelled tasks', async () => {
    const reader: ReapplicationAlertReaderPort = {
      findCandidateRecipesForAlerts: jest.fn().mockResolvedValue([
        {
          ...candidateBase,
          id: 'cancelled-recipe',
          taskStatus: 'CANCELADA',
          reapplicationIntervalDays: 5,
        },
      ]),
    };
    const useCase = new ListReapplicationAlertsUseCase(reader, clock);
    const result = await useCase.execute('tenant-1');

    expect(result).toHaveLength(0);
  });

  it('generates overdue, due today, and upcoming alerts and sorts them by urgency', async () => {
    const overdueCandidate: RecipeForReapplicationAlert = {
      ...candidateBase,
      id: 'r-overdue',
      reapplicationDate: new Date('2026-11-13T00:00:00Z'), // -2 days overdue
    };

    const dueTodayCandidate: RecipeForReapplicationAlert = {
      ...candidateBase,
      id: 'r-due-today',
      reapplicationDate: new Date('2026-11-15T00:00:00Z'), // today
    };

    const upcomingCandidate: RecipeForReapplicationAlert = {
      ...candidateBase,
      id: 'r-upcoming',
      reapplicationDate: new Date('2026-11-17T00:00:00Z'), // +2 days upcoming
    };

    const distantCandidate: RecipeForReapplicationAlert = {
      ...candidateBase,
      id: 'r-distant',
      reapplicationDate: new Date('2026-11-28T00:00:00Z'), // +13 days (outside 3-day horizon)
    };

    const reader: ReapplicationAlertReaderPort = {
      findCandidateRecipesForAlerts: jest.fn().mockResolvedValue([
        upcomingCandidate,
        overdueCandidate,
        distantCandidate,
        dueTodayCandidate,
      ]),
    };

    const useCase = new ListReapplicationAlertsUseCase(reader, clock);
    const results = await useCase.execute('tenant-1', 3);

    expect(results).toHaveLength(3);
    // Sort order: overdue first, then due today, then upcoming
    expect(results[0].recipeId).toBe('r-overdue');
    expect(results[0].urgency).toBe('OVERDUE');
    expect(results[0].isDue).toBe(true);
    expect(results[0].daysRemaining).toBe(-2);

    expect(results[1].recipeId).toBe('r-due-today');
    expect(results[1].urgency).toBe('DUE_TODAY');
    expect(results[1].isDue).toBe(true);
    expect(results[1].daysRemaining).toBe(0);

    expect(results[2].recipeId).toBe('r-upcoming');
    expect(results[2].urgency).toBe('UPCOMING');
    expect(results[2].isDue).toBe(false);
    expect(results[2].daysRemaining).toBe(2);
  });
});
