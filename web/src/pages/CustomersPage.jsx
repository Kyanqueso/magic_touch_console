import EntityListPage from '../components/EntityListPage.jsx'
import { CUSTOMER_COLUMNS } from '../api/parties.js'

export default function CustomersPage() {
  return (
    <EntityListPage
      kind="customer"
      title="Global Customers"
      searchPlaceholder="Search Customer..."
      addLabel="Add Customer"
      idPrefix="CUST"
      columns={CUSTOMER_COLUMNS}
      formTitle="Customer"
      detailNoun="customer"
    />
  )
}
