import EstimateForm from '../../components/EstimateForm';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function NewQuotePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div>
      <div className="p-6 print-hide">
        <button
          onClick={() => router.push('/quotes')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Quotes
        </button>
      </div>
      <EstimateForm />
    </div>
  );
}
