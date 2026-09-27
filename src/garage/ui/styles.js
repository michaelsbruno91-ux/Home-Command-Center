// Shared Tailwind class strings for the overlay: translucent "glass" panels in
// the app's existing palette (see tailwind.config.js / index.css tokens).

export const panel = 'rounded-xl border border-white/10 bg-[#111827]/80 backdrop-blur-md shadow-2xl shadow-black/40 text-text-primary'

export const chip = (active) =>
  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border backdrop-blur-md transition-colors ${
    active
      ? 'bg-amber-400/15 border-amber-400/60 text-amber-300'
      : 'bg-[#111827]/70 border-white/10 text-slate-300 hover:bg-white/10'
  }`

export const btn = (variant = 'ghost') =>
  ({
    ghost: 'px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/10 border border-white/10 transition-colors',
    primary: 'px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 text-black hover:bg-amber-300 transition-colors',
    danger: 'px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-300 hover:bg-red-500/15 border border-red-400/30 transition-colors',
  })[variant]

export const STATUS_STYLE = {
  overdue: 'bg-red-500 text-white',
  'due-soon': 'bg-orange-400 text-black',
  ok: 'bg-emerald-500/20 text-emerald-300',
}

export const STATUS_LABEL = { overdue: 'Overdue', 'due-soon': 'Due soon', ok: 'OK' }
