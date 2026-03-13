import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { createServerClient } from '@/lib/supabase';
import { getTeamRole } from '@/lib/teams';
import { createInvite, getPendingInvites, revokeInvite } from '@/lib/team-invites';
import type { TeamRole } from '@/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
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

    const { email, role } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      );
    }

    if (!role || (role !== 'admin' && role !== 'member')) {
      return NextResponse.json(
        { error: 'Role must be admin or member' },
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
        { error: 'Only team owners and admins can invite members' },
        { status: 403 }
      );
    }

    const invite = await createInvite(
      dbUser.team_id,
      email.trim().toLowerCase(),
      role as TeamRole,
      user.id
    );

    const inviteLink = `${APP_URL}/invite?token=${invite.token}`;

    return NextResponse.json({ invite, inviteLink }, { status: 201 });
  } catch (error) {
    console.error('Create invite error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invite' },
      { status: 500 }
    );
  }
}

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

    const invites = await getPendingInvites(dbUser.team_id);

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Get pending invites error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get pending invites' },
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

    const { inviteId } = await request.json();

    if (!inviteId || typeof inviteId !== 'string') {
      return NextResponse.json(
        { error: 'inviteId is required' },
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
        { error: 'Only team owners and admins can revoke invites' },
        { status: 403 }
      );
    }

    await revokeInvite(inviteId, user.id, dbUser.team_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke invite error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke invite' },
      { status: 500 }
    );
  }
}
