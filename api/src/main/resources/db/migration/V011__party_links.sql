-- Links a customer to the supplier record created alongside it via "Also add
-- as Supplier". A join table, not FK columns on customers/suppliers directly:
-- the two rows cannot reference each other atomically at insert time (one
-- must exist before the other), and this keeps the two tables' deliberate
-- separation intact rather than coupling them structurally. At most one link
-- per party in either direction, enforced by the primary key / unique pair.
create table party_links (
    customer_id  bigint      primary key references customers (id) on delete cascade,
    supplier_id  bigint      not null unique references suppliers (id) on delete cascade,
    created_at   timestamptz not null default now(),
    created_by   uuid
);
