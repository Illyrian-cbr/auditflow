'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/providers';
import TeamUsageBar from '@/components/TeamUsageBar';
import TeamMemberList from '@/components/TeamMemberList';
import TeamInviteForm from '@/components/TeamInviteForm';
import type { Team, TeamMember, TeamInvite, TeamRole } from '@/types';

const STRIPE_PRICE_IDS: Record<string, string> = {
  team_starter: process.env.NEXT_PUBLIC_STRIPE_TEAM_STARTER_PRICE_ID ?? '',
  team_pro: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRO_PRICE_ID ?? '',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamWithCount extends Team {
  member_count: number;
}

interface UsageInfo {
  used: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ''}`}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-8 w-64" />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <SkeletonBlock className="h-5 w-48 mb-3" />
        <SkeletonBlock className="h-3 w-full" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <SkeletonBlock className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Team Form
// ---------------------------------------------------------------------------

function CreateTeamForm() {
  const [name, setName] = useState('');
  const [tier, setTier] = useState<'team_starter' | 'team_pro'>('team_starter');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a team name.');
      return;
    }

    setCreating(true);
    try {
      // Step 1: Create the team
      const teamRes = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, tier }),
      });

      if (!teamRes.ok) {
        const data = await teamRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create team');
      }

      // Step 2: Redirect to Stripe checkout
      const priceId =
        tier === 'team_starter'
          ? STRIPE_PRICE_IDS.team_starter
          : STRIPE_PRICE_IDS.team_pro;

      const checkoutRes = await fetch('/api/teams/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (!checkoutRes.ok) {
        const data = await checkoutRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start checkout');
      }

      const { url } = await checkoutRes.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-center mb-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal/10">
          <svg
            className="h-7 w-7 text-teal"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-navy">Create a Team</h1>
        <p className="mt-2 text-sm text-gray-500">
          Collaborate with your colleagues on invoice auditing.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-5">
        {/* Team Name */}
        <div>
          <label
            htmlFor="team-name"
            className="block text-sm font-medium text-navy mb-1.5"
          >
            Team Name
          </label>
          <input
            id="team-name"
            type="text"
            placeholder="Acme Construction"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            disabled={creating}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal disabled:opacity-50"
          />
        </div>

        {/* Tier Selection */}
        <div>
          <label className="block text-sm font-medium text-navy mb-3">
            Choose a Plan
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Team Starter */}
            <button
              type="button"
              onClick={() => setTier('team_starter')}
              disabled={creating}
              className={`cursor-pointer rounded-xl border-2 p-4 text-left transition-all ${
                tier === 'team_starter'
                  ? 'border-teal bg-teal/5 ring-1 ring-teal'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-navy">Team Starter</p>
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    tier === 'team_starter'
                      ? 'border-teal bg-teal'
                      : 'border-gray-300'
                  }`}
                >
                  {tier === 'team_starter' && (
                    <svg viewBox="0 0 16 16" className="h-full w-full text-white">
                      <path
                        fill="currentColor"
                        d="M6.5 11.5L3 8l1-1 2.5 2.5L12 4l1 1-6.5 6.5z"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xl font-bold text-navy">
                $99<span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <ul className="mt-3 space-y-1 text-xs text-gray-600">
                <li>Up to 5 members</li>
                <li>200 scans/month</li>
                <li>All Tier 1 + Tier 2 features</li>
              </ul>
            </button>

            {/* Team Pro */}
            <button
              type="button"
              onClick={() => setTier('team_pro')}
              disabled={creating}
              className={`cursor-pointer rounded-xl border-2 p-4 text-left transition-all ${
                tier === 'team_pro'
                  ? 'border-teal bg-teal/5 ring-1 ring-teal'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-navy">Team Pro</p>
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    tier === 'team_pro'
                      ? 'border-teal bg-teal'
                      : 'border-gray-300'
                  }`}
                >
                  {tier === 'team_pro' && (
                    <svg viewBox="0 0 16 16" className="h-full w-full text-white">
                      <path
                        fill="currentColor"
                        d="M6.5 11.5L3 8l1-1 2.5 2.5L12 4l1 1-6.5 6.5z"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xl font-bold text-navy">
                $199<span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <ul className="mt-3 space-y-1 text-xs text-gray-600">
                <li>Up to 20 members</li>
                <li>500 scans/month</li>
                <li>All Tier 1 + Tier 2 features</li>
              </ul>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="w-full rounded-lg bg-teal px-6 py-3 text-sm font-semibold text-white hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {creating ? 'Creating Team...' : 'Create Team & Subscribe'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TeamPage() {
  return (
    <Suspense>
      <TeamContent />
    </Suspense>
  );
}

function TeamContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [team, setTeam] = useState<TeamWithCount | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole>('member');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Check for checkout success param
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setCheckoutSuccess(true);
    }
  }, [searchParams]);

  // Fetch all team data
  const fetchTeamData = useCallback(async () => {
    if (!user) return;

    setDataLoading(true);
    setError(null);

    try {
      // Fetch team info
      const teamRes = await fetch('/api/teams');
      if (!teamRes.ok) throw new Error('Failed to load team info');
      const teamData = await teamRes.json();

      if (!teamData.team) {
        setTeam(null);
        setDataLoading(false);
        return;
      }

      setTeam(teamData.team as TeamWithCount);

      // Fetch members, invites, and usage in parallel
      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/teams/members'),
        fetch('/api/teams/invite'),
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members ?? []);

        // Determine current user's role from members list
        const currentMember = (membersData.members as TeamMember[])?.find(
          (m) => m.user_id === user.id
        );
        if (currentMember) {
          setCurrentUserRole(currentMember.role);
        }
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvites(invitesData.invites ?? []);
      }

      // Compute usage from team data (tier limits)
      // We fetch scan usage from the team scan counts via a separate call
      try {
        const usageRes = await fetch(`/api/teams/members`);
        if (usageRes.ok) {
          // Usage is derived from team tier limits
          const tierLimits: Record<string, number> = {
            team_starter: 200,
            team_pro: 500,
          };
          const limit = tierLimits[teamData.team.subscription_tier] ?? 200;
          // For now, we use the team info; actual scan count is on the server
          setUsage({ used: 0, limit });
        }
      } catch {
        // Usage fetch is non-critical
      }

      // Try to get actual team scan usage
      try {
        const scanUsageRes = await fetch('/api/teams');
        if (scanUsageRes.ok) {
          const scanUsageData = await scanUsageRes.json();
          if (scanUsageData.team) {
            const tierLimits: Record<string, number> = {
              team_starter: 200,
              team_pro: 500,
            };
            const limit =
              tierLimits[scanUsageData.team.subscription_tier] ?? 200;
            setUsage({ used: scanUsageData.team.scan_count ?? 0, limit });
          }
        }
      } catch {
        // Silently handle
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTeamData();
    }
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, fetchTeamData, router]);

  // Handlers
  const handleRemoveMember = async (memberId: string) => {
    const res = await fetch('/api/teams/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to remove member');
    }

    // Refresh member list
    setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
  };

  const handleInvite = async (email: string, role: TeamRole) => {
    const res = await fetch('/api/teams/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to send invite');
    }

    const data = await res.json();
    setInvites((prev) => [data.invite, ...prev]);
  };

  const handleRevoke = async (inviteId: string) => {
    const res = await fetch('/api/teams/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to revoke invite');
    }

    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  // Loading
  if (authLoading || (user && dataLoading)) {
    return <PageSkeleton />;
  }

  // Error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-md">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-red-800">
            Something went wrong
          </h3>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <button
            onClick={fetchTeamData}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // No team — show create form
  if (!team) {
    return (
      <div className="py-8">
        <CreateTeamForm />
      </div>
    );
  }

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
  const tierDisplayName =
    team.subscription_tier === 'team_starter' ? 'Team Starter' : 'Team Pro';

  return (
    <div className="space-y-6">
      {/* Checkout Success Banner */}
      {checkoutSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 text-green-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">
                Team subscription activated!
              </p>
              <p className="text-sm text-green-600">
                Your team is ready to go. Start inviting members below.
              </p>
            </div>
            <button
              onClick={() => setCheckoutSuccess(false)}
              className="shrink-0 text-green-400 hover:text-green-600 cursor-pointer"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Team Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">{team.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-semibold text-navy">
              {tierDisplayName}
            </span>
            <span className="text-sm text-gray-500">
              {members.length} of {team.max_members} members
            </span>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Team Usage
        </h2>
        <TeamUsageBar
          used={usage?.used ?? 0}
          limit={usage?.limit ?? 200}
          tierName={team.subscription_tier}
        />
      </div>

      {/* Members */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">Team Members</h2>
        <TeamMemberList
          members={members}
          currentUserRole={currentUserRole}
          onRemove={handleRemoveMember}
        />
      </div>

      {/* Invites */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy">
          {canManage ? 'Invite Team Members' : 'Pending Invites'}
        </h2>
        <TeamInviteForm
          invites={invites}
          onInvite={handleInvite}
          onRevoke={handleRevoke}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
