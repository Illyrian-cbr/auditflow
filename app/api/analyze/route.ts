import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerClient } from '@/lib/supabase';
import { anthropic, CLAUDE_MODEL } from '@/lib/claude';
import { checkScanLimit, incrementScanCount } from '@/lib/scan-limits';
import type { AnalysisResult, SubscriptionTier } from '@/types';

const TIER_1_PROMPT = `You are an expert invoice auditor. Analyze this invoice image thoroughly and return a JSON response with the following structure:
{
  "vendor_name": "string",
  "invoice_date": "string",
  "invoice_total": number,
  "line_items": [{"description": "string", "quantity": number|null, "unit_price": number|null, "total": number}],
  "flags": [{"type": "vague_charge|duplicate|phantom_fee|math_error|formatting_trick", "description": "string", "severity": "low|medium|high", "amount": number|null}],
  "math_check": {"status": "pass|fail", "expected_total": number|null, "actual_total": number|null, "details": "string"},
  "overall_risk_score": "low|medium|high"
}

Flag these issues:
- Vague charges: "miscellaneous", "admin fee", "handling fee", "service charge" with no clear description
- Duplicates: same description and amount appearing more than once
- Phantom fees: charges referencing services not mentioned elsewhere
- Math errors: line items that don't add up to the total
- Formatting tricks: unusual formatting that might hide charges

Be thorough and flag every suspicious item. Return ONLY valid JSON, no other text.`;

const TIER_2_ADDITION = `

ADDITIONALLY, for each major service or labor charge, use web search to find current regional market rates. Compare the invoiced rate against what you find. Flag anything more than 20% above the regional average.

Add these fields to your JSON response:
"benchmarks": [{"service_description": "string", "invoiced_rate": number, "market_average": number, "difference_percent": number, "source": "string"}],
"total_potential_savings": number,
"benchmark_summary": "string"`;

function getMediaType(
  fileType: string
): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf' {
  const typeMap: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'> = {
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
    'image/png': 'image/png',
    'image/gif': 'image/gif',
    'image/webp': 'image/webp',
    'application/pdf': 'application/pdf',
  };

  return typeMap[fileType] || 'image/png';
}

function extractJson(text: string): AnalysisResult {
  // Try to find JSON in the response — it might be wrapped in markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }

  // Try parsing the entire response as JSON
  const trimmed = text.trim();
  const startIdx = trimmed.indexOf('{');
  const endIdx = trimmed.lastIndexOf('}');

  if (startIdx !== -1 && endIdx !== -1) {
    return JSON.parse(trimmed.slice(startIdx, endIdx + 1));
  }

  return JSON.parse(trimmed);
}

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

    // Check scan limit
    const scanLimit = await checkScanLimit(user.id);
    if (!scanLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Scan limit reached',
          used: scanLimit.used,
          limit: scanLimit.limit,
          remaining: scanLimit.remaining,
        },
        { status: 403 }
      );
    }

    // Get user tier
    const serverSupabase = createServerClient();
    const { data: dbUser } = await serverSupabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = (dbUser?.subscription_tier || 'free') as SubscriptionTier;

    // Read uploaded file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    const mediaType = getMediaType(file.type);
    const isPro = tier === 'pro';

    // Build the prompt
    const prompt = isPro ? TIER_1_PROMPT + TIER_2_ADDITION : TIER_1_PROMPT;

    // Build message content with vision
    const imageContent: {
      type: 'image';
      source: {
        type: 'base64';
        media_type: string;
        data: string;
      };
    } = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Data,
      },
    };

    // Build tools array for Pro tier (web search)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: any[] = [];
    if (isPro) {
      tools.push({
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 10,
      });
    }

    // Call Claude API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageParams: any = {
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            imageContent,
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    };

    if (tools.length > 0) {
      messageParams.tools = tools;
    }

    const response = await anthropic.messages.create(messageParams);

    // Extract text from response
    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }

    if (!responseText) {
      return NextResponse.json(
        { error: 'No analysis result received from AI' },
        { status: 500 }
      );
    }

    // Parse the JSON result
    let analysisResult: AnalysisResult;
    try {
      analysisResult = extractJson(responseText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse analysis result' },
        { status: 500 }
      );
    }

    // Save scan to the database
    const { data: scan, error: insertError } = await serverSupabase
      .from('scans')
      .insert({
        user_id: user.id,
        file_name: file.name,
        analysis_result: analysisResult,
        tier_used: isPro ? 'tier2' : 'tier1',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save scan:', insertError);
      // Still return the result even if saving fails
    }

    // Increment scan count
    await incrementScanCount(user.id);

    return NextResponse.json({
      result: analysisResult,
      scan_id: scan?.id || null,
      scan_limit: {
        used: scanLimit.used + 1,
        limit: scanLimit.limit,
        remaining: scanLimit.remaining - 1,
      },
    });
  } catch (error) {
    console.error('Analyze endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze invoice' },
      { status: 500 }
    );
  }
}
