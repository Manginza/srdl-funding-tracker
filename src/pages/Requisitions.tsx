import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Filter } from 'lucide-react'
import { store } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/format'
import { hasRole, useCurrentUser, USERS } from '@/lib/currentUser'
import Badge from '@/components/ui/Badge'
import RequisitionForm from '@/components/RequisitionForm'
import type { Requisition, RequisitionStatus } from '@/types/database'

const statusVariant = (s: RequisitionStatus) =>
  s === 'authorised' ? 'success' : s === 'declined' ? 'danger' : 'warning'

export default function Requisitions() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const canRequest = hasRole(user, 'requester') || hasRole(user, 'admin')

  const [reqs, setReqs] = useState<Requisition[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRequester, setFilterRequester] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = useCallback(async () => {
    const rows = await store.getRequisitions({
      status: (filterStatus || undefined) as RequisitionStatus | undefined,
      requestedBy: filterRequester || undefined,
      from: from || undefined,
      to: to || undefined,
    })
    setReqs(rows)
    setLoading(false)
  }, [filterStatus, filterRequester, from, to])

  useEffect(() => { load() }, [load])

  function handleSaved() {
    setShowForm(false)
    load()
  }

  if (showForm) {
    return <RequisitionForm onSaved={handleSaved} onCancel={() => setShowForm(false)} />
  }

  const pendingTotal = reqs.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
  const authorisedTotal = reqs.filter(r => r.status === 'authorised').reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Requisitions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Withdrawal requests, approvals and audit trail</p>
        </div>
        {canRequest && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <Plus size={16} /> New Requisition
          </button>
        )}
      </div>

      {/* Running totals for the current filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending (this view)</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(pendingTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Cash requested but not yet authorised</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Authorised (this view)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(authorisedTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Approved for withdrawal</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-lg p-3">
        <Filter size={16} className="text-gray-400" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="authorised">Authorised</option>
          <option value="declined">Declined</option>
        </select>
        <select value={filterRequester} onChange={e => setFilterRequester(e.target.value)} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm">
          <option value="">All requesters</option>
          {USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-500">
          From
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-500">
          To
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm" />
        </label>
      </div>

      {loading ? (
        <p className="text-center py-12 text-gray-400">Loading...</p>
      ) : reqs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 mb-3">No requisitions {filterStatus || filterRequester || from || to ? 'match this filter' : 'yet'}</p>
          {canRequest && !filterStatus && !filterRequester && (
            <button onClick={() => setShowForm(true)} className="text-primary-600 text-sm font-medium hover:text-primary-700">
              Raise your first requisition
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Requisition No</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Requested by</th>
                <th className="px-4 py-3 font-medium">Authorised by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reqs.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/requisitions/${r.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{r.requisition_no}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(r.date_of_withdrawal)}</td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.category}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(r.status)}>{r.status}</Badge></td>
                  <td className="px-4 py-3 text-gray-600">{r.requested_by_name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.authorised_by_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
