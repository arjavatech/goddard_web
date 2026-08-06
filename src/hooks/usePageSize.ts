import { useState, useCallback } from 'react';
import { PreferencesService } from '../services/preferences';

export function usePageSize(pageKey: string, defaultSize = 10) {
  const [pageSize, setPageSizeState] = useState<number>(() => {
    return PreferencesService.getPageSize(pageKey, defaultSize);
  });

  const setPageSize = useCallback((newSize: number) => {
    PreferencesService.setPageSize(pageKey, newSize);
    setPageSizeState(newSize);
  }, [pageKey]);

  return [pageSize, setPageSize] as const;
}
