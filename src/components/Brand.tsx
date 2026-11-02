import {
  GraduationCap, Briefcase, Coins, FirstAidKit, ForkKnife, Storefront, Buildings, Truck, Factory, Plant, SoccerBall, UsersThree, Cpu, MusicNotes, Bank, House, Scales, SquaresFour, type Icon,
} from '@phosphor-icons/react';
export const CATEGORY_ICONS: Record<string, Icon> = { GraduationCap, Briefcase, Coins, FirstAidKit, ForkKnife, Storefront, Buildings, Truck, Factory, Plant, SoccerBall, UsersThree, Cpu, MusicNotes, Bank, House, Scales };
export function CatIcon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  const I = CATEGORY_ICONS[name] || SquaresFour;
  return <I size={size} weight="duotone" className={className} aria-hidden="true" />;
}
export function Mark({ size = 28 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="#13252A" />
    <path d="M14 44c8-3 12-15 18-15s10 12 18 15" fill="none" stroke="#E09F3E" strokeWidth="5" strokeLinecap="round" />
    <path d="M14 33c8-3 12-13 18-13s10 10 18 13" fill="none" stroke="#FFF3B0" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    <circle cx="32" cy="48" r="3.5" fill="#E09F3E" />
  </svg>;
}
export function Wordmark() {
  return <span className="flex items-center gap-2"><Mark /><span className="font-display text-[17px] font-semibold tracking-tight">Byawastha<span className="ml-1.5 align-middle text-[11px] font-medium text-muted">व्यवस्था</span></span></span>;
}
