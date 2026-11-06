import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Button, Card, Field, Input } from '@/components/ui'
import { useAuth, DEMO_PASSWORD, DEMO_USERS } from '@/lib/auth'
import { ROLE_LABELS } from '@/lib/labels'

export function LoginPage() {
  const { user, loading, signIn, mode } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(identifier, password)
      navigate('/', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 1px, transparent 1px, transparent 14px)',
          }}
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400 text-lg font-black text-slate-950 shadow-lg shadow-amber-400/20">
              C
            </div>
            <div>
              <p className="text-sm font-semibold">Confecat S.A.</p>
              <p className="text-[11px] text-slate-400">Gestión de personal</p>
            </div>
          </div>

          <h1 className="mt-14 max-w-md text-3xl font-semibold leading-tight tracking-tight">
            El legajo de cada trabajador,{' '}
            <span className="text-amber-400">ordenado y a un click.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            Sistema interno de administración de personal: altas, bajas, datos laborales y
            documentación de la planta, sin planillas sueltas ni versiones duplicadas.
          </p>

          <ul className="mt-10 space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-slate-300">
                <b className="font-semibold text-white">Plantilla única</b> con búsqueda por DNI,
                legajo o sector.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-slate-300">
                <b className="font-semibold text-white">Importación desde Excel</b> con validación de
                DNI, CUIL y duplicados fila por fila.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-slate-300">
                <b className="font-semibold text-white">Historial de cambios</b> y accesos por rol
                para cada dato sensible.
              </span>
            </li>
          </ul>
        </div>

        <p className="relative text-[11px] text-slate-500">
          Confecat S.A. · Uso interno · Los datos personales se tratan según la Ley 25.326.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 font-black text-amber-400">
              C
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Confecat S.A.</p>
              <p className="text-[11px] text-slate-500">Gestión de personal</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-500">
            Acceso exclusivo para el personal de administración y RRHH.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Usuario o email" htmlFor="identifier" required>
              <Input
                id="identifier"
                autoComplete="username"
                placeholder="admin@confecat.com"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoFocus
              />
            </Field>

            <Field label="Contraseña" htmlFor="password" required>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full justify-center" size="lg" loading={submitting}>
              <LogIn className="h-4 w-4" />
              Ingresar
            </Button>
          </form>

          {mode === 'demo' && (
            <Card className="mt-6 border-dashed border-amber-300 bg-amber-50/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                Modo demo · probá la aplicación
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-800/80">
                Contraseña para todos los usuarios: <b>{DEMO_PASSWORD}</b>. Hacé click en un perfil
                para completar el formulario.
              </p>
              <div className="mt-2.5 space-y-1.5">
                {DEMO_USERS.map((demoUser) => {
                  const username = demoUser.email.split('@')[0]
                  return (
                    <button
                      key={demoUser.email}
                      type="button"
                      onClick={() => {
                        setIdentifier(username)
                        setPassword(DEMO_PASSWORD)
                        setError(null)
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-left text-[11px] transition hover:border-amber-400 hover:bg-amber-100/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-800">
                          {demoUser.nombre}
                        </span>
                        <span className="block truncate font-mono text-slate-500">{username}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">
                        {ROLE_LABELS[demoUser.rol]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </Card>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
            ¿No tenés acceso? Solicitá tus credenciales al área de Administración de Personal.
          </p>
        </div>
      </div>
    </div>
  )
}
