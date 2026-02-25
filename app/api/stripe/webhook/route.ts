// app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { resend } from '@/lib/resend';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const projectId = session.metadata?.projectId;

      if (projectId) {
        // Update project status
        await supabase
          .from('projects')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', projectId);

        // Get project details for email
        const { data: project } = await supabase
          .from('projects')
          .select(
            `
            *,
            photographers (
              email
            )
          `
          )
          .eq('id', projectId)
          .single();

        if (project) {
          // Email photographer
          await resend.emails.send({
            from: 'assistant@onboardflow.com',
            to: project.photographers.email,
            subject: '💰 Payment Received!',
            html: `
              <h2>Payment Received! 🎉</h2>
              <p><strong>Client:</strong> ${project.client_email}</p>
              <p><strong>Project:</strong> ${project.project_name}</p>
              <p><strong>Amount:</strong> $${(project.amount / 100).toFixed(2)}</p>
              <p>The booking is now confirmed! Time to focus on creating amazing photos.</p>
              <br>
              <p>Need anything else? Just reply to this email.</p>
              <br>
              <p>Best,<br>Your Invisible Assistant</p>
            `,
          });

          // Email client
          await resend.emails.send({
            from: 'assistant@onboardflow.com',
            to: project.client_email,
            subject: 'Booking Confirmed!',
            html: `
              <h2>Thank you for your payment! 🎉</h2>
              <p>Your booking for <strong>${project.project_name}</strong> is now confirmed.</p>
              <p>The photographer will be in touch with you soon to discuss next steps.</p>
              <br>
              <p>Best regards,<br>The OnboardFlow Assistant</p>
            `,
          });
        }
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
