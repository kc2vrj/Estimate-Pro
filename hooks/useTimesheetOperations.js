import { useState } from 'react';
import { useSession } from 'next-auth/react';

export function useTimesheetOperations() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveTimesheetEntry = async (entry) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/timesheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save timesheet entry');
      }

      const data = await response.json();
      return data.id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTimesheetEntries = async (startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/timesheet?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get timesheet entries');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTimesheetEntry = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/timesheet/${id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get timesheet entry');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTimesheetEntry = async (id, entry) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/timesheet/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update timesheet entry');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTimesheetEntry = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/timesheet/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete timesheet entry');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    saveTimesheetEntry,
    getTimesheetEntries,
    getTimesheetEntry,
    updateTimesheetEntry,
    deleteTimesheetEntry,
  };
}
