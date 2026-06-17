import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { LoadingScreen } from '../../components/LoadingScreen'

interface Usuario {
  id: string
  nombre: string
  username: string
  rol: 'admin' | 'evaluador'
  congelado: boolean
  created_at: string
}

export function GestionUsuarios() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<Usuario | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formNombre, setFormNombre] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formRol, setFormRol] = useState<'evaluador' | 'admin'>('evaluador')

  useEffect(() => {
    if (perfil && perfil.rol !== 'admin') navigate('/')
  }, [perfil, navigate])

  function cargarUsuarios() {
    setLoading(true)
    supabase.from('perfiles').select('id, nombre, username, rol, congelado, created_at').order('nombre').then(({ data }) => {
      setUsuarios((data ?? []) as Usuario[])
      setLoading(false)
    })
  }

  useEffect(() => { cargarUsuarios() }, [])

  function openCreate() {
    setEditUser(null)
    setFormEmail('')
    setFormPassword('')
    setFormNombre('')
    setFormUsername('')
    setFormRol('evaluador')
    setError('')
    setShowModal(true)
  }

  async function toggleCongelado(u: Usuario) {
    setGuardando(true)
    const { error: err } = await supabase.from('perfiles').update({ congelado: !u.congelado }).eq('id', u.id)
    if (err) { setError(err.message); setGuardando(false); return }
    setGuardando(false)
    cargarUsuarios()
  }

  function openEdit(u: Usuario) {
    setEditUser(u)
    setFormNombre(u.nombre)
    setFormUsername(u.username)
    setFormRol(u.rol)
    setFormEmail('')
    setFormPassword('')
    setError('')
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError('')

    if (editUser) {
      if (formPassword.trim()) {
        if (editUser.id === perfil!.id) {
          const { error: pwdErr } = await supabase.auth.updateUser({ password: formPassword.trim() })
          if (pwdErr) { setError(pwdErr.message); setGuardando(false); return }
        }
      }
      const { error: err } = await supabase.from('perfiles').update({
        nombre: formNombre.trim(), username: formUsername.trim(), rol: formRol,
      }).eq('id', editUser.id)
      if (err) { setError(err.message); setGuardando(false); return }
    } else {
      if (!formEmail.trim() || !formPassword.trim()) {
        setError('Email y password requeridos'); setGuardando(false); return
      }
      const { error: err } = await supabase.auth.signUp({
        email: formEmail.trim(),
        password: formPassword,
        options: {
          data: { nombre: formNombre.trim(), username: formUsername.trim(), rol: formRol },
        },
      })
      if (err) { setError(err.message); setGuardando(false); return }
    }

    setGuardando(false)
    setShowModal(false)
    cargarUsuarios()
  }

  async function handleDelete(id: string) {
    setGuardando(true)
    const { error: err } = await supabase.from('perfiles').delete().eq('id', id)
    if (err) { setError(err.message); setGuardando(false); return }
    setGuardando(false)
    setDeleteConfirm(null)
    cargarUsuarios()
  }

  if (!perfil || perfil.rol !== 'admin') return null

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-500 hover:text-blue-600">Panel</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-700 font-medium">Administracion</span>
      </div>
      <div className="mb-6 flex items-center justify-end gap-2">
        <button type="button" onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo usuario
        </button>
      </div>

      {loading ? <LoadingScreen /> : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={`border-b border-slate-100 hover:bg-slate-50 ${u.congelado ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{u.nombre}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${u.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${u.congelado ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {u.congelado ? 'Congelado' : 'Activo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(u.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(u)}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      {u.id !== perfil.id && (
                        <>
                          <button type="button" onClick={() => toggleCongelado(u)} disabled={guardando}
                            className={`rounded px-2 py-1 text-xs font-medium ${u.congelado ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                          >
                            {u.congelado ? 'Descongelar' : 'Congelar'}
                          </button>
                          <button type="button" onClick={() => { setDeleteConfirm(u.id); setError('') }}
                            className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-slate-800">
              {editUser ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              {editUser ? (
                <div>
                  <input value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Nueva contrasena (dejar vacio para no cambiar)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    type="password"
                  />
                  {editUser.id !== perfil!.id && (
                    <p className="mt-1 text-xs text-slate-400">Solo podes cambiar tu propia contrasena</p>
                  )}
                </div>
              ) : (
                <>
                  <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email *"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    type="email" required
                  />
                  <input value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Contrasena *"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    type="password" required
                  />
                </>
              )}
              <input value={formNombre} onChange={(e) => setFormNombre(e.target.value)} placeholder="Nombre completo *"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
              <input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="Nombre de usuario *"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
              <select value={formRol} onChange={(e) => setFormRol(e.target.value as 'admin' | 'evaluador')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="evaluador">Evaluador</option>
                <option value="admin">Admin</option>
              </select>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={guardando}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {guardando ? 'Guardando...' : editUser ? 'Guardar cambios' : 'Crear usuario'}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-bold text-slate-800">Eliminar usuario</h2>
            <p className="mb-4 text-sm text-slate-600">Esta accion elimina el usuario y su perfil permanentemente.</p>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => handleDelete(deleteConfirm)} disabled={guardando}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                {guardando ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button type="button" onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
