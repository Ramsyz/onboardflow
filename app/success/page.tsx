// app/success/page.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // You could verify the payment here if needed
    if (sessionId) {
      console.log('Payment successful for session:', sessionId);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful! 🎉</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your payment. Your booking is now confirmed.
        </p>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">Booking Confirmed</div>
            <p className="text-gray-600 mb-4">
              You'll receive a confirmation email shortly with all the details.
            </p>
            <div className="text-sm text-gray-500">
              <p>Session ID: {sessionId || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition text-center"
          >
            Return Home
          </Link>
          <p className="text-sm text-gray-500">Need help? Contact the photographer directly.</p>
        </div>
      </div>
    </div>
  );
}
