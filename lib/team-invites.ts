import crypto from 'crypto';
import { createServerClient } from './supabase';
import { getTeamRole } from './teams';
import type { TeamInvite, TeamRole } from '@/types';

export async function createInvite(
  teamId: string,
  email: string,
  role: TeamRole,
  invitedBy: string
): Promise<TeamInvite> {
  const supabase = createServerClient();

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: invite, error } = await supabase
    .from('team_invites')
    .insert({
      team_id: teamId,
      email,
      role,
      invited_by: invitedBy,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error || !invite) {
    throw new Error(`Failed to create invite: ${error?.message ?? 'Unknown error'}`);
  }

  return invite as TeamInvite;
}

export async function acceptInvite(
  token: string,
  userId: string
): Promise<void> {
  const supabase = createServerClient();

  // Look up the invite by token
  const { data: invite, error: findError } = await supabase
    .from('team_invites')
    .select('*')
    .eq('token', token)
    .single();

  if (findError || !invite) {
    throw new Error('Invalid or expired invite token');
  }

  // Check if already accepted
  if (invite.accepted_at) {
    throw new Error('This invite has already been accepted');
  }

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(invite.expires_at);
  if (now > expiresAt) {
    throw new Error('This invite has expired');
  }

  // Create team member
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: invite.team_id,
      user_id: userId,
      role: invite.role,
      joined_at: new Date().toISOString(),
    });

  if (memberError) {
    throw new Error(`Failed to add team member: ${memberError.message}`);
  }

  // Update user's team_id
  const { error: userError } = await supabase
    .from('users')
    .update({ team_id: invite.team_id })
    .eq('id', userId);

  if (userError) {
    throw new Error(`Failed to update user team: ${userError.message}`);
  }

  // Mark invite as accepted
  await supabase
    .from('team_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);
}

export async function getPendingInvites(teamId: string): Promise<TeamInvite[]> {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: invites, error } = await supabase
    .from('team_invites')
    .select('*')
    .eq('team_id', teamId)
    .is('accepted_at', null)
    .gte('expires_at', now)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending invites: ${error.message}`);
  }

  return (invites as TeamInvite[]) ?? [];
}

export async function revokeInvite(
  inviteId: string,
  requesterId: string,
  teamId: string
): Promise<void> {
  // Only owner/admin can revoke
  const requesterRole = await getTeamRole(teamId, requesterId);
  if (!requesterRole || (requesterRole !== 'owner' && requesterRole !== 'admin')) {
    throw new Error('Only team owners and admins can revoke invites');
  }

  const supabase = createServerClient();

  const { error } = await supabase
    .from('team_invites')
    .delete()
    .eq('id', inviteId)
    .eq('team_id', teamId);

  if (error) {
    throw new Error(`Failed to revoke invite: ${error.message}`);
  }
}
