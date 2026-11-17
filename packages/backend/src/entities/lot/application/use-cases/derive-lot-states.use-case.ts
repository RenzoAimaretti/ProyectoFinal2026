import { EMPTY_LOT_HISTORY, deriveLotState } from '../../domain/lot-state';
import { LotHistoryReaderPort } from '../lot.ports';
import { LotRecord, LotWithState } from '../lot.types';

/**
 * Derives each lot's state from what actually happened on it. The state is never
 * stored, so it cannot drift away from the history that produces it.
 */
export class DeriveLotStatesUseCase {
  constructor(private readonly historyReader: LotHistoryReaderPort) {}

  async execute(lots: readonly LotRecord[]): Promise<LotWithState[]> {
    if (lots.length === 0) {
      return [];
    }

    const history = await this.historyReader.findHistoryByLotIds(
      lots.map((lot) => lot.id),
    );

    return lots.map((lot) => ({
      ...lot,
      state: deriveLotState(history.get(lot.id) ?? EMPTY_LOT_HISTORY),
    }));
  }
}
