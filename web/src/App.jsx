import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import CorporateProfilesPage from './pages/CorporateProfilesPage.jsx'
import ChartOfAccountsPage from './pages/ChartOfAccountsPage.jsx'
import CustomersPage from './pages/CustomersPage.jsx'
import SuppliersPage from './pages/SuppliersPage.jsx'
import MaterialsPage from './pages/MaterialsPage.jsx'
import MyProfilePage from './pages/MyProfilePage.jsx'
import { ForbiddenPage, NotFoundPage } from './pages/ErrorPage.jsx'
import { RequireAuth, RequireModule } from './lib/auth.jsx'

const protect = (element) => <RequireAuth>{element}</RequireAuth>

// Gate a route on a module grant. The API enforces the same matrix server-side.
const gate = (moduleKey, element) => (
  <RequireModule moduleKey={moduleKey}>{element}</RequireModule>
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/corporate-profiles" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/corporate-profiles" element={gate('corporate_profiles', <CorporateProfilesPage />)} />
      <Route path="/chart-of-accounts" element={gate('chart_of_accounts', <ChartOfAccountsPage />)} />
      <Route path="/customers" element={gate('customers', <CustomersPage />)} />
      <Route path="/suppliers" element={gate('suppliers', <SuppliersPage />)} />
      <Route path="/materials" element={gate('materials', <MaterialsPage />)} />
      <Route path="/my-profile" element={protect(<MyProfilePage />)} />

      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
