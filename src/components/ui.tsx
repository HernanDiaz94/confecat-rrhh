import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Botón ─────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus-visible:outline-slate-900 disabled:bg-slate-400',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-slate-400 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-slate-400',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:outline-rose-600 disabled:bg-rose-300',
  success:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-emerald-600 disabled:bg-emerald-300',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-sm',
  icon: 'h-9 w-9 justify-center',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}) {
  return (
    <button
      className={cn(
        'inline-flex select-none items-center rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

/* ── Formularios ───────────────────────────────────────────────────── */

const controlBase =
  'w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, 'h-10', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, 'min-h-20 py-2 leading-relaxed', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, 'h-10 cursor-pointer pr-8', className)} {...props}>
      {children}
    </select>
  )
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] leading-tight text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] leading-tight font-medium text-rose-600">{error}</p>}
    </div>
  )
}

/* ── Tarjetas y badges ─────────────────────────────────────────────── */

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...props}>
      {children}
    </div>
  )
}

type BadgeTone = 'slate' | 'green' | 'amber' | 'rose' | 'blue' | 'violet'

const badgeTones: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export function Badge({
  tone = 'slate',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ── Modal ─────────────────────────────────────────────────────────── */

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: keyof typeof modalSizes
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm sm:p-6">
      <div
        className={cn(
          'my-4 w-full animate-[modal-in_.15s_ease-out] rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5',
          modalSizes[size],
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/* ── Estados ───────────────────────────────────────────────────────── */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon && <div className="rounded-full bg-slate-100 p-3 text-slate-400">{icon}</div>}
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {description && <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
