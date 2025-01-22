import EstimateForm from '../../components/EstimateForm';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';

export default function NewEstimatePage() {
  const router = useRouter();

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
      </div>
      <EstimateForm />
    </div>
  );
}
