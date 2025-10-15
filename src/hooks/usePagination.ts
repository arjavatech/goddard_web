import { useState, useMemo, useEffect } from 'react';

interface UsePaginationProps<T> {
  data: T[];
  itemsPerPage?: number;
  mobileItemsPerPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  paginatedData: T[];
  itemsPerPage: number;
  isMobile: boolean;
  setCurrentPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
}

export function usePagination<T>({
  data,
  itemsPerPage = 10,
  mobileItemsPerPage = 5
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const actualItemsPerPage = isMobile ? mobileItemsPerPage : itemsPerPage;

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * actualItemsPerPage;
    return data.slice(startIndex, startIndex + actualItemsPerPage);
  }, [data, currentPage, actualItemsPerPage]);

  const totalPages = Math.ceil(data.length / actualItemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [isMobile]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  return {
    currentPage,
    totalPages,
    paginatedData,
    itemsPerPage: actualItemsPerPage,
    isMobile,
    setCurrentPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage
  };
}