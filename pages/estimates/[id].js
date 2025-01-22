import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import EstimateForm from '../../components/EstimateForm';
import { ArrowLeft, Edit } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function ViewEstimatePage() {
  const router = useRouter();
  const { id, edit } = router.query;
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    if (id && session) {
      fetchEstimate();
    }
  }, [id, session]);

  const fetchEstimate = async () => {
    try {
      const response = await fetch(`/api/estimates/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch estimate');
      }
      const data = await response.json();
      console.log('Fetched estimate:', data);
      setEstimate(data);
    } catch (error) {
      console.error('Error fetching estimate:', error);
      alert('Error loading estimate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!estimate) {
    return <div className="p-6">Estimate not found</div>;
  }

  return (
    <div>
      <div className="p-6 flex justify-between items-center print:hidden">
        <button
          onClick={() => router.push('/estimates')}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Estimates
        </button>
        
        {!edit && (
          <button
            onClick={() => router.push(`/estimates/${id}?edit=true`)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            <Edit size={20} />
            Edit Estimate
          </button>
        )}
      </div>

      <EstimateForm 
        initialData={estimate} 
        readOnly={!edit} 
        onSubmit={async (data) => {
          try {
            const response = await fetch(`/api/estimates/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || 'Failed to update estimate');
            }
            
            router.push('/estimates');
          } catch (error) {
            console.error('Error updating estimate:', error);
            alert('Error updating estimate: ' + error.message);
          }
        }} 
      />
    </div>
  );
}
