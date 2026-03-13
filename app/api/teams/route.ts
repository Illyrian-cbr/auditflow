import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { createTeam, getTeamForUser } from '@/lib/teams';

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

    const { name, tier } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    if (!tier || (tier !== 'team_starter' && tier !== 'team_pro')) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be team_starter or team_pro' },
        { status: 400 }
      );
    }

    // Check if user already has a team
    const existingTeam = await getTeamForUser(user.id);
    if (existingTeam) {
      return NextResponse.json(
        { error: 'User already belongs to a team' },
        { status: 409 }
      );
    }

    const team = await createTeam(name.trim(), user.id, tier);

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create team' },
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

    const team = await getTeamForUser(user.id);

    if (!team) {
      return NextResponse.json({ team: null });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get team info' },
      { status: 500 }
    );
  }
}
