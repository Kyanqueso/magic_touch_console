-- Materials becomes per-corporate-profile "Inventory": each profile keeps its
-- own material list instead of sharing one global catalog, and there is no
-- GLOBAL option (unlike customers/suppliers/chart of accounts) - a material
-- always belongs to exactly one profile.
--
-- No production material data exists yet to preserve, so this migration
-- clears the module's tables rather than attempting a data migration.
-- DESTRUCTIVE - safe only because nothing is deployed with real material
-- data. Do not run this against an environment that has any.
delete from job_order_materials;
delete from purchase_order_items;
delete from materials;
delete from material_groups;

-- Both tables are now empty, so a straight not-null add is safe.
alter table materials
    add column corporate_profile_id bigint not null references corporate_profiles (id) on delete cascade;

alter table material_groups
    add column corporate_profile_id bigint not null references corporate_profiles (id) on delete cascade;

alter table materials drop constraint materials_material_code_key;
create unique index materials_code_uk
    on materials (corporate_profile_id, material_code)
    where archived_at is null;

alter table material_groups drop constraint material_groups_name_key;
create unique index material_groups_name_uk
    on material_groups (corporate_profile_id, lower(name));

-- New profiles start with an empty group list; groups are created on the fly
-- via the existing find-or-create combobox flow (same as today), so V002's
-- global material-groups seed no longer applies and is not re-seeded per
-- profile. V002 itself is left untouched - never edit a shipped migration.
