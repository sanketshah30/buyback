import type { ReactNode } from 'react';
import './DataTable.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /** Rendered in a trailing, right-aligned Actions column. */
  actions?: (row: T) => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, rows, rowKey, actions, loading = false, emptyMessage = 'Nothing here yet.' }: DataTableProps<T>) {
  const colCount = columns.length + (actions ? 1 : 0);
  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.align === 'right' ? 'data-table__right' : undefined}>
                {col.header}
              </th>
            ))}
            {actions && <th className="data-table__right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={colCount} className="data-table__message">
                Loading…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={colCount} className="data-table__message">
                {emptyMessage}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td key={col.key} className={col.align === 'right' ? 'data-table__right' : undefined}>
                    {col.render(row)}
                  </td>
                ))}
                {actions && (
                  <td className="data-table__right">
                    <div className="data-table__actions">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
