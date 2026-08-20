import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { useUserContext } from '../../contexts/UserContext';
import { emailHistoryService } from '../../services/emailHistoryService';
import { EmailHistoryRecord, EmailHistoryFilters as FilterType, EmailHistorySummary as SummaryType } from '../../types/emailHistory';
import { EmailHistorySummary } from '../../components/email-history/EmailHistorySummary';
import { EmailHistoryFilters } from '../../components/email-history/EmailHistoryFilters';
import { EmailHistoryTable } from '../../components/email-history/EmailHistoryTable';
import { EmailHistoryDetails } from '../../components/email-history/EmailHistoryDetails';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Mail, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

type DateRangeOption = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

export function EmailHistory() {
  const { schoolId } = useUserContext();
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState<FilterType>({
    page: 1,
    pageSize: 10,
    status: 'All Status',
    emailType: 'All Types',
    search: '',
  });

  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('last30');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  const [records, setRecords] = useState<EmailHistoryRecord[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<SummaryType>({ totalSent: 0, delivered: 0, failed: 0, processing: 0 });

  const [selectedRecord, setSelectedRecord] = useState<EmailHistoryRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const calculateDateRange = useCallback(() => {
    const today = new Date();
    let from = new Date();
    let to = new Date();

    switch (dateRangeOption) {
      case 'today':
        break;
      case 'yesterday':
        from.setDate(today.getDate() - 1);
        to.setDate(today.getDate() - 1);
        break;
      case 'last7':
        from.setDate(today.getDate() - 7);
        break;
      case 'last30':
        from.setDate(today.getDate() - 30);
        break;
      case 'custom':
        return {
          dateFrom: customDateFrom || undefined,
          dateTo: customDateTo || undefined,
        };
    }

    return {
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
    };
  }, [dateRangeOption, customDateFrom, customDateTo]);

  const loadData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);

    const dateRange = calculateDateRange();
    
    try {
      const response = await emailHistoryService.getHistory(schoolId, {
        ...filters,
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo
      });
      
      setRecords(response.items);
      setTotalItems(response.total);
      setSummary(response.summary);
    } catch (error) {
      console.error('Failed to load email history', error);
    } finally {
      setLoading(false);
    }
  }, [schoolId, filters, calculateDateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (updates: Partial<FilterType>) => {
    setFilters(prev => ({ ...prev, ...updates, page: 1 }));
  };

  const handleDateRangeChange = (option: DateRangeOption) => {
    setDateRangeOption(option);
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleViewRecord = (record: EmailHistoryRecord) => {
    setSelectedRecord(record);
    setIsDetailsOpen(true);
  };

  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-2 sm:px-4 py-0 sm:pt-6 space-y-6 pb-12"
      >
        {/* Page Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs mt-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Email History</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Track and monitor email delivery across your organization.</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <EmailHistorySummary summary={summary} />

        {/* Date Range Control */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-8">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Date Range:</span>
          </div>
          <Select value={dateRangeOption} onValueChange={(val) => handleDateRangeChange(val as DateRangeOption)}>
            <SelectTrigger className="w-[180px] rounded-xl bg-white border-slate-200">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="bg-white rounded-xl border border-slate-100 shadow-xl">
              <SelectItem value="today" className="cursor-pointer text-sm">Today</SelectItem>
              <SelectItem value="yesterday" className="cursor-pointer text-sm">Yesterday</SelectItem>
              <SelectItem value="last7" className="cursor-pointer text-sm">Last 7 Days</SelectItem>
              <SelectItem value="last30" className="cursor-pointer text-sm">Last 30 Days</SelectItem>
              <SelectItem value="custom" className="cursor-pointer text-sm">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRangeOption === 'custom' && (
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <Input 
                type="date" 
                value={customDateFrom} 
                onChange={(e) => { setCustomDateFrom(e.target.value); handleFilterChange({}); }}
                className="w-auto h-10 rounded-xl"
              />
              <span className="text-slate-400">to</span>
              <Input 
                type="date" 
                value={customDateTo} 
                onChange={(e) => { setCustomDateTo(e.target.value); handleFilterChange({}); }}
                className="w-auto h-10 rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Email History Section */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            Email Records
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">{totalItems}</span>
          </h2>

          <EmailHistoryFilters filters={filters} onFilterChange={handleFilterChange} />
          
          <EmailHistoryTable 
            records={records}
            totalItems={totalItems}
            filters={filters}
            loading={loading}
            onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
            onPageSizeChange={(pageSize) => setFilters(prev => ({ ...prev, pageSize, page: 1 }))}
            onViewRecord={handleViewRecord}
          />
        </div>

        {/* Details Modal */}
        <EmailHistoryDetails 
          record={selectedRecord} 
          isOpen={isDetailsOpen} 
          onClose={() => { setIsDetailsOpen(false); setTimeout(() => setSelectedRecord(null), 200); }} 
        />
      </motion.div>
    </AdminLayout>
  );
}
