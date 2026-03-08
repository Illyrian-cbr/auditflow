import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerClient } from '@/lib/supabase';
import { anthropic, CLAUDE_MODEL } from '@/lib/claude';
import type { AnalysisResult, SubscriptionTier } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check tier — must be starter or pro
    const serverSupabase = createServerClient();
    const { data: dbUser } = await serverSupabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = (dbUser?.subscription_tier || 'free') as SubscriptionTier;

    if (tier === 'free') {
      return NextResponse.json(
        { error: 'Dispute letter generation requires a Starter or Pro subscription.' },
        { status: 403 }
      );
    }

    const { scanId } = await request.json();

    if (!scanId) {
      return NextResponse.json(
        { error: 'Missing scanId' },
        { status: 400 }
      );
    }

    // Fetch the scan with analysis result
    const { data: scan, error: scanError } = await serverSupabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .eq('user_id', user.id)
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    const analysisResult = scan.analysis_result as AnalysisResult | null;

    if (!analysisResult) {
      return NextResponse.json(
        { error: 'No analysis result found for this scan' },
        { status: 400 }
      );
    }

    // Build a summary of flagged items for the prompt
    const flagsSummary = analysisResult.flags
      .map(
        (flag, i) =>
          `${i + 1}. [${flag.severity.toUpperCase()}] ${flag.type}: ${flag.description}${flag.amount !== null ? ` ($${flag.amount.toFixed(2)})` : ''}`
      )
      .join('\n');

    const mathDetails =
      analysisResult.math_check.status === 'fail'
        ? `\nMath discrepancy: Expected total $${analysisResult.math_check.expected_total}, actual total $${analysisResult.math_check.actual_total}. ${analysisResult.math_check.details}`
        : '';

    const benchmarkDetails =
      analysisResult.benchmarks && analysisResult.benchmarks.length > 0
        ? `\n\nBenchmark findings:\n${analysisResult.benchmarks
            .map(
              (b) =>
                `- ${b.service_description}: Invoiced $${b.invoiced_rate}, market average $${b.market_average} (${b.difference_percent > 0 ? '+' : ''}${b.difference_percent.toFixed(1)}% vs market)`
            )
            .join('\n')}${analysisResult.total_potential_savings ? `\nTotal potential savings: $${analysisResult.total_potential_savings.toFixed(2)}` : ''}`
        : '';

    const prompt = `You are a professional business consultant helping a client draft a dispute letter to a vendor regarding suspicious charges found on an invoice.

Invoice details:
- Vendor: ${analysisResult.vendor_name}
- Invoice Date: ${analysisResult.invoice_date}
- Invoice Total: $${analysisResult.invoice_total.toFixed(2)}
- Overall Risk Score: ${analysisResult.overall_risk_score}

Flagged issues:
${flagsSummary}${mathDetails}${benchmarkDetails}

Generate a professional, firm but courteous dispute letter that:
1. References the specific invoice by vendor name and date
2. Lists each flagged item with a clear explanation of why it is being disputed
3. Requests itemized justification for vague charges
4. Requests correction of any math errors
5. Cites any overpriced charges compared to market rates (if benchmark data is available)
6. Requests a revised invoice with disputed charges removed or adjusted
7. Sets a reasonable deadline for response (15 business days)
8. Maintains a professional tone throughout

Format the letter with proper business letter formatting, including a placeholder for the sender's name and address at the top. The letter should be ready to send with minimal edits.`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from response
    let letterText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        letterText += block.text;
      }
    }

    if (!letterText) {
      return NextResponse.json(
        { error: 'Failed to generate dispute letter' },
        { status: 500 }
      );
    }

    return NextResponse.json({ letter: letterText });
  } catch (error) {
    console.error('Dispute letter generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate dispute letter' },
      { status: 500 }
    );
  }
}
