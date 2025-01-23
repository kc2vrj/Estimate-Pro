import EstimatesList from '../../components/EstimatesList';
import { useRouter } from 'next/router';
import { Plus } from 'lucide-react';

export default function EstimatesPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Estimates</h1>
        <button
          onClick={() => router.push('/estimates/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
        >
          <Plus size={20} className="mr-2" />
          New Estimate
        </button>
      </div>
      <EstimatesList />
    </div>
  );
}
