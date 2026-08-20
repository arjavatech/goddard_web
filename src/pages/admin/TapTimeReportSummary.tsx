import React, { useState, useMemo, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, Download, Calendar, Users, Clock, FileText, TrendingUp } from 'lucide-react';
import { TapTimeReportStorage, TapTimeAttendanceRecord } from '../../services/local/tapTimeReportStorage';
import { TapTimeEmployeeStorage } from '../../services/local/tapTimeEmployeeStorage';

type ViewMode = 'Daily' | 'Range' | 'Salaried' | 'Pending';

export function TapTimeReportSummary() {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('Daily');
  const [searchQuery, setSearchQuery] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const [singleDate, setSingleDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  // Salaried Report specific
  const [selectedReportType, setSelectedReportType] = useState('Weekly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedHalf, setSelectedHalf] = useState('first');
  const [availableWeeks, setAvailableWeeks] = useState<{number: number, label: string, start: string, end: string}[]>([]);
  
  // Pending Checkout specific
  const [checkoutTimes, setCheckoutTimes] = useState<Record<string, string>>({});
  const [checkoutErrors, setCheckoutErrors] = useState<Record<string, string>>({});
  
  const [records, setRecords] = useState<TapTimeAttendanceRecord[]>([]);

  useEffect(() => {
    if (selectedReportType === 'Weekly' && selectedYear && selectedMonth) {
      const weeks = [];
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
      const lastDay = new Date(selectedYear, selectedMonth, 0);

      let current = new Date(firstDay);
      while (current.getDay() !== 1 && current <= lastDay) {
        current.setDate(current.getDate() + 1);
      }

      if (current <= lastDay) {
        let weekNum = 1;
        while (current <= lastDay) {
          const weekStart = new Date(current);
          const weekEnd = new Date(current);
          weekEnd.setDate(weekEnd.getDate() + 6);
          
          const actualEnd = weekEnd > lastDay ? lastDay : weekEnd;
          
          weeks.push({
            number: weekNum,
            label: `Week ${weekNum}: ${weekStart.getDate()} ${weekStart.toLocaleString('default', { month: 'short' })} - ${actualEnd.getDate()} ${actualEnd.toLocaleString('default', { month: 'short' })}`,
            start: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`,
            end: `${selectedYear}-${String(actualEnd.getMonth() + 1).padStart(2, '0')}-${String(actualEnd.getDate()).padStart(2, '0')}`
          });
          
          current.setDate(current.getDate() + 7);
          weekNum++;
        }
      }
      setAvailableWeeks(weeks);
      if (weeks.length > 0) setSelectedWeek(0);
      else setSelectedWeek(null);
    }
  }, [selectedYear, selectedMonth, selectedReportType]);

  const getDateRangeForReportType = () => {
    const todayObj = new Date();
    switch (selectedReportType) {
      case 'Weekly': {
        if (availableWeeks.length === 0 || selectedWeek === null) return null;
        return { start: availableWeeks[selectedWeek].start, end: availableWeeks[selectedWeek].end };
      }
      case 'Biweekly': {
        const end = todayObj.toISOString().split('T')[0];
        const startObj = new Date(todayObj);
        startObj.setDate(startObj.getDate() - 13);
        const start = startObj.toISOString().split('T')[0];
        return { start, end };
      }
      case 'Monthly': {
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const start = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const end = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { start, end };
      }
      case 'Bimonthly': {
        if (selectedHalf === 'first') {
          return {
            start: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
            end: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-15`
          };
        } else {
          const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
          return {
            start: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-16`,
            end: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
          };
        }
      }
      default: return null;
    }
  };

  const loadData = () => {
    setLoading(true);
    try {
      if (viewMode === 'Daily') {
        const data = TapTimeReportStorage.getRecordsForDate(singleDate);
        setRecords(data);
      } else if (viewMode === 'Range') {
        const data = TapTimeReportStorage.getRecordsForDateRange(startDate, endDate);
        setRecords(data);
      } else if (viewMode === 'Pending') {
        const data = TapTimeReportStorage.getAttendanceRecords().filter(r => !r.checkOutTime);
        setRecords(data);
      } else if (viewMode === 'Salaried') {
        const range = getDateRangeForReportType();
        if (range) {
          const data = TapTimeReportStorage.getRecordsForDateRange(range.start, range.end);
          setRecords(data);
        } else {
          setRecords([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode !== 'Salaried') {
      loadData();
    }
  }, [viewMode, singleDate, startDate, endDate]);

  const handleLoadSalariedReport = () => {
    loadData();
  };

  const handleCheckoutTimeChange = (id: string, value: string, checkInTimeStr: string) => {
    setCheckoutTimes(prev => ({ ...prev, [id]: value }));
    if (value) {
      const checkinDate = new Date(checkInTimeStr);
      const dateString = checkinDate.toISOString().split('T')[0];
      const checkoutDateTime = new Date(`${dateString}T${value}:00`);
      if (checkoutDateTime <= checkinDate) {
        setCheckoutErrors(prev => ({ ...prev, [id]: "Checkout time must be after check-in time" }));
      } else {
        setCheckoutErrors(prev => { const updated = { ...prev }; delete updated[id]; return updated; });
      }
    } else {
      setCheckoutErrors(prev => { const updated = { ...prev }; delete updated[id]; return updated; });
    }
  };

  const handleCheckout = (record: TapTimeAttendanceRecord) => {
    const checkoutTime = checkoutTimes[record.id];
    if (!checkoutTime) return;
    
    const checkinDate = new Date(record.checkInTime);
    const dateString = checkinDate.toISOString().split('T')[0];
    const checkoutDateTime = new Date(`${dateString}T${checkoutTime}:00`);
    
    if (checkoutDateTime <= checkinDate) return;
    
    TapTimeReportStorage.updateAttendanceRecord(record.id, { checkOutTime: checkoutDateTime.toISOString() });
    
    setCheckoutTimes(prev => { const updated = { ...prev }; delete updated[record.id]; return updated; });
    loadData();
  };

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

  const salariedAggregatedData = useMemo(() => {
    if (viewMode !== 'Salaried') return [];
    const map: Record<string, { employeeName: string, employeePin: string, totalHours: number }> = {};
    filteredRecords.forEach(r => {
      if (!map[r.employeeId]) {
        map[r.employeeId] = { employeeName: r.employeeName, employeePin: r.employeePin, totalHours: 0 };
      }
      map[r.employeeId].totalHours += r.hoursCalculated;
    });
    return Object.values(map);
  }, [filteredRecords, viewMode]);

  const totalRecords = viewMode === 'Salaried' ? salariedAggregatedData.length : filteredRecords.length;
  const uniqueEmployees = new Set(filteredRecords.map(r => r.employeeId)).size;
  const totalHours = filteredRecords.reduce((sum, r) => sum + r.hoursCalculated, 0).toFixed(2);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleExportCSV = () => {
    let csvRows = [];
    if (viewMode === 'Salaried') {
      const headers = ['Employee Name', 'PIN', 'Total Hours'];
      csvRows = [headers.join(',')];
      salariedAggregatedData.forEach(r => {
        csvRows.push([`"${r.employeeName}"`, `"${r.employeePin}"`, r.totalHours.toFixed(2)].join(','));
      });
    } else {
      const headers = ['Date', 'Employee Name', 'PIN', 'Check In', 'Check Out', 'Total Hours'];
      csvRows = [headers.join(',')];
      filteredRecords.forEach(r => {
        csvRows.push([
          r.date,
          `"${r.employeeName}"`,
          `"${r.employeePin}"`,
          formatTime(r.checkInTime),
          formatTime(r.checkOutTime),
          r.hoursCalculated.toFixed(2)
        ].join(','));
      });
    }
    
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

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col xl:flex-row justify-between gap-4">
            <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl w-fit">
              <button 
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'Daily' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setViewMode('Daily'); setRecords([]); }}
              >
                Daily Report
              </button>
              <button 
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'Range' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setViewMode('Range'); setRecords([]); }}
              >
                Date Range Report
              </button>
              <button 
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'Salaried' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setViewMode('Salaried'); setRecords([]); }}
              >
                Salaried Report
              </button>
              <button 
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'Pending' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setViewMode('Pending'); setRecords([]); }}
              >
                Pending Checkout
              </button>
            </div>

            <div className="relative w-full xl:w-64">
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
            {viewMode === 'Daily' && (
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Date</label>
                <input 
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="h-10 px-3 w-full sm:w-48 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]"
                />
              </div>
            )}
            
            {viewMode === 'Range' && (
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

            {viewMode === 'Salaried' && (
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-wrap gap-2">
                  {['Weekly', 'Biweekly', 'Monthly', 'Bimonthly'].map(type => (
                    <Button
                      key={type}
                      onClick={() => {
                        setSelectedReportType(type);
                        setRecords([]);
                      }}
                      variant={selectedReportType === type ? 'default' : 'outline'}
                      className={`h-9 px-4 text-xs font-bold rounded-lg ${selectedReportType === type ? 'bg-[#0F2D52] text-white hover:bg-[#0a1e36]' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 items-end">
                  {selectedReportType !== 'Biweekly' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Year</label>
                        <select 
                          value={selectedYear} 
                          onChange={e => setSelectedYear(parseInt(e.target.value))}
                          className="h-10 px-3 w-32 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]"
                        >
                          {[...Array(5)].map((_, i) => {
                            const y = new Date().getFullYear() - i;
                            return <option key={y} value={y}>{y}</option>;
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Month</label>
                        <select 
                          value={selectedMonth} 
                          onChange={e => setSelectedMonth(parseInt(e.target.value))}
                          className="h-10 px-3 w-40 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]"
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                            <option key={idx} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  {selectedReportType === 'Weekly' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Week</label>
                      <select 
                        value={selectedWeek !== null ? selectedWeek : ''} 
                        onChange={e => setSelectedWeek(parseInt(e.target.value))}
                        disabled={availableWeeks.length === 0}
                        className="h-10 px-3 w-56 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]"
                      >
                        <option value="">Select Week</option>
                        {availableWeeks.map((w, idx) => (
                          <option key={idx} value={idx}>{w.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {selectedReportType === 'Bimonthly' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Period</label>
                      <select 
                        value={selectedHalf} 
                        onChange={e => setSelectedHalf(e.target.value)}
                        className="h-10 px-3 w-48 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]"
                      >
                        <option value="first">First Half (1-15)</option>
                        <option value="second">Second Half (16-End)</option>
                      </select>
                    </div>
                  )}
                  <Button
                    onClick={handleLoadSalariedReport}
                    className="h-10 bg-[#0F2D52] hover:bg-[#0a1e36] text-white px-6 rounded-xl font-bold text-sm"
                  >
                    Load Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500">{viewMode === 'Salaried' ? 'Employees' : 'Present Employees'}</p>
                <h3 className="text-2xl font-black text-slate-900">{viewMode === 'Salaried' ? salariedAggregatedData.length : uniqueEmployees}</h3>
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

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {viewMode === 'Salaried' ? (
                    <>
                      <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Employee</th>
                      <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Total Hours</th>
                    </>
                  ) : (
                    <>
                      <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
                      <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Employee</th>
                      <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Check In</th>
                      <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Check Out</th>
                      <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Total Hours</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viewMode === 'Salaried' ? (
                  salariedAggregatedData.length > 0 ? (
                    salariedAggregatedData.map((emp, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-5">
                          <div className="font-bold text-sm text-slate-900">{emp.employeeName}</div>
                          <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                            PIN: <code className="px-1 py-0.5 bg-slate-100 text-slate-700 rounded font-mono font-semibold">{emp.employeePin}</code>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <span className="inline-flex px-2 py-1 bg-[#EFF5FB] text-[#0F2D52] font-bold text-xs rounded-lg">
                            {emp.totalHours.toFixed(2)}h
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-12 text-center">
                        <TrendingUp className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-semibold text-sm">No salaried records found</p>
                      </td>
                    </tr>
                  )
                ) : (
                  filteredRecords.length > 0 ? (
                    filteredRecords.map(record => {
                      const minTime = record.checkInTime ? `${String(new Date(record.checkInTime).getHours()).padStart(2, '0')}:${String(new Date(record.checkInTime).getMinutes() + 1).padStart(2, '0')}` : undefined;
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-5 text-sm font-medium text-slate-900">{record.date}</td>
                          <td className="py-3 px-5">
                            <div className="font-bold text-sm text-slate-900">{record.employeeName}</div>
                            <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                              PIN: <code className="px-1 py-0.5 bg-slate-100 text-slate-700 rounded font-mono font-semibold">{record.employeePin}</code>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-sm font-medium text-slate-700">{formatTime(record.checkInTime)}</td>
                          <td className="py-3 px-5 text-sm font-medium text-slate-700">
                            {record.checkOutTime ? (
                              formatTime(record.checkOutTime)
                            ) : viewMode === 'Pending' ? (
                              <div className="flex flex-col gap-1 w-32">
                                <input
                                  type="time"
                                  min={minTime}
                                  value={checkoutTimes[record.id] || ''}
                                  onChange={(e) => handleCheckoutTimeChange(record.id, e.target.value, record.checkInTime)}
                                  className={`h-8 px-2 rounded-lg border text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:outline-none transition-colors ${checkoutErrors[record.id] ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-slate-200 focus:border-[#0F2D52]'}`}
                                />
                                {checkoutErrors[record.id] && <span className="text-[10px] text-red-500 leading-tight">{checkoutErrors[record.id]}</span>}
                                <Button 
                                  onClick={() => handleCheckout(record)}
                                  disabled={!checkoutTimes[record.id] || !!checkoutErrors[record.id]}
                                  size="sm"
                                  className="h-7 text-[11px] font-bold mt-1 bg-[#10b981] hover:bg-[#059669] text-white disabled:bg-slate-200 disabled:text-slate-400"
                                >
                                  Check Out
                                </Button>
                              </div>
                            ) : (
                              '--:--'
                            )}
                          </td>
                          <td className="py-3 px-5">
                            <span className="inline-flex px-2 py-1 bg-[#EFF5FB] text-[#0F2D52] font-bold text-xs rounded-lg">
                              {record.hoursCalculated.toFixed(2)}h
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-semibold text-sm">No attendance records found</p>
                        <p className="text-slate-400 text-xs mt-1">Try adjusting your filters</p>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
