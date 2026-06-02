import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Departamento } from './pages/Departamento'
import { ListaSupermercados } from './pages/supermercados/ListaSupermercados'
import { EvaluarSupermercado } from './pages/supermercados/EvaluarSupermercado'
import { GestionConceptos } from './pages/supermercados/GestionConceptos'
import { HistorialEvaluaciones } from './pages/supermercados/HistorialEvaluaciones'
import { DetalleEvaluacion } from './pages/supermercados/DetalleEvaluacion'

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
            <Route path="/departamento/:slug" element={<Departamento />} />
            <Route path="/operaciones/supermercados" element={<ListaSupermercados />} />
            <Route path="/operaciones/supermercados/conceptos" element={<GestionConceptos />} />
            <Route path="/operaciones/supermercados/:id/evaluar" element={<EvaluarSupermercado />} />
            <Route path="/operaciones/supermercados/:id/evaluacion/:evaluacionId" element={<DetalleEvaluacion />} />
            <Route path="/operaciones/supermercados/:id" element={<HistorialEvaluaciones />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
