import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { SUPERMERCADOS } from '../../types'

type Phase = 'plate' | 'vehicle_form' | 'movement_form'
type VehiculoRow = { id: string; marca: string; modelo: string; color: string; tipo: string; origen: string }

export function ControlGaritas() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('plate')
  const [placa, setPlaca] = useState('')
  const [garita, setGarita] = useState(1)
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null)

  const [vehiculo, setVehiculo] = useState<VehiculoRow | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() })

  function reset() {
    setPlaca('')
    setVehiculo(null)
    setPhase('plate')
    setGuardando(false)
    setMensaje(null)
  }

  async function buscarVehiculo() {
    if (!user || !placa.trim()) return
    setGuardando(true)
    setMensaje(null)
    const { data } = await supabase.from('seguridad_vehiculos').select('*').eq('placa', placa.trim().toUpperCase()).maybeSingle()
    setGuardando(false)
    if (data) { setVehiculo(data); setPhase('movement_form') }
    else { setVehiculo(null); setPhase('vehicle_form') }
  }

  async function guardarVehiculo() {
    if (!marca.trim() || !modelo.trim() || !colorVehiculo.trim()) {
      setMensaje({ texto: 'Completa marca, modelo y color', error: true }); return
    }
    setGuardando(true)
    setMensaje(null)
    const { data, error } = await supabase.from('seguridad_vehiculos').insert({
      placa: placa.trim().toUpperCase(), marca: marca.trim(), modelo: modelo.trim(),
      color: colorVehiculo.trim(), tipo: tipoVehiculo, origen,
    }).select().single()
    setGuardando(false)
    if (error) { setMensaje({ texto: `Error: ${error.message}`, error: true }); return }
    setVehiculo(data)
    setPhase('movement_form')
  }

  async function registrarMovimiento() {
    if (!user || !vehiculo) return
    if (!chofer.trim()) { setMensaje({ texto: 'Nombre del chofer requerido', error: true }); return }
    if (vehiculo.origen === 'Luxor' && !combustibleDefectuoso && nivelCombustible === 0) {
      setMensaje({ texto: 'Indica el nivel de combustible o marca como defectuoso', error: true }); return
    }
    setGuardando(true)
    setMensaje(null)

    const destinoOrigenVal = destinoOrigen === 'Otro' ? otroDestino : destinoOrigen

    const { error } = await supabase.from('seguridad_registros').insert({
      garita, placa: placa.trim().toUpperCase(), tipo, creado_por: user.id,
      chofer: chofer.trim(),
      tipo_carga: tipoCarga,
      destino_origen: destinoOrigenVal,
      nivel_combustible: vehiculo.origen === 'Luxor' && !combustibleDefectuoso ? nivelCombustible : null,
      combustible_defectuoso: vehiculo.origen === 'Luxor' ? combustibleDefectuoso : false,
    })
    if (error) { setMensaje({ texto: `Error: ${error.message}`, error: true }); setGuardando(false); return }

    setMensaje({ texto: tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada', error: false })
    setGuardando(false)
    setTimeout(reset, 1000)
  }

  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [colorVehiculo, setColorVehiculo] = useState('')
  const [tipoVehiculo, setTipoVehiculo] = useState('Particular')
  const [origen, setOrigen] = useState('Visitante')
  const [chofer, setChofer] = useState('')
  const [tipoCarga, setTipoCarga] = useState('')
  const [destinoOrigen, setDestinoOrigen] = useState('')
  const [otroDestino, setOtroDestino] = useState('')
  const [nivelCombustible, setNivelCombustible] = useState(0)
  const [combustibleDefectuoso, setCombustibleDefectuoso] = useState(false)

  function limpiarForm() {
    setMarca(''); setModelo(''); setColorVehiculo(''); setTipoVehiculo('Particular')
    setOrigen('Visitante'); setChofer(''); setTipoCarga(''); setDestinoOrigen('')
    setOtroDestino(''); setNivelCombustible(0); setCombustibleDefectuoso(false)
    setMensaje(null)
  }

  function volverAPlate() {
    reset()
    limpiarForm()
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col items-center justify-center px-4 py-8">
      <div className="w-full">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-800">Control de Acceso</h1>
          <p className="text-slate-400">Garita 1 y 2</p>
        </div>

        {phase === 'plate' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              {[1, 2].map((g) => (
                <button key={g} type="button" onClick={() => setGarita(g)}
                  className={`flex-1 rounded-xl py-3 text-lg font-bold transition-all ${garita === g ? 'bg-slate-800 text-white shadow-lg shadow-slate-200' : 'bg-white text-slate-400 shadow-sm hover:bg-slate-50'}`}
                >
                  Garita {g}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              {(['entrada', 'salida'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  className={`flex-1 rounded-xl py-3 text-lg font-bold transition-all ${tipo === t ? (t === 'entrada' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-red-600 text-white shadow-lg shadow-red-200') : 'bg-white text-slate-400 shadow-sm hover:bg-slate-50'}`}
                >
                  {t === 'entrada' ? 'Entrada' : 'Salida'}
                </button>
              ))}
            </div>
            <input ref={inputRef} type="text" value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              className="w-full rounded-xl border-2 border-slate-200 px-5 py-4 text-center text-3xl font-bold uppercase tracking-[0.3em] focus:border-blue-400 focus:outline-none"
              placeholder="PLACA" maxLength={10}
              onKeyDown={(e) => { if (e.key === 'Enter' && placa.trim()) buscarVehiculo() }}
            />
            <button type="button" onClick={buscarVehiculo} disabled={guardando || !placa.trim()}
              className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
            >
              {guardando ? 'Buscando...' : 'Siguiente'}
            </button>
            <button type="button" onClick={() => navigate('/departamento/seguridad/historial')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
            >
              Historial de movimientos
            </button>
            <button type="button" onClick={() => navigate('/departamento/sistemas/crear')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Reportar incidencia
            </button>
          </div>
        )}

        {phase === 'vehicle_form' && (
          <div className="rounded-xl border-2 border-blue-100 bg-blue-50 p-5 space-y-4">
            <p className="text-center text-sm font-medium text-blue-700">
              Vehiculo no registrado — ingresa los datos
            </p>
            <p className="text-center font-mono text-xl font-bold text-slate-700">{placa}</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Marca *"
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Modelo *"
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <input value={colorVehiculo} onChange={(e) => setColorVehiculo(e.target.value)} placeholder="Color *"
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <select value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="Particular">Particular</option>
                <option value="Carga">Carga</option>
              </select>
            </div>
            <div className="flex gap-2">
              {['Luxor', 'Visitante'].map((o) => (
                <button key={o} type="button" onClick={() => setOrigen(o)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${origen === o ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                >
                  {o}
                </button>
              ))}
            </div>
            {mensaje && (
              <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">{mensaje.texto}</div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={guardarVehiculo} disabled={guardando}
                className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
              >
                {guardando ? 'Guardando...' : 'Guardar vehiculo'}
              </button>
              <button type="button" onClick={volverAPlate}
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-500 transition-all hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {phase === 'movement_form' && vehiculo && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-2xl font-bold text-slate-800">{placa}</p>
                  <p className="text-sm text-slate-500">
                    {vehiculo.marca} {vehiculo.modelo} — {vehiculo.color}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${vehiculo.origen === 'Luxor' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                  {vehiculo.origen}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Chofer</label>
                <input value={chofer} onChange={(e) => setChofer(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Nombre del chofer" autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Tipo de carga</label>
                <div className="grid grid-cols-2 gap-2">
                  {['PERECEDERO', 'NO PERECEDERO', 'MIXTO', 'SERVICIOS GENERALES'].map((c) => (
                    <button key={c} type="button" onClick={() => setTipoCarga(c)}
                      className={`rounded-lg py-2 text-sm font-medium transition-colors ${tipoCarga === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  {tipo === 'salida' ? 'Destino' : 'Procedencia / Origen'}
                </label>
                <select value={destinoOrigen} onChange={(e) => setDestinoOrigen(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {SUPERMERCADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value="Otro">Otro</option>
                </select>
                {destinoOrigen === 'Otro' && (
                  <input value={otroDestino} onChange={(e) => setOtroDestino(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Especificar..."
                  />
                )}
              </div>

              {vehiculo.origen === 'Luxor' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <label className="text-xs font-semibold uppercase text-amber-700">Combustible</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={100} step={5} value={nivelCombustible}
                      onChange={(e) => { setNivelCombustible(Number(e.target.value)); setCombustibleDefectuoso(false) }}
                      className="flex-1 accent-amber-600 disabled:opacity-40"
                      disabled={combustibleDefectuoso}
                    />
                    <span className="min-w-[3rem] text-right text-lg font-bold text-amber-800">
                      {combustibleDefectuoso ? '--' : `${nivelCombustible}%`}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-amber-700">
                    <input type="checkbox" checked={combustibleDefectuoso}
                      onChange={(e) => { setCombustibleDefectuoso(e.target.checked); if (e.target.checked) setNivelCombustible(0) }}
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    Flotante defectuoso
                  </label>
                </div>
              )}
            </div>

            {mensaje && (
              <div className={`rounded-xl p-4 text-center text-sm font-medium ${mensaje.error ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {mensaje.texto}
              </div>
            )}

            <button type="button" onClick={registrarMovimiento} disabled={guardando}
              className={`w-full rounded-xl py-4 text-lg font-bold text-white transition-all disabled:opacity-40 ${tipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} ${guardando ? 'animate-pulse' : ''}`}
            >
              {guardando ? 'Registrando...' : tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Salida'}
            </button>

            <button type="button" onClick={() => { limpiarForm(); reset() }}
              className="w-full rounded-xl py-3 text-sm text-slate-500 transition-all hover:text-slate-700"
            >
              Cancelar y volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
