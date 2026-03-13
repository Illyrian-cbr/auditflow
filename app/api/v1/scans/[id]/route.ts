import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { authenticateApiRequest } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    const supabase = createServerClient();

    // Fetch the scan
    const { data: scan, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Verify ownership — user_id must match, OR team_id must match with owner/admin role
    let authorized = scan.user_id === user.id;

    if (!authorized && scan.team_id && user.team_id === scan.team_id) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', user.team_id)
        .eq('user_id', user.id)
        .single();

      if (membership && (membership.role === 'owner' || membership.role === 'admin')) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: scan.id,
        user_id: scan.user_id,
        team_id: scan.team_id,
        file_name: scan.file_name,
        created_at: scan.created_at,
        tier_used: scan.tier_used,
        analysis_result: scan.analysis_result,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('API v1 scan detail error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch scan' },
      { status: 500 }
    );
  }
}
