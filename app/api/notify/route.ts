import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, scanId, analysisResult } = await request.json();

    const supabase = createServerClient();

    // Check if user has email notifications enabled
    const { data: user } = await supabase
      .from('users')
      .select('email, name, email_notifications, subscription_tier')
      .eq('id', userId)
      .single();

    if (!user || !user.email_notifications) {
      return NextResponse.json({ sent: false, reason: 'notifications_disabled' });
    }

    const flags = analysisResult?.flags || [];
    const riskScore = analysisResult?.overall_risk_score || 'unknown';
    const totalSavings = analysisResult?.total_potential_savings;
    const isPro = user.subscription_tier === 'pro';

    // Build email content
    const emailSubject = `Invoice Scan Complete: ${flags.length} issues found (${riskScore} risk)`;
    const emailBody = buildEmailHtml({
      userName: user.name || user.email.split('@')[0],
      flagCount: flags.length,
      riskScore,
      totalSavings: isPro ? totalSavings : undefined,
      scanUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/scan/${scanId}`,
    });

    // TODO: Send email via Resend or similar service
    // For now, log the email content
    console.log('Email notification:', {
      to: user.email,
      subject: emailSubject,
      body: 'HTML email generated',
    });

    // In production, uncomment and configure:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'Auditflow <notifications@auditflow.com>',
    //   to: user.email,
    //   subject: emailSubject,
    //   html: emailBody,
    // });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('Email notification error:', error);
    return NextResponse.json({ sent: false, error: 'Failed to send' }, { status: 500 });
  }
}

function buildEmailHtml(params: {
  userName: string;
  flagCount: number;
  riskScore: string;
  totalSavings?: number;
  scanUrl: string;
}): string {
  const savingsSection = params.totalSavings
    ? `<div style="background: #2A9D8F; color: white; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
        <p style="margin: 0; font-size: 14px;">Total Potential Savings</p>
        <p style="margin: 4px 0 0; font-size: 28px; font-weight: bold;">$${params.totalSavings.toFixed(2)}</p>
      </div>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1B2A4A;">
      <div style="background: #1B2A4A; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Auditflow</h1>
        <p style="color: #9CA3AF; margin: 8px 0 0;">Invoice Scan Complete</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px;">
        <p>Hi ${params.userName},</p>
        <p>Your invoice scan has been completed. Here's a quick summary:</p>
        <div style="background: #FAF8F5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6B7280;">Issues Found</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${params.flagCount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6B7280;">Risk Score</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; text-transform: capitalize;">${params.riskScore}</td>
            </tr>
          </table>
        </div>
        ${savingsSection}
        <div style="text-align: center; margin-top: 24px;">
          <a href="${params.scanUrl}" style="display: inline-block; background: #2A9D8F; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold;">View Full Results</a>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #9CA3AF; text-align: center;">
          You received this email because you have notifications enabled in Auditflow.
          <br>Manage your preferences in <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" style="color: #2A9D8F;">Settings</a>.
        </p>
      </div>
    </body>
    </html>
  `;
}
