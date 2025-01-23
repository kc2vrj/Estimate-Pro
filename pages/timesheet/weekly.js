import React, { useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';

export default function TimesheetForm() {
  const { data: session } = useSession();
  const [timesheet, setTimesheet] = useState({
    employeeName: session?.user?.name || '',
    weekEnding: '',
    rows: Array(7).fill({
      date: '',
      customer: '',
      description: '',
      regularHours: '',
      overtimeHours: '',
      totalHours: ''
    }),
    totalRegularHours: 0,
    totalOvertimeHours: 0,
    grandTotal: 0
  });

  const calculateTotals = (rows) => {
    const regularTotal = rows.reduce((sum, row) => sum + (parseFloat(row.regularHours) || 0), 0);
    const overtimeTotal = rows.reduce((sum, row) => sum + (parseFloat(row.overtimeHours) || 0), 0);
    return {
      regularTotal,
      overtimeTotal,
      grandTotal: regularTotal + overtimeTotal
    };
  };

  const updateRow = (index, field, value) => {
    const newRows = timesheet.rows.map((row, i) => {
      if (i === index) {
        const updatedRow = { ...row, [field]: value };
        if (field === 'regularHours' || field === 'overtimeHours') {
          const regular = parseFloat(field === 'regularHours' ? value : row.regularHours) || 0;
          const overtime = parseFloat(field === 'overtimeHours' ? value : row.overtimeHours) || 0;
          updatedRow.totalHours = regular + overtime;
        }
        return updatedRow;
      }
      return row;
    });

    const totals = calculateTotals(newRows);
    setTimesheet({
      ...timesheet,
      rows: newRows,
      totalRegularHours: totals.regularTotal,
      totalOvertimeHours: totals.overtimeTotal,
      grandTotal: totals.grandTotal
    });
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/timesheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timesheet)
      });

      if (!response.ok) {
        throw new Error('Failed to save timesheet');
      }

      const result = await response.json();
      toast.success('Timesheet saved successfully');
      // Optionally reset form or navigate
    } catch (error) {
      console.error('Timesheet save error:', error);
      toast.error('Failed to save timesheet');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Maytech Systems LLC Timesheet</h1>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          <Save className="w-4 h-4" />
          Save Timesheet
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Employee Name:</label>
          <input 
            type="text"
            className="w-full border rounded px-3 py-2"
            value={timesheet.employeeName}
            onChange={(e) => setTimesheet({...timesheet, employeeName: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Week Ending:</label>
          <input 
            type="date"
            className="w-full border rounded px-3 py-2"
            value={timesheet.weekEnding}
            onChange={(e) => setTimesheet({...timesheet, weekEnding: e.target.value})}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 text-left w-24">Date</th>
              <th className="border p-2 text-left">Customer</th>
              <th className="border p-2 text-left">Description of Work</th>
              <th className="border p-2 text-center w-24">Regular Hours</th>
              <th className="border p-2 text-center w-24">Overtime Hours</th>
              <th className="border p-2 text-center w-24">Total Hours</th>
            </tr>
          </thead>
          <tbody>
            {timesheet.rows.map((row, index) => (
              <tr key={index}>
                <td className="border p-2">
                  <input
                    type="date"
                    className="w-full border rounded px-2 py-1"
                    value={row.date}
                    onChange={(e) => updateRow(index, 'date', e.target.value)}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1"
                    value={row.customer}
                    onChange={(e) => updateRow(index, 'customer', e.target.value)}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1"
                    value={row.description}
                    onChange={(e) => updateRow(index, 'description', e.target.value)}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-center"
                    value={row.regularHours}
                    onChange={(e) => updateRow(index, 'regularHours', e.target.value)}
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-center"
                    value={row.overtimeHours}
                    onChange={(e) => updateRow(index, 'overtimeHours', e.target.value)}
                  />
                </td>
                <td className="border p-2 text-center bg-gray-50">
                  {row.totalHours || '0'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td colSpan="3" className="border p-2 text-right">Totals:</td>
              <td className="border p-2 text-center">{timesheet.totalRegularHours.toFixed(2)}</td>
              <td className="border p-2 text-center">{timesheet.totalOvertimeHours.toFixed(2)}</td>
              <td className="border p-2 text-center">{timesheet.grandTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-8">
        <div>
          <h3 className="font-semibold mb-4">Employee Signature:</h3>
          <div className="border-b border-black pt-8"></div>
          <div className="mt-2">Date: _________________</div>
        </div>
        <div>
          <h3 className="font-semibold mb-4">Supervisor Approval:</h3>
          <div className="border-b border-black pt-8"></div>
          <div className="mt-2">Date: _________________</div>
        </div>
      </div>
    </div>
  );
}
