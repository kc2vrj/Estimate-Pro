import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function EstimatesList() {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/login');
      return;
    }

    if (!session.user.is_approved && session.user.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchEstimates();
  }, [session, status]);

  const fetchEstimates = async () => {
    try {
      const response = await fetch('/api/estimates');
      if (!response.ok) throw new Error('Failed to fetch estimates');
      const data = await response.json();
      setEstimates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault(); // Prevent the link click
    if (!confirm('Are you sure you want to delete this estimate?')) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/estimates/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete estimate');
      }
      
      // Remove the estimate from the local state instead of refetching
      setEstimates(prevEstimates => prevEstimates.filter(est => est.id !== id));
    } catch (err) {
      console.error('Error deleting estimate:', err);
      setError(err.message);
      // Show error message to user
      alert('Error deleting estimate: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Estimates</h1>
          <Link
            href="/estimates/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            New Estimate
          </Link>
        </div>

        {estimates.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No estimates</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new estimate.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {estimates.map((estimate) => (
                <li key={estimate.id}>
                  <Link href={`/estimates/${estimate.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {estimate.number || `Estimate #${estimate.id}`}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex space-x-2">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ${(estimate.total_amount || 0).toFixed(2)}
                          </p>
                          <button
                            onClick={(e) => handleDelete(estimate.id, e)}
                            className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {estimate.date}
                          </p>
                          {estimate.po && (
                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                              PO: {estimate.po}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>{estimate.salesRep}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
