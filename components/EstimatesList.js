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

    fetchEstimates();
  }, [session, status, router]);

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

      if (!response.ok) {
        throw new Error('Failed to delete estimate');
      }

      // Remove the estimate from the list
      setEstimates(estimates.filter(est => est.id !== id));
    } catch (err) {
      setError(err.message);
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
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">Estimates</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all estimates created by you.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href="/estimates/new"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              Add Estimate
            </Link>
          </div>
        </div>
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <div className="divide-y divide-gray-200 bg-white">
                  {estimates.map((estimate) => (
                    <div key={estimate.id} className="p-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="truncate">
                          <div className="flex">
                            <p className="truncate text-sm font-medium text-indigo-600">
                              <Link
                                href={`/estimates/${estimate.id}`}
                                className="hover:underline"
                              >
                                Estimate #{estimate.number}
                              </Link>
                            </p>
                          </div>
                          <div className="mt-2 flex">
                            <div className="flex items-center text-sm text-gray-500">
                              <p>Created on {new Date(estimate.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex items-center space-x-4">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            ${(estimate.total_amount || 0).toFixed(2)}
                          </p>
                          <div className="flex space-x-2">
                            <Link
                              href={`/estimates/${estimate.id}/print`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Print
                            </Link>
                            <button
                              onClick={(e) => handleDelete(estimate.id, e)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
