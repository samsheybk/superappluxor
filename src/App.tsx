import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Departamento } from './pages/Departamento'
import { TallerAutomotriz } from './pages/taller/TallerAutomotriz'
import { DetalleVehiculo } from './pages/taller/DetalleVehiculo'
import { PlantasElectricas } from './pages/plantas/PlantasElectricas'
import { EvaluarAlmacen } from './pages/almacen/EvaluarAlmacen'
import { DetalleEvaluacion as DetalleEvaluacionAlmacen } from './pages/almacen/DetalleEvaluacion'
import { GestionConceptosAlmacen } from './pages/almacen/GestionConceptos'
import { ListaEvaluaciones } from './pages/almacen/ListaEvaluaciones'
import { VerificarPlanta } from './pages/plantas/VerificarPlanta'
import { ReporteFalla } from './pages/plantas/ReporteFalla'
import { ListaSupermercados } from './pages/supermercados/ListaSupermercados'
import { EvaluarSupermercado } from './pages/supermercados/EvaluarSupermercado'
import { GestionConceptos } from './pages/supermercados/GestionConceptos'
import { HistorialEvaluaciones } from './pages/supermercados/HistorialEvaluaciones'
import { DetalleEvaluacion } from './pages/supermercados/DetalleEvaluacion'
import { Documentacion } from './pages/Documentacion'
import { ListaTickets } from './pages/sistemas/ListaTickets'
import { CrearTicket } from './pages/sistemas/CrearTicket'
import { DetalleTicket } from './pages/sistemas/DetalleTicket'
import { ControlGaritas } from './pages/seguridad/ControlGaritas'
import { HistorialGaritas } from './pages/seguridad/HistorialGaritas'
import { GestionUsuarios } from './pages/admin/GestionUsuarios'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/config/supermercados" element={<Navigate to="/operaciones/supermercados" replace />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/departamento/taller-automotriz" element={<TallerAutomotriz />} />
            <Route path="/departamento/plantas-electricas" element={<PlantasElectricas />} />
            <Route path="/departamento/almacen-y-distribucion" element={<ListaEvaluaciones />} />
            <Route path="/departamento/almacen-y-distribucion/conceptos" element={<GestionConceptosAlmacen />} />
            <Route path="/departamento/almacen-y-distribucion/evaluar" element={<EvaluarAlmacen />} />
            <Route path="/departamento/almacen-y-distribucion/evaluacion/:evaluacionId" element={<DetalleEvaluacionAlmacen />} />
            <Route path="/departamento/sistemas" element={<ListaTickets />} />
            <Route path="/departamento/sistemas/crear" element={<CrearTicket />} />
            <Route path="/departamento/sistemas/ticket/:ticketId" element={<DetalleTicket />} />
            <Route path="/departamento/seguridad" element={<ControlGaritas />} />
            <Route path="/departamento/seguridad/historial" element={<HistorialGaritas />} />
            <Route path="/departamento/:slug" element={<Departamento />} />
            <Route path="/operaciones/supermercados" element={<ListaSupermercados />} />
            <Route path="/operaciones/supermercados/conceptos" element={<GestionConceptos />} />
            <Route path="/operaciones/supermercados/:id/evaluar" element={<EvaluarSupermercado />} />
            <Route path="/operaciones/supermercados/:id/evaluacion/:evaluacionId" element={<DetalleEvaluacion />} />
            <Route path="/operaciones/supermercados/:id" element={<HistorialEvaluaciones />} />
            <Route path="/documentacion" element={<Documentacion />} />
            <Route path="/admin/usuarios" element={<GestionUsuarios />} />
          </Route>
          <Route path="/plantas/:id" element={<ProtectedRoute><VerificarPlanta /></ProtectedRoute>} />
          <Route path="/reporte/:id" element={<ReporteFalla />} />
          <Route path="/taller/vehiculo/:id" element={<DetalleVehiculo />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
