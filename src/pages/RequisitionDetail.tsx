import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Check, X, ShieldAlert, Clock, FileText, Link2 } from 'lucide-react'
import { store } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/format'
import { hasRole, useCurrentUser } from '@/lib/currentUser'
import { generateRequisitionPdf } from '@/lib/requisitionPdf'
import Badge from '@/components/ui/Badge'
import type { Requisition, RequisitionAudit, RequisitionStatus } from '@/types/database'

const statusVariant = (s: RequisitionStatus) =>
  s === 'authorised' ? 'success' : s === 'declined' ? 'danger' : 'warning'

function auditLabel(action: RequisitionAudit['action']): string {
  switch (action) {
    case 'created': return 'Created'
    case 'authorised': return 'Authorised'
    case 'declined': return 'Declined'
    case 'edited': return 'Edited'
    case 'pdf_exported': return 'Exported PDF'
    default: return action
  }
}

export default function RequisitionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const canAuthorise = hasRole(user, 'authoriser') || hasRole(user, 'admin')

  const [req, setReq] = useState<Requisition | undefined>()
  const [audit, setAudit] = useState<RequisitionAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<'authorise' | 'decline' | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [wetSignature, setWetSignature] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const [r, a] = await Promise.all([store.getRequisition(id), store.getRequisitionAudit(id)])
    setReq(r)
    setAudit(a)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleAuthorise() {
    if (!id) return
    setBusy(true)
    try {
      await store.authoriseRequisition(id, user)
      setConfirming(null)
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function handleDecline() {
    if (!id || !declineReason.trim()) return
    setBusy(true)
    try {
      await store.declineRequisition(id, declineReason.trim(), user)
      setConfirming(null)
      setDeclineReason('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function handleExport() {
    if (!req) return
    generateRequisitionPdf(req, { wetSignature })
    await store.logRequisitionExport(req.id, user, wetSignature ? 'Exported PDF (blank signature lines)' : 'Exported PDF')
    await load()
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>
  if (!req) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/requisitions')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back to requisitions
        </button>
        <p className="text-gray-400">Requisition not found.</p>
      </div>
    )
  }

  const isPending = req.status === 'pending'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/requisitions')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Back to requisitions
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <p className="font-mono text-sm text-gray-500">{req.requisition_no}</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(req.amount)}</h1>
          </div>
          <Badge variant={statusVariant(req.status)}>{req.status}</Badge>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Date of withdrawal</dt>
            <dd className="text-gray-900 mt-0.5">{formatDate(req.date_of_withdrawal)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Category</dt>
            <dd className="text-gray-900 mt-0.5">{req.category}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Bank account</dt>
            <dd className="text-gray-900 mt-0.5">{req.bank_account}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Purpose</dt>
            <dd className="text-gray-900 mt-0.5">{req.purpose}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Requested by</dt>
            <dd className="text-gray-900 mt-0.5">{req.requested_by_name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Authorised by</dt>
            <dd className="text-gray-900 mt-0.5">{req.authorised_by_name ?? '—'}</dd>
          </div>
          {req.status === 'declined' && req.decline_reason && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Reason for decline</dt>
              <dd className="text-red-700 mt-0.5">{req.decline_reason}</dd>
            </div>
          )}
        </dl>

        {req.linked_transaction_id && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <Link2 size={16} /> Reconciled against bank transaction {req.linked_transaction_id}
          </div>
        )}
      </div>

      {/* Approval actions */}
      {isPending && canAuthorise && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {!confirming ? (
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming('authorise')}
                className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
              >
                <Check size={16} /> Authorise
              </button>
              <button
                onClick={() => setConfirming('decline')}
                className="flex items-center gap-1.5 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                <X size={16} /> Decline
              </button>
            </div>
          ) : confirming === 'authorise' ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-800">
                Authorise <strong>{req.requisition_no}</strong> for <strong>{formatCurrency(req.amount)}</strong> as <strong>{user.name}</strong>? This is recorded in the audit trail and cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={handleAuthorise} disabled={busy} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {busy ? 'Saving...' : 'Confirm authorise'}
                </button>
                <button onClick={() => setConfirming(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-800">
                Decline <strong>{req.requisition_no}</strong> for <strong>{formatCurrency(req.amount)}</strong>. A reason is required.
              </p>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                rows={3}
                placeholder="Reason for declining..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-3">
                <button onClick={handleDecline} disabled={busy || !declineReason.trim()} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {busy ? 'Saving...' : 'Confirm decline'}
                </button>
                <button onClick={() => { setConfirming(null); setDeclineReason('') }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {isPending && !canAuthorise && (
        <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Clock size={16} className="mt-0.5 shrink-0" /> Awaiting authorisation. Switch to an authoriser to act on this request.
        </div>
      )}

      {!isPending && (
        <div className="flex items-start gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          This requisition is {req.status} and locked. To correct it, raise a new requisition — historical records are immutable.
        </div>
      )}

      {/* PDF export */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><FileText size={16} /> Signable form</h2>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={wetSignature} onChange={e => setWetSignature(e.target.checked)} className="rounded" />
            Print blank signature lines (for wet signature)
          </label>
          <button onClick={handleExport} className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
            <Download size={16} /> Export as PDF
          </button>
        </div>
      </div>

      {/* Audit trail */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Audit trail</h2>
        <ol className="space-y-4">
          {audit.map(a => (
            <li key={a.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="w-2 h-2 rounded-full bg-primary-500 mt-1.5" />
                <span className="flex-1 w-px bg-gray-200" />
              </div>
              <div className="pb-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{auditLabel(a.action)}</span> · {a.actor_name}
                </p>
                {a.detail && <p className="text-xs text-gray-500 mt-0.5">{a.detail}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.created_at)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
