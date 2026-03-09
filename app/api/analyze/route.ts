import { NextRequest, NextResponse } from 'next/server';
import { supabase, createServerClient } from '@/lib/supabase';
import { anthropic, CLAUDE_MODEL } from '@/lib/claude';
import { checkScanLimit, incrementScanCount } from '@/lib/scan-limits';
import { getCachedBenchmark, upsertBenchmark } from '@/lib/benchmark-cache';
import { trackVendorTrend } from '@/lib/vendor-trends';
import type { AnalysisResult, SubscriptionTier, Benchmark } from '@/types';

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

// Pass 1 prompt: quick extraction of line items only (no web search needed)
const EXTRACT_LINE_ITEMS_PROMPT = `Extract just the line items from this invoice image. Return ONLY a JSON array of objects:
[{"description": "string", "total": number}]
Keep descriptions concise. Return ONLY valid JSON, no other text.`;

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

  // Inject cached benchmarks so Claude doesn't need to web search for these
  if (cachedBenchmarks.length > 0) {
    addition += `

I already have verified market rate data for these services — use these benchmarks directly (do NOT web search for them):
`;
    for (const { description, benchmark } of cachedBenchmarks) {
      addition += `- "${description}": market average $${benchmark.market_average.toFixed(2)} (source: ${benchmark.source})\n`;
    }
  }

  // Tell Claude which services still need web search
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

    // =========================================================
    // Pro tier: Two-pass approach with benchmark cache pre-check
    // =========================================================
    let tier2Addition = '';
    let needsWebSearch = false;

    if (isPro) {
      try {
        // PASS 1: Quick extraction of line items (no web search, cheap)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extractResponse = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                imageContent,
                { type: 'text', text: EXTRACT_LINE_ITEMS_PROMPT },
              ],
            },
          ],
        } as any);

        let extractText = '';
        for (const block of extractResponse.content) {
          if (block.type === 'text') {
            extractText += block.text;
          }
        }

        // Parse extracted line items
        const lineItems: { description: string; total: number }[] =
          extractJsonArray(extractText);

        // Filter to significant items (> $50) worth benchmarking
        const significantItems = lineItems.filter((item) => item.total > 50);

        // Check cache for each service description
        const cachedBenchmarks: { description: string; benchmark: Benchmark }[] = [];
        const uncachedDescriptions: string[] = [];

        for (const item of significantItems) {
          const cached = await getCachedBenchmark(item.description);
          if (cached) {
            // Cache hit — use stored benchmark data
            cachedBenchmarks.push({
              description: item.description,
              benchmark: {
                service_description: cached.service_description,
                invoiced_rate: item.total,
                market_average: cached.average_rate,
                difference_percent:
                  ((item.total - cached.average_rate) / cached.average_rate) * 100,
                source: cached.source,
              },
            });
          } else {
            // Cache miss — needs web search
            uncachedDescriptions.push(item.description);
          }
        }

        console.log(
          `Benchmark cache: ${cachedBenchmarks.length} hits, ${uncachedDescriptions.length} misses`
        );

        // Build the Tier 2 prompt with cached data injected
        tier2Addition = buildTier2Prompt(cachedBenchmarks, uncachedDescriptions);
        needsWebSearch = uncachedDescriptions.length > 0;
      } catch (extractError) {
        // If Pass 1 fails, fall back to the original behavior (full web search)
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
    const prompt = isPro ? TIER_1_PROMPT + tier2Addition : TIER_1_PROMPT;

    // Build tools array — only include web search if needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: any[] = [];
    if (isPro && needsWebSearch) {
      tools.push({
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 10,
      });
    }

    // PASS 2 (or only pass for non-Pro): Full analysis
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

    // Phase 2: Cache benchmarks for future lookups (Pro tier only)
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
        // Non-critical — don't fail the response
      }
    }

    // Phase 2: Track vendor trends (fire-and-forget)
    if (scan?.id) {
      trackVendorTrend(user.id, scan.id, analysisResult).catch((err) =>
        console.error('Failed to track vendor trend:', err)
      );
    }

    // Phase 2: Send email notification (fire-and-forget)
    if (scan?.id) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${appUrl}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          scanId: scan.id,
          analysisResult,
        }),
      }).catch((err) => console.error('Failed to send notification:', err));
    }

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
