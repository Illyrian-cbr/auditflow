'use client';

import { useState } from 'react';
import type { TeamInvite, TeamRole } from '@/types';

interface TeamInviteFormProps {
  invites: TeamInvite[];
  onInvite: (email: string, role: TeamRole) => void;
  onRevoke: (inviteId: string) => void;
  canManage: boolean;
}

function formatExpiry(dateStr: string): string {
  const expiry = new Date(dateStr);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Expired';
  if (diffDays === 1) return 'Expires tomorrow';
  return `Expires in ${diffDays} days`;
}

function RoleBadge({ role }: { role: TeamRole }) {
  const styles: Record<string, string> = {
    admin: 'bg-teal/10 text-teal',
    member: 'bg-gray-100 text-gray-600',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        styles[role] || styles.member
      }`}
    >
      {role}
    </span>
  );
}

export default function TeamInviteForm({
  invites,
  onInvite,
  onRevoke,
  canManage,
}: TeamInviteFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setSending(true);
    try {
      await onInvite(trimmedEmail, role);
      setEmail('');
      setRole('member');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send invite.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setRevokingId(inviteId);
    try {
      await onRevoke(inviteId);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      {canManage && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="invite-email" className="sr-only">
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                disabled={sending}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="sr-only">
                Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                disabled={sending}
                className="w-full sm:w-auto rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-navy focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal disabled:opacity-50 cursor-pointer"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="shrink-0 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? 'Sending...' : 'Send Invite'}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </form>
      )}

      {/* Pending Invites List */}
      {invites.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Pending Invites
          </h4>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <svg
                      className="h-4 w-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">
                      {invite.email}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={invite.role} />
                      <span className="text-xs text-gray-400">
                        {formatExpiry(invite.expires_at)}
                      </span>
                    </div>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRevoke(invite.id)}
                    disabled={revokingId === invite.id}
                    className="shrink-0 rounded-md bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {revokingId === invite.id ? 'Revoking...' : 'Revoke'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {invites.length === 0 && !canManage && (
        <p className="text-sm text-gray-400 text-center py-4">
          No pending invites.
        </p>
      )}
    </div>
  );
}
