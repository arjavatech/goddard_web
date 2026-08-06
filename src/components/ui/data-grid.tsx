import React from 'react';
import { DataTable } from './data-table';
import { MobileCardList } from './mobile-card-list';

export interface ColumnDef<T> {
  id: string;
  header: React.ReactNode;
  cell: (item: T) => React.ReactNode;
  className?: string; // For table
  hideInCardBody?: boolean;
}

interface DataGridProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  viewMode: 'table' | 'card';
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  // Function to render the custom card, passing down the item and dynamic columns
  renderCard: (item: T, dynamicColumns: ColumnDef<T>[]) => React.ReactNode;
  gridClassName?: string;
  tableLayout?: 'auto' | 'fixed';
}

export function DataGrid<T>({
  data,
  columns,
  viewMode,
  loading,
  loadingMessage,
  emptyMessage,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onPageSizeChange,
  renderCard,
  gridClassName,
  tableLayout
}: DataGridProps<T>) {
  
  if (viewMode === 'card') {
    const dynamicColumns = columns.filter(c => !c.hideInCardBody);
    return (
      <MobileCardList
        cards={data.map(item => renderCard(item, dynamicColumns))}
        loading={loading}
        loadingMessage={loadingMessage}
        emptyMessage={emptyMessage}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        gridClassName={gridClassName}
      />
    );
  }

  return (
    <DataTable
      columns={columns.map(c => ({ header: c.header, className: c.className }))}
      tableLayout={tableLayout}
      rows={data.map((item, index) => (
        <tr key={index} className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-colors duration-150">
          {columns.map(c => (
            <td key={c.id} className={`py-4 px-4 ${c.className || ''}`}>
              {c.cell(item)}
            </td>
          ))}
        </tr>
      ))}
      loading={loading}
      loadingMessage={loadingMessage}
      emptyMessage={emptyMessage}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
}
