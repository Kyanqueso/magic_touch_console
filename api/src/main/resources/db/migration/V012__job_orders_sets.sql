-- "No. of Sets" drives qty and series_to on job orders that use it
-- (qty = sets * 50, series_to = series_from + qty); nullable because
-- existing job orders predate the concept and keep entering qty/series_to
-- by hand.
alter table job_orders add column no_of_sets integer;
