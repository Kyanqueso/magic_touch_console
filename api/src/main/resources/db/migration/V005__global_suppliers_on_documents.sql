-- Let purchase orders reference a Global supplier.
--
-- V001 tied a PO to its supplier with a composite key:
--
--   foreign key (supplier_id, corporate_profile_id)
--       references suppliers (id, corporate_profile_id)
--
-- A Global supplier has corporate_profile_id null and a PO's is not null, so
-- that pair could never match one - global suppliers were structurally barred
-- from purchasing. Global entries exist so the same firm need not be re-added
-- to every corporate profile, so that was the wrong constraint.
--
-- The document stays owned by the profile that raised it: purchase_orders
-- keeps its own not-null corporate_profile_id, and every list query filters on
-- it, so two profiles buying from one global supplier never see each other's
-- documents.
alter table purchase_orders drop constraint purchase_orders_supplier_fk;

alter table purchase_orders
    add constraint purchase_orders_supplier_fk
    foreign key (supplier_id) references suppliers (id) on delete restrict;

-- The supplier must still belong to the buying profile, or be global. The
-- database cannot express that across tables, so PurchasingLookups enforces it.

-- suppliers_id_profile_uk existed only as the target of the old composite key.
-- Left in place: it is redundant beside the primary key but harmless, and
-- dropping it is not worth the risk on live data.
