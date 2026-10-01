import { TaskReadOutput, TaskRecord } from '../../application/task.types';

/**
 * Task reads always bring the display names of their relations so the inbound
 * adapter can expose `lotName`, `farmName`, `taskTypeName` and the operator
 * summaries without extra round trips. These are additive read enrichments:
 * existing columns and their mapping stay untouched.
 */
export const TASK_READ_INCLUDE = {
  lot: { select: { name: true, farm: { select: { name: true } } } },
  taskType: { select: { name: true } },
  operators: { select: { id: true, username: true, email: true } },
} as const;

export type TaskReadRow = TaskRecord & {
  lot?: { name: string; farm?: { name: string } | null } | null;
  taskType?: { name: string } | null;
  operators?: { id: string; username: string | null; email: string }[] | null;
};

export function toTaskReadOutput(row: TaskReadRow): TaskReadOutput {
  const { lot, taskType, operators, ...record } = row;

  return {
    ...record,
    lotName: lot?.name,
    farmName: lot?.farm?.name,
    taskTypeName: taskType?.name,
    operators: operators?.map((operator) => ({
      id: operator.id,
      name: operator.username ?? operator.email,
    })),
  };
}
