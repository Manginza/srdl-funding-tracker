import { jsPDF } from 'jspdf'
import { format, parseISO } from 'date-fns'
import type { Requisition } from '@/types/database'

// Organisation letterhead. Address is a locality placeholder — update it to the
// NPO's registered postal/street address before this form is used officially.
export const ORG = {
  name: 'SIKHULULEKILE READING DEVELOPMENT AND LIFE SKILLS',
  address: 'Philippi / Nyanga, Cape Town, Western Cape',
  registrations: 'NPO 118-318   |   PBO 930046314',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '____________________'
  try {
    return format(parseISO(iso), 'dd MMMM yyyy')
  } catch {
    return iso
  }
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return ''
  try {
    return format(parseISO(iso), "dd MMM yyyy 'at' HH:mm")
  } catch {
    return iso
  }
}

function fmtAmount(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface ExportOptions {
  /** Force blank signature lines even when the requisition was approved in-app. */
  wetSignature?: boolean
}

export function generateRequisitionPdf(req: Requisition, opts: ExportOptions = {}): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // --- Letterhead ---------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(ORG.name, pageWidth / 2, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(ORG.address, pageWidth / 2, y, { align: 'center' })
  y += 4.5
  doc.text(ORG.registrations, pageWidth / 2, y, { align: 'center' })
  y += 6
  doc.setDrawColor(30)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  // --- Title --------------------------------------------------------------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('CASH WITHDRAWAL REQUISITION', pageWidth / 2, y, { align: 'center' })
  y += 12

  // --- Detail rows --------------------------------------------------------
  const labelX = margin
  const valueX = margin + 55
  const rowGap = 9
  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(label, labelX, y)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(value, contentWidth - 55)
    doc.text(lines, valueX, y)
    y += rowGap + (lines.length - 1) * 5
  }

  row('Requisition No:', req.requisition_no)
  row('Date of withdrawal:', fmtDate(req.date_of_withdrawal))
  row('Amount:', fmtAmount(req.amount))
  row('Bank account:', req.bank_account)
  row('Category:', req.category)
  row('Status:', req.status.toUpperCase())

  y += 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Purpose:', labelX, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  const purposeLines = doc.splitTextToSize(req.purpose, contentWidth)
  doc.text(purposeLines, labelX, y)
  y += purposeLines.length * 5 + 6

  if (req.status === 'declined' && req.decline_reason) {
    doc.setFont('helvetica', 'bold')
    doc.text('Reason for decline:', labelX, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    const reasonLines = doc.splitTextToSize(req.decline_reason, contentWidth)
    doc.text(reasonLines, labelX, y)
    y += reasonLines.length * 5 + 6
  }

  // --- Signature blocks ---------------------------------------------------
  const approvedInApp = req.status === 'authorised' && !!req.authorised_at && !opts.wetSignature
  const blockWidth = (contentWidth - 10) / 2
  const leftX = margin
  const rightX = margin + blockWidth + 10
  const sigTop = Math.max(y + 8, 210)

  const signatureBlock = (
    x: number,
    heading: string,
    name: string | null,
    subtitle: string,
    printName: boolean,
    stamp: string | null,
  ) => {
    let by = sigTop
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(heading, x, by)
    by += 16
    doc.setDrawColor(60)
    doc.setLineWidth(0.3)
    doc.line(x, by, x + blockWidth, by)
    by += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(printName && name ? name : '(signature)', x, by)
    by += 5
    doc.text(subtitle, x, by)
    by += 10
    doc.line(x, by, x + blockWidth * 0.6, by)
    by += 5
    doc.text('Date', x, by)
    if (stamp) {
      by += 8
      doc.setFontSize(7.5)
      doc.setTextColor(90)
      const stampLines = doc.splitTextToSize(stamp, blockWidth)
      doc.text(stampLines, x, by)
      doc.setTextColor(0)
    }
  }

  signatureBlock(
    leftX,
    'Requested by',
    req.requested_by_name,
    'Executive Director',
    true,
    null,
  )
  signatureBlock(
    rightX,
    'Authorised by',
    approvedInApp ? req.authorised_by_name : null,
    approvedInApp && req.authorised_by_name ? '' : '',
    approvedInApp,
    approvedInApp ? `Approved electronically in-app on ${fmtDateTime(req.authorised_at)}` : null,
  )

  doc.save(`${req.requisition_no}.pdf`)
}
