interface RiskBadgeProps {
  score: 'low' | 'medium' | 'high';
}

const config: Record<
  RiskBadgeProps['score'],
  { label: string; className: string }
> = {
  low: {
    label: 'Low Risk',
    className: 'bg-green-100 text-green-800',
  },
  medium: {
    label: 'Medium Risk',
    className: 'bg-yellow-100 text-yellow-800',
  },
  high: {
    label: 'High Risk',
    className: 'bg-red-100 text-red-800',
  },
};

export default function RiskBadge({ score }: RiskBadgeProps) {
  const { label, className } = config[score];

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
