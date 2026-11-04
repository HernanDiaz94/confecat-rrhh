import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react'
import type { ImportRowResult, ImportSummary } from '@/lib/types'
import { repo } from '@/lib/data'
import { useAllEmployees, useContractTypes, usePositions, useSectors } from '@/lib/queries'
import { useAuth, canManage } from '@/lib/auth'
import { useToast } from '@/components/Toast'
import { Badge, Button, Card, PageHeader, Spinner } from '@/components/ui'
import {
  downloadImportTemplate,
  exportImportErrors,
  parseImportFile,
  validateImportRows,
  type ParsedImport,
} from '@/lib/excel'
import { cn, formatDate, formatNumber } from '@/lib/utils'

const ACTION_META = {
  crear: { label: 'Crear', tone: 'green' as const },
  actualizar: { label: 'Actualizar', tone: 'blue' as const },
  omitir: { label: 'Omitir', tone: 'slate' as const },
  error: { label: 'Error', tone: 'rose' as const },
}

export function ImportPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const employeesQuery = useAllEmployees()
  const sectorsQuery = useSectors()
  const positionsQuery = usePositions()
  const contractsQuery = useContractTypes()

  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [updateExisting, setUpdateExisting] = useState(true)
  const [createMissing, setCreateMissing] = useState(true)
  const [filter, setFilter] = useState<'todos' | 'problemas' | 'listos'>('todos')
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const manage = canManage(user?.rol)
  const dataReady =
    employeesQuery.isSuccess &&
    sectorsQuery.isSuccess &&
    positionsQuery.isSuccess &&
    contractsQuery.isSuccess

  const results = useMemo<ImportRowResult[]>(() => {
    if (!parsed || !dataReady) return []
    return validateImportRows(parsed.rows, {
      employees: employeesQuery.data ?? [],
      sectors: sectorsQuery.data ?? [],
      positions: positionsQuery.data ?? [],
      contractTypes: contractsQuery.data ?? [],
      updateExisting,
      createMissing,
    })
  }, [parsed, dataReady, employeesQuery.data, sectorsQuery.data, positionsQuery.data, contractsQuery.data, updateExisting, createMissing])

  const counts = useMemo(() => {
    return {
      crear: results.filter((row) => row.action === 'crear').length,
      actualizar: results.filter((row) => row.action === 'actualizar').length,
      omitir: results.filter((row) => row.action === 'omitir').length,
      error: results.filter((row) => row.action === 'error').length,
      listos: results.filter((row) => row.action === 'crear' || row.action === 'actualizar').length,
      avisos: results.filter((row) => row.errors.length === 0 && row.warnings.length > 0).length,
    }
  }, [results])

  const visibleRows = useMemo(() => {
    if (filter === 'listos') {
      return results.filter((row) => row.action === 'crear' || row.action === 'actualizar')
    }
    if (filter === 'problemas') {
      return results.filter((row) => row.errors.length > 0 || row.warnings.length > 0)
    }
    return results
  }, [results, filter])

  async function handleFile(nextFile: File | undefined | null) {
    if (!nextFile) return
    if (!/\.(xlsx|xls|csv)$/i.test(nextFile.name)) {
      setParseError('El archivo debe ser .xlsx, .xls o .csv.')
      return
    }
    setParsing(true)
    setParseError(null)
    setSummary(null)
    try {
      const nextParsed = await parseImportFile(nextFile)
      if (nextParsed.rows.length === 0) {
        setParseError('El archivo no contiene filas de datos debajo de los encabezados.')
        setParsed(null)
      } else {
        setFile(nextFile)
        setParsed(nextParsed)
      }
    } catch (error) {
      setParsed(null)
      setParseError(error instanceof Error ? error.message : 'No pudimos leer el archivo.')
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    const ready = results.filter((row) => row.action === 'crear' || row.action === 'actualizar')
    if (ready.length === 0) return
    setImporting(true)
    try {
      const nextSummary = await repo.applyImport(
        ready.map((row) => row.input),
        { updateExisting, createMissing },
      )
      setSummary(nextSummary)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['audit'] }),
        queryClient.invalidateQueries({ queryKey: ['sectors'] }),
        queryClient.invalidateQueries({ queryKey: ['positions'] }),
      ])
      toast({
        tone: 'success',
        title: 'Importación finalizada',
        description: `${formatNumber(nextSummary.creados)} creados · ${formatNumber(nextSummary.actualizados)} actualizados${
          nextSummary.errores.length ? ` · ${nextSummary.errores.length} con error` : ''
        }.`,
      })
    } catch (error) {
      toast({
        tone: 'error',
        title: 'No se pudo importar',
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setFile(null)
    setParsed(null)
    setSummary(null)
    setParseError(null)
    setFilter('todos')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!manage) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <h2 className="mt-3 text-sm font-semibold text-slate-900">Acceso restringido</h2>
        <p className="mt-1 text-xs text-slate-500">
          Tu usuario tiene permisos de solo lectura. Pedile a un administrador que te habilite la
          importación de legajos.
        </p>
        <Link to="/empleados" className="mt-4 inline-block">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a empleados
          </Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Importar empleados"
        description="Cargá el listado desde Excel con validación previa: nada se guarda hasta que confirmes."
        actions={
          <Link to="/empleados">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Volver al listado
            </Button>
          </Link>
        }
      />

      {summary ? (
        <Card className="overflow-hidden">
          <div className="flex items-start gap-3 border-b border-slate-200 bg-emerald-50/60 p-5">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Importación completada</h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Los legajos ya están disponibles en el listado y en el panel.
              </p>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-4">
            {[
              { label: 'Creados', value: summary.creados, tone: 'text-emerald-600' },
              { label: 'Actualizados', value: summary.actualizados, tone: 'text-sky-600' },
              { label: 'Omitidos', value: summary.omitidos, tone: 'text-slate-600' },
              { label: 'Con error', value: summary.errores.length, tone: 'text-rose-600' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {item.label}
                </p>
                <p className={cn('mt-1 text-2xl font-semibold tabular-nums', item.tone)}>
                  {formatNumber(item.value)}
                </p>
              </div>
            ))}
          </div>
          {summary.errores.length > 0 && (
            <div className="mx-5 mb-5 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                {summary.errores.length} filas no se importaron
              </p>
              <ul className="mt-1.5 max-h-32 space-y-1 overflow-y-auto text-[11px] text-rose-700">
                {summary.errores.slice(0, 20).map((error, index) => (
                  <li key={`${error.fila}-${index}`}>
                    {error.fila ? `Fila ${error.fila}: ` : ''}
                    {error.detalle}
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => exportImportErrors(summary.errores)}
              >
                <Download className="h-3.5 w-3.5" />
                Descargar errores
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 p-4">
            <Button onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Importar otro archivo
            </Button>
            <Link to="/empleados">
              <Button variant="secondary">Ver empleados</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">1. Descargá la plantilla</h2>
                  <p className="text-[11px] text-slate-500">Una fila por empleado, sin tocar los encabezados.</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                <li>• Obligatorios: legajo, DNI, apellido, nombre, fecha de ingreso y sector.</li>
                <li>• Fechas en formato <b>dd/mm/aaaa</b>.</li>
                <li>• El CUIL se valida; si falta, se genera con prefijo 20.</li>
                <li>• Las filas con DNI o legajo repetido se informan antes de importar.</li>
              </ul>
              <Button variant="secondary" className="mt-3 w-full justify-center" onClick={downloadImportTemplate}>
                <FileSpreadsheet className="h-4 w-4" />
                Descargar plantilla .xlsx
              </Button>
            </Card>

            <Card
              className={cn(
                'flex flex-col items-center justify-center border-dashed p-6 text-center transition',
                dragging ? 'border-slate-900 bg-slate-50' : 'border-slate-300',
              )}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                void handleFile(event.dataTransfer.files?.[0])
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
              {parsing ? (
                <>
                  <Spinner className="h-6 w-6 text-slate-500" />
                  <p className="mt-2 text-xs text-slate-500">Leyendo el archivo…</p>
                </>
              ) : file && parsed ? (
                <>
                  <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
                  <p className="mt-2 max-w-full truncate text-sm font-semibold text-slate-900">{file.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {formatNumber(parsed.rows.length)} filas detectadas · {parsed.detectedColumns.length}{' '}
                    columnas reconocidas
                  </p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={reset}>
                    <X className="h-3.5 w-3.5" />
                    Quitar archivo
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-500">
                    <Upload className="h-5 w-5" />
                  </div>
                  <h2 className="mt-2 text-sm font-semibold text-slate-900">2. Subí el archivo completo</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Arrastralo acá o hacé click para elegirlo.
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">Formatos: .xlsx, .xls, .csv · hasta ~5.000 filas</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Elegir archivo
                  </Button>
                </>
              )}
            </Card>
          </div>

          {parseError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parsed && parsed.ignoredColumns.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Se ignoraron columnas que no reconocemos:{' '}
                <b>{parsed.ignoredColumns.join(', ')}</b>. Si contienen datos necesarios, avisanos para
                sumarlas al mapeo.
              </span>
            </div>
          )}

          {parsed && !dataReady && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Spinner className="h-4 w-4" />
              Cargando catálogos para validar…
            </div>
          )}

          {parsed && dataReady && (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">3. Revisá y confirmá</h2>
                  <p className="text-[11px] text-slate-500">
                    Nada se guarda hasta que confirmes. Podés corregir el Excel y volver a subirlo.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="green">{counts.crear} nuevos</Badge>
                  <Badge tone="blue">{counts.actualizar} actualizar</Badge>
                  {counts.omitir > 0 && <Badge tone="slate">{counts.omitir} omitir</Badge>}
                  {counts.error > 0 && <Badge tone="rose">{counts.error} con error</Badge>}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5">
                  <label className="flex cursor-pointer items-start gap-2 text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(event) => setUpdateExisting(event.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-slate-900"
                    />
                    <span>
                      <b className="font-semibold">Actualizar legajos existentes</b> si coinciden DNI o
                      legajo.
                      <span className="block text-slate-400">
                        Si lo desactivás, esas filas se omiten.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={createMissing}
                      onChange={(event) => setCreateMissing(event.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-slate-900"
                    />
                    <span>
                      <b className="font-semibold">Crear sectores y puestos faltantes</b>.
                      <span className="block text-slate-400">
                        Si lo desactivás, esas filas quedan con error.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
                  {[
                    { key: 'todos', label: `Todas (${results.length})` },
                    { key: 'listos', label: `Listas (${counts.listos})` },
                    { key: 'problemas', label: `Avisos (${counts.error + counts.avisos})` },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setFilter(option.key as typeof filter)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                        filter === option.key
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:bg-slate-100',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[26rem] overflow-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                    <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Fila</th>
                      <th className="px-3 py-2">Empleado</th>
                      <th className="px-3 py-2">DNI / Legajo</th>
                      <th className="px-3 py-2">Sector / Puesto</th>
                      <th className="px-3 py-2">Ingreso</th>
                      <th className="px-3 py-2">Acción</th>
                      <th className="px-3 py-2">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleRows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={cn(
                          'align-top',
                          row.action === 'error' ? 'bg-rose-50/40' : 'bg-white',
                        )}
                      >
                        <td className="px-3 py-2 tabular-nums text-slate-400">{row.rowNumber}</td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-800">
                            {row.input.apellido || '—'}, {row.input.nombre || '—'}
                          </p>
                          <p className="text-[10px] text-slate-400">{row.input.email ?? ''}</p>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-slate-600">
                          {row.input.dni || '—'}
                          <span className="block text-[10px] text-slate-400">
                            Legajo {row.input.legajo || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.input.sector ?? '—'}
                          <span className="block text-[10px] text-slate-400">
                            {row.input.puesto ?? 'Sin puesto'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{formatDate(row.input.fecha_ingreso)}</td>
                        <td className="px-3 py-2">
                          <Badge tone={ACTION_META[row.action].tone}>{ACTION_META[row.action].label}</Badge>
                        </td>
                        <td className="max-w-[18rem] px-3 py-2">
                          {row.errors.map((error, index) => (
                            <p key={`e-${index}`} className="text-rose-600">
                              • {error}
                            </p>
                          ))}
                          {row.warnings.map((warning, index) => (
                            <p key={`w-${index}`} className="text-amber-600">
                              • {warning}
                            </p>
                          ))}
                          {row.errors.length === 0 && row.warnings.length === 0 && (
                            <span className="text-slate-400">Sin observaciones</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visibleRows.length === 0 && (
                  <p className="px-4 py-8 text-center text-xs text-slate-400">
                    No hay filas para este filtro.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 p-4">
                <p className="max-w-md text-[11px] text-slate-500">
                  Se van a procesar <b>{counts.listos}</b> filas. Las filas con error quedan afuera y
                  podés corregirlas después.
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={reset}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleImport}
                    loading={importing}
                    disabled={counts.listos === 0}
                  >
                    <Upload className="h-4 w-4" />
                    Importar {counts.listos} {counts.listos === 1 ? 'fila' : 'filas'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
