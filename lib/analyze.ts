import { anthropic, CLAUDE_MODEL } from '@/lib/claude';
import { createServerClient } from '@/lib/supabase';
import { getCachedBenchmark, upsertBenchmark } from '@/lib/benchmark-cache';
import { trackVendorTrend } from '@/lib/vendor-trends';
import type { AnalysisResult, Benchmark } from '@/types';

// ─── Prompts ───────────────────────────────────────────────────────────────────

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

const EXTRACT_LINE_ITEMS_PROMPT = `Extract just the line items from this invoice image. Return ONLY a JSON array of objects:
[{"description": "string", "total": number}]
Keep descriptions concise. Return ONLY valid JSON, no other text.`;

const CONSUMER_PROMPT = `You are an expert consumer bill auditor specializing in utility bills, contractor quotes, medical bills, and auto repair invoices. Analyze this document and return a JSON response with the following structure:
{
  "vendor_name": "string",
  "invoice_date": "string",
  "invoice_total": number,
  "line_items": [{"description": "string", "quantity": number|null, "unit_price": number|null, "total": number}],
  "flags": [{"type": "vague_charge|duplicate|phantom_fee|math_error|formatting_trick|overpriced", "description": "string", "severity": "low|medium|high", "amount": number|null}],
  "math_check": {"status": "pass|fail", "expected_total": number|null, "actual_total": number|null, "details": "string"},
  "overall_risk_score": "low|medium|high"
}

Flag these consumer-specific issues:
- Vague charges: mystery fees, service charges, administrative fees with no explanation
- Duplicates: same charge appearing multiple times
- Phantom fees: charges for services not requested or described
- Math errors: totals that don't add up
- Formatting tricks: small-print surcharges, hidden fees
- Overpriced: common services charged at notably high rates (e.g., $50 for a standard oil filter)

Be consumer-friendly in descriptions. Explain why each flag matters in plain language. Return ONLY valid JSON, no other text.`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

export function extractJson(text: string): AnalysisResult {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractJsonArray(text: string): any[] {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }
  const trimmed = text.trim();
  const startIdx = trimmed.indexOf('[');
  const endIdx = trimmed.lastIndexOf(']');
  if (startIdx !== -1 && endIdx !== -1) {
    return JSON.parse(trimmed.slice(startIdx, endIdx + 1));
  }
  return JSON.parse(trimmed);
}

function buildTier2Prompt(
  cachedBenchmarks: { description: string; benchmark: Benchmark }[],
  uncachedDescriptions: string[]
): string {
  let addition = `

ADDITIONALLY, compare each major service or labor charge against market rates and add these fields to your JSON response:
"benchmarks": [{"service_description": "string", "invoiced_rate": number, "market_average": number, "difference_percent": number, "source": "string"}],
"total_potential_savings": number,
"benchmark_summary": "string"

Flag anything more than 20% above the regional average.`;

  if (cachedBenchmarks.length > 0) {
    addition += `

I already have verified market rate data for these services — use these benchmarks directly (do NOT web search for them):
`;
    for (const { description, benchmark } of cachedBenchmarks) {
      addition += `- "${description}": market average $${benchmark.market_average.toFixed(2)} (source: ${benchmark.source})\n`;
    }
  }

  if (uncachedDescriptions.length > 0) {
    addition += `
For these services, use web search to find current regional market rates:
`;
    for (const desc of uncachedDescriptions) {
      addition += `- "${desc}"\n`;
    }
  } else {
    addition += `
All service benchmarks have been provided above. Do NOT use web search — just compare the invoiced rates against the provided market averages.`;
  }

  return addition;
}

// ─── Main Analysis Pipeline ────────────────────────────────────────────────────

export interface RunAnalysisParams {
  fileBuffer: Buffer;
  fileName: string;
  fileType: string;
  userId: string;
  teamId?: string | null;
  tier: string;
  mode?: 'business' | 'consumer';
}

export interface RunAnalysisResult {
  analysisResult: AnalysisResult;
  scanId: string | null;
}

export async function runAnalysis(params: RunAnalysisParams): Promise<RunAnalysisResult> {
  const { fileBuffer, fileName, fileType, userId, teamId, tier, mode = 'business' } = params;

  const base64Data = fileBuffer.toString('base64');
  const mediaType = getMediaType(fileType);
  const isPro = tier === 'pro' || tier === 'team_pro';
  const isPdf = fileType === 'application/pdf';
  const isConsumer = mode === 'consumer';

  // Build file content block
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileContent: any = isPdf
    ? {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
      }
    : {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64Data },
      };

  // Select base prompt
  const basePrompt = isConsumer ? CONSUMER_PROMPT : TIER_1_PROMPT;

  // ── Pro tier: Two-pass approach with benchmark cache pre-check ──
  let tier2Addition = '';
  let needsWebSearch = false;

  if (isPro && !isConsumer) {
    try {
      // PASS 1: Quick extraction of line items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extractResponse = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [fileContent, { type: 'text', text: EXTRACT_LINE_ITEMS_PROMPT }],
          },
        ],
      } as any);

      let extractText = '';
      for (const block of extractResponse.content) {
        if (block.type === 'text') {
          extractText += block.text;
        }
      }

      const lineItems: { description: string; total: number }[] = extractJsonArray(extractText);
      const significantItems = lineItems.filter((item) => item.total > 50);

      const cachedBenchmarks: { description: string; benchmark: Benchmark }[] = [];
      const uncachedDescriptions: string[] = [];

      for (const item of significantItems) {
        const cached = await getCachedBenchmark(item.description);
        if (cached) {
          cachedBenchmarks.push({
            description: item.description,
            benchmark: {
              service_description: cached.service_description,
              invoiced_rate: item.total,
              market_average: cached.average_rate,
              difference_percent: ((item.total - cached.average_rate) / cached.average_rate) * 100,
              source: cached.source,
            },
          });
        } else {
          uncachedDescriptions.push(item.description);
        }
      }

      console.log(`Benchmark cache: ${cachedBenchmarks.length} hits, ${uncachedDescriptions.length} misses`);
      tier2Addition = buildTier2Prompt(cachedBenchmarks, uncachedDescriptions);
      needsWebSearch = uncachedDescriptions.length > 0;
    } catch (extractError) {
      console.error('Pass 1 extraction failed, falling back:', extractError);
      tier2Addition = `

ADDITIONALLY, for each major service or labor charge, use web search to find current regional market rates. Compare the invoiced rate against what you find. Flag anything more than 20% above the regional average.

Add these fields to your JSON response:
"benchmarks": [{"service_description": "string", "invoiced_rate": number, "market_average": number, "difference_percent": number, "source": "string"}],
"total_potential_savings": number,
"benchmark_summary": "string"`;
      needsWebSearch = true;
    }
  }

  // Build the final prompt
  const prompt = isPro && !isConsumer ? basePrompt + tier2Addition : basePrompt;

  // Build tools array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: any[] = [];
  if (isPro && needsWebSearch) {
    tools.push({ type: 'web_search_20250305', name: 'web_search', max_uses: 10 });
  }

  // PASS 2 (or only pass for non-Pro): Full analysis
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageParams: any = {
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [fileContent, { type: 'text', text: prompt }],
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
    throw new Error('No analysis result received from AI');
  }

  // Parse the JSON result
  let analysisResult: AnalysisResult;
  try {
    analysisResult = extractJson(responseText);
  } catch {
    console.error('Failed to parse Claude response:', responseText);
    throw new Error('Failed to parse analysis result');
  }

  // Save scan to the database
  const serverSupabase = createServerClient();
  const { data: scan, error: insertError } = await serverSupabase
    .from('scans')
    .insert({
      user_id: userId,
      team_id: teamId || null,
      file_name: fileName,
      analysis_result: analysisResult,
      tier_used: isPro ? 'tier2' : 'tier1',
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to save scan:', insertError);
  }

  // Cache benchmarks for future lookups (Pro tier only)
  if (isPro && analysisResult.benchmarks && analysisResult.benchmarks.length > 0) {
    try {
      for (const bench of analysisResult.benchmarks) {
        await upsertBenchmark({
          serviceCategory: bench.service_description,
          serviceDescription: bench.service_description,
          rate: bench.market_average,
          source: bench.source,
        });
      }
    } catch (cacheError) {
      console.error('Failed to cache benchmarks:', cacheError);
    }
  }

  // Track vendor trends (fire-and-forget)
  if (scan?.id) {
    trackVendorTrend(userId, scan.id, analysisResult).catch((err) =>
      console.error('Failed to track vendor trend:', err)
    );
  }

  // Send email notification (fire-and-forget)
  if (scan?.id) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, scanId: scan.id, analysisResult }),
    }).catch((err) => console.error('Failed to send notification:', err));
  }

  return {
    analysisResult,
    scanId: scan?.id || null,
  };
}
