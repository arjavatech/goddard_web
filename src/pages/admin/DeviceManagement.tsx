import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Search, Edit, Trash2, Tablet, Copy, AlertCircle, Clock } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../contexts/ToastContext';

export interface Device {
  id: string;
  name: string;
  timezone: string;
  accessKey: string;
}

const LOCAL_STORAGE_KEY = 'goddard_device_management_mock_data';

export function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  const [deviceName, setDeviceName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [copiedKey, setCopiedKey] = useState('');
  
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  
  const { showToast } = useToast();

  useEffect(() => {
    // Load devices from localStorage on mount
    const loadDevices = () => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          setDevices(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to parse stored devices:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadDevices();
  }, []);

  // Update localStorage whenever devices change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(devices));
    }
  }, [devices, loading]);

  const filteredDevices = useMemo(() => {
    return devices.filter(device => 
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.timezone.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [devices, searchQuery]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!deviceName.trim()) {
      errors.deviceName = 'Device name is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateRandomString = (length = 4) => {
    return Math.random().toString(36).substring(2, 2 + length).padEnd(length, '0');
  };

  const createAccessKey = () => {
    return `${generateRandomString(4)}${crypto.randomUUID().replace(/-/g, '').substring(0, 6)}${generateRandomString(4)}`;
  };

  const maskAccessKey = (key: string) => {
    if (!key) return '';
    return '*'.repeat(key.length - 4) + key.slice(-4);
  };

  const copyAccessKey = async (accessKey: string) => {
    try {
      await navigator.clipboard.writeText(accessKey);
      setCopiedKey(accessKey);
      showToast('success', 'Access key copied to clipboard');
      setTimeout(() => setCopiedKey(''), 2000);
    } catch (error) {
      showToast('error', 'Failed to copy access key');
    }
  };

  const handleAddDevice = () => {
    if (!validateForm()) return;
    
    const newDevice: Device = {
      id: crypto.randomUUID(),
      name: deviceName.trim(),
      timezone,
      accessKey: createAccessKey(),
    };
    
    setDevices(prev => [...prev, newDevice]);
    setIsAddDialogOpen(false);
    resetForm();
    showToast('success', 'Device added successfully');
  };

  const handleEditDevice = () => {
    if (!validateForm() || !selectedDevice) return;
    
    setDevices(prev => prev.map(d => 
      d.id === selectedDevice.id 
        ? { ...d, name: deviceName.trim(), timezone }
        : d
    ));
    
    setIsEditDialogOpen(false);
    resetForm();
    showToast('success', 'Device updated successfully');
  };

  const handleDeleteDevice = () => {
    if (!selectedDevice) return;
    
    setDevices(prev => prev.filter(d => d.id !== selectedDevice.id));
    setIsDeleteDialogOpen(false);
    setSelectedDevice(null);
    showToast('success', 'Device deleted successfully');
  };

  const openEditDialog = (device: Device) => {
    setSelectedDevice(device);
    setDeviceName(device.name);
    setTimezone(device.timezone);
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (device: Device) => {
    setSelectedDevice(device);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setDeviceName('');
    setTimezone('America/New_York');
    setFormErrors({});
    setSelectedDevice(null);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12 mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading devices...</p>
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
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-16 sm:mt-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">Device Management</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">Manage and monitor your registered devices</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
            className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 rounded-xl font-bold shadow-xs border-none h-10 px-4 w-full sm:w-auto text-xs" 
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Device
          </Button>
        </div>

        {devices.length === 0 ? (
          <Card className="text-center py-16 sm:py-24 border-slate-100 shadow-sm rounded-2xl">
            <CardContent>
              <div className="w-16 h-16 bg-[#EFF5FB] rounded-full flex items-center justify-center mx-auto mb-6">
                <Tablet className="h-8 w-8 text-[#0F2D52]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No devices registered</h3>
              <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
                Get started by adding your first device for the Tap-Time functionality.
              </p>
              <div className="flex justify-center">
                <Button 
                  onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
                  className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 rounded-xl font-bold shadow-xs border-none h-10 px-6"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Device
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
              <div className="relative w-full sm:w-72">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <input
                  placeholder="Search devices..."
                  className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-500">
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Device</th>
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Time Zone</th>
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Access Key</th>
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDevices.map(device => (
                    <tr key={device.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EFF5FB] flex items-center justify-center flex-shrink-0">
                            <Tablet className="w-5 h-5 text-[#0F2D52]" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900">{device.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5 font-medium">ID: {device.id.substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {device.timezone}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <code className="flex-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono truncate font-semibold">
                            {maskAccessKey(device.accessKey)}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyAccessKey(device.accessKey)}
                            className="flex items-center gap-1.5 text-xs px-2.5 h-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 flex-shrink-0 font-semibold"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedKey === device.accessKey ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(device)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-[#0F2D52] hover:bg-[#EFF5FB] rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(device)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDevices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-slate-500 font-medium">
                        No devices found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredDevices.map(device => (
                <div key={device.id} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#EFF5FB] flex items-center justify-center flex-shrink-0">
                        <Tablet className="w-5 h-5 text-[#0F2D52]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-900 truncate">{device.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate font-medium">ID: {device.id.substring(0, 8)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(device)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-[#0F2D52]"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(device)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 pl-13 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">{device.timezone}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono truncate font-semibold">
                        {maskAccessKey(device.accessKey)}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyAccessKey(device.accessKey)}
                        className="flex items-center gap-1 text-xs px-2 h-7 rounded-lg border-slate-200 text-slate-600 flex-shrink-0 font-semibold"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedKey === device.accessKey ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredDevices.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-500 font-medium">
                  No devices found.
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Add / Edit Device Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="w-[95vw] sm:max-w-lg rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0" preventClose>
          <div className="flex-shrink-0 px-5 py-4 border-b bg-white">
            <DialogTitle className="text-xl font-bold text-slate-900">
              {isEditDialogOpen ? 'Edit Device' : 'Add New Device'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1 font-medium">
              {isEditDialogOpen ? 'Update device configuration' : 'Configure a new device for Tap-Time'}
            </DialogDescription>
          </div>
          
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Device Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={deviceName}
                onChange={e => {
                  setDeviceName(e.target.value);
                  if (formErrors.deviceName) setFormErrors(prev => ({ ...prev, deviceName: '' }));
                }}
                placeholder="e.g. Front Desk Tablet"
                className={`w-full h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white transition-all ${formErrors.deviceName ? 'border-red-500' : ''}`}
                autoFocus
              />
              {formErrors.deviceName && (
                <p className="text-xs text-red-600 mt-1.5 font-bold">{formErrors.deviceName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Time Zone
              </label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 bg-white text-sm focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]">
                  <SelectValue placeholder="Select a timezone" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                  <SelectItem value="America/New_York" className="rounded-lg">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago" className="rounded-lg">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver" className="rounded-lg">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles" className="rounded-lg">Pacific Time (PT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex-shrink-0 px-5 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
              className="h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleEditDevice : handleAddDevice}
              className="h-10 rounded-xl text-xs font-bold px-5 bg-[#0F2D52] hover:bg-[#1E4B83] text-white transition-all shadow-xs"
            >
              {isEditDialogOpen ? 'Save Changes' : 'Add Device'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Device Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0" preventClose>
          <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Delete Device
            </DialogTitle>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">{selectedDevice?.name}</span>? 
              This will remove the device from your registered list. This action cannot be undone.
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
              onClick={handleDeleteDevice}
              className="h-10 rounded-xl text-xs font-bold px-4 text-white transition-all bg-red-600 hover:bg-red-700"
            >
              Delete Device
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
