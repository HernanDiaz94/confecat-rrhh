import { isSupabaseConfigured } from '@/lib/supabase'
import { demoRepo } from './demo'
import type { Repo } from './repo'
import { supabaseRepo } from './supabase'

export const repo: Repo = isSupabaseConfigured ? supabaseRepo : demoRepo
export type { Repo }
