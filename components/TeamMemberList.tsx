'use client';

import { useState } from 'react';
import type { TeamMember, TeamRole } from '@/types';

interface TeamMemberListProps {
  members: TeamMember[];
  currentUserRole: TeamRole;
  onRemove: (memberId: string) => void;
}

function RoleBadge({ role }: { role: TeamRole }) {
  const styles: Record<TeamRole, string> = {
    owner: 'bg-navy text-white',
    admin: 'bg-teal text-white',
    member: 'bg-gray-200 text-gray-700',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[role]}`}
    >
      {role}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Pending';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TeamMemberList({
  members,
  currentUserRole,
  onRemove,
}: TeamMemberListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleRemove = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      await onRemove(memberId);
    } finally {
      setRemovingId(null);
      setConfirmId(null);
    }
  };

  if (members.length === 0) {
    return (
      <div className="py-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
        <p className="mt-3 text-sm font-medium text-gray-500">
          No team members yet
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Invite your team to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Joined
            </th>
            {canManage && (
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {members.map((member) => {
            const isOwner = member.role === 'owner';
            const isSelf =
              removingId === null && confirmId === null; // placeholder; we check by role
            const showRemove =
              canManage && !isOwner && member.user_id !== undefined;

            return (
              <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-navy">
                  {member.name || 'Unnamed'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {member.email || '--'}
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={member.role} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatDate(member.joined_at)}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {showRemove ? (
                      confirmId === member.user_id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRemove(member.user_id)}
                            disabled={removingId === member.user_id}
                            className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {removingId === member.user_id
                              ? 'Removing...'
                              : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(member.user_id)}
                          className="rounded-md bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">--</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
