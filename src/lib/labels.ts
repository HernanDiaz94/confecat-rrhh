import type { EmployeeStatus, Role } from '@/lib/types'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  rrhh: 'RRHH',
  consulta: 'Consulta',
}

export const STATUS_LABELS: Record<EmployeeStatus, string> = {
  activo: 'Activo',
  licencia: 'Licencia',
  baja: 'Baja',
}

export const STATUS_TONES: Record<EmployeeStatus, 'green' | 'amber' | 'rose'> = {
  activo: 'green',
  licencia: 'amber',
  baja: 'rose',
}

export const ACTION_LABELS: Record<string, string> = {
  crear: 'Alta',
  actualizar: 'Modificación',
  baja: 'Baja',
  reactivar: 'Reactivación',
  eliminar: 'Eliminación',
}

export const FIELD_LABELS: Record<string, string> = {
  legajo: 'Legajo',
  dni: 'DNI',
  cuil: 'CUIL',
  apellido: 'Apellido',
  nombre: 'Nombre',
  fecha_nacimiento: 'Fecha de nacimiento',
  estado_civil: 'Estado civil',
  domicilio: 'Domicilio',
  telefono: 'Teléfono',
  email: 'Email',
  contacto_emergencia_nombre: 'Contacto de emergencia',
  contacto_emergencia_telefono: 'Teléfono de emergencia',
  fecha_ingreso: 'Fecha de ingreso',
  fecha_egreso: 'Fecha de egreso',
  sector_id: 'Sector',
  position_id: 'Puesto',
  categoria: 'Categoría',
  contract_type_id: 'Tipo de contrato',
  jornada_horas: 'Jornada (horas)',
  sueldo_basico: 'Sueldo básico',
  banco: 'Banco',
  cbu: 'CBU',
  estado: 'Estado',
  motivo_baja: 'Motivo de baja',
  notas: 'Notas',
}

export const ESTADO_CIVIL_OPTIONS = [
  'Soltero/a',
  'Casado/a',
  'Unión convivencial',
  'Divorciado/a',
  'Viudo/a',
]

export const MOTIVO_BAJA_OPTIONS = [
  'Renuncia',
  'Despido',
  'Fin de contrato',
  'Jubilación',
  'Abandono de puesto',
  'Fallecimiento',
  'Otro',
]

export const SECTOR_NONE = 'Sin sector'
