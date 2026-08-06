import { Loading } from './loading';
import { MobilePagination } from './pagination';
import { PageSizeSelector } from './page-size-selector';

interface MobileCardListProps {
  cards: React.ReactNode[];
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
  gridClassName?: string;
}

export function MobileCardList({
  cards,
  loading,
  loadingMessage = 'Loading...',
  emptyMessage = 'No results found.',
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onPageSizeChange,
  className,
  gridClassName = 'grid grid-cols-1 sm:grid-cols-2 gap-3',
}: MobileCardListProps) {
  return (
    <div className={className}>
      {onPageSizeChange && (
        <div className="flex justify-end items-center px-4 py-3 mb-2 border-b border-slate-200 bg-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <PageSizeSelector
              pageSize={itemsPerPage ?? 10}
              onPageSizeChange={onPageSizeChange}
              options={[10, 25, 50, 100]}
            />
          </div>
        </div>
      )}
      {loading ? (
        <div className="py-6 sm:py-8">
          <Loading message={loadingMessage} size="sm" />
        </div>
      ) : cards.length > 0 ? (
        <div className={gridClassName}>{cards}</div>
      ) : (
        <div className="py-8 text-center text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      )}
      <MobilePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
