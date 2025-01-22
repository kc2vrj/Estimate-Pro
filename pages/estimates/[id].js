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

  useEffect(() => {
    if (id && session) {
      fetchEstimate();
    }
  }, [id, session]);

  const fetchEstimate = async () => {
    try {
      const response = await fetch(`/api/estimates/${id}`);
      if (!response.ok) throw new Error('Failed to fetch estimate');
      const data = await response.json();
      
      // Ensure rows have the correct format
      if (data.rows) {
        data.rows = data.rows.map((row, index) => ({
          ...row,
          id: row.id || index + 1
        }));
      }

      // Ensure totals are set
      data.totals = {
        subtotal: data.subtotal || 0,
        salesTax: data.salesTax || 0,
        total: data.total || 0
      };

      setEstimate(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching estimate:', error);
      setError('Error loading estimate');
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!estimate) return <div>Estimate not found</div>;

  return (
    <div>
      <div className="p-6 print-hide">
        <button
          onClick={() => router.push('/estimates')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Estimates
        </button>
        {mode !== 'edit' && (
          <button
            onClick={() => router.push(`/estimates/${id}?mode=edit`)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            <Edit size={20} />
            Edit Estimate
          </button>
        )}
      </div>
      <EstimateForm 
        initialData={estimate} 
        readOnly={mode !== 'edit'} 
        isEditing={mode === 'edit'} 
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
