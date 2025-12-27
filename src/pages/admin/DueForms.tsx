import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Search, Mail, Calendar, AlertTriangle, CheckCircle, Clock, Filter, ArrowUpDown } from 'lucide-react';
import { fetchUserContext } from '../../services/api/user';
import { fetchDueForms, DueForm } from '../../services/api/admin';
import { useToast } from '../../contexts/ToastContext';
import { apiBaseUrl } from '../../config/env';


export function DueForms() {
  const [dueForms, setDueForms] = useState<DueForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<DueForm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        
        // Use new enrollments API
        const response = await fetch(`${apiBaseUrl}/enrollments?school_id=${user.schoolId}`, {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-owner-key-2024',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const enrollments = data.enrollments || [];
          
          // Map enrollments to due forms
          const mappedForms: DueForm[] = [];
          
          enrollments.forEach((enrollment: any) => {
            Object.entries(enrollment.forms || {}).forEach(([formName, formData]: [string, any]) => {
              const today = new Date();
              
              // Parse DD-MM-YYYY format
              let dueDate = null;
              if (formData.due_date) {
                const parts = formData.due_date.split('-');
                if (parts.length === 3) {
                  const [day, month, year] = parts;
                  dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                }
              }
              
              let status: 'pending' | 'completed' | 'overdue' = 'pending';
              if (formData.status === 'approved') {
                status = 'completed';
              } else if (dueDate && dueDate < today) {
                status = 'overdue';
              }
              
              // Combine parent names and emails
              let parentName = `${enrollment.parent_first_name} ${enrollment.parent_last_name}`;
              let parentEmail = enrollment.primary_email;
              
              if (enrollment.secondary_parent_first_name) {
                parentName += ` & ${enrollment.secondary_parent_first_name} ${enrollment.secondary_parent_last_name}`;
                if (enrollment.secondary_parent_email) {
                  parentEmail += `, ${enrollment.secondary_parent_email}`;
                }
              }
              
              mappedForms.push({
                id: `${enrollment.enrollment_id}-${formName}`,
                formName,
                studentName: `${enrollment.child_first_name} ${enrollment.child_last_name}`,
                parentName,
                parentEmail,
                dueDate: formData.due_date || null,
                status,
                assignedDate: formData.assigned_at || ''
              });
            });
          });
          
          if (!isMounted) return;
          setDueForms(mappedForms);
          setFilteredForms(mappedForms);
        } else {
          console.error('Failed to fetch enrollments');
        }
      } catch (error) {
        console.error('Error fetching due forms:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredFormsData = useMemo(() => {
    return dueForms.filter(form => {
      const matchesSearch = 
        form.formName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.parentName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [dueForms, searchQuery, statusFilter]);

  const [sortBy, setSortBy] = useState('formName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const sorted = [...filteredFormsData].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case 'formName': aVal = a.formName; bVal = b.formName; break;
        case 'studentName': aVal = a.studentName; bVal = b.studentName; break;
        case 'parentName': aVal = a.parentName; bVal = b.parentName; break;
        case 'dueDate': aVal = a.dueDate || ''; bVal = b.dueDate || ''; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        default: aVal = a.formName; bVal = b.formName;
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      const result = sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      return result;
    });
    setFilteredForms(sorted);
  }, [filteredFormsData, sortBy, sortOrder]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedForms(filteredForms.map(form => form.id));
    } else {
      setSelectedForms([]);
    }
  };

  const handleSelectForm = (formId: string, checked: boolean) => {
    if (checked) {
      setSelectedForms(prev => [...prev, formId]);
    } else {
      setSelectedForms(prev => prev.filter(id => id !== formId));
    }
  };

  const handleSendReminder = async (formIds: string[]) => {
    try {
      const user = await fetchUserContext();
      if (!user.schoolId) return;

      const formsToRemind = dueForms.filter(f => formIds.includes(f.id));
      
      const reminders = formsToRemind.map(form => ({
        parent_email: form.parentEmail,
        parent_name: form.parentName,
        student_name: form.studentName,
        class_name: 'N/A',
        form_name: form.formName,
        due_date: form.dueDate || ''
      }));

      const response = await fetch(`${apiBaseUrl}/emails/bulk-form-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-owner-key-2024'
        },
        body: JSON.stringify({
          school_id: user.schoolId,
          reminders
        })
      });

      if (response.ok) {
        showToast('success', `Reminder emails sent to ${formIds.length} parent(s)`);
        setSelectedForms([]);
      } else {
        showToast('error', 'Failed to send reminder emails');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      showToast('error', 'Failed to send reminder emails');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
      case 'pending':
        return <Badge variant="warning" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    
    // Handle DD-MM-YYYY format
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US');
      }
    }
    
    return dateString;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    
    // Parse DD-MM-YYYY format
    const parts = dueDate.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        const today = new Date();
        return date < today && date.toDateString() !== today.toDateString();
      }
    }
    
    return false;
  };

  const stats = {
    total: dueForms.length,
    pending: dueForms.filter(f => f.status === 'pending').length,
    overdue: dueForms.filter(f => f.status === 'overdue').length,
    completed: dueForms.filter(f => f.status === 'completed').length
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              Due Forms Tracking
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Monitor form completion status and send reminders to parents
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Remind
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {selectedForms.length > 0 && (
                <DropdownMenuItem 
                  onClick={() => handleSendReminder(selectedForms)}
                >
                  Remind Selected ({selectedForms.length})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => {
                  const pendingForms = filteredForms.filter(f => f.status === 'pending').map(f => f.id);
                  handleSendReminder(pendingForms);
                }}
                disabled={filteredForms.filter(f => f.status === 'pending').length === 0}
              >
                Remind Pending ({filteredForms.filter(f => f.status === 'pending').length})
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  const overdueForms = filteredForms.filter(f => f.status === 'overdue').map(f => f.id);
                  handleSendReminder(overdueForms);
                }}
                disabled={filteredForms.filter(f => f.status === 'overdue').length === 0}
              >
                Remind Overdue ({filteredForms.filter(f => f.status === 'overdue').length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">Total Forms</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.pending}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full flex-shrink-0 ml-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">Overdue</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.overdue}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-full flex-shrink-0 ml-2">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.completed}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full flex-shrink-0 ml-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search forms, students, or parents..."
                  className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-10 sm:h-11">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto h-10 sm:h-11">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSortBy('formName'); setSortOrder('asc'); }}>Form A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('formName'); setSortOrder('desc'); }}>Form Z-A</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('studentName'); setSortOrder('asc'); }}>Student A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('studentName'); setSortOrder('desc'); }}>Student Z-A</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('parentName'); setSortOrder('asc'); }}>Parent A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('parentName'); setSortOrder('desc'); }}>Parent Z-A</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('dueDate'); setSortOrder('asc'); }}>Due Date</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('status'); setSortOrder('asc'); }}>Status</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Due Forms ({filteredForms.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazon-teal mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading forms...</p>
              </div>
            ) : filteredForms.length > 0 ? (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-2 md:p-4 font-medium text-xs md:text-sm">
                          <div className="flex items-center gap-2">
                            <span>Select</span>
                            {filteredForms.length > 0 && (
                              <Checkbox
                                checked={selectedForms.length === filteredForms.length}
                                onCheckedChange={handleSelectAll}
                              />
                            )}
                          </div>
                        </th>
                        <th className="text-left p-2 md:p-4 font-medium text-xs md:text-sm">Form</th>
                        <th className="text-left p-2 md:p-4 font-medium text-xs md:text-sm">Student</th>
                        <th className="text-left p-2 md:p-4 font-medium text-xs md:text-sm">Parent</th>
                        <th className="text-left p-2 md:p-4 font-medium text-xs md:text-sm">Due Date</th>
                        <th className="text-left p-2 md:p-4 font-medium text-xs md:text-sm">Status</th>
                        <th className="text-left p-2 md:p-4 font-medium text-xs md:text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredForms.map(form => (
                        <tr key={form.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 md:p-4">
                            <Checkbox
                              checked={selectedForms.includes(form.id)}
                              onCheckedChange={(checked) => handleSelectForm(form.id, checked as boolean)}
                            />
                          </td>
                          <td className="p-2 md:p-4 font-medium text-xs md:text-sm">{form.formName}</td>
                          <td className="p-2 md:p-4 text-xs md:text-sm">{form.studentName}</td>
                          <td className="p-2 md:p-4 text-xs md:text-sm">
                            <div>
                              <div className="font-medium">{form.parentName.split(' & ')[0]}</div>
                              <div className="text-xs text-muted-foreground">{form.parentEmail.split(', ')[0]}</div>
                              {form.parentName.includes(' & ') && (
                                <div className="mt-1">
                                  <div className="font-medium">{form.parentName.split(' & ')[1]}</div>
                                  <div className="text-xs text-muted-foreground">{form.parentEmail.split(', ')[1] || ''}</div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-2 md:p-4 text-xs md:text-sm">
                            <div className={isOverdue(form.dueDate) && form.status !== 'completed' ? 'text-red-600 font-medium' : form.dueDate ? '' : 'text-muted-foreground'}>
                              {formatDate(form.dueDate)}
                            </div>
                          </td>
                          <td className="p-2 md:p-4">{getStatusBadge(form.status)}</td>
                          <td className="p-2 md:p-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendReminder([form.id])}
                              disabled={form.status === 'completed'}
                              className="text-xs px-2 py-1"
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              <span className="hidden lg:inline">Remind</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <span className="text-sm font-medium">Select All</span>
                    <Checkbox
                      checked={selectedForms.length === filteredForms.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </div>
                  {filteredForms.map(form => (
                    <div key={form.id} className="border rounded-lg p-3 space-y-3 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedForms.includes(form.id)}
                            onCheckedChange={(checked) => handleSelectForm(form.id, checked as boolean)}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-sm truncate">{form.formName}</h3>
                            <p className="text-xs text-muted-foreground">Student: {form.studentName}</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(form.status)}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Parent(s):</p>
                          <div className="text-sm space-y-1">
                            <div>
                              <div className="font-medium text-xs">{form.parentName.split(' & ')[0]}</div>
                              <div className="text-xs text-muted-foreground truncate">{form.parentEmail.split(', ')[0]}</div>
                            </div>
                            {form.parentName.includes(' & ') && (
                              <div>
                                <div className="font-medium text-xs">{form.parentName.split(' & ')[1]}</div>
                                <div className="text-xs text-muted-foreground truncate">{form.parentEmail.split(', ')[1] || ''}</div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">Due:</p>
                            <p className={`text-xs font-medium truncate ${
                              isOverdue(form.dueDate) && form.status !== 'completed' 
                                ? 'text-red-600' 
                                : form.dueDate ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {formatDate(form.dueDate)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminder([form.id])}
                            disabled={form.status === 'completed'}
                            className="text-xs px-2 py-1 h-7 flex-shrink-0 ml-2"
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No forms match your current filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}