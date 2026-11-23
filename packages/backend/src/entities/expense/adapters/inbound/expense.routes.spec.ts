import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ExpenseSuggestionController } from './expense-suggestion.controller';
import { ExpenseController } from './expense.controller';

// The role-matrix specs key on handler names; these pins tie each guarded
// handler to the HTTP verb and path of design §2.11, so a renamed route or a
// swapped verb cannot keep the matrix green while exposing another endpoint.
type Handler = (...args: unknown[]) => unknown;

function routeOf(controller: { prototype: object }, handler: string) {
  const method = (controller.prototype as Record<string, Handler>)[handler];
  return {
    verb: Reflect.getMetadata(METHOD_METADATA, method) as RequestMethod,
    path: Reflect.getMetadata(PATH_METADATA, method) as string,
  };
}

describe('expense routes', () => {
  it('mounts the expense controller under /expenses', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ExpenseController)).toBe(
      'expenses',
    );
  });

  it.each([
    ['preview', RequestMethod.POST, 'preview'],
    ['findAll', RequestMethod.GET, '/'],
    ['create', RequestMethod.POST, '/'],
    ['update', RequestMethod.PATCH, ':id'],
    ['remove', RequestMethod.DELETE, ':id'],
    ['suggest', RequestMethod.POST, ':id/suggestions'],
  ])(
    'binds ExpenseController.%s to its verb and path',
    (handler, verb, path) => {
      expect(routeOf(ExpenseController, handler)).toEqual({ verb, path });
    },
  );

  it('mounts the suggestion controller under /expense-suggestions', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, ExpenseSuggestionController),
    ).toBe('expense-suggestions');
  });

  it.each([
    ['findAll', RequestMethod.GET, '/'],
    ['approve', RequestMethod.POST, ':id/approve'],
    ['reject', RequestMethod.POST, ':id/reject'],
  ])(
    'binds ExpenseSuggestionController.%s to its verb and path',
    (handler, verb, path) => {
      expect(routeOf(ExpenseSuggestionController, handler)).toEqual({
        verb,
        path,
      });
    },
  );
});
