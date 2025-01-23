import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTimesheetOperations } from '../../hooks/useTimesheetOperations';
import TimesheetForm from '../../components/TimesheetForm';

export default function DailyTimesheetPage() {
  const {
    getTimesheetEntries,
    deleteTimesheetEntry,
  } = useTimesheetOperations();

  const [entries, setEntries] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const data = await getTimesheetEntries(dateRange.startDate, dateRange.endDate);
        setEntries(data);
      } catch (error) {
        toast.error('Failed to load timesheet entries');
      }
    };

    fetchEntries();
  }, [dateRange]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this timesheet entry?')) {
      try {
        await deleteTimesheetEntry(id);
        toast.success('Timesheet entry deleted successfully');
        setEntries(entries.filter(entry => entry.id !== id));
      } catch (error) {
        toast.error('Failed to delete timesheet entry');
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Daily Timesheet</h1>
      <div className="mb-4">
        <label className="block mb-2">Date</label>
        <input 
          type="date" 
          value={dateRange.startDate}
          onChange={(e) => setDateRange({
            startDate: e.target.value,
            endDate: e.target.value
          })}
          className="w-full p-2 border rounded"
        />
      </div>
      <TimesheetForm 
        initialDate={dateRange.startDate}
        onEntryAdded={(newEntry) => setEntries([...entries, newEntry])}
      />
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">Entries</h2>
        {entries.length === 0 ? (
          <p>No timesheet entries found for the selected date.</p>
        ) : (
          <div className="grid gap-4">
            {entries.map((entry) => (
              <div 
                key={entry.id} 
                className="border p-4 rounded flex justify-between items-center"
              >
                <div>
                  <p><strong>Customer:</strong> {entry.customer_name}</p>
                  <p><strong>Time:</strong> {entry.time_in} - {entry.time_out}</p>
                </div>
                <button 
                  onClick={() => handleDelete(entry.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
