import { Money } from '../../../valuation/domain/money';
import { ExpenseFilters } from '../../domain/expense.rules';
import { ExpenseOutput, ExpenseValuation } from '../dto/expense.output';

export const EXPENSE_REPOSITORY = Symbol('EXPENSE_REPOSITORY');

/** Valorizacion nueva de un gasto: monto y moneda con su precio del dia. */
export interface ExpenseRevaluation {
  money: Money;
  valuation: ExpenseValuation;
  valuedAt: Date;
}

export interface CreateExpenseRecord {
  companyId: string;
  lotId: string;
  categoryId: string;
  date: Date;
  description: string;
  money: Money;
  valuation: ExpenseValuation;
  valuedAt: Date;
  userId: string;
}

export interface UpdateExpenseRecord {
  id: string;
  companyId: string;
  userId: string;
  /** `updatedAt` leido por el caso de uso: si cambio, perdio una carrera. */
  expectedUpdatedAt: Date;
  lotId: string;
  categoryId: string;
  date: Date;
  description: string;
  /** `null` conserva monto, moneda, grano y valorizacion originales. */
  revaluation: ExpenseRevaluation | null;
}

export interface DeleteExpenseRecord {
  id: string;
  companyId: string;
  userId: string;
  expectedUpdatedAt: Date;
  deletedAt: Date;
}

export interface ExpenseRepositoryPort {
  create(record: CreateExpenseRecord): Promise<ExpenseOutput>;
  /** Excluye los gastos dados de baja. */
  findAll(companyId: string, filters: ExpenseFilters): Promise<ExpenseOutput[]>;
  /** Excluye los gastos dados de baja; siempre acotado por firma. */
  findById(id: string, companyId: string): Promise<ExpenseOutput | null>;
  /**
   * Edicion directa del ADMIN. Atomica: verifica en la misma transaccion que
   * el gasto existe, no cambio y no tiene sugerencia pendiente.
   */
  updateDirect(record: UpdateExpenseRecord): Promise<ExpenseOutput>;
  /** Baja logica directa del ADMIN, con las mismas verificaciones. */
  softDelete(record: DeleteExpenseRecord): Promise<void>;
}
