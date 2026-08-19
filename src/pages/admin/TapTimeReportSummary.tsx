import React, { useState, useMemo, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, Download, Calendar, Users, Clock, FileText } from 'lucide-react';
import { TapTimeReportStorage, TapTimeAttendanceRecord } from '../../services/local/tapTimeReportStorage';
import { TapTimeEmployeeStorage } from '../../services/local/tapTimeEmployeeStorage';

type ViewMode = 'Daily' | 'Range';

export function TapTimeReportSummary() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('Daily');
  const [searchQuery, setSearchQuery] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const [singleDate, setSingleDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  const [records, setRecords] = useState<TapTimeAttendanceRecord[]>([]);

  useEffect(() => {
    loadData();
  }, [viewMode, singleDate, startDate, endDate]);

  const loadData = () => {
    try {
      if (viewMode === 'Daily') {
        const data = TapTimeReportStorage.getRecordsForDate(singleDate);
        setRecords(data);
      } else {
        const data = TapTimeReportStorage.getRecordsForDateRange(startDate, endDate);
        setRecords(data);
      }
    } finally {
      setLoading(false);
    }
  };

  // Memoize employees mapping for quick lookups
  const employeesMap = useMemo(() => {
    const employees = TapTimeEmployeeStorage.getEmployees();
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp;
      return acc;
    }, {} as Record<string, any>);
  }, []);

  const enrichedRecords = useMemo(() => {
    return records.map(record => {
      const emp = employeesMap[record.employeeId];
      let hours = 0;
      if (record.checkInTime && record.checkOutTime) {
        const checkIn = new Date(record.checkInTime);
        const checkOut = new Date(record.checkOutTime);
        hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      }
      return {
        ...record,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        employeePin: emp ? emp.pin : 'N/A',
        hoursCalculated: Math.max(0, hours)
      };
    });
  }, [records, employeesMap]);

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return enrichedRecords;
    const lower = searchQuery.toLowerCase();
    return enrichedRecords.filter(r => 
      r.employeeName.toLowerCase().includes(lower) || 
      r.employeePin.includes(lower)
    );
  }, [enrichedRecords, searchQuery]);

  // Aggregate Stats
  const totalRecords = filteredRecords.length;
  const uniqueEmployees = new Set(filteredRecords.map(r => r.employeeId)).size;
  const totalHours = filteredRecords.reduce((sum, r) => sum + r.hoursCalculated, 0).toFixed(2);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Employee Name', 'PIN', 'Check In', 'Check Out', 'Total Hours'];
    const csvRows = [headers.join(',')];
    
    filteredRecords.forEach(r => {
      const row = [
        r.date,
        `"${r.employeeName}"`,
        `"${r.employeePin}"`,
        formatTime(r.checkInTime),
        formatTime(r.checkOutTime),
        r.hoursCalculated.toFixed(2)
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tap_time_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-8 w-8"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-2 sm:px-4 py-0 sm:pt-12 space-y-6 pb-12"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-16 sm:mt-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">Attendance Reports</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">View and export attendance records</p>
          </div>
          <Button 
            onClick={handleExportCSV}
            className="bg-white border-slate-200 text-[#0F2D52] hover:bg-slate-50 rounded-xl font-bold shadow-xs h-10 px-4 w-full sm:w-auto text-xs" 
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              <button 
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'Daily' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setViewMode('Daily')}
              >
                Daily View
              </button>
              <button 
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'Range' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setViewMode('Range')}
              >
                Date Range
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
              <input
                placeholder="Search employee or PIN..."
                className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {viewMode === 'Daily' ? (
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Date</label>
                <input 
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="h-10 px-3 w-full sm:w-48 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]"
                />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-end">
                <div className="w-full sm:w-auto">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Start Date</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 px-3 w-full sm:w-48 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]"
                  />
                </div>
                <span className="hidden sm:inline text-slate-400 pb-2">to</span>
                <div className="w-full sm:w-auto">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">End Date</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 px-3 w-full sm:w-48 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500">Present Employees</p>
                <h3 className="text-2xl font-black text-slate-900">{uniqueEmployees}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500">Total Records</p>
                <h3 className="text-2xl font-black text-slate-900">{totalRecords}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500">Total Hours</p>
                <h3 className="text-2xl font-black text-slate-900">{totalHours}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-500">
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Employee</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Check In</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Check Out</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-5 text-sm font-medium text-slate-900">{record.date}</td>
                      <td className="py-3 px-5">
                        <div className="font-bold text-sm text-slate-900">{record.employeeName}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                          PIN: <code className="px-1 py-0.5 bg-slate-100 text-slate-700 rounded font-mono font-semibold">{record.employeePin}</code>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-sm font-medium text-slate-700">{formatTime(record.checkInTime)}</td>
                      <td className="py-3 px-5 text-sm font-medium text-slate-700">{formatTime(record.checkOutTime)}</td>
                      <td className="py-3 px-5">
                        <span className="inline-flex px-2 py-1 bg-[#EFF5FB] text-[#0F2D52] font-bold text-xs rounded-lg">
                          {record.hoursCalculated.toFixed(2)}h
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-semibold text-sm">No attendance records found</p>
                      <p className="text-slate-400 text-xs mt-1">Try adjusting your filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
