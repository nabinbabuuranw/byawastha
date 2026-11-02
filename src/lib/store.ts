import { create } from 'zustand';
export type Theme = 'light' | 'dark' | 'system';
export type Accent = 'saffron' | 'teal' | 'auburn' | 'vanilla';
interface UI {
  theme: Theme; accent: Accent; paletteOpen: boolean; navOpen: boolean; toasts: { id: number; text: string; tone: 'ok' | 'err' | 'info' }[];
  setTheme: (t: Theme) => void; setAccent: (a: Accent) => void; setPalette: (o: boolean) => void; setNav: (o: boolean) => void;
  toast: (text: string, tone?: 'ok' | 'err' | 'info') => void; dismiss: (id: number) => void;
}
const apply = (t: Theme) => { const d = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', d); };
let tid = 0;
export const useUI = create<UI>((set, get) => ({
  theme: ((typeof localStorage !== 'undefined' && localStorage.getItem('bw-theme')) as Theme) || 'system',
  accent: ((typeof localStorage !== 'undefined' && localStorage.getItem('bw-accent')) as Accent) || 'saffron',
  paletteOpen: false, navOpen: false, toasts: [],
  setTheme: (t) => { localStorage.setItem('bw-theme', t); apply(t); set({ theme: t }); },
  setAccent: (a) => { localStorage.setItem('bw-accent', a); document.documentElement.dataset.accent = a; set({ accent: a }); },
  setPalette: (o) => set({ paletteOpen: o }), setNav: (o) => set({ navOpen: o }),
  toast: (text, tone = 'ok') => { const id = ++tid; set({ toasts: [...get().toasts, { id, text, tone }] }); setTimeout(() => get().dismiss(id), 4200); },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
if (typeof window !== 'undefined') matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (useUI.getState().theme === 'system') apply('system'); });
export const isDark = () => document.documentElement.classList.contains('dark');
