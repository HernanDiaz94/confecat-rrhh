import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Quita todo lo que no sea dígito. */
export function onlyDigits(value: string): string {
  return (value ?? '').replace(/\D/g, '')
}

/** Normaliza texto para comparar (sin acentos, minúsculas, sin espacios extra). */
export function normalizeKey(value: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function isValidDni(value: string): boolean {
  const dni = onlyDigits(value)
  return dni.length >= 7 && dni.length <= 8 && Number(dni) > 0
}

/**
 * Valida el dígito verificador del CUIL/CUIT (11 dígitos).
 * Algoritmo oficial: pesos 5,4,3,2,7,6,5,4,3,2 sobre los primeros 10 dígitos.
 */
export function isValidCuil(value: string): boolean {
  const cuil = onlyDigits(value)
  if (cuil.length !== 11) return false
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((acc, weight, i) => acc + weight * Number(cuil[i]), 0)
  const mod = 11 - (sum % 11)
  const check = mod === 11 ? 0 : mod === 10 ? 9 : mod
  return check === Number(cuil[10])
}

/** Calcula el CUIL a partir de un prefijo (20/23/24/27) y el DNI. */
export function buildCuil(prefix: '20' | '23' | '24' | '27', dni: string): string {
  const base = `${prefix}${onlyDigits(dni).padStart(8, '0')}`
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((acc, weight, i) => acc + weight * Number(base[i]), 0)
  const mod = 11 - (sum % 11)
  const check = mod === 11 ? 0 : mod === 10 ? 9 : mod
  return `${base}${check}`
}

/** '2024-03-08' → '08/03/2024' (sin problemas de zona horaria). */
export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const iso = value.slice(0, 10)
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('es-AR').format(value)
}

export function fullName(employee: { apellido: string; nombre: string }): string {
  return `${employee.apellido}, ${employee.nombre}`
}

export function initials(employee: { apellido: string; nombre: string }): string {
  return `${employee.apellido.charAt(0)}${employee.nombre.charAt(0)}`.toUpperCase()
}

export function todayIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/** Convierte distintos formatos de fecha de Excel a ISO (YYYY-MM-DD). */
export function parseDateToIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    const offset = value.getTimezoneOffset() * 60000
    return new Date(value.getTime() - offset).toISOString().slice(0, 10)
  }
  if (typeof value === 'number') {
    // Serial de Excel (1899-12-30 como origen)
    const ms = Math.round((value - 25569) * 86400 * 1000)
    const date = new Date(ms)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString().slice(0, 10)
  }
  const text = String(value).trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(text)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    return `${year}-${month}-${day}`
  }
  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    const offset = parsed.getTimezoneOffset() * 60000
    return new Date(parsed.getTime() - offset).toISOString().slice(0, 10)
  }
  return null
}

export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

export function ageFrom(dateIso?: string | null): number | null {
  if (!dateIso) return null
  const birth = new Date(dateIso)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--
  return age
}

export function monthsBetween(fromIso: string, toIso = todayIso()): number {
  const from = new Date(fromIso)
  const to = new Date(toIso)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0
  return Math.max(
    0,
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()),
  )
}

export function seniorityLabel(fromIso?: string | null): string {
  if (!fromIso) return '—'
  const months = monthsBetween(fromIso)
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (years === 0) return `${rest} ${rest === 1 ? 'mes' : 'meses'}`
  if (rest === 0) return `${years} ${years === 1 ? 'año' : 'años'}`
  return `${years} años y ${rest} meses`
}

export function isSameMonth(dateIso: string | null, reference = new Date()): boolean {
  if (!dateIso) return false
  const date = new Date(dateIso)
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth()
}

export function isBirthdayInMonth(dateIso: string | null, reference = new Date()): boolean {
  if (!dateIso) return false
  const date = new Date(dateIso)
  return date.getMonth() === reference.getMonth()
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function timeAgo(value: string): string {
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  if (Number.isNaN(diff)) return formatDateTime(value)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'hace unos segundos'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} ${days === 1 ? 'día' : 'días'}`
  return formatDateTime(value)
}

