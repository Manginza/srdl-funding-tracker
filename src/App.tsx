import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Grants from '@/pages/Grants'
import Balances from '@/pages/Balances'
import Compliance from '@/pages/Compliance'
import Requisitions from '@/pages/Requisitions'
import RequisitionDetail from '@/pages/RequisitionDetail'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/grants" element={<Grants />} />
          <Route path="/balances" element={<Balances />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/requisitions" element={<Requisitions />} />
          <Route path="/requisitions/:id" element={<RequisitionDetail />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
