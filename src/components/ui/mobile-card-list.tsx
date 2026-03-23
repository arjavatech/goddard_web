import { Loading } from './loading';
import { MobilePagination } from './pagination';

interface MobileCardListProps {
  cards: React.ReactNode[];
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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
  onPageChange,
  className,
  gridClassName = 'grid grid-cols-1 sm:grid-cols-2 gap-3',
}: MobileCardListProps) {
  return (
    <div className={className}>
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
        onPageChange={onPageChange}
      />
    </div>
  );
}
