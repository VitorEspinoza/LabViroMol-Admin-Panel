import { describe, expect, it, vi } from 'vitest';
import { Table } from 'primeng/table';

import { TableSortCycle } from './table-sort-cycle';

function makeTable(): Table {
  return {
    sortField: undefined,
    sortOrder: undefined,
    tableService: { onSort: vi.fn() },
  } as unknown as Table;
}

describe('TableSortCycle', () => {
  it('retorna undefined sem nenhum evento ou clique anterior', () => {
    const cycle = new TableSortCycle();

    expect(cycle.resolve(undefined)).toEqual({ sortBy: undefined, sortDirection: undefined });
    expect(cycle.current()).toEqual({ sortBy: undefined, sortDirection: undefined });
  });

  it('primeiro clique ordena ascendente', () => {
    const cycle = new TableSortCycle();

    expect(cycle.resolve({ sortField: 'name', sortOrder: 1 })).toEqual({ sortBy: 'name', sortDirection: 'asc' });
  });

  it('segundo clique ordena descendente', () => {
    const cycle = new TableSortCycle();

    cycle.resolve({ sortField: 'name', sortOrder: 1 });
    expect(cycle.resolve({ sortField: 'name', sortOrder: -1 })).toEqual({ sortBy: 'name', sortDirection: 'desc' });
  });

  it('terceiro clique remove a ordenação e reseta o estado visual da tabela', () => {
    const cycle = new TableSortCycle();
    const table = makeTable();

    cycle.resolve({ sortField: 'name', sortOrder: 1 }, table);
    cycle.resolve({ sortField: 'name', sortOrder: -1 }, table);

    const result = cycle.resolve({ sortField: 'name', sortOrder: 1 }, table);

    expect(result).toEqual({ sortBy: undefined, sortDirection: undefined });
    expect(table.sortField).toBeNull();
    expect(table.sortOrder).toBe(1);
    expect(table.tableService.onSort).toHaveBeenCalledWith(null);
  });

  it('quarto clique no mesmo campo recomeça o ciclo em ascendente', () => {
    const cycle = new TableSortCycle();
    const table = makeTable();

    cycle.resolve({ sortField: 'name', sortOrder: 1 }, table);
    cycle.resolve({ sortField: 'name', sortOrder: -1 }, table);
    cycle.resolve({ sortField: 'name', sortOrder: 1 }, table);

    expect(cycle.resolve({ sortField: 'name', sortOrder: 1 }, table)).toEqual({ sortBy: 'name', sortDirection: 'asc' });
  });

  it('clicar em outro campo inicia um novo ciclo de ordenação', () => {
    const cycle = new TableSortCycle();
    const table = makeTable();

    cycle.resolve({ sortField: 'name', sortOrder: 1 }, table);
    cycle.resolve({ sortField: 'name', sortOrder: -1 }, table);

    expect(cycle.resolve({ sortField: 'location', sortOrder: 1 }, table)).toEqual({ sortBy: 'location', sortDirection: 'asc' });
  });

  it('current() preserva a última ordenação aplicada para recargas manuais', () => {
    const cycle = new TableSortCycle();

    cycle.resolve({ sortField: 'name', sortOrder: -1 });

    expect(cycle.current()).toEqual({ sortBy: 'name', sortDirection: 'desc' });
    expect(cycle.resolve(undefined)).toEqual({ sortBy: 'name', sortDirection: 'desc' });
  });

  it('current() retorna undefined após a ordenação ser removida no terceiro clique', () => {
    const cycle = new TableSortCycle();
    const table = makeTable();

    cycle.resolve({ sortField: 'name', sortOrder: 1 }, table);
    cycle.resolve({ sortField: 'name', sortOrder: -1 }, table);
    cycle.resolve({ sortField: 'name', sortOrder: 1 }, table);

    expect(cycle.current()).toEqual({ sortBy: undefined, sortDirection: undefined });
  });

  it('evento sem sortField (ordenação removida pelo próprio PrimeNG) limpa o ciclo', () => {
    const cycle = new TableSortCycle();

    cycle.resolve({ sortField: 'name', sortOrder: 1 });

    expect(cycle.resolve({ sortField: undefined, sortOrder: undefined })).toEqual({ sortBy: undefined, sortDirection: undefined });
    expect(cycle.current()).toEqual({ sortBy: undefined, sortDirection: undefined });
  });
});
