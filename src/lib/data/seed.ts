import type { ContractType, EmployeeInput, Position, Sector } from '@/lib/types'
import { buildCuil } from '@/lib/utils'

export const SEED_VERSION = '2026-11-06b'

const SECTORS: { nombre: string; puestos: string[] }[] = [
  {
    nombre: 'Administración',
    puestos: ['Jefe de Personal', 'Analista de RRHH', 'Administrativo', 'Recepcionista'],
  },
  { nombre: 'Corte', puestos: ['Supervisor de Corte', 'Cortador', 'Ayudante de Corte'] },
  { nombre: 'Costura', puestos: ['Supervisora de Costura', 'Costurera', 'Ayudante de Costura'] },
  { nombre: 'Terminación', puestos: ['Encargado de Terminación', 'Planchador', 'Revisor'] },
  { nombre: 'Depósito', puestos: ['Jefe de Depósito', 'Operario de Depósito', 'Chofer'] },
  { nombre: 'Mantenimiento', puestos: ['Jefe de Mantenimiento', 'Mecánico', 'Electricista'] },
  { nombre: 'Calidad', puestos: ['Analista de Calidad', 'Controlador de Calidad'] },
]

const CONTRACTS = ['Permanente', 'Plazo fijo', 'Temporada', 'Pasantía']

// Domicilios de ejemplo en San Fernando del Valle de Catamarca.
const DOMICILIOS = [
  'Av. Güemes 245, Bº Centro',
  'Av. Ocampo 1180, Bº Norte',
  'Av. Belgrano 640, Bº Centro',
  'Calle Sarmiento 512, Bº La Chacarita',
  'Av. Gobernador Ramón Castillo 1450, Bº Parque América',
  'Calle 25 de Mayo 380, Bº Centro',
  'Av. Alem 905, Bº Norte',
  'Calle Rivadavia 1230, Bº Villa Cubas',
  'Av. Los Terebintos 320, Bº Los Terebintos',
  'Calle San Martín 470, Bº Centro',
  'Av. Virgen del Valle 2140, Bº La Chacarita',
  'Calle Chacabuco 860, Bº San Ramón',
  'Av. Acosta Villafañe 1020, Bº General Paz',
  'Calle Junín 715, Bº Centro',
  'Av. Presidente Castillo 1890, Bº El Milagro',
  'Calle Maipú 340, Bº Norte',
  'Av. Juan Domingo Perón 2560, Bº La Tablada',
  'Calle La Rioja 605, Bº Centro',
  'Av. Los Álamos 175, Bº Los Álamos',
  'Calle Catamarca 990, Bº Villa Cubas',
  'Av. Güemes 1340, Bº Norte',
  'Calle Tucumán 425, Bº Centro',
  'Av. Ocampo 2310, Bº Santa Lucía',
  'Calle Salta 680, Bº San Ramón',
  'Av. Gobernador Ramón Castillo 760, Bº Parque América',
  'Calle República 1115, Bº La Chacarita',
  'Av. Alem 1560, Bº General Paz',
  'Calle Esquiú 230, Bº Centro',
  'Av. Los Terebintos 1480, Bº Los Terebintos',
  'Calle 9 de Julio 555, Bº Villa Cubas',
]

const CIUDAD = 'San Fernando del Valle de Catamarca'

interface SeedPerson {
  apellido: string
  nombre: string
  dni: string
  nacimiento: string
  ingreso: string
  sector: string
  puesto: string
  categoria: string
  sueldo: number
  estado?: EmployeeInput['estado']
  egreso?: string
  motivo?: string
  banco?: string
  cbu?: string
}

const PEOPLE: SeedPerson[] = [
  { apellido: 'Duarte', nombre: 'Marcela', dni: '28456789', nacimiento: '1981-04-12', ingreso: '2012-03-01', sector: 'Administración', puesto: 'Jefe de Personal', categoria: 'Fuera de convenio', sueldo: 1850000, banco: 'Galicia', cbu: '0070123456789012345678' },
  { apellido: 'Ferreyra', nombre: 'Sofía', dni: '35678912', nacimiento: '1991-09-23', ingreso: '2018-06-11', sector: 'Administración', puesto: 'Analista de RRHH', categoria: 'Administrativo A', sueldo: 1120000, banco: 'Santander', cbu: '0720123456789012345678' },
  { apellido: 'Gómez', nombre: 'Alejandro', dni: '31456789', nacimiento: '1985-01-30', ingreso: '2015-02-16', sector: 'Administración', puesto: 'Administrativo', categoria: 'Administrativo B', sueldo: 980000, banco: 'Galicia', cbu: '0070987654321098765432' },
  { apellido: 'Sosa', nombre: 'Romina', dni: '40123456', nacimiento: '1997-11-05', ingreso: '2022-08-01', sector: 'Administración', puesto: 'Recepcionista', categoria: 'Administrativo C', sueldo: 760000, banco: 'Nación', cbu: '0110456789012345678901' },
  { apellido: 'Pereyra', nombre: 'Hugo', dni: '20876543', nacimiento: '1968-07-19', ingreso: '2004-05-03', sector: 'Corte', puesto: 'Supervisor de Corte', categoria: 'Oficial especializado', sueldo: 1480000, banco: 'Provincia', cbu: '0140345678901234567890' },
  { apellido: 'Benítez', nombre: 'Luis', dni: '26765432', nacimiento: '1978-02-14', ingreso: '2009-09-21', sector: 'Corte', puesto: 'Cortador', categoria: 'Oficial', sueldo: 1210000, banco: 'Galicia', cbu: '0070567890123456789012' },
  { apellido: 'Quiroga', nombre: 'Diego', dni: '34567891', nacimiento: '1989-12-01', ingreso: '2016-04-18', sector: 'Corte', puesto: 'Cortador', categoria: 'Oficial', sueldo: 1180000, banco: 'Nación', cbu: '0110678901234567890123' },
  { apellido: 'Molina', nombre: 'Jorge', dni: '38123457', nacimiento: '1994-03-27', ingreso: '2021-01-11', sector: 'Corte', puesto: 'Ayudante de Corte', categoria: 'Ayudante', sueldo: 890000, banco: 'Provincia', cbu: '0140789012345678901234' },
  { apellido: 'Cáceres', nombre: 'Marta', dni: '18456789', nacimiento: '1963-06-08', ingreso: '1998-10-05', sector: 'Costura', puesto: 'Supervisora de Costura', categoria: 'Oficial especializado', sueldo: 1510000, banco: 'Galicia', cbu: '0070890123456789012345' },
  { apellido: 'Ledesma', nombre: 'Cristina', dni: '23456781', nacimiento: '1973-08-15', ingreso: '2006-02-13', sector: 'Costura', puesto: 'Costurera', categoria: 'Oficial', sueldo: 1090000, banco: 'Nación', cbu: '0110901234567890123456' },
  { apellido: 'Álvarez', nombre: 'Rosa', dni: '25678913', nacimiento: '1977-10-02', ingreso: '2008-07-07', sector: 'Costura', puesto: 'Costurera', categoria: 'Oficial', sueldo: 1080000, banco: 'Provincia', cbu: '0140012345678901234567' },
  { apellido: 'Villalba', nombre: 'Silvana', dni: '27891234', nacimiento: '1979-01-21', ingreso: '2010-11-15', sector: 'Costura', puesto: 'Costurera', categoria: 'Oficial', sueldo: 1075000, banco: 'Galicia', cbu: '0070123456789012345679' },
  { apellido: 'Ramírez', nombre: 'Noelia', dni: '36789123', nacimiento: '1992-05-09', ingreso: '2019-03-04', sector: 'Costura', puesto: 'Costurera', categoria: 'Medio oficial', sueldo: 950000, banco: 'Santander', cbu: '0720234567890123456789' },
  { apellido: 'Ojeda', nombre: 'Lorena', dni: '39456123', nacimiento: '1996-02-17', ingreso: '2022-05-02', sector: 'Costura', puesto: 'Ayudante de Costura', categoria: 'Ayudante', sueldo: 840000, banco: 'Nación', cbu: '0110345678901234567891' },
  { apellido: 'Maidana', nombre: 'Karina', dni: '41234567', nacimiento: '1999-07-30', ingreso: '2023-09-18', sector: 'Costura', puesto: 'Ayudante de Costura', categoria: 'Ayudante', sueldo: 820000, banco: 'Provincia', cbu: '0140456789012345678902' },
  { apellido: 'Torres', nombre: 'Raúl', dni: '22345678', nacimiento: '1971-04-04', ingreso: '2002-08-12', sector: 'Terminación', puesto: 'Encargado de Terminación', categoria: 'Oficial especializado', sueldo: 1420000, banco: 'Galicia', cbu: '0070567890123456789013' },
  { apellido: 'Acosta', nombre: 'Mirta', dni: '24123456', nacimiento: '1975-09-11', ingreso: '2007-01-22', sector: 'Terminación', puesto: 'Planchador', categoria: 'Oficial', sueldo: 1020000, banco: 'Nación', cbu: '0110678901234567890124' },
  { apellido: 'Giménez', nombre: 'Carlos', dni: '29876541', nacimiento: '1982-12-12', ingreso: '2013-06-17', sector: 'Terminación', puesto: 'Revisor', categoria: 'Medio oficial', sueldo: 980000, banco: 'Provincia', cbu: '0140789012345678901235' },
  { apellido: 'Bogado', nombre: 'Estela', dni: '33456781', nacimiento: '1988-03-03', ingreso: '2017-10-09', sector: 'Terminación', puesto: 'Revisor', categoria: 'Medio oficial', sueldo: 960000, banco: 'Galicia', cbu: '0070890123456789012346' },
  { apellido: 'Ríos', nombre: 'Sergio', dni: '21456783', nacimiento: '1969-11-25', ingreso: '2001-04-30', sector: 'Depósito', puesto: 'Jefe de Depósito', categoria: 'Jefe de sector', sueldo: 1450000, banco: 'Santander', cbu: '0720901234567890123457' },
  { apellido: 'Navarro', nombre: 'Pablo', dni: '30234567', nacimiento: '1983-06-06', ingreso: '2014-09-01', sector: 'Depósito', puesto: 'Operario de Depósito', categoria: 'Operario', sueldo: 920000, banco: 'Nación', cbu: '0110012345678901234568' },
  { apellido: 'Cabrera', nombre: 'Marcos', dni: '37234561', nacimiento: '1993-01-16', ingreso: '2020-02-24', sector: 'Depósito', puesto: 'Chofer', categoria: 'Chofer', sueldo: 1050000, banco: 'Provincia', cbu: '0140123456789012345679' },
  { apellido: 'Paz', nombre: 'Verónica', dni: '38901234', nacimiento: '1995-08-28', ingreso: '2021-07-19', sector: 'Depósito', puesto: 'Operario de Depósito', categoria: 'Operario', sueldo: 900000, banco: 'Galicia', cbu: '0070234567890123456780' },
  { apellido: 'Ibarra', nombre: 'Ernesto', dni: '19876543', nacimiento: '1966-05-20', ingreso: '1996-03-11', sector: 'Mantenimiento', puesto: 'Jefe de Mantenimiento', categoria: 'Jefe de sector', sueldo: 1520000, banco: 'Nación', cbu: '0110345678901234567890' },
  { apellido: 'Aguirre', nombre: 'Daniel', dni: '27456789', nacimiento: '1978-10-07', ingreso: '2009-05-25', sector: 'Mantenimiento', puesto: 'Mecánico', categoria: 'Oficial especializado', sueldo: 1240000, banco: 'Provincia', cbu: '0140456789012345678901' },
  { apellido: 'Suárez', nombre: 'Gustavo', dni: '32678901', nacimiento: '1986-02-02', ingreso: '2016-11-14', sector: 'Mantenimiento', puesto: 'Electricista', categoria: 'Oficial especializado', sueldo: 1260000, banco: 'Galicia', cbu: '0070567890123456789012' },
  { apellido: 'Barrios', nombre: 'Lucía', dni: '41567892', nacimiento: '2000-04-23', ingreso: '2023-03-06', sector: 'Calidad', puesto: 'Analista de Calidad', categoria: 'Técnico', sueldo: 990000, banco: 'Santander', cbu: '0720678901234567890123' },
  { apellido: 'Coria', nombre: 'Andrea', dni: '35678124', nacimiento: '1990-12-19', ingreso: '2019-08-26', sector: 'Calidad', puesto: 'Controlador de Calidad', categoria: 'Técnico', sueldo: 940000, banco: 'Nación', cbu: '0110789012345678901234', estado: 'licencia' },
  { apellido: 'Funes', nombre: 'Ricardo', dni: '28567123', nacimiento: '1980-07-15', ingreso: '2011-02-07', sector: 'Calidad', puesto: 'Controlador de Calidad', categoria: 'Técnico', sueldo: 950000, banco: 'Provincia', cbu: '0140890123456789012345' },
  { apellido: 'Herrera', nombre: 'Julio', dni: '30678912', nacimiento: '1984-09-09', ingreso: '2013-12-02', sector: 'Corte', puesto: 'Ayudante de Corte', categoria: 'Ayudante', sueldo: 870000, banco: 'Galicia', cbu: '0070901234567890123456', estado: 'baja', egreso: '2026-09-30', motivo: 'Renuncia' },
]

function iso(daysAgo: number) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

export function buildSeed(): {
  sectors: Sector[]
  positions: Position[]
  contractTypes: ContractType[]
  employees: EmployeeInput[]
} {
  const sectors: Sector[] = SECTORS.map((s, i) => ({
    id: `sec-${i + 1}`,
    nombre: s.nombre,
    activo: true,
    created_at: iso(400),
  }))

  const positions: Position[] = []
  SECTORS.forEach((s, si) => {
    s.puestos.forEach((puesto, pi) => {
      positions.push({
        id: `pos-${si + 1}-${pi + 1}`,
        nombre: puesto,
        sector_id: `sec-${si + 1}`,
        activo: true,
        created_at: iso(400),
      })
    })
  })

  const contractTypes: ContractType[] = CONTRACTS.map((nombre, i) => ({
    id: `ct-${i + 1}`,
    nombre,
    activo: true,
    created_at: iso(400),
  }))

  const employees: EmployeeInput[] = PEOPLE.map((person, index) => {
    const sector = sectors.find((s) => s.nombre === person.sector)
    const position = positions.find(
      (p) => p.nombre === person.puesto && p.sector_id === sector?.id,
    )
    const prefix: '20' | '27' = index % 2 === 0 ? '27' : '20'
    return {
      legajo: String(101 + index),
      dni: person.dni,
      cuil: buildCuil(prefix, person.dni),
      apellido: person.apellido,
      nombre: person.nombre,
      fecha_nacimiento: person.nacimiento,
      estado_civil: index % 3 === 0 ? 'Casado/a' : index % 3 === 1 ? 'Soltero/a' : 'Unión convivencial',
      domicilio: `${DOMICILIOS[index % DOMICILIOS.length]}, ${CIUDAD}`,
      telefono: `383-4${String(10 + ((index * 7) % 90)).padStart(2, '0')}-${1000 + ((index * 37) % 9000)}`,
      email: `${person.nombre.toLowerCase()}.${person.apellido.toLowerCase()}@confecat.com.ar`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''),
      contacto_emergencia_nombre: index % 2 === 0 ? 'Familiar directo' : 'Cónyuge',
      contacto_emergencia_telefono: `383-4${String(20 + ((index * 9) % 80)).padStart(2, '0')}-${2000 + ((index * 29) % 8000)}`,
      fecha_ingreso: person.ingreso,
      fecha_egreso: person.egreso ?? null,
      sector_id: sector?.id ?? null,
      position_id: position?.id ?? null,
      categoria: person.categoria,
      contract_type_id: contractTypes[index % contractTypes.length].id,
      jornada_horas: index % 5 === 0 ? 40 : 45,
      sueldo_basico: person.sueldo,
      banco: person.banco ?? 'Galicia',
      cbu: person.cbu ?? null,
      estado: person.estado ?? 'activo',
      motivo_baja: person.motivo ?? null,
      notas: null,
    }
  })

  return { sectors, positions, contractTypes, employees }
}
