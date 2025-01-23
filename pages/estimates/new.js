import EstimateForm from '../../components/EstimateForm';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function NewEstimatePage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/login');
    },
  });

  const handleSubmit = async (formData) => {
    try {
      console.log('Submitting estimate:', formData);
      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create estimate');
      }

      const newEstimate = await response.json();
      console.log('Created estimate:', newEstimate);
      router.push(`/estimates/${newEstimate.id}`);
    } catch (err) {
      console.error('Error creating estimate:', err);
      setError(err.message);
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/estimates')}
            className="text-blue-600 hover:text-blue-800 mr-4"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Create New Estimate</h1>
        </div>
      </div>
      <EstimateForm onSubmit={handleSubmit} />
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
