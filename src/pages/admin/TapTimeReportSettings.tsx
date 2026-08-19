import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Search, Edit, Trash2, Mail, AlertCircle, Settings, CheckCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { useToast } from '../../contexts/ToastContext';
import { TapTimeReportStorage, TapTimeReportSetting, ReportFrequency } from '../../services/local/tapTimeReportStorage';

const ALL_FREQUENCIES: ReportFrequency[] = ['Daily', 'Weekly', 'Biweekly', 'Monthly', 'Bimonthly'];

export function TapTimeReportSettings() {
  const [settings, setSettings] = useState<TapTimeReportSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedSetting, setSelectedSetting] = useState<TapTimeReportSetting | null>(null);
  
  const [email, setEmail] = useState('');
  const [frequencies, setFrequencies] = useState<ReportFrequency[]>([]);
  
  const [formErrors, setFormErrors] = useState<{ email?: string; frequencies?: string }>({});
  
  const { showToast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const storedSettings = TapTimeReportStorage.getSettings();
      setSettings(storedSettings);
    } finally {
      setLoading(false);
    }
  };

  const filteredSettings = useMemo(() => {
    if (!searchQuery) return settings;
    return settings.filter(setting => 
      setting.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      setting.frequencies.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [settings, searchQuery]);

  const validateForm = () => {
    const errors: { email?: string; frequencies?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (frequencies.length === 0) {
      errors.frequencies = 'Please select at least one frequency';
    } else if (frequencies.length > 2) {
      errors.frequencies = 'Maximum 2 frequencies allowed';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSetting = () => {
    if (!validateForm()) return;
    
    if (selectedSetting) {
      const updated = TapTimeReportStorage.updateSetting(selectedSetting.id, {
        email: email.trim(),
        frequencies
      });
      if (updated) {
        setSettings(prev => prev.map(s => s.id === updated.id ? updated : s));
        showToast('success', 'Report recipient updated successfully');
      }
    } else {
      const newSetting = TapTimeReportStorage.addSetting({
        email: email.trim(),
        frequencies
      });
      setSettings(prev => [...prev, newSetting]);
      showToast('success', 'Report recipient added successfully');
    }
    
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleDeleteSetting = () => {
    if (!selectedSetting) return;
    
    TapTimeReportStorage.deleteSetting(selectedSetting.id);
    setSettings(prev => prev.filter(s => s.id !== selectedSetting.id));
    setIsDeleteDialogOpen(false);
    setSelectedSetting(null);
    showToast('success', 'Recipient deleted successfully');
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (setting: TapTimeReportSetting) => {
    setSelectedSetting(setting);
    setEmail(setting.email);
    setFrequencies([...setting.frequencies]);
    setFormErrors({});
    setIsAddDialogOpen(true);
  };

  const openDeleteDialog = (setting: TapTimeReportSetting) => {
    setSelectedSetting(setting);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setEmail('');
    setFrequencies([]);
    setFormErrors({});
    setSelectedSetting(null);
  };

  const toggleFrequency = (freq: ReportFrequency) => {
    setFrequencies(prev => {
      if (prev.includes(freq)) {
        return prev.filter(f => f !== freq);
      }
      if (prev.length >= 2) return prev; // max 2 enforced by UI logic too
      return [...prev, freq];
    });
    if (formErrors.frequencies) setFormErrors(prev => ({ ...prev, frequencies: undefined }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12 mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading settings...</p>
          </div>
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
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">Attendance Report Settings</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">Manage automated report recipients and frequencies</p>
          </div>
          <Button 
            onClick={openAddDialog}
            className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 rounded-xl font-bold shadow-xs border-none h-10 px-4 w-full sm:w-auto text-xs" 
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Recipient
          </Button>
        </div>

        {settings.length === 0 ? (
          <Card className="text-center py-16 sm:py-24 border-slate-100 shadow-sm rounded-2xl bg-white">
            <CardContent>
              <div className="w-16 h-16 bg-[#EFF5FB] rounded-full flex items-center justify-center mx-auto mb-6">
                <Settings className="h-8 w-8 text-[#0F2D52]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No recipients configured</h3>
              <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
                Add an email address to start receiving automated attendance reports.
              </p>
              <div className="flex justify-center">
                <Button 
                  onClick={openAddDialog}
                  className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 rounded-xl font-bold shadow-xs border-none h-10 px-6"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Recipient
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-72">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <input
                  placeholder="Search emails or frequency..."
                  className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-500">
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Recipient Email</th>
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Report Frequencies</th>
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSettings.map(setting => (
                    <tr key={setting.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EFF5FB] flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 text-[#0F2D52]" />
                          </div>
                          <span className="font-bold text-sm text-slate-900">{setting.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex flex-wrap gap-2">
                          {setting.frequencies.map(freq => (
                            <span key={freq} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                              {freq}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(setting)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-[#0F2D52] hover:bg-[#EFF5FB] rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(setting)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSettings.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-sm text-slate-500 font-medium">
                        No settings found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {filteredSettings.map(setting => (
                <div key={setting.id} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#EFF5FB] flex items-center justify-center flex-shrink-0">
                         <Mail className="w-4 h-4 text-[#0F2D52]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-900 truncate">{setting.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(setting)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-[#0F2D52]"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(setting)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-13">
                    {setting.frequencies.map(freq => (
                      <span key={freq} className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                        {freq}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {filteredSettings.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-500 font-medium">
                  No settings found.
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Add / Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0" preventClose>
          <div className="flex-shrink-0 px-5 py-4 border-b bg-white">
            <DialogTitle className="text-xl font-bold text-slate-900">
              {selectedSetting ? 'Edit Recipient' : 'Add Recipient'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1 font-medium">
              Configure email address and report frequencies.
            </DialogDescription>
          </div>
          
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <Input
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (formErrors.email) setFormErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="e.g. reporting@example.com"
                className={`w-full h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white transition-all ${formErrors.email ? 'border-red-500' : ''}`}
                autoFocus
              />
              {formErrors.email && <p className="text-xs text-red-600 mt-1.5 font-bold">{formErrors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Report Frequency (Max 2) <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_FREQUENCIES.map(freq => {
                  const isSelected = frequencies.includes(freq);
                  const isDisabled = !isSelected && frequencies.length >= 2;
                  return (
                    <button
                      key={freq}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => toggleFrequency(freq)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5
                        ${isSelected 
                          ? 'bg-[#0F2D52] border-[#0F2D52] text-white' 
                          : isDisabled 
                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                    >
                      {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                      {freq}
                    </button>
                  );
                })}
              </div>
              {formErrors.frequencies && <p className="text-xs text-red-600 mt-2 font-bold">{formErrors.frequencies}</p>}
            </div>
          </div>
          
          <div className="flex-shrink-0 px-5 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
              className="h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSetting}
              className="h-10 rounded-xl text-xs font-bold px-5 bg-[#0F2D52] hover:bg-[#1E4B83] text-white transition-all shadow-xs"
            >
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0" preventClose>
          <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Remove Recipient
            </DialogTitle>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-900">{selectedSetting?.email}</span>? 
              They will no longer receive automated attendance reports.
            </p>
          </div>
          <div className="flex-shrink-0 px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSetting}
              className="h-10 rounded-xl text-xs font-bold px-4 text-white transition-all bg-red-600 hover:bg-red-700"
            >
              Remove Recipient
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
