import * as XLSX from 'xlsx'
import type {
  ContractType,
  Employee,
  ImportRowInput,
  ImportRowResult,
  ImportSummary,
  Position,
  Sector,
} from '@/lib/types'
import {
  buildCuil,
  formatDate,
  isValidCuil,
  isValidDni,
  normalizeKey,
  onlyDigits,
  parseDateToIso,
  parseNumber,
} from '@/lib/utils'

export const IMPORT_COLUMNS = [
  { key: 'legajo', label: 'Legajo', required: true, example: '101', hint: 'Número de legajo interno. Único.' },
  { key: 'dni', label: 'DNI', required: true, example: '30123456', hint: '7 u 8 dígitos, sin puntos.' },
  { key: 'cuil', label: 'CUIL', required: false, example: '20301234563', hint: '11 dígitos. Si falta, se genera con prefijo 20.' },
  { key: 'apellido', label: 'Apellido', required: true, example: 'Pérez', hint: '' },
  { key: 'nombre', label: 'Nombre', required: true, example: 'Juan', hint: '' },
  { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', required: false, example: '15/04/1988', hint: 'dd/mm/aaaa' },
  { key: 'fecha_ingreso', label: 'Fecha de ingreso', required: true, example: '01/03/2024', hint: 'dd/mm/aaaa' },
  { key: 'sector', label: 'Sector', required: true, example: 'Costura', hint: 'Debe coincidir con un sector existente.' },
  { key: 'puesto', label: 'Puesto', required: false, example: 'Costurera', hint: 'Debe coincidir con un puesto del sector.' },
  { key: 'categoria', label: 'Categoría', required: false, example: 'Oficial', hint: 'Texto libre.' },
  { key: 'tipo_contrato', label: 'Tipo de contrato', required: false, example: 'Permanente', hint: 'Catálogo de tipos de contrato.' },
  { key: 'jornada_horas', label: 'Jornada (horas)', required: false, example: '45', hint: 'Horas semanales.' },
  { key: 'sueldo_basico', label: 'Sueldo básico', required: false, example: '950000', hint: 'Solo números.' },
  { key: 'telefono', label: 'Teléfono', required: false, example: '11-5555-1234', hint: '' },
  { key: 'email', label: 'Email', required: false, example: 'juan.perez@correo.com', hint: '' },
  { key: 'banco', label: 'Banco', required: false, example: 'Galicia', hint: '' },
  { key: 'cbu', label: 'CBU', required: false, example: '0070123456789012345678', hint: '22 dígitos.' },
] as const

type ColumnKey = (typeof IMPORT_COLUMNS)[number]['key']

const EXTRA_ALIASES: Record<string, ColumnKey> = {
  'nro legajo': 'legajo',
  'n legajo': 'legajo',
  'numero legajo': 'legajo',
  'numero de legajo': 'legajo',
  documento: 'dni',
  'nro documento': 'dni',
  'n documento': 'dni',
  'dni/cuil': 'dni',
  nacimiento: 'fecha_nacimiento',
  'fecha nac': 'fecha_nacimiento',
  'fecha de nacimiento': 'fecha_nacimiento',
  ingreso: 'fecha_ingreso',
  'fecha alta': 'fecha_ingreso',
  'fecha de ingreso': 'fecha_ingreso',
  area: 'sector',
  'puesto/cargo': 'puesto',
  cargo: 'puesto',
  convenio: 'categoria',
  'categoria convenio': 'categoria',
  'tipo contrato': 'tipo_contrato',
  modalidad: 'tipo_contrato',
  horas: 'jornada_horas',
  jornada: 'jornada_horas',
  sueldo: 'sueldo_basico',
  basico: 'sueldo_basico',
  salario: 'sueldo_basico',
  celular: 'telefono',
  correo: 'email',
  mail: 'email',
  'correo electronico': 'email',
  'cbu/cvu': 'cbu',
  cvu: 'cbu',
}

const HEADER_LOOKUP = new Map<string, ColumnKey>()
for (const column of IMPORT_COLUMNS) {
  HEADER_LOOKUP.set(normalizeKey(column.key), column.key)
  HEADER_LOOKUP.set(normalizeKey(column.label), column.key)
}
for (const [alias, key] of Object.entries(EXTRA_ALIASES)) {
  HEADER_LOOKUP.set(normalizeKey(alias), key)
}

export interface ParsedImport {
  rows: ImportRowInput[]
  detectedColumns: string[]
  ignoredColumns: string[]
}

function resolveHeader(value: unknown): ColumnKey | null {
  return HEADER_LOOKUP.get(normalizeKey(String(value ?? ''))) ?? null
}

export async function parseImportFile(file: File): Promise<ParsedImport> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames.find((name) => normalizeKey(name).includes('empleado')) ?? workbook.SheetNames[0]
  if (!sheetName) throw new Error('El archivo no contiene hojas.')
  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: true,
  })

  const headerIndex = matrix
    .slice(0, 12)
    .findIndex((row) => row.some((cell) => resolveHeader(cell) !== null))
  if (headerIndex < 0) {
    throw new Error(
      'No encontramos los encabezados. Descargá la plantilla oficial y no modifiques la primera fila.',
    )
  }

  const headerRow = matrix[headerIndex]
  const mapping: { index: number; key: ColumnKey }[] = []
  const detected: string[] = []
  const ignored: string[] = []

  headerRow.forEach((cell, index) => {
    const key = resolveHeader(cell)
    const label = String(cell ?? '').trim()
    if (!label) return
    if (key) {
      mapping.push({ index, key })
      detected.push(label)
    } else {
      ignored.push(label)
    }
  })

  const rows: ImportRowInput[] = []
  for (let r = headerIndex + 1; r < matrix.length; r++) {
    const raw = matrix[r]
    if (!raw || raw.every((cell) => String(cell ?? '').trim() === '')) continue
    const values: Partial<Record<ColumnKey, unknown>> = {}
    for (const { index, key } of mapping) values[key] = raw[index]

    rows.push({
      rowNumber: r + 1,
      legajo: String(values.legajo ?? '').trim().replace(/\.0+$/, ''),
      dni: onlyDigits(String(values.dni ?? '')),
      cuil: onlyDigits(String(values.cuil ?? '')),
      apellido: String(values.apellido ?? '').trim(),
      nombre: String(values.nombre ?? '').trim(),
      fecha_nacimiento: parseDateToIso(values.fecha_nacimiento),
      fecha_ingreso: parseDateToIso(values.fecha_ingreso) ?? '',
      sector: String(values.sector ?? '').trim() || null,
      puesto: String(values.puesto ?? '').trim() || null,
      categoria: String(values.categoria ?? '').trim() || null,
      tipo_contrato: String(values.tipo_contrato ?? '').trim() || null,
      jornada_horas: parseNumber(values.jornada_horas),
      sueldo_basico: parseNumber(values.sueldo_basico),
      telefono: String(values.telefono ?? '').trim() || null,
      email: String(values.email ?? '').trim() || null,
      banco: String(values.banco ?? '').trim() || null,
      cbu: onlyDigits(String(values.cbu ?? '')) || null,
    })
  }

  return { rows, detectedColumns: detected, ignoredColumns: ignored }
}

export function validateImportRows(
  rows: ImportRowInput[],
  context: {
    employees: Employee[]
    sectors: Sector[]
    positions: Position[]
    contractTypes: ContractType[]
    updateExisting: boolean
    createMissing: boolean
  },
): ImportRowResult[] {
  const seenDni = new Map<string, number>()
  const seenLegajo = new Map<string, number>()
  const sectorKeys = new Set(context.sectors.map((sector) => normalizeKey(sector.nombre)))
  const positionKeys = new Set(
    context.positions.map((position) => `${position.sector_id}|${normalizeKey(position.nombre)}`),
  )
  const contractKeys = new Set(context.contractTypes.map((contract) => normalizeKey(contract.nombre)))

  return rows.map((input) => {
    const errors: string[] = []
    const warnings: string[] = []
    const dni = onlyDigits(input.dni)
    const legajo = input.legajo.trim()

    if (!legajo) errors.push('El legajo es obligatorio.')
    if (!input.apellido) errors.push('El apellido es obligatorio.')
    if (!input.nombre) errors.push('El nombre es obligatorio.')
    if (!dni) {
      errors.push('El DNI es obligatorio.')
    } else if (!isValidDni(dni)) {
      errors.push('El DNI debe tener 7 u 8 dígitos.')
    }

    let cuil = input.cuil
    if (!cuil) {
      if (isValidDni(dni)) {
        cuil = buildCuil('20', dni)
        warnings.push(`CUIL generado automáticamente: ${cuil}. Verificá el prefijo correcto.`)
      }
    } else if (!isValidCuil(cuil)) {
      errors.push('El CUIL no es válido (revisá los 11 dígitos y el verificador).')
    }

    if (!input.fecha_ingreso) {
      errors.push('La fecha de ingreso es obligatoria (dd/mm/aaaa).')
    } else if (Number.isNaN(new Date(input.fecha_ingreso).getTime())) {
      errors.push('La fecha de ingreso no es válida.')
    }

    if (input.fecha_nacimiento && Number.isNaN(new Date(input.fecha_nacimiento).getTime())) {
      errors.push('La fecha de nacimiento no es válida.')
    }

    if (!input.sector) {
      errors.push('El sector es obligatorio.')
    } else if (!sectorKeys.has(normalizeKey(input.sector)) && !context.createMissing) {
      errors.push(`El sector "${input.sector}" no existe.`)
    } else if (!sectorKeys.has(normalizeKey(input.sector)) && context.createMissing) {
      warnings.push(`Se creará el sector "${input.sector}".`)
    }

    if (input.puesto && input.sector) {
      const sector = context.sectors.find((item) => normalizeKey(item.nombre) === normalizeKey(input.sector ?? ''))
      const key = `${sector?.id ?? 'nuevo'}|${normalizeKey(input.puesto)}`
      if (sector && !positionKeys.has(key) && !context.createMissing) {
        warnings.push(`El puesto "${input.puesto}" no existe en el sector; se guardará sin puesto.`)
      } else if (sector && !positionKeys.has(key) && context.createMissing) {
        warnings.push(`Se creará el puesto "${input.puesto}".`)
      }
    }

    if (input.tipo_contrato && !contractKeys.has(normalizeKey(input.tipo_contrato))) {
      warnings.push(`El tipo de contrato "${input.tipo_contrato}" no está en el catálogo; se guardará vacío.`)
    }

    if (input.jornada_horas !== null && (input.jornada_horas <= 0 || input.jornada_horas > 60)) {
      warnings.push('La jornada debería estar entre 1 y 60 horas semanales.')
    }

    if (input.sueldo_basico !== null && input.sueldo_basico < 0) {
      errors.push('El sueldo no puede ser negativo.')
    }

    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      warnings.push('El email no tiene un formato válido.')
    }

    if (input.cbu && input.cbu.length !== 22) {
      warnings.push('El CBU debe tener 22 dígitos.')
    }

    if (dni) {
      const previous = seenDni.get(dni)
      if (previous) {
        errors.push(`DNI repetido en el archivo (también aparece en la fila ${previous}).`)
      } else {
        seenDni.set(dni, input.rowNumber)
      }
    }

    if (legajo) {
      const previous = seenLegajo.get(normalizeKey(legajo))
      if (previous) {
        errors.push(`Legajo repetido en el archivo (también aparece en la fila ${previous}).`)
      } else {
        seenLegajo.set(normalizeKey(legajo), input.rowNumber)
      }
    }

    const byDni = dni ? context.employees.find((employee) => onlyDigits(employee.dni) === dni) : undefined
    const byLegajo = legajo
      ? context.employees.find((employee) => normalizeKey(employee.legajo) === normalizeKey(legajo))
      : undefined

    if (byDni && byLegajo && byDni.id !== byLegajo.id) {
      errors.push(
        `El DNI pertenece a ${byDni.apellido}, ${byDni.nombre} (legajo ${byDni.legajo}) y el legajo a ${byLegajo.apellido}, ${byLegajo.nombre} (DNI ${byLegajo.dni}). Revisá los datos.`,
      )
    }

    let action: ImportRowResult['action'] = 'crear'
    if (errors.length > 0) {
      action = 'error'
    } else if (byDni || byLegajo) {
      action = context.updateExisting ? 'actualizar' : 'omitir'
      const existing = (byDni ?? byLegajo) as Employee
      if (byDni && normalizeKey(byDni.legajo) !== normalizeKey(legajo)) {
        warnings.push(`Se actualizará el legajo ${byDni.legajo} (coincide por DNI).`)
      }
      if (byLegajo && onlyDigits(byLegajo.dni) !== dni) {
        warnings.push(`Se actualizará el DNI ${byLegajo.dni} (coincide por legajo).`)
      }
      if (!byDni && byLegajo) warnings.push(`El empleado ya existe (${existing.apellido}, ${existing.nombre}).`)
    }

    return {
      rowNumber: input.rowNumber,
      action,
      errors,
      warnings,
      input: { ...input, cuil },
    }
  })
}

export function downloadImportTemplate() {
  const workbook = XLSX.utils.book_new()

  const header = IMPORT_COLUMNS.map((column) => column.label)
  const sample1 = IMPORT_COLUMNS.map((column) => column.example)
  const sample2 = IMPORT_COLUMNS.map((column) => {
    if (column.key === 'legajo') return '102'
    if (column.key === 'dni') return '28987654'
    if (column.key === 'cuil') return '27289876544'
    if (column.key === 'apellido') return 'Gómez'
    if (column.key === 'nombre') return 'María'
    if (column.key === 'fecha_nacimiento') return '22/09/1985'
    if (column.key === 'fecha_ingreso') return '15/01/2025'
    if (column.key === 'sector') return 'Terminación'
    if (column.key === 'puesto') return 'Revisora'
    if (column.key === 'categoria') return 'Oficial'
    if (column.key === 'tipo_contrato') return 'Permanente'
    if (column.key === 'jornada_horas') return '45'
    if (column.key === 'sueldo_basico') return '980000'
    if (column.key === 'telefono') return '11-4444-9876'
    if (column.key === 'email') return 'maria.gomez@correo.com'
    if (column.key === 'banco') return 'Nación'
    if (column.key === 'cbu') return '0110123456789012345678'
    return ''
  })

  const employeesSheet = XLSX.utils.aoa_to_sheet([header, sample1, sample2])
  employeesSheet['!cols'] = IMPORT_COLUMNS.map((column) => ({
    wch: Math.max(column.label.length + 2, 14),
  }))
  XLSX.utils.book_append_sheet(workbook, employeesSheet, 'Empleados')

  const instructions = [
    ['Plantilla de importación de empleados — Confecat S.A.'],
    [''],
    ['Cómo usarla'],
    ['1. Completá una fila por empleado en la hoja "Empleados". No cambies los encabezados.'],
    ['2. Las columnas marcadas como obligatorias no pueden quedar vacías.'],
    ['3. Las fechas van en formato dd/mm/aaaa (por ejemplo 01/03/2024).'],
    ['4. El DNI y el legajo deben ser únicos dentro del archivo y del sistema.'],
    ['5. Si el DNI o el legajo ya existen, la fila actualiza al empleado (configurable al importar).'],
    ['6. El CUIL se valida con dígito verificador. Si lo dejás vacío se genera con prefijo 20.'],
    ['7. Los sectores y puestos que no existan se pueden crear automáticamente al importar.'],
    ['8. Guardá el archivo en formato .xlsx y subilo desde la pantalla "Importar".'],
    [''],
    ['Columnas'],
    ...IMPORT_COLUMNS.map((column) => [
      column.label,
      column.required ? 'Obligatoria' : 'Opcional',
      column.hint || '',
      `Ejemplo: ${column.example}`,
    ]),
  ]
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions)
  instructionsSheet['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 55 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones')

  XLSX.writeFile(workbook, 'Confecat-plantilla-empleados.xlsx')
}

export function exportEmployeesToExcel(
  employees: Employee[],
  lookups: { sectors: Sector[]; positions: Position[]; contractTypes: ContractType[] },
) {
  const header = [
    'Legajo',
    'DNI',
    'CUIL',
    'Apellido',
    'Nombre',
    'Fecha de nacimiento',
    'Fecha de ingreso',
    'Fecha de egreso',
    'Estado',
    'Sector',
    'Puesto',
    'Categoría',
    'Tipo de contrato',
    'Jornada (horas)',
    'Sueldo básico',
    'Teléfono',
    'Email',
    'Banco',
    'CBU',
    'Domicilio',
    'Contacto de emergencia',
    'Teléfono de emergencia',
    'Notas',
  ]

  const rows = employees.map((employee) => [
    employee.legajo,
    employee.dni,
    employee.cuil,
    employee.apellido,
    employee.nombre,
    formatDate(employee.fecha_nacimiento),
    formatDate(employee.fecha_ingreso),
    employee.fecha_egreso ? formatDate(employee.fecha_egreso) : '',
    employee.estado,
    lookups.sectors.find((sector) => sector.id === employee.sector_id)?.nombre ?? '',
    lookups.positions.find((position) => position.id === employee.position_id)?.nombre ?? '',
    employee.categoria ?? '',
    lookups.contractTypes.find((contract) => contract.id === employee.contract_type_id)?.nombre ?? '',
    employee.jornada_horas ?? '',
    employee.sueldo_basico ?? '',
    employee.telefono ?? '',
    employee.email ?? '',
    employee.banco ?? '',
    employee.cbu ?? '',
    employee.domicilio ?? '',
    employee.contacto_emergencia_nombre ?? '',
    employee.contacto_emergencia_telefono ?? '',
    employee.notas ?? '',
  ])

  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows])
  sheet['!cols'] = header.map((title, index) => ({
    wch: Math.max(title.length + 2, index === 3 || index === 4 ? 18 : 14),
  }))
  XLSX.utils.book_append_sheet(workbook, sheet, 'Empleados')

  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `Confecat-empleados-${stamp}.xlsx`)
}

export function exportImportErrors(errors: ImportSummary['errores']) {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Fila', 'Detalle del error'],
    ...errors.map((error) => [error.fila || '—', error.detalle]),
  ])
  sheet['!cols'] = [{ wch: 8 }, { wch: 90 }]
  XLSX.utils.book_append_sheet(workbook, sheet, 'Errores')
  XLSX.writeFile(workbook, 'Confecat-errores-importacion.xlsx')
}
