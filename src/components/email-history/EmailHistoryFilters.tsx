import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { EmailHistoryFilters as FilterType, EmailHistoryStatus } from '../../types/emailHistory';

interface EmailHistoryFiltersProps {
  filters: FilterType;
  onFilterChange: (updates: Partial<FilterType>) => void;
}

export function EmailHistoryFilters({ filters, onFilterChange }: EmailHistoryFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const toggleFilters = () => setShowFilters(prev => !prev);
  
  const activeFilterCount = (filters.status !== 'All Status' ? 1 : 0) + (filters.emailType !== 'All Types' ? 1 : 0);

  const clearAllFilters = () => {
    onFilterChange({ status: 'All Status', emailType: 'All Types' });
  };

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Search and Toggle Button */}
      <div className="flex items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 transition-colors ${filters.search ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
          <Input
            type="text"
            placeholder="Search recipient, subject..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="pl-9 pr-4 h-8 transition-all rounded-xl focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white border-slate-200 text-sm placeholder:text-slate-400"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 hover:text-slate-600 rounded-md"
              onClick={() => onFilterChange({ search: '' })}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          onClick={toggleFilters}
          size="sm"
          className="h-8 rounded-xl bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 transition-all duration-200 relative font-bold text-xs px-3 flex-shrink-0"
        >
          {showFilters ? <X className="h-4 w-4 sm:mr-1.5" /> : <Filter className="h-4 w-4 sm:mr-1.5" />}
          <span className="hidden sm:inline">{showFilters ? 'Hide Filters' : 'Filters'}</span>
          {!showFilters && activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F2D52] text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
              </span>
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-8 rounded-lg bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 transition-all font-bold text-xs">
                <X className="h-3.5 w-3.5 mr-1" />
                Clear All
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">Status</label>
              <Select
                value={filters.status || 'All Status'}
                onValueChange={(val) => onFilterChange({ status: val as EmailHistoryStatus | 'All Status' })}
              >
                <SelectTrigger className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border border-slate-100 shadow-xl" position="popper" sideOffset={4}>
                  <SelectItem value="All Status" className="cursor-pointer text-sm">All Status</SelectItem>
                  <SelectItem value="sent" className="cursor-pointer text-sm">Sent</SelectItem>
                  <SelectItem value="failed" className="cursor-pointer text-sm">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">Email Type</label>
              <Select
                value={filters.emailType || 'All Types'}
                onValueChange={(val) => onFilterChange({ emailType: val })}
              >
                <SelectTrigger className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border border-slate-100 shadow-xl" position="popper" sideOffset={4}>
                  <SelectItem value="All Types" className="cursor-pointer text-sm">All Types</SelectItem>
                  <SelectItem value="Parent Invitation" className="cursor-pointer text-sm">Parent Invitation</SelectItem>
                  <SelectItem value="Parent Reminder" className="cursor-pointer text-sm">Parent Reminder</SelectItem>
                  <SelectItem value="Form Notification" className="cursor-pointer text-sm">Form Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
