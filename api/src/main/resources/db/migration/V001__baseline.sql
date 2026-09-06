-- =========================================================================
-- V001 baseline — full schema for Magic Touch Console.
--
--  * Enum types are modelled as varchar + CHECK. Stored values are the Java
--    enum names (UPPER_SNAKE), so @Enumerated(STRING) maps straight across.
--  * app_users.id equals the Supabase auth.users id. The FK to auth.users is
--    added only in the Supabase environment (see README) so local Dev Services
--    and CI can migrate without the auth schema present.
--  * updated_at is maintained by Hibernate (@UpdateTimestamp); no DB trigger.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Auth & access
-- -------------------------------------------------------------------------

create table app_users (
    id           uuid primary key,
    employee_no  varchar(20) unique,
    email        varchar(255) not null unique,
    last_name    varchar(80)  not null,
    first_name   varchar(80)  not null,
    phone        varchar(20),
    role         varchar(10)  not null default 'USER' check (role in ('USER', 'ADMIN')),
    disabled_at  timestamptz,
    created_at   timestamptz  not null default now(),
    updated_at   timestamptz  not null default now()
);
create index app_users_role_idx        on app_users (role);
create index app_users_disabled_at_idx on app_users (disabled_at);

create table modules (
    key         varchar(60) primary key,
    name        varchar(120) not null,
    sort_order  integer  not null default 0
);

create table corporate_profiles (
    id              bigint generated always as identity primary key,
    name            varchar(200) not null,
    address         text,
    tin             varchar(20),
    sss             varchar(20),
    phic            varchar(20),
    hdmf            varchar(20),
    wtax_atc1       varchar(10),
    wtax_atc1_rate  numeric(5, 2),
    wtax_atc2       varchar(10),
    wtax_atc2_rate  numeric(5, 2),
    archived_at     timestamptz,
    created_by      uuid,
    updated_by      uuid,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index corporate_profiles_active_idx on corporate_profiles (id) where archived_at is null;

create table user_modules (
    user_id     uuid        not null references app_users (id) on delete cascade,
    module_key  varchar(60) not null references modules (key) on delete cascade,
    access      varchar(10) not null default 'NO_ACCESS' check (access in ('NO_ACCESS', 'VIEWER', 'EDITOR')),
    updated_by  uuid,
    updated_at  timestamptz not null default now(),
    primary key (user_id, module_key)
);

create table corporate_profile_modules (
    corporate_profile_id  bigint      not null references corporate_profiles (id) on delete cascade,
    module_key            varchar(60) not null references modules (key) on delete cascade,
    is_enabled            boolean     not null default false,
    updated_by            uuid,
    updated_at            timestamptz not null default now(),
    primary key (corporate_profile_id, module_key)
);

create table corporate_profile_filing_types (
    id                    bigint generated always as identity primary key,
    corporate_profile_id  bigint      not null references corporate_profiles (id) on delete cascade,
    filing_type           varchar(20) not null,
    unique (corporate_profile_id, filing_type)
);

create table business_registrations (
    id                    bigint generated always as identity primary key,
    corporate_profile_id  bigint      not null references corporate_profiles (id) on delete cascade,
    body                  varchar(3)  not null check (body in ('DTI', 'SEC', 'CDA')),
    registration_no       varchar(40) not null,
    registered_at         date,
    expires_at            date,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);
create index business_registrations_profile_body_idx on business_registrations (corporate_profile_id, body);
create index business_registrations_expires_idx      on business_registrations (expires_at);

create table access_audit (
    id                      bigint generated always as identity primary key,
    grant_kind              varchar(30)  not null check (grant_kind in ('USER_MODULE', 'CORPORATE_PROFILE_MODULE')),
    actor_id                uuid,
    actor_name              varchar(160) not null,
    actor_email             varchar(255) not null,
    target_user_id          uuid,
    target_user_name        varchar(160),
    corporate_profile_id    bigint,
    corporate_profile_name  varchar(200),
    module_key              varchar(60)  not null,
    module_name             varchar(120) not null,
    old_access              varchar(10) check (old_access in ('NO_ACCESS', 'VIEWER', 'EDITOR')),
    new_access              varchar(10) check (new_access in ('NO_ACCESS', 'VIEWER', 'EDITOR')),
    old_enabled             boolean,
    new_enabled             boolean,
    created_at              timestamptz  not null default now()
);
create index access_audit_target_user_idx on access_audit (target_user_id);
create index access_audit_profile_idx     on access_audit (corporate_profile_id);
create index access_audit_actor_idx       on access_audit (actor_id);
create index access_audit_created_idx     on access_audit (created_at);

-- -------------------------------------------------------------------------
-- Reference data (global, shared across every corporate profile)
-- -------------------------------------------------------------------------

create table account_categories (
    id          bigint generated always as identity primary key,
    name        varchar(120) not null unique,
    sort_order  integer  not null default 0
);

create table chart_of_accounts (
    id                   bigint generated always as identity primary key,
    account_category_id  bigint       not null references account_categories (id) on delete restrict,
    account_class        varchar(10)  not null check (account_class in ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    sub_type             varchar(40),
    account_code         varchar(20)  not null unique,
    account_name         varchar(200) not null,
    atc_code             varchar(10),
    tax_rate             numeric(5, 2),
    reference_form       varchar(60),
    archived_at          timestamptz,
    created_by           uuid,
    updated_by           uuid,
    created_at           timestamptz  not null default now(),
    updated_at           timestamptz  not null default now()
);
create index chart_of_accounts_category_idx on chart_of_accounts (account_category_id);
create index chart_of_accounts_active_idx   on chart_of_accounts (account_category_id) where archived_at is null;

create table material_groups (
    id          bigint generated always as identity primary key,
    name        varchar(120) not null unique,
    sort_order  integer  not null default 0
);

create table materials (
    id                 bigint generated always as identity primary key,
    material_group_id  bigint        not null references material_groups (id) on delete restrict,
    material_code      varchar(20)   not null unique,
    name               varchar(160)  not null,
    unit_price         numeric(12, 4) not null default 0,
    archived_at        timestamptz,
    created_by         uuid,
    updated_by         uuid,
    created_at         timestamptz   not null default now(),
    updated_at         timestamptz   not null default now()
);
create index materials_group_idx  on materials (material_group_id);
create index materials_active_idx on materials (material_group_id) where archived_at is null;

-- -------------------------------------------------------------------------
-- Directory — customers & suppliers (deliberately two separate tables)
-- -------------------------------------------------------------------------

create table customers (
    id                    bigint generated always as identity primary key,
    corporate_profile_id  bigint references corporate_profiles (id) on delete cascade,
    scope                 varchar(6)   not null check (scope in ('LOCAL', 'GLOBAL')),
    name                  varchar(200) not null,
    address               text,
    zip_code              varchar(20),
    terms_days            integer      not null default 0,
    tin                   varchar(20),
    branch_code           varchar(10),
    company_type          varchar(20) check (company_type in ('SINGLE', 'OPC', 'PARTNERSHIP', 'CORPORATION')),
    tax_type              varchar(20) check (tax_type in ('VAT', 'NON_VAT', 'VAT_EXEMPT', 'ZERO_RATED')),
    wtax_atc1             varchar(10),
    wtax_atc1_rate        numeric(5, 2),
    wtax_atc2             varchar(10),
    wtax_atc2_rate        numeric(5, 2),
    archived_at           timestamptz,
    created_by            uuid,
    updated_by            uuid,
    created_at            timestamptz  not null default now(),
    updated_at            timestamptz  not null default now(),
    constraint customers_scope_profile_ck check (
        (scope = 'GLOBAL' and corporate_profile_id is null) or
        (scope = 'LOCAL'  and corporate_profile_id is not null)
    )
);
create index customers_name_idx  on customers (corporate_profile_id, name) where archived_at is null;
create index customers_scope_idx on customers (scope);
create unique index customers_taxpayer_uk
    on customers (corporate_profile_id, tin, branch_code)
    where archived_at is null and tin is not null;

create table suppliers (
    id                    bigint generated always as identity primary key,
    corporate_profile_id  bigint references corporate_profiles (id) on delete cascade,
    scope                 varchar(6)   not null check (scope in ('LOCAL', 'GLOBAL')),
    name                  varchar(200) not null,
    address               text,
    zip_code              varchar(20),
    terms_days            integer      not null default 0,
    tin                   varchar(20),
    branch_code           varchar(10),
    company_type          varchar(20) check (company_type in ('SINGLE', 'OPC', 'PARTNERSHIP', 'CORPORATION')),
    tax_type              varchar(20) check (tax_type in ('VAT', 'NON_VAT', 'VAT_EXEMPT', 'ZERO_RATED')),
    wtax_atc1             varchar(10),
    wtax_atc1_rate        numeric(5, 2),
    wtax_atc2             varchar(10),
    wtax_atc2_rate        numeric(5, 2),
    archived_at           timestamptz,
    created_by            uuid,
    updated_by            uuid,
    created_at            timestamptz  not null default now(),
    updated_at            timestamptz  not null default now(),
    constraint suppliers_scope_profile_ck check (
        (scope = 'GLOBAL' and corporate_profile_id is null) or
        (scope = 'LOCAL'  and corporate_profile_id is not null)
    ),
    constraint suppliers_id_profile_uk unique (id, corporate_profile_id)
);
create index suppliers_name_idx  on suppliers (corporate_profile_id, name) where archived_at is null;
create index suppliers_scope_idx on suppliers (scope);
create unique index suppliers_taxpayer_uk
    on suppliers (corporate_profile_id, tin, branch_code)
    where archived_at is null and tin is not null;

-- -------------------------------------------------------------------------
-- Job orders
-- -------------------------------------------------------------------------

create table job_orders (
    id                    bigint generated always as identity primary key,
    corporate_profile_id  bigint      not null references corporate_profiles (id) on delete cascade,
    customer_id           bigint      not null references customers (id) on delete restrict,
    status                varchar(10) not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
    branch                varchar(80),
    series_from           varchar(20),
    series_to             varchar(20),
    job_description       varchar(160),
    specification         varchar(160),
    equipment             varchar(60),
    date_ordered          date,
    delivery_date         date,
    customer_po_ref       varchar(40),
    atp_no                varchar(40),
    atp_date              date,
    invoice_no            varchar(40),
    invoice_date          date,
    or_no                 varchar(40),
    or_date               date,
    qty                   integer,
    unit                  varchar(20),
    size                  varchar(40),
    unit_price            numeric(12, 4),
    operator              varchar(120),
    collator              varchar(120),
    other_instructions    text,
    archived_at           timestamptz,
    created_by            uuid,
    updated_by            uuid,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);
create index job_orders_active_idx   on job_orders (corporate_profile_id, id desc) where archived_at is null;
create index job_orders_customer_idx on job_orders (customer_id);
create index job_orders_ordered_idx  on job_orders (date_ordered);

create table job_order_materials (
    id            bigint generated always as identity primary key,
    job_order_id  bigint   not null references job_orders (id) on delete cascade,
    material_id   bigint   not null references materials (id) on delete restrict,
    line_no       integer  not null,
    text_color    varchar(40),
    number_color  varchar(40),
    ink1          varchar(40),
    ink2          varchar(40),
    perforation1  varchar(40),
    perforation2  varchar(40),
    distribution  varchar(60),
    back_copy     varchar(60),
    size_needed   integer,
    qty_needed    integer,
    unique (job_order_id, line_no)
);
create index job_order_materials_material_idx on job_order_materials (material_id);

-- -------------------------------------------------------------------------
-- PO  ->  supplier invoice  ->  voucher
-- -------------------------------------------------------------------------

create table purchase_orders (
    id                    bigint generated always as identity primary key,
    corporate_profile_id  bigint  not null references corporate_profiles (id) on delete cascade,
    supplier_id           bigint  not null,
    po_date               date    not null,
    prepared_by           varchar(120),
    prepared_date         date,
    approved_by           varchar(120),
    approved_date         date,
    archived_at           timestamptz,
    created_by            uuid,
    updated_by            uuid,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now(),
    -- forces the PO's supplier to be a Local supplier of the same profile
    constraint purchase_orders_supplier_fk
        foreign key (supplier_id, corporate_profile_id)
        references suppliers (id, corporate_profile_id) on delete restrict
);
create index purchase_orders_active_idx   on purchase_orders (corporate_profile_id, id desc) where archived_at is null;
create index purchase_orders_supplier_idx on purchase_orders (supplier_id);

create table purchase_order_items (
    id                 bigint generated always as identity primary key,
    purchase_order_id  bigint        not null references purchase_orders (id) on delete cascade,
    material_id        bigint        not null references materials (id) on delete restrict,
    line_no            integer       not null,
    qty                numeric(12, 2) not null,
    unit               varchar(20)   not null,
    unit_price         numeric(12, 4) not null,
    unique (purchase_order_id, line_no)
);
create index purchase_order_items_material_idx on purchase_order_items (material_id);

create table supplier_invoices (
    id                    bigint generated always as identity primary key,
    corporate_profile_id  bigint not null references corporate_profiles (id) on delete cascade,
    purchase_order_id     bigint not null references purchase_orders (id) on delete restrict,
    sinv_date             date   not null,
    debit_account_id      bigint references chart_of_accounts (id) on delete restrict,
    credit_account_id     bigint references chart_of_accounts (id) on delete restrict,
    archived_at           timestamptz,
    created_by            uuid,
    updated_by            uuid,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);
create index supplier_invoices_active_idx on supplier_invoices (corporate_profile_id, id desc) where archived_at is null;
create index supplier_invoices_po_idx     on supplier_invoices (purchase_order_id);

create table vouchers (
    id                         bigint generated always as identity primary key,
    corporate_profile_id       bigint        not null references corporate_profiles (id) on delete cascade,
    supplier_invoice_id        bigint        not null references supplier_invoices (id) on delete restrict,
    voucher_date               date          not null,
    net_amount                 numeric(14, 2) not null,
    is_paid                    boolean       not null default false,
    paid_at                    timestamptz,
    debit_account_id           bigint references chart_of_accounts (id) on delete restrict,
    credit_cash_account_id     bigint references chart_of_accounts (id) on delete restrict,
    credit_payable_account_id  bigint references chart_of_accounts (id) on delete restrict,
    archived_at                timestamptz,
    created_by                 uuid,
    updated_by                 uuid,
    created_at                 timestamptz not null default now(),
    updated_at                 timestamptz not null default now()
);
create index vouchers_active_idx on vouchers (corporate_profile_id, id desc) where archived_at is null;
create index vouchers_sinv_idx   on vouchers (supplier_invoice_id);
create index vouchers_paid_idx   on vouchers (is_paid);
