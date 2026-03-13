import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { authenticateApiRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate via Bearer token
    const auth = await authenticateApiRequest(request);

    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide a valid API key as a Bearer token. API access requires Pro or Team tier.' },
        { status: 401 }
      );
    }

    const { user } = auth;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20', 10)));
    const showTeam = searchParams.get('team') === 'true';

    const supabase = createServerClient();
    const offset = (page - 1) * perPage;

    let query = supabase
      .from('scans')
      .select('id, file_name, created_at, tier_used, analysis_result', { count: 'exact' });

    if (showTeam && user.team_id) {
      // Check if user has permission to view team scans (owner or admin)
      const { data: membership } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', user.team_id)
        .eq('user_id', user.id)
        .single();

      if (membership && (membership.role === 'owner' || membership.role === 'admin')) {
        query = query.eq('team_id', user.team_id);
      } else {
        // Not authorized for team view, fall back to personal scans
        query = query.eq('user_id', user.id);
      }
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: scans, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) {
      console.error('Failed to fetch scans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scans' },
        { status: 500 }
      );
    }

    // Map results to extract risk_score from analysis_result
    const results = (scans || []).map((scan) => {
      const analysisResult = scan.analysis_result as Record<string, unknown> | null;
      return {
        id: scan.id,
        file_name: scan.file_name,
        created_at: scan.created_at,
        tier_used: scan.tier_used,
        risk_score: analysisResult?.overall_risk_score || null,
      };
    });

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / perPage);

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        per_page: perPage,
        total: totalCount,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('API v1 scans list error:', message);
    return NextResponse.json(
      { error: 'Failed to list scans' },
      { status: 500 }
    );
  }
}
