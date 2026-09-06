-- Job No. is the job_orders id; start it at 1001 to match the console's
-- display convention (1001, 1002, ...).
alter table job_orders alter column id restart with 1001;
