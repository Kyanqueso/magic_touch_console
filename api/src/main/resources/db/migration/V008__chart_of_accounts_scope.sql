-- Chart of Accounts gains LOCAL/GLOBAL scope, matching customers/suppliers:
-- a company's own accounts (LOCAL) alongside the shared, always-visible set
-- (GLOBAL). Existing rows all become GLOBAL - every account today is
-- implicitly shared across every corporate profile.

alter table chart_of_accounts
    add column corporate_profile_id bigint references corporate_profiles (id) on delete cascade,
    add column scope varchar(6) not null default 'GLOBAL' check (scope in ('LOCAL', 'GLOBAL'));

alter table chart_of_accounts alter column scope drop default;

alter table chart_of_accounts
    add constraint chart_of_accounts_scope_profile_ck check (
        (scope = 'GLOBAL' and corporate_profile_id is null) or
        (scope = 'LOCAL'  and corporate_profile_id is not null)
    );

alter table account_categories
    add column corporate_profile_id bigint references corporate_profiles (id) on delete cascade,
    add column scope varchar(6) not null default 'GLOBAL' check (scope in ('LOCAL', 'GLOBAL'));

alter table account_categories alter column scope drop default;

alter table account_categories
    add constraint account_categories_scope_profile_ck check (
        (scope = 'GLOBAL' and corporate_profile_id is null) or
        (scope = 'LOCAL'  and corporate_profile_id is not null)
    );

-- account_code was globally unique; now unique per scope (every GLOBAL row
-- shares corporate_profile_id = null, so global codes still collide with
-- each other - only LOCAL codes are free to repeat across profiles).
alter table chart_of_accounts drop constraint chart_of_accounts_account_code_key;
create unique index chart_of_accounts_code_uk
    on chart_of_accounts (corporate_profile_id, account_code)
    where archived_at is null;

-- account_categories has no archive column (see ReferenceGroup), so no
-- partial filter is needed here.
alter table account_categories drop constraint account_categories_name_key;
create unique index account_categories_name_uk
    on account_categories (corporate_profile_id, lower(name));
