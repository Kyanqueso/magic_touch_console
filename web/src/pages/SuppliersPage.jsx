import EntityListPage from '../components/EntityListPage.jsx'
import { SUPPLIER_COLUMNS } from '../api/parties.js'

export default function SuppliersPage() {
  return (
    <EntityListPage
      kind="supplier"
      title="Global Suppliers"
      searchPlaceholder="Search Supplier..."
      addLabel="Add Supplier"
      idPrefix="Supp"
      columns={SUPPLIER_COLUMNS}
      formTitle="Supplier"
      detailNoun="supplier"
    />
  )
}
