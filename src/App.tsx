import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Departamento } from './pages/Departamento'
import { ListaSupermercados } from './pages/supermercados/ListaSupermercados'
import { EvaluarSupermercado } from './pages/supermercados/EvaluarSupermercado'

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
            <Route path="/operaciones/supermercados/:id" element={<EvaluarSupermercado />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
