// app/create/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { resend } from '@/lib/resend';
import { nanoid } from 'nanoid';

export default function CreatePage() {
  const [loading, setLoading] = useState(false);
  const [magicLink, setMagicLink] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const photographerEmail = formData.get('photographerEmail') as string;
    const clientEmail = formData.get('clientEmail') as string;
    const projectName = formData.get('projectName') as string;
    const amount = parseFloat(formData.get('amount') as string) * 100;

    try {
      // 1. Generate unique magic link
      const linkSlug = nanoid(10);
      const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/client/${linkSlug}`;

      // 2. Find or create photographer
      const { data: photographer } = await supabase
        .from('photographers')
        .select('id')
        .eq('email', photographerEmail)
        .single();

      let photographerId;
      if (photographer) {
        photographerId = photographer.id;
      } else {
        const { data: newPhotographer } = await supabase
          .from('photographers')
          .insert({ email: photographerEmail })
          .select()
          .single();
        photographerId = newPhotographer.id;
      }

      // 3. Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          photographer_id: photographerId,
          client_email: clientEmail,
          project_name: projectName,
          amount: amount,
          magic_link: linkSlug,
          status: 'pending',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 4. Email the magic link to photographer
      await resend.emails.send({
        from: 'assistant@onboardflow.com',
        to: photographerEmail,
        subject: 'Your Magic Link is Ready!',
        html: `
          <h2>Your Magic Link is Ready! ✨</h2>
          <p>I've created a magic link for your client. Just send them this:</p>
          <p><a href="${magicLink}">${magicLink}</a></p>
          <p><strong>What happens next:</strong></p>
          <ol>
            <li>Client clicks link</li>
            <li>Client reviews and signs contract</li>
            <li>Client pays deposit</li>
            <li>You get notified (I'll email you)</li>
          </ol>
          <p>That's it! You can focus on photography now.</p>
          <p>Best,<br>Your Invisible Assistant</p>
        `,
      });

      // 5. Show success
      setMagicLink(magicLink);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Your Magic Link</h1>
          <p className="mt-2 text-gray-600">
            Replace 5 emails with 1 link. Your assistant will handle the rest.
          </p>
        </div>

        {magicLink ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Magic Link Created!</h2>
              <p className="text-gray-600 mb-4">Send this link to your client:</p>
              <div className="bg-gray-100 p-3 rounded-lg mb-4 break-all">
                <code className="text-sm">{magicLink}</code>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(magicLink)}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition"
              >
                Copy Link
              </button>
              <button
                onClick={() => setMagicLink('')}
                className="w-full mt-2 text-indigo-600 py-2 px-4 rounded-md hover:bg-indigo-50 transition"
              >
                Create Another Link
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="photographerEmail"
                  className="block text-sm font-medium text-gray-700"
                >
                  Your Email
                </label>
                <input
                  type="email"
                  id="photographerEmail"
                  name="photographerEmail"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700">
                  Client's Email
                </label>
                <input
                  type="email"
                  id="clientEmail"
                  name="clientEmail"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">
                  Project Name
                </label>
                <input
                  type="text"
                  id="projectName"
                  name="projectName"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Johnson Family Portrait Session"
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Deposit Amount ($)
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  required
                  min="1"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="250"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Creating Magic Link...' : 'Create Magic Link'}
              </button>
            </div>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Your client will sign and pay through the link. You'll get email updates.</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
