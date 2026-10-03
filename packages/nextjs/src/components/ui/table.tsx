"use client";

// Design-system tables.
//
// Two layers are exported:
// - Low-level `Table` / `Th` / `Td` for fully custom layouts.
// - High-level `DataTable<T>` for typed columns with empty/loading states.
//
// Documented API:
//   <DataTable
//     columns={[{ key, header, render, align?, className?, headerClassName? }]}
//     data={rows}
//     rowKey={(row, i) => row.id}
//     onRowClick?={(row) => ...}
//     loading?={boolean}
//     emptyState?={<node>}
//     skeletonRows?={number}
//   />

import { EmptyState } from "./primitives";
import { InboxIcon } from "./icons";
import { TableSkeleton } from "./skeleton";

export type DataTableAlign = "left" | "center" | "right";

export type DataTableColumn<T> = {
  /** Stable column identifier. */
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: DataTableAlign;
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  skeletonRows?: number;
  className?: string;
  caption?: string;
};

const alignClass: Record<DataTableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/* ------------------------------------------------------------------ */
/* Low-level primitives                                                */
/* ------------------------------------------------------------------ */

export function Table({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-agro-border ${className}`}>
      <table className="text-numeric w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: DataTableAlign;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 font-semibold ${alignClass[align]} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: DataTableAlign;
  className?: string;
}) {
  return <td className={`px-3 py-2.5 ${alignClass[align]} ${className}`}>{children}</td>;
}

/* ------------------------------------------------------------------ */
/* High-level typed table                                              */
/* ------------------------------------------------------------------ */

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  loading = false,
  emptyState,
  skeletonRows = 5,
  className = "",
  caption,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={skeletonRows} columns={columns.length} className={className} />;
  }

  if (data.length === 0) {
    return (
      <div className={className}>
        {emptyState ?? (
          <EmptyState
            icon={<InboxIcon />}
            title="Sin datos"
            subtitle="No hay registros para mostrar."
          />
        )}
      </div>
    );
  }

  return (
    <Table className={className}>
      {caption && (
        <caption className="border-b border-agro-border px-3 py-2 text-left text-sm font-semibold text-ink">
          {caption}
        </caption>
      )}
      <thead className="bg-base-subtle/60 text-[11px] uppercase tracking-wider text-ink-faint">
        <tr>
          {columns.map((col) => (
            <Th key={col.key} align={col.align} className={col.headerClassName}>
              {col.header}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-agro-border">
        {data.map((row, index) => (
          <tr
            key={rowKey(row, index)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            onKeyDown={
              onRowClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }
                : undefined
            }
            tabIndex={onRowClick ? 0 : undefined}
            className={`transition-colors ${
              onRowClick
                ? "cursor-pointer hover:bg-base-subtle focus:bg-base-subtle focus:outline-none"
                : ""
            }`}
          >
            {columns.map((col) => (
              <Td key={col.key} align={col.align} className={col.className}>
                {col.render(row)}
              </Td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
