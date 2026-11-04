import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { ROLE_LABELS } from '@/lib/labels'
import { Badge } from '@/components/ui'

const NAV_ITEMS = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/empleados', label: 'Empleados', icon: Users, end: false },
  { to: '/importar', label: 'Importar', icon: Upload, end: false },
  { to: '/catalogos', label: 'Catálogos', icon: Building2, end: false },
]

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut, mode } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-300">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 font-black text-slate-950 shadow-lg shadow-amber-400/20">
          C
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Confecat S.A.</p>
          <p className="text-[11px] text-slate-400">Gestión de personal</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-4.5 w-4.5 shrink-0 transition',
                    isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300',
                  )}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-3">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          {mode === 'demo' ? (
            <span>Modo demo — datos locales</span>
          ) : (
            <span>Conexión segura con Supabase</span>
          )}
        </div>

        {user && (
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">
                {initials(user.nombre)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.nombre}</p>
                <p className="truncate text-[10px] text-slate-400">{user.email}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <Badge tone={user.rol === 'admin' ? 'amber' : user.rol === 'rrhh' ? 'blue' : 'slate'}>
                {ROLE_LABELS[user.rol]}
              </Badge>
              <button
                type="button"
                onClick={async () => {
                  await signOut()
                  navigate('/login', { replace: true })
                }}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Salir
              </button>
            </div>
          </div>
        )}
        <p className="px-1 text-center text-[10px] text-slate-600">v1.0 · Legajo digital</p>
      </div>
    </div>
  )
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { mode } = useAuth()
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1)

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-2xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-sm font-semibold text-slate-800 lg:hidden">Confecat S.A.</span>
              <span className="hidden text-xs text-slate-500 sm:block">{todayLabel}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {mode === 'demo' && (
                <Badge tone="amber" className="hidden sm:inline-flex">
                  Modo demo
                </Badge>
              )}
              <Badge tone="green" className="hidden sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Sistema operativo
              </Badge>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
