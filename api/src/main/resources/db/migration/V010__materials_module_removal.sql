-- Materials/Inventory no longer has its own module gate: access to it now
-- rides entirely on the job_orders grant (see ModuleRoutes.java). Reverses
-- V004's insert; the FKs from user_modules and corporate_profile_modules
-- cascade automatically.
delete from modules where key = 'materials';
