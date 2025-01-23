import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTimesheetOperations } from '../../hooks/useTimesheetOperations';
import TimesheetForm from '../../components/TimesheetForm';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Clock, Calendar, Building2, FileText, Trash2, Edit2 } from 'lucide-react';

export default function TimesheetPage() {
  const { data: session } = useSession();
  const {
    getTimesheetEntries,
    deleteTimesheetEntry,
    loading,
    error
  } = useTimesheetOperations();

  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date().setDate(1), 'yyyy-MM-dd'),
    endDate: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (session) {
      loadEntries();
    }
  }, [session, dateRange]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const loadEntries = async () => {
    try {
      const data = await getTimesheetEntries(dateRange.startDate, dateRange.endDate);
      setEntries(data);
    } catch (err) {
      toast.error('Failed to load timesheet entries');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this timesheet entry?')) {
      try {
        await deleteTimesheetEntry(id);
        toast.success('Timesheet entry deleted successfully');
        loadEntries();
      } catch (err) {
        toast.error('Failed to delete timesheet entry');
      }
    }
  };

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setShowForm(true);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditEntry(null);
    loadEntries();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditEntry(null);
  };

  const calculateTotalHours = () => {
    return entries.reduce((total, entry) => total + (entry.total_hours || 0), 0);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Timesheet</h1>
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            Add New Entry
          </Button>
        </div>

        {showForm && (
          <div className="mb-8">
            <TimesheetForm
              initialData={editEntry}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Filter Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Entries</CardTitle>
            <div className="text-sm font-medium">
              Total Hours: {calculateTotalHours()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {entries.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No timesheet entries found for the selected date range.
                </p>
              ) : (
                entries.map((entry) => (
                  <Card key={entry.id} className="bg-gray-50">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {format(new Date(entry.date), 'MMMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4 text-gray-500" />
                            <span>{entry.customer_name}</span>
                          </div>
                          {entry.work_order && (
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span>WO: {entry.work_order}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span>
                              {entry.time_in} - {entry.time_out}
                            </span>
                          </div>
                          <div className="font-medium">
                            Total Hours: {entry.total_hours}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(entry)}
                              className="flex items-center space-x-1"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(entry.id)}
                              className="flex items-center space-x-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
