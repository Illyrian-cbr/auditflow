import { createServerClient } from './supabase';
import type { Team, TeamMember, TeamRole } from '@/types';

export async function createTeam(
  name: string,
  ownerUserId: string,
  tier: 'team_starter' | 'team_pro'
): Promise<Team> {
  const supabase = createServerClient();

  const maxMembers = tier === 'team_starter' ? 5 : 20;

  // Create the team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name,
      owner_user_id: ownerUserId,
      subscription_tier: tier,
      max_members: maxMembers,
    })
    .select()
    .single();

  if (teamError || !team) {
    throw new Error(`Failed to create team: ${teamError?.message ?? 'Unknown error'}`);
  }

  // Add the owner as a team member
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: ownerUserId,
      role: 'owner' as TeamRole,
      joined_at: new Date().toISOString(),
    });

  if (memberError) {
    throw new Error(`Failed to add owner as team member: ${memberError.message}`);
  }

  // Update user's team_id
  const { error: userError } = await supabase
    .from('users')
    .update({ team_id: team.id })
    .eq('id', ownerUserId);

  if (userError) {
    throw new Error(`Failed to update user team_id: ${userError.message}`);
  }

  return team as Team;
}

export async function getTeamForUser(
  userId: string
): Promise<(Team & { member_count: number }) | null> {
  const supabase = createServerClient();

  // Look up the user's team_id
  const { data: user } = await supabase
    .from('users')
    .select('team_id')
    .eq('id', userId)
    .single();

  if (!user?.team_id) return null;

  // Fetch the team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('id', user.team_id)
    .single();

  if (teamError || !team) return null;

  // Get member count
  const { count } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', team.id);

  return {
    ...(team as Team),
    member_count: count ?? 0,
  };
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const supabase = createServerClient();

  // Fetch team members
  const { data: members, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (error || !members) {
    throw new Error(`Failed to fetch team members: ${error?.message ?? 'Unknown error'}`);
  }

  // Get user details for each member
  const userIds = members.map((m) => m.user_id);
  const { data: users } = await supabase
    .from('users')
    .select('id, email, name')
    .in('id', userIds);

  const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);

  return members.map((member) => {
    const user = userMap.get(member.user_id);
    return {
      ...member,
      email: user?.email,
      name: user?.name ?? null,
    } as TeamMember;
  });
}

export async function removeTeamMember(
  teamId: string,
  userId: string,
  requesterId: string
): Promise<void> {
  const supabase = createServerClient();

  // Check requester's role
  const requesterRole = await getTeamRole(teamId, requesterId);
  if (!requesterRole || (requesterRole !== 'owner' && requesterRole !== 'admin')) {
    throw new Error('Only team owners and admins can remove members');
  }

  // Check if the target is the owner
  const targetRole = await getTeamRole(teamId, userId);
  if (targetRole === 'owner') {
    throw new Error('Cannot remove the team owner');
  }

  // Remove the team member
  const { error: removeError } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (removeError) {
    throw new Error(`Failed to remove team member: ${removeError.message}`);
  }

  // Clear user's team_id
  await supabase
    .from('users')
    .update({ team_id: null })
    .eq('id', userId);
}

export async function getTeamRole(
  teamId: string,
  userId: string
): Promise<TeamRole | null> {
  const supabase = createServerClient();

  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  return (member?.role as TeamRole) ?? null;
}
