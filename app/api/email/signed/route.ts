// app/api/email/signed/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resend } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    // Get project and photographer details
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

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Send email to photographer
    await resend.emails.send({
      from: 'assistant@onboardflow.com',
      to: project.photographers.email,
      subject: '✅ Contract Signed!',
      html: `
        <h2>Great news! Your client just signed the contract.</h2>
        <p><strong>Client:</strong> ${project.client_email}</p>
        <p><strong>Project:</strong> ${project.project_name}</p>
        <p><strong>Deposit:</strong> $${(project.amount / 100).toFixed(2)}</p>
        <p>I've automatically sent them the payment link. You'll get another email when they pay.</p>
        <p>No action needed from you. Just focus on the creative work! 🎨</p>
        <br>
        <p>Best,<br>Your Invisible Assistant</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: 'Error sending email' }, { status: 500 });
  }
}
