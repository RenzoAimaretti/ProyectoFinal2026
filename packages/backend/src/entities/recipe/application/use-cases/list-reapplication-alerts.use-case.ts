import { ClockPort, ReapplicationAlertReaderPort } from '../recipe.ports';
import { ReapplicationAlert } from '../recipe.types';
import { assertRequiredString } from '../recipe.validation';
import { evaluateReapplicationAlert } from '../../domain/reapplication-alert.rules';

export class ListReapplicationAlertsUseCase {
  constructor(
    private readonly reader: ReapplicationAlertReaderPort,
    private readonly clock?: ClockPort,
  ) {}

  async execute(
    tenantId: string,
    upcomingHorizonDays = 3,
  ): Promise<ReapplicationAlert[]> {
    const tenant = assertRequiredString(tenantId, 'tenantId');
    const now = this.clock ? this.clock.now() : new Date();

    const candidates = await this.reader.findCandidateRecipesForAlerts(tenant);

    const alerts: ReapplicationAlert[] = [];

    for (const recipe of candidates) {
      if (recipe.taskStatus === 'CANCELADA') {
        continue;
      }

      const evaluation = evaluateReapplicationAlert(
        {
          recipeDate: recipe.date,
          reapplicationDate: recipe.reapplicationDate,
          reapplicationIntervalDays: recipe.reapplicationIntervalDays,
        },
        now,
        upcomingHorizonDays,
      );

      if (!evaluation) {
        continue;
      }

      alerts.push({
        recipeId: recipe.id,
        taskId: recipe.taskId,
        lotId: recipe.lotId,
        lotName: recipe.lotName,
        farmName: recipe.farmName,
        clientName: recipe.clientName,
        crop: recipe.crop,
        pest: recipe.pest,
        observations: recipe.observations,
        recipeDate: recipe.date,
        targetDate: evaluation.targetDate,
        reapplicationIntervalDays: recipe.reapplicationIntervalDays,
        daysRemaining: evaluation.daysRemaining,
        urgency: evaluation.urgency,
        isDue: evaluation.isDue,
      });
    }

    return alerts.sort((a, b) => {
      // Sort order: lower daysRemaining (most overdue) comes first
      return a.daysRemaining - b.daysRemaining;
    });
  }
}
