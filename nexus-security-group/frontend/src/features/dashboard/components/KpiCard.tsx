import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  className?: string;
}

export function KpiCard({ label, value, icon: Icon, color, className = '' }: KpiCardProps) {
  return (
    <div className={`glass-card p-6 flex items-start justify-between group ${className}`}>
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">{label}</p>
        <h3 className="text-3xl font-bold text-white">{value}</h3>
      </div>
      <div className={`w-12 h-12 rounded-xl bg-${color}-500/20 flex items-center justify-center border border-${color}-500/30 group-hover:scale-110 transition-transform`}>
        <Icon aria-hidden="true" className={`w-6 h-6 text-${color}-400`} />
      </div>
    </div>
  );
}
