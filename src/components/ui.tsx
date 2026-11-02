import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, WarningCircle, CheckCircle, Info } from '@phosphor-icons/react';
import { useUI } from '../lib/store';

export function Skeleton({ className = '' }: { className?: string }) { return <div className={'skeleton ' + className} aria-hidden="true" />; }
export function SkeletonRows({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return <div className="space-y-2 p-4" role="status" aria-label="Loading">{Array.from({ length: rows }).map((_, i) => (
    <div key={i} className="flex gap-3">{Array.from({ length: cols }).map((_, j) => <Skeleton key={j} className={'h-5 ' + (j === 0 ? 'w-1/3' : 'flex-1')} />)}</div>))}</div>;
}
export function Empty({ title, body, action, icon }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return <div className="flex flex-col items-center text-center px-6 py-14">
    <div className="mb-4 grid h-12 w-12 place-items-center rounded-full border border-dashed border-line text-muted">{icon}</div>
    <h3 className="font-display text-lg font-semibold">{title}</h3>
    {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>;
}
export function ErrorBox({ error, retry }: { error: string; retry?: () => void }) {
  return <div role="alert" className="m-4 flex items-start gap-3 rounded-panel border border-danger/40 bg-danger/5 p-4 text-sm">
    <WarningCircle size={20} className="mt-0.5 shrink-0 text-danger" weight="duotone" />
    <div className="flex-1"><p className="font-semibold text-danger">That didn't load</p><p className="text-ink-2">{error}</p></div>
    {retry && <button className="btn-line h-8" onClick={retry}>Try again</button>}
  </div>;
}
export function Field({ label, hint, error, children, htmlFor, required }: { label: string; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string; required?: boolean }) {
  return <div className="space-y-1">
    <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink-2">{label}{required && <span className="text-danger"> *</span>}</label>
    {children}
    {error ? <p className="text-xs font-medium text-danger" role="alert">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
  </div>;
}
export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea,button:not([data-close])')?.focus(), 30);
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => { clearTimeout(t); window.removeEventListener('keydown', k); prev?.focus?.(); };
  }, [open, onClose]);
  return <AnimatePresence>{open && (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-[#081114]/50" onClick={onClose} />
      <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={'glass relative w-full rounded-t-sheet sm:rounded-sheet max-h-[92vh] flex flex-col ' + (wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}
        initial={{ y: 24, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 16, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button data-close className="btn-ghost h-8 w-8 px-0" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 bg-surface/70">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line/70 px-5 py-3">{footer}</div>}
      </motion.div>
    </motion.div>)}</AnimatePresence>;
}
export function Confirm({ open, onClose, onConfirm, title, body, confirmText = 'Delete', busy }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmText?: string; busy?: boolean }) {
  return <Modal open={open} onClose={onClose} title={title} footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : confirmText}</button></>}>
    <div className="text-sm text-ink-2">{body}</div>
  </Modal>;
}
export function Toaster() {
  const { toasts, dismiss } = useUI();
  return <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
    <AnimatePresence>{toasts.map((t) => (
      <motion.div key={t.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }}
        className="glass pointer-events-auto flex items-start gap-2 rounded-panel px-3.5 py-3 text-sm">
        {t.tone === 'err' ? <WarningCircle size={18} weight="fill" className="text-danger shrink-0" /> : t.tone === 'ok' ? <CheckCircle size={18} weight="fill" className="text-ok shrink-0" /> : <Info size={18} weight="fill" className="text-primary shrink-0" />}
        <span className="flex-1">{t.text}</span>
        <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted hover:text-ink"><X size={14} /></button>
      </motion.div>))}</AnimatePresence>
  </div>;
}
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
    className={'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ' + (checked ? 'bg-brand border-brand' : 'bg-surface-2 border-line')}>
    <span className={'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ' + (checked ? 'translate-x-5' : 'translate-x-1')} />
  </button>;
}
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { key: T; label: ReactNode }[] }) {
  return <div role="tablist" className="flex gap-1 no-scrollbar overflow-x-auto overflow-y-hidden border-b border-line">
    {items.map((it) => <button key={it.key} role="tab" aria-selected={value === it.key} onClick={() => onChange(it.key)}
      className={'relative -mb-px whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors ' + (value === it.key ? 'text-ink' : 'text-muted hover:text-ink-2')}>
      {it.label}{value === it.key && <motion.span layoutId={'tab-underline'} className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand" />}
    </button>)}
  </div>;
}
export function PageHead({ eyebrow, title, desc, actions }: { eyebrow?: string; title: string; desc?: ReactNode; actions?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>{eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}<h1 className="font-display text-[26px] leading-tight font-semibold tracking-tight">{title}</h1>{desc && <p className="mt-1 max-w-2xl text-sm text-muted">{desc}</p>}</div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>;
}
