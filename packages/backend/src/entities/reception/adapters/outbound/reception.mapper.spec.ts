import { toReceptionRecord, ReceptionRow } from './reception.mapper';

const baseRow: ReceptionRow = {
  id: 'reception-1',
  clientId: 'client-1',
  date: new Date('2026-04-01T00:00:00.000Z'),
  status: 'PENDIENTE_VALIDACION',
  rejectionReason: null,
  validatedBy: null,
  validatedAt: null,
  createdAt: new Date('2026-04-01T10:00:00.000Z'),
  updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  client: { name: 'Estancia La Esperanza' },
  items: [
    {
      id: 'item-1',
      receptionId: 'reception-1',
      inputId: 'input-1',
      quantity: 10,
      validatedQuantity: null,
      unit: 'L',
      input: { name: 'Glifosato' },
    },
  ],
};

describe('toReceptionRecord', () => {
  it('exposes the client name and the input name additively', () => {
    const record = toReceptionRecord(baseRow);

    expect(record.clientName).toBe('Estancia La Esperanza');
    expect(record.items[0].inputName).toBe('Glifosato');
    expect(record.items[0].quantityVariance).toBeNull();
  });

  it('omits variance while the reception is pending', () => {
    const record = toReceptionRecord(baseRow);

    expect(record.items[0]).not.toHaveProperty('variance');
  });

  it('exposes the variance as validated minus expected when decided', () => {
    const record = toReceptionRecord({
      ...baseRow,
      status: 'VALIDADA',
      validatedBy: 'user-1',
      validatedAt: new Date('2026-04-02T09:30:00.000Z'),
      items: [{ ...baseRow.items[0], validatedQuantity: 12 }],
    });

    expect(record.items[0].quantityVariance).toBe(2);
    expect(record.items[0].variance).toBe(2);
  });

  it('keeps the existing keys untouched when the relations are not loaded', () => {
    const record = toReceptionRecord({
      ...baseRow,
      client: undefined,
      items: [{ ...baseRow.items[0], input: undefined }],
    });

    expect(record.clientName).toBeUndefined();
    expect(record.items[0].inputName).toBeUndefined();
    expect(record.items[0].id).toBe('item-1');
    expect(record.items[0].quantity).toBe(10);
  });
});
