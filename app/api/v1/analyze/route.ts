import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { authenticateApiRequest } from '@/lib/api-auth';
import { anthropic, CLAUDE_MODEL } from '@/lib/claude';
import { checkScanLimit, incrementScanCount } from '@/lib/scan-limits';
import type { AnalysisResult, SubscriptionTier } from '@/types';

const TIER_1_PROMPT = `You are an expert invoice auditor. Analyze this invoice thoroughly and return a JSON response with the following structure:
{
  "vendor_name": "string",
  "invoice_date": "string",
  "invoice_total": number,
  "line_items": [{"description": "string", "quantity": number|null, "unit_price": number|null, "total": number}],
  "flags": [{"type": "vague_charge|duplicate|phantom_fee|math_error|formatting_trick|overpriced", "description": "string", "severity": "low|medium|high", "amount": number|null}],
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

function inferFileType(fileName: string, fileType?: string): string {
  if (fileType) return fileType;

  const ext = fileName.split('.').pop()?.toLowerCase();
  const extMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };

  return extMap[ext || ''] || 'image/png';
}

function extractJson(text: string): AnalysisResult {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }

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
    // Authenticate via Bearer token (NOT cookies)
    const auth = await authenticateApiRequest(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide a valid API key as a Bearer token. API access requires Pro or Team tier.' },
        { status: 401 }
      );
    }

    const { user, tier } = auth;

    // Parse JSON body
    let body: { file: string; file_name: string; file_type?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Expected: { file: string (base64), file_name: string, file_type?: string }' },
        { status: 400 }
      );
    }

    if (!body.file || !body.file_name) {
      return NextResponse.json(
        { error: 'Missing required fields: file (base64 string) and file_name' },
        { status: 400 }
      );
    }

    // Check scan limits — use team_id if the user belongs to a team
    const limitUserId = user.team_id || user.id;

    let scanLimit: { allowed: boolean; used: number; limit: number; remaining: number };
    try {
      scanLimit = await checkScanLimit(limitUserId);
    } catch (limitError) {
      console.error('checkScanLimit error:', limitError);
      return NextResponse.json(
        { error: `Scan limit check failed: ${String(limitError)}` },
        { status: 500 }
      );
    }

    if (!scanLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Scan limit reached for this billing period',
          scan_limit: {
            used: scanLimit.used,
            limit: scanLimit.limit,
            remaining: 0,
          },
        },
        { status: 403 }
      );
    }

    // Decode base64 to Buffer
    let base64Data: string;
    try {
      // Strip data URI prefix if present (e.g., "data:application/pdf;base64,...")
      base64Data = body.file.includes(',') ? body.file.split(',')[1] : body.file;
      // Validate that it's valid base64 by trying to decode
      Buffer.from(base64Data, 'base64');
    } catch {
      return NextResponse.json(
        { error: 'Invalid base64-encoded file data' },
        { status: 400 }
      );
    }

    // Determine file type
    const resolvedFileType = inferFileType(body.file_name, body.file_type);
    const isPdf = resolvedFileType === 'application/pdf';
    const mediaType = getMediaType(resolvedFileType);

    // Build content block for Claude
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileContent: any = isPdf
      ? {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        }
      : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data,
          },
        };

    // Build prompt based on tier
    const isProTier = tier === 'pro' || tier === 'team_pro';
    const prompt = isProTier ? TIER_1_PROMPT + TIER_2_ADDITION : TIER_1_PROMPT;

    // Build tools array — add web search for Pro/Team Pro
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: any[] = [];
    if (isProTier) {
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
            fileContent,
            { type: 'text', text: prompt },
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

    // Parse JSON result
    let analysisResult: AnalysisResult;
    try {
      analysisResult = extractJson(responseText);
    } catch {
      console.error('Failed to parse Claude response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse analysis result' },
        { status: 500 }
      );
    }

    // Save scan to database
    const serverSupabase = createServerClient();
    const { data: scan, error: insertError } = await serverSupabase
      .from('scans')
      .insert({
        user_id: user.id,
        team_id: user.team_id || null,
        file_name: body.file_name,
        analysis_result: analysisResult,
        tier_used: isProTier ? 'tier2' : 'tier1',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save scan:', insertError);
    }

    // Increment scan count
    await incrementScanCount(limitUserId);

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
    const message = error instanceof Error ? error.message : String(error);
    console.error('API v1 analyze error:', message, error);
    return NextResponse.json(
      { error: `Failed to analyze invoice: ${message}` },
      { status: 500 }
    );
  }
}
