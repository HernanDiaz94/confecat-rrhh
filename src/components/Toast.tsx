import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  tone: ToastTone
  title: string
  description?: string
}

interface ToastContextValue {
  toast: (input: { tone?: ToastTone; title: string; description?: string }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    ({ tone = 'info', title, description }: { tone?: ToastTone; title: string; description?: string }) => {
      const id = crypto.randomUUID()
      setItems((current) => [...current.slice(-3), { id, tone, title, description }])
      window.setTimeout(() => remove(id), 5000)
    },
    [remove],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-3.5 shadow-lg',
              item.tone === 'success' && 'border-emerald-200',
              item.tone === 'error' && 'border-rose-200',
              item.tone === 'info' && 'border-slate-200',
            )}
          >
            <div
              className={cn(
                'mt-0.5 shrink-0',
                item.tone === 'success' && 'text-emerald-600',
                item.tone === 'error' && 'text-rose-600',
                item.tone === 'info' && 'text-sky-600',
              )}
            >
              {item.tone === 'success' && <CheckCircle2 className="h-5 w-5" />}
              {item.tone === 'error' && <XCircle className="h-5 w-5" />}
              {item.tone === 'info' && <Info className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Cerrar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>.')
  return context
}
