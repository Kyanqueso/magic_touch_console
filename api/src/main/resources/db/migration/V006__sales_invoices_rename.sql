-- "Supplier invoice" was a misnomer: the document is a sales invoice raised
-- against a purchase order. Rename the table, its indexes, and the voucher FK
-- column to match. Column names inside the table are unchanged.

alter table supplier_invoices rename to sales_invoices;
alter index supplier_invoices_active_idx rename to sales_invoices_active_idx;
alter index supplier_invoices_po_idx     rename to sales_invoices_po_idx;

alter table vouchers rename column supplier_invoice_id to sales_invoice_id;
