import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { createServerClient } from '@/lib/supabase';
import { getTeamMembers, removeTeamMember, getTeamRole } from '@/lib/teams';

export async function GET() {
  try {
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

    // Get user's team_id
    const { data: dbUser } = await serverSupabase
      .from('users')
      .select('team_id')
      .eq('id', user.id)
      .single();

    if (!dbUser?.team_id) {
      return NextResponse.json(
        { error: 'User does not belong to a team' },
        { status: 404 }
      );
    }

    const members = await getTeamMembers(dbUser.team_id);

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get team members' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
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

    const { memberId } = await request.json();

    if (!memberId || typeof memberId !== 'string') {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const serverSupabase = createServerClient();

    // Get user's team_id
    const { data: dbUser } = await serverSupabase
      .from('users')
      .select('team_id')
      .eq('id', user.id)
      .single();

    if (!dbUser?.team_id) {
      return NextResponse.json(
        { error: 'User does not belong to a team' },
        { status: 404 }
      );
    }

    // Verify caller is owner or admin
    const callerRole = await getTeamRole(dbUser.team_id, user.id);
    if (!callerRole || (callerRole !== 'owner' && callerRole !== 'admin')) {
      return NextResponse.json(
        { error: 'Only team owners and admins can remove members' },
        { status: 403 }
      );
    }

    await removeTeamMember(dbUser.team_id, memberId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove team member error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
