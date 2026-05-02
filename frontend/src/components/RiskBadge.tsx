import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface RiskBadgeProps {
  score: number;
  className?: string;
}

export default function RiskBadge({ score, className }: RiskBadgeProps) {
  let level = 'SAFE';
  let color = 'text-primary';
  let bgColor = 'bg-primary/10';
  let borderColor = 'border-primary/20';
  let Icon = ShieldCheck;

  if (score > 80) {
    level = 'CRITICAL';
    color = 'text-error';
    bgColor = 'bg-error/10';
    borderColor = 'border-error/30';
    Icon = ShieldAlert;
  } else if (score > 50) {
    level = 'SUSPICIOUS';
    color = 'text-tertiary';
    bgColor = 'bg-tertiary/10';
    borderColor = 'border-tertiary/30';
    Icon = AlertTriangle;
  }

  return (
    <div className={cn(
      "px-4 py-2 rounded-2xl border flex items-center gap-3 shadow-sm transition-all",
      bgColor, borderColor, className
    )}>
      <Icon className={cn("w-4 h-4", color)} />
      <div className="flex flex-col">
        <span className={cn("text-[10px] font-mono font-black uppercase tracking-widest", color)}>
          {level}
        </span>
        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
          Risk_Score: {score}%
        </span>
      </div>
    </div>
  );
}
