import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ToastProvider } from '@/components/Toast'
import { Layout } from '@/components/Layout'
import { Spinner } from '@/components/ui'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { EmployeesPage } from '@/pages/Employees'
import { ImportPage } from '@/pages/Import'
import { CatalogsPage } from '@/pages/Catalogs'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950">
      <div className="flex flex-col items-center gap-4 text-slate-300">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-400 text-2xl font-black text-slate-950">
          C
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Spinner className="h-4 w-4" />
          Cargando Confecat…
        </div>
      </div>
    </div>
  )
}

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return <Layout />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="/empleados" element={<EmployeesPage />} />
                <Route path="/importar" element={<ImportPage />} />
                <Route path="/catalogos" element={<CatalogsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
