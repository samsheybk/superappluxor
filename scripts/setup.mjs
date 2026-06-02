import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Cargar variables de entorno desde .env
const envPath = join(__dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=')
      return [k.trim(), v.join('=').trim()]
    })
)

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function setup() {
  console.log('🔧 Configurando Super EvaLuxor...\n')

  // 1. Crear usuario admin
  console.log('1. Creando usuario admin...')
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: 'admin@evaluxor.com',
    password: 'Admin123!',
  })

  if (signUpError) {
    if (signUpError.message.includes('already')) {
      console.log('   ✅ El usuario admin ya existe')
    } else {
      console.error(`   ❌ Error al crear admin: ${signUpError.message}`)
      console.log('\n   ⚠️  Crea el usuario manualmente en:')
      console.log(`   ${supabaseUrl}/project/settings/auth`)
    }
  } else {
    console.log('   ✅ Usuario admin creado: admin@evaluxor.com / Admin123!')
    console.log('   ⚠️  Revisa el correo de confirmación o deshabilita "Confirm email" en Supabase Auth Settings')
  }

  // 2. Insertar perfil de admin
  console.log('\n2. Insertando perfil del admin...')
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { error: profileError } = await supabase.from('perfiles').upsert({
      id: user.id,
      nombre: 'Administrador',
      rol: 'admin',
    }, { onConflict: 'id' })

    if (profileError) {
      console.log(`   ⚠️  No se pudo insertar perfil: ${profileError.message}`)
      console.log('   Ejecuta el SQL manualmente desde supabase/migrations/00001_schema_inicial.sql')
    } else {
      console.log('   ✅ Perfil de admin insertado')
    }
  }

  // 3. Instrucciones SQL
  console.log('\n3. Ejecuta el siguiente SQL en el SQL Editor de Supabase:')
  console.log('   Ve a: https://supabase.com/dashboard/project/cylzqujhusaijmjaznfm/sql/new')
  console.log('   Y pega el contenido de: supabase/migrations/00001_schema_inicial.sql\n')

  console.log('🎯 Setup completado!')
}

setup().catch(console.error)
