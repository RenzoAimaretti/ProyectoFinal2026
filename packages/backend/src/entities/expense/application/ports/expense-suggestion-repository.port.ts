import {
  ExpenseChanges,
  ExpenseSuggestionStatusValue,
} from '../../domain/expense.rules';
import { ExpenseSuggestionOutput, SuggestionKind } from '../dto/expense.output';
import { ExpenseRevaluation } from './expense-repository.port';

export const EXPENSE_SUGGESTION_REPOSITORY = Symbol(
  'EXPENSE_SUGGESTION_REPOSITORY',
);

export interface CreateSuggestionRecord {
  expenseId: string;
  companyId: string;
  kind: SuggestionKind;
  /** Solo en EDICION; una BAJA no propone valores. */
  proposed: ExpenseChanges | null;
  suggestedBy: string;
}

export interface SuggestionFilter {
  companyId: string;
  status?: ExpenseSuggestionStatusValue;
  suggestedBy?: string;
}

export type ApprovalApply =
  | {
      kind: 'EDICION';
      /** `updatedAt` del gasto leido por el caso de uso. */
      expectedUpdatedAt: Date;
      lotId: string;
      categoryId: string;
      date: Date;
      description: string;
      /** `null` conserva monto, moneda, grano y valorizacion originales. */
      revaluation: ExpenseRevaluation | null;
    }
  | { kind: 'BAJA' };

export interface ApproveSuggestionRecord {
  id: string;
  companyId: string;
  resolvedBy: string;
  resolvedAt: Date;
  apply: ApprovalApply;
}

export interface RejectSuggestionRecord {
  id: string;
  companyId: string;
  resolvedBy: string;
  resolvedAt: Date;
  reason: string;
}

export interface ExpenseSuggestionRepositoryPort {
  /**
   * Atomica: verifica que el gasto existe y no tiene otra sugerencia pendiente.
   * Una carrera la resuelve el indice unico parcial (409).
   */
  create(record: CreateSuggestionRecord): Promise<ExpenseSuggestionOutput>;
  findAll(filter: SuggestionFilter): Promise<ExpenseSuggestionOutput[]>;
  findById(
    id: string,
    companyId: string,
  ): Promise<ExpenseSuggestionOutput | null>;
  /**
   * Aplica la edicion o la baja logica y marca la sugerencia APROBADA en UNA
   * transaccion; verifica en ella que sigue PENDIENTE.
   */
  approve(record: ApproveSuggestionRecord): Promise<ExpenseSuggestionOutput>;
  /** Marca RECHAZADA con motivo, verificando en la transaccion que sigue PENDIENTE. */
  reject(record: RejectSuggestionRecord): Promise<ExpenseSuggestionOutput>;
}
