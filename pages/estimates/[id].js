import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import EstimateForm from '../../components/EstimateForm';
import { ArrowLeft, Edit } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function ViewEstimatePage() {
  const router = useRouter();
  const { id, mode } = router.query;
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(mode === 'edit');

  useEffect(() => {
    if (id && session) {
      fetchEstimate();
    }
  }, [id, session]);

  const fetchEstimate = async () => {
    try {
      console.log('Fetching estimate:', id);
      const response = await fetch(`/api/estimates/${id}`);
      if (!response.ok) throw new Error('Failed to fetch estimate');
      const data = await response.json();
      
      console.log('Raw estimate data:', data);
      setEstimate(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching estimate:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleUpdateEstimate = async (updatedData) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/estimates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error('Failed to update estimate');
      }

      const updatedEstimate = await response.json();
      setEstimate(updatedEstimate);
      setIsEditing(false);
      router.push(`/estimates/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!estimate) return <div className="p-4">No estimate found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-0">
        <div className="flex items-center justify-between mb-4 px-8 py-2 no-print">
          <button
            onClick={() => router.push('/estimates')}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Estimates
          </button>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="text-red-600 text-center p-4">{error}</div>
        ) : estimate ? (
          <EstimateForm
            initialData={estimate}
            onSubmit={handleUpdateEstimate}
            readOnly={!isEditing}
          />
        ) : (
          <div className="text-center p-4">No estimate found</div>
        )}
      </div>
    </div>
  );
}
