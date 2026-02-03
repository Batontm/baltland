import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const trimmed = String(line || '').trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (!match) return
    const key = match[1].trim()
    let val = match[2]
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (key && process.env[key] === undefined) process.env[key] = val
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase
    .from('land_plots')
    .select('id, title, cadastral_number, coordinates_json')
    .not('coordinates_json', 'is', null)
    .limit(5)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Plots with coordinates:', data?.length)
  data?.forEach(p => {
    console.log(`- ${p.title} (${p.cadastral_number}):`, !!p.coordinates_json)
  })

  const { count } = await supabase
    .from('land_plots')
    .select('*', { count: 'exact', head: true })
  
  const { count: coordsCount } = await supabase
    .from('land_plots')
    .select('*', { count: 'exact', head: true })
    .not('coordinates_json', 'is', null)

  console.log(`Total plots: ${count}`)
  console.log(`Plots with coordinates: ${coordsCount}`)
}

check()
