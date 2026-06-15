import { Table, TableLazyLoadEvent } from 'primeng/table';

export interface SortParams {
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * PrimeNG's p-table only toggles a sorted column between ascending and
 * descending. This tracks click history to add a third "no sort" state:
 * a click on an already-descending column clears sorting and resets the
 * table's visual sort indicators.
 */
export class TableSortCycle {
  private lastField?: string;
  private lastOrder?: number;

  resolve(event: TableLazyLoadEvent | undefined, table?: Table): SortParams {
    if (!event) return this.current();

    const field = typeof event.sortField === 'string' ? event.sortField : undefined;
    const order = event.sortOrder ?? undefined;

    if (field && field === this.lastField && this.lastOrder === -1 && order === 1) {
      this.lastField = undefined;
      this.lastOrder = undefined;
      if (table) {
        table.sortField = null;
        table.sortOrder = 1;
        table.tableService.onSort(null);
      }
      return { sortBy: undefined, sortDirection: undefined };
    }

    this.lastField = field;
    this.lastOrder = order;

    return field ? { sortBy: field, sortDirection: order === -1 ? 'desc' : 'asc' } : { sortBy: undefined, sortDirection: undefined };
  }

  /** Current sort params without consuming a lazy-load event (e.g. reloading after a mutation). */
  current(): SortParams {
    return this.lastField ? { sortBy: this.lastField, sortDirection: this.lastOrder === -1 ? 'desc' : 'asc' } : { sortBy: undefined, sortDirection: undefined };
  }
}
