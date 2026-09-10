import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface EntityTableProps<T> {
  columns: Column<T>[];
  items: T[];
  getRowKey: (item: T) => string;
  isLoading: boolean;
  error: string | null;
  emptyLabel: string;
}

export function EntityTable<T>({
  columns,
  items,
  getRowKey,
  isLoading,
  error,
  emptyLabel,
}: EntityTableProps<T>) {
  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-ink-soft">Loading…</div>
    );
  }

  if (error) {
    return <div className="py-8 text-center text-sm text-red-600">{error}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-ink-soft">{emptyLabel}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
            {columns.map((col) => (
              <th key={col.header} className="py-2 pr-4 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((item) => (
            <tr key={getRowKey(item)} className="text-ink">
              {columns.map((col) => (
                <td key={col.header} className={`py-2.5 pr-4 ${col.className ?? ""}`}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
