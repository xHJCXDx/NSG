import { useState } from 'react';
import { BookOpen, ChevronDown, Shield, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../../shared/i18n/translations';

interface StandardRow {
  name: string;
  description: string;
}

interface SectionProps {
  title: string;
  description: string;
  standards: StandardRow[];
  indicatorClass: string;
  icon: typeof Shield;
  defaultOpen?: boolean;
}

function ComplianceSection({ title, description, standards, indicatorClass, icon: Icon, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-edge-card last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between py-4 text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${indicatorClass}`}
            aria-hidden="true"
          />
          <Icon className="h-4 w-4 text-content-secondary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-content-heading">{title}</p>
            <p className="text-xs text-content-muted">{description}</p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-content-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="mb-4 overflow-hidden rounded-lg border border-edge">
          <table className="w-full text-sm">
            <tbody>
              {standards.map((std) => (
                <tr key={std.name} className="border-b border-edge last:border-0 hover:bg-surface-hover">
                  <td className="py-2.5 pl-4 pr-3 font-medium text-content-primary align-top w-2/5">
                    {std.name}
                  </td>
                  <td className="py-2.5 pr-4 text-content-secondary align-top">
                    {std.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ComplianceCard() {
  const t = useTranslation();
  const c = t.settings.compliance;
  const s = c.standards;

  const implementedStandards: StandardRow[] = [
    { name: s.ley25326.name, description: s.ley25326.description },
    { name: s.convention108.name, description: s.convention108.description },
  ];

  const alignedStandards: StandardRow[] = [
    { name: s.ley26388.name, description: s.ley26388.description },
    { name: s.ley25520.name, description: s.ley25520.description },
    { name: s.budapest.name, description: s.budapest.description },
    { name: s.gdpr.name, description: s.gdpr.description },
    { name: s.res710.name, description: s.res710.description },
    { name: s.owaspSession.name, description: s.owaspSession.description },
  ];

  const referenceStandards: StandardRow[] = [
    { name: s.iso27037.name, description: s.iso27037.description },
    { name: s.iso27701.name, description: s.iso27701.description },
    { name: s.nistCsf.name, description: s.nistCsf.description },
    { name: s.mitreAttack.name, description: s.mitreAttack.description },
  ];

  return (
    <div className="glass-card p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-content-heading">{c.title}</h2>
        <p className="mt-1 text-sm text-content-secondary">{c.description}</p>
      </div>

      <ComplianceSection
        title={c.implemented.title}
        description={c.implemented.description}
        standards={implementedStandards}
        indicatorClass="bg-emerald-400"
        icon={ShieldCheck}
        defaultOpen
      />
      <ComplianceSection
        title={c.aligned.title}
        description={c.aligned.description}
        standards={alignedStandards}
        indicatorClass="bg-blue-400"
        icon={Shield}
      />
      <ComplianceSection
        title={c.reference.title}
        description={c.reference.description}
        standards={referenceStandards}
        indicatorClass="bg-gray-400"
        icon={BookOpen}
      />
    </div>
  );
}
