import { useQuery } from '@tanstack/react-query'
import { repo } from '@/lib/data'

export function useAllEmployees() {
  return useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => repo.listAllEmployees(),
  })
}

export function useSectors() {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: () => repo.listSectors(),
  })
}

export function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: () => repo.listPositions(),
  })
}

export function useContractTypes() {
  return useQuery({
    queryKey: ['contract-types'],
    queryFn: () => repo.listContractTypes(),
  })
}

export function useAudit(employeeId?: string) {
  return useQuery({
    queryKey: ['audit', employeeId ?? 'global'],
    queryFn: () => repo.listAudit(employeeId),
  })
}
