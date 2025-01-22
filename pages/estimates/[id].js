import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import EstimateForm from '../../components/EstimateForm';
import { ArrowLeft, Edit } from 'lucide-react';

export default function ViewEstimatePage() {
  const router = useRouter();
  const { id, edit } = router.query;
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchEstimate();
    }
  }, [id]);

  const fetchEstimate = async () => {
    try {
      const response = await fetch(`/api/estimates?id=${id}`);
      if (!response.ok) throw new Error('Failed to fetch estimate');
      const data = await response.json();
      setEstimate(data);
    } catch (error) {
      console.error('Error fetching estimate:', error);
      alert('Error loading estimate');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
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
        isEditing={!!edit}
      />
    </div>
  );
}
