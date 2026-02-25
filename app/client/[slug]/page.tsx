// app/client/[slug]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import SignatureCanvas from 'react-signature-canvas';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Project {
  id: string;
  client_email: string;
  project_name: string;
  amount: number;
  status: 'pending' | 'signed' | 'paid' | 'completed';
  contract_signed_at: string | null;
  paid_at: string | null;
}

export default function ClientPortalPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [signature, setSignature] = useState('');
  const sigCanvas = useRef<SignatureCanvas>(null);

  const steps = [
    { id: 1, name: 'Review Contract', description: 'Read through the agreement' },
    { id: 2, name: 'Sign Contract', description: 'Add your signature' },
    { id: 3, name: 'Pay Deposit', description: 'Secure your booking' },
  ];

  useEffect(() => {
    loadProject();
  }, [slug]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('magic_link', slug)
        .single();

      if (error) throw error;
      setProject(data);

      // Determine current step
      if (data.paid_at) {
        setCurrentStep(4); // All done
      } else if (data.contract_signed_at) {
        setCurrentStep(3); // Ready to pay
      } else {
        setCurrentStep(1); // Start with contract
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!sigCanvas.current || !project) return;

    const signatureData = sigCanvas.current.toDataURL();
    setSignature(signatureData);

    try {
      // Save signature
      const { error: sigError } = await supabase.from('signatures').insert({
        project_id: project.id,
        signature_data: signatureData,
      });

      if (sigError) throw sigError;

      // Update project status
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          status: 'signed',
          contract_signed_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (projectError) throw projectError;

      // Move to next step
      setCurrentStep(3);

      // Email photographer (we'll implement this in API route)
      await fetch('/api/email/signed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
    } catch (err) {
      console.error(err);
      alert('Error saving signature. Please try again.');
    }
  };

  const handlePayment = async () => {
    if (!project) return;

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          amount: project.amount,
          projectName: project.project_name,
        }),
      });

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error(err);
      alert('Error creating payment. Please try again.');
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setSignature('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Portal Not Found</h1>
          <p className="mt-2 text-gray-600">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{project.project_name}</h1>
          <p className="mt-2 text-gray-600">Complete these steps to secure your booking</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep > step.id
                      ? 'bg-green-600'
                      : currentStep === step.id
                        ? 'bg-indigo-600'
                        : 'bg-gray-300'
                  }`}
                >
                  <span className="text-white text-sm font-medium">
                    {currentStep > step.id ? '✓' : step.id}
                  </span>
                </div>
                <div className="ml-3">
                  <div
                    className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.name}
                  </div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.id + 1 ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Contract</h2>
              <div className="border rounded-lg p-4 mb-6">
                <p className="text-gray-700 mb-4">
                  This is a sample contract. In the real version, you would upload your own contract
                  PDF.
                </p>
                <div className="space-y-3">
                  <p>
                    <strong>Project:</strong> {project.project_name}
                  </p>
                  <p>
                    <strong>Client:</strong> {project.client_email}
                  </p>
                  <p>
                    <strong>Deposit:</strong> ${(project.amount / 100).toFixed(2)}
                  </p>
                  <p>
                    <strong>Terms:</strong> 50% deposit required to secure booking. Balance due on
                    delivery.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition"
              >
                I Agree - Continue to Sign
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sign Contract</h2>
              <p className="text-gray-600 mb-4">Please sign below to agree to the terms.</p>

              <div className="border-2 border-gray-300 rounded-lg mb-4">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  canvasProps={{
                    width: 500,
                    height: 200,
                    className: 'w-full h-48',
                  }}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={clearSignature}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition"
                >
                  Clear
                </button>
                <button
                  onClick={handleSign}
                  disabled={!signature}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Save Signature
                </button>
              </div>

              {signature && (
                <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
                  ✓ Signature saved! Proceeding to payment...
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pay Deposit</h2>
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    ${(project.amount / 100).toFixed(2)}
                  </div>
                  <p className="text-gray-600">50% deposit to secure your booking</p>
                </div>
              </div>

              <button
                onClick={handlePayment}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Pay Securely with Stripe
              </button>

              <p className="mt-4 text-sm text-gray-500 text-center">
                Secure payment processed by Stripe. Your card details are never stored on our
                servers.
              </p>
            </div>
          )}

          {currentStep === 4 && (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed! 🎉</h2>
              <p className="text-gray-600 mb-4">
                Thank you! Your deposit has been received and your booking is confirmed.
              </p>
              <p className="text-gray-500">
                The photographer will be in touch with next steps. You'll receive a confirmation
                email shortly.
              </p>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Need help? Contact the photographer directly.</p>
        </div>
      </div>
    </div>
  );
}
