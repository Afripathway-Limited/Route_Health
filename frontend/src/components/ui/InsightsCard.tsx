'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { Sparkles, Clock, User, Trophy, AlertTriangle, Zap, Info, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Insight {
  type: 'warning' | 'success' | 'danger' | 'info';
  icon: string;
  title: string;
  description: string;
  action: string | null;
  action_url: string | null;
}

interface InsightsCardProps {
  from: string;
  to: string;
}

const iconMap: Record<string, React.ElementType> = {
  clock: Clock,
  user: User,
  trophy: Trophy,
  alert: AlertTriangle,
  zap: Zap,
  info: Info,
};

const borderColor: Record<string, string> = {
  warning: 'var(--warning)',
  success: 'var(--success)',
  danger: 'var(--danger)',
  info: 'var(--info)',
};

const iconBg: Record<string, string> = {
  warning: 'var(--warning-subtle)',
  success: 'var(--success-subtle)',
  danger: 'var(--danger-subtle)',
  info: 'var(--info-subtle)',
};

const iconColor: Record<string, string> = {
  warning: 'var(--warning)',
  success: 'var(--success)',
  danger: 'var(--danger)',
  info: 'var(--info)',
};

export function InsightsCard({ from, to }: InsightsCardProps) {
  const { data: insights, isLoading } = useQuery<Insight[]>({
    queryKey: ['analytics-insights', from, to],
    queryFn: () => get<Insight[]>('/analytics/insights', { from, to }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={15} style={{ color: 'var(--brand)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              AI Insights
            </h2>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Automated analysis of your operational data
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-[10px]" />
          ))
        ) : !insights?.length ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Sparkles size={24} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No insights available for this period</p>
          </div>
        ) : (
          insights.map((insight, i) => {
            const Icon = iconMap[insight.icon] ?? Info;
            return (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-[10px] transition-all"
                style={{
                  borderLeft: `3px solid ${borderColor[insight.type] ?? 'var(--border-subtle)'}`,
                  background: 'var(--bg-elevated)',
                }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-[8px] flex items-center justify-center"
                  style={{ background: iconBg[insight.type] }}
                >
                  <Icon size={14} style={{ color: iconColor[insight.type] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {insight.title}
                  </p>
                  <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {insight.description}
                  </p>
                  {insight.action && insight.action_url && (
                    <Link
                      href={insight.action_url}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold mt-1.5"
                      style={{ color: 'var(--brand)' }}
                    >
                      {insight.action}
                      <ExternalLink size={10} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
