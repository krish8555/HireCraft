import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Job = {
  id: string
  title: string
  description: string
  requirements: string
  location: string
  type: string
  salary_range: string
  created_at: string
}

export type Admin = {
  id: string
  username: string
  created_at: string
}
