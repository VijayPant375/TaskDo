import { Crown } from 'lucide-react';

interface PremiumBadgeProps {
  size?: 'sm' | 'md';
}

export function PremiumBadge({ size = 'md' }: PremiumBadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1 text-sm';
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white ${sizeClass}`}
    >
      <Crown className={iconClass} />
      Premium
    </span>
  );
}
