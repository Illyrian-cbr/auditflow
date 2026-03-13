import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { checkScanLimit, incrementScanCount } from '@/lib/scan-limits';
import { checkTeamScanLimit, incrementTeamScanCount } from '@/lib/team-scan-limits';
import { runAnalysis } from '@/lib/analyze';
import type { SubscriptionTier } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user via cookie-aware server client
    const authClient = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const serverSupabase = createServerClient();

    // Ensure user profile row exists — Google OAuth users may bypass the signup trigger
    const { data: existingUser } = await serverSupabase
      .from('users')
      .select('id, subscription_tier, team_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingUser) {
      const { error: insertUserError } = await serverSupabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email ?? '',
          name:
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            null,
          subscription_tier: 'free',
        });

      if (insertUserError) {
        console.error('Failed to create user profile:', insertUserError);
        return NextResponse.json(
          { error: `Failed to initialize user profile: ${insertUserError.message}` },
          { status: 500 }
        );
      }
    }

    const tier = (existingUser?.subscription_tier || 'free') as SubscriptionTier;
    const teamId = existingUser?.team_id || null;
    const isTeamTier = tier === 'team_starter' || tier === 'team_pro';

    // Check scan limit — use team limits for team tiers, otherwise individual
    let scanLimit: { allowed: boolean; used: number; limit: number; remaining: number };
    try {
      if (isTeamTier && teamId) {
        scanLimit = await checkTeamScanLimit(teamId);
      } else {
        scanLimit = await checkScanLimit(user.id);
      }
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
          error: 'Scan limit reached',
          used: scanLimit.used,
          limit: scanLimit.limit,
          remaining: scanLimit.remaining,
        },
        { status: 403 }
      );
    }

    // Read uploaded file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine analysis mode
    const isConsumer = tier === 'personal';

    // Run analysis pipeline
    const { analysisResult, scanId } = await runAnalysis({
      fileBuffer: buffer,
      fileName: file.name,
      fileType: file.type,
      userId: user.id,
      teamId,
      tier,
      mode: isConsumer ? 'consumer' : 'business',
    });

    // Increment scan count
    if (isTeamTier && teamId) {
      await incrementTeamScanCount(teamId);
    } else {
      await incrementScanCount(user.id);
    }

    return NextResponse.json({
      result: analysisResult,
      scan_id: scanId,
      scan_limit: {
        used: scanLimit.used + 1,
        limit: scanLimit.limit,
        remaining: scanLimit.remaining - 1,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Analyze endpoint error:', message, error);
    return NextResponse.json(
      { error: `Failed to analyze invoice: ${message}` },
      { status: 500 }
    );
  }
}
