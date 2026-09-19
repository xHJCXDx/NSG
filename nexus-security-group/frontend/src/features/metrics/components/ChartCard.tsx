interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, children, className = '' }: ChartCardProps) {
  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-content-heading">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-content-secondary">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
