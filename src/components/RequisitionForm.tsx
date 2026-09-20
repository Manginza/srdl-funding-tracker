import { useState } from 'react'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { store } from '@/lib/store'
import { todayISO } from '@/lib/format'
import { hasRole, useCurrentUser } from '@/lib/currentUser'

export const DEFAULT_PURPOSE =
  'Cash required for local taxi transport for programme/operational travel. ' +
  'E-hailing services do not operate in the Philippi/Nyanga service area due to ' +
  'community safety concerns, so local taxi operators (cash only) are used instead.'

export const DEFAULT_BANK_ACCOUNT = 'Nedbank Current Account 1212869494 (SRDL)'

// Kept in sync with the categories used in the monthly bank reconciliation so a
// requisition can eventually map onto a reconciliation line.
export const REQUISITION_CATEGORIES = [
  'Fuel and Transport',
  'Programme Costs',
  'Stipends',
  'Office & Admin',
  'Other',
]

interface Props {
  onSaved: () => void
  onCancel: () => void
}

export default function RequisitionForm({ onSaved, onCancel }: Props) {
  const user = useCurrentUser()
  const canRequest = hasRole(user, 'requester') || hasRole(user, 'admin')

  const [dateOfWithdrawal, setDateOfWithdrawal] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Fuel and Transport')
  const [purpose, setPurpose] = useState(DEFAULT_PURPOSE)
  const [bankAccount, setBankAccount] = useState(DEFAULT_BANK_ACCOUNT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!dateOfWithdrawal) return setError('Date of withdrawal is required')
    if (!Number.isFinite(amt) || amt <= 0) return setError('Amount must be greater than zero')
    if (!purpose.trim()) return setError('Purpose is required')
    setError(null)
    setSaving(true)
    try {
      await store.createRequisition(
        {
          date_of_withdrawal: dateOfWithdrawal,
          amount: amt,
          purpose: purpose.trim(),
          category: category.trim() || 'Fuel and Transport',
          bank_account: bankAccount.trim() || DEFAULT_BANK_ACCOUNT,
        },
        user,
      )
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back to requisitions
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">New Cash Requisition</h2>

        {!canRequest ? (
          <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <ShieldAlert size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              You are acting as <strong>{user.name}</strong>, who does not hold the <em>requester</em> role.
              Switch to a requester (bottom of the sidebar) to raise a requisition.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of withdrawal</label>
                <input
                  type="date"
                  value={dateOfWithdrawal}
                  onChange={e => setDateOfWithdrawal(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ZAR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                list="requisition-categories"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <datalist id="requisition-categories">
                {REQUISITION_CATEGORIES.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-gray-400">Keep in step with the monthly reconciliation categories.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank account</label>
              <input
                type="text"
                value={bankAccount}
                onChange={e => setBankAccount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <textarea
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">Pre-filled with the standard wording — edit for one-off cases.</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Submitting...' : 'Submit Requisition'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
