// pages/estimates.js
import Head from 'next/head';
import EstimateForm from '../components/EstimateForm';

export default function EstimatePage() {
  return (
    <>
      <Head>
        <title>Maytech Systems - Estimate Form</title>
        <meta name="description" content="Maytech Systems Estimate Form" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-50 py-8">
        <EstimateForm />
      </main>
    </>
  );
}