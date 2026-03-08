import Link from 'next/link';

interface ScanCounterProps {
  used: number;
  limit: number;
}

export default function ScanCounter({ used, limit }: ScanCounterProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 100;
  const atLimit = used >= limit;

  let barColor: string;
  if (percentage > 80) {
    barColor = 'bg-red-500';
  } else if (percentage >= 50) {
    barColor = 'bg-yellow-500';
  } else {
    barColor = 'bg-green-500';
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-navy">
          {used} of {limit} scans used
        </span>
        {atLimit && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            Limit Reached
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${used} of ${limit} scans used`}
        />
      </div>

      {atLimit && (
        <div className="mt-2">
          <Link
            href="/dashboard/settings"
            className="text-sm font-medium text-teal hover:text-teal-dark transition-colors underline underline-offset-2"
          >
            Upgrade for more scans
          </Link>
        </div>
      )}
    </div>
  );
}
