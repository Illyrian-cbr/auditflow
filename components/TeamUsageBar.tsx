'use client';

interface TeamUsageBarProps {
  used: number;
  limit: number;
  tierName: string;
}

export default function TeamUsageBar({ used, limit, tierName }: TeamUsageBarProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 100;
  const atLimit = used >= limit;

  const tierDisplayName = tierName === 'team_starter' ? 'Team Starter' : 'Team Pro';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-navy">
          {used} of {limit} scans used this period
        </span>
        <span className="inline-flex items-center rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-semibold text-teal">
          {tierDisplayName}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            atLimit ? 'bg-red-500' : 'bg-teal'
          }`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${used} of ${limit} scans used`}
        />
      </div>

      {atLimit && (
        <p className="mt-2 text-xs text-red-600 font-medium">
          Scan limit reached for this billing period.
        </p>
      )}
    </div>
  );
}
