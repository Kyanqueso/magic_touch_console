import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import SegmentedTabs from './SegmentedTabs.jsx'
import PurchaseOrdersTab from './PurchaseOrdersTab.jsx'
import SalesInvoicesTab from './SalesInvoicesTab.jsx'
import VouchersTab from './VouchersTab.jsx'

const TABS = [
  { value: 'PO', label: 'PO' },
  { value: 'SInv', label: 'S Inv' },
  { value: 'Vouchers', label: 'Vouchers' },
]

export default function SupplierDetail({ supplier, profileId, onBack }) {
  const [tab, setTab] = useState('PO')

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 rounded-md p-1 text-content transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-extrabold text-content">{supplier.name}</h1>
      </div>

      <div className="mt-4">
        <SegmentedTabs full value={tab} options={TABS} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === 'PO' && <PurchaseOrdersTab supplier={supplier} profileId={profileId} />}
        {tab === 'SInv' && <SalesInvoicesTab supplier={supplier} profileId={profileId} />}
        {tab === 'Vouchers' && <VouchersTab supplier={supplier} profileId={profileId} />}
      </div>
    </div>
  )
}
