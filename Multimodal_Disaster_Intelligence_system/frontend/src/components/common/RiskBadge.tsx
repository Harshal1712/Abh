import React from 'react';
import type { RiskLevel, EventStatus } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel | EventStatus | string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md', pulse = false }) => {
  const getStyle = () => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MODERATE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING_REVIEW':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'APPROVED':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'ACTIVE_ALERT':
      case 'ACTIVE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MONITORING':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'VERIFIED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'UNVERIFIED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getDotColor = () => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-amber-500';
      case 'MODERATE': return 'bg-yellow-500';
      case 'LOW': return 'bg-emerald-500';
      case 'PENDING_REVIEW': return 'bg-indigo-500';
      case 'APPROVED': return 'bg-sky-500';
      case 'ACTIVE_ALERT':
      case 'ACTIVE': return 'bg-rose-500';
      case 'MONITORING': return 'bg-sky-500';
      default: return 'bg-slate-400';
    }
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3.5 py-1.5 text-sm font-semibold' : 'px-2.5 py-1 text-xs font-medium';

  const labelText = typeof level === 'string' ? level.replace('_', ' ') : String(level);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs transition-all whitespace-nowrap ${getStyle()} ${sizeClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${getDotColor()} ${pulse && (level === 'CRITICAL' || level === 'ACTIVE' || level === 'PENDING_REVIEW') ? 'animate-ping' : ''}`} />
      <span>{labelText}</span>
    </span>
  );
};
