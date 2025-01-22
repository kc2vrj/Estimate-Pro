import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Add debug logging
  console.log('Session status:', status);
  console.log('Session data:', session);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Redirect approved users to estimates
  if (session?.user?.is_approved || session?.user?.role === 'admin') {
    console.log('Redirecting to estimates...');
    router.push('/estimates');
    return null;
  }

  return (
    <>
      <Head>
        <title>Estimate Pro - Professional Estimate Generation System</title>
        <meta name="description" content="A modern, professional estimate generation system built with Next.js" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="relative overflow-hidden">
          <div className="relative pt-6 pb-16 sm:pb-24">
            <nav className="relative max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6">
              <div className="flex items-center flex-1">
                <div className="flex items-center justify-between w-full">
                  <a href="#" className="text-2xl font-bold text-gray-900">
                    Estimate Pro
                  </a>
                  <div className="hidden md:block">
                    <div className="ml-10 space-x-4">
                      {!session && (
                        <>
                          <Link
                            href="/auth/login"
                            className="inline-block bg-indigo-600 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-indigo-700"
                          >
                            Sign in
                          </Link>
                          <Link
                            href="/auth/register"
                            className="inline-block bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-gray-50"
                          >
                            Register
                          </Link>
                        </>
                      )}
                      {session && (
                        <Link
                          href="/estimates"
                          className="inline-block bg-indigo-600 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-indigo-700"
                        >
                          Go to Estimates
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </nav>

            <main className="mt-16 mx-auto max-w-7xl px-4 sm:mt-24">
              <div className="text-center">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">Professional</span>
                  <span className="block text-indigo-600">Estimate Generation</span>
                </h1>
                <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                  Create professional estimates quickly and easily. Perfect for contractors, freelancers, and small businesses.
                </p>
                <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                  {!session ? (
                    <>
                      <div className="rounded-md shadow">
                        <Link
                          href="/auth/register"
                          className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                        >
                          Get started
                        </Link>
                      </div>
                      <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                        <Link
                          href="/auth/login"
                          className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                        >
                          Sign in
                        </Link>
                      </div>
                    </>
                  ) : !session.user.is_approved ? (
                    <div className="rounded-md bg-yellow-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Account Pending Approval</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>Your account is currently pending approval from an administrator.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md shadow">
                      <Link
                        href="/estimates"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                      >
                        Go to Dashboard
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
