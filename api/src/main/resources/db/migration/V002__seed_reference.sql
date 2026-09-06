-- Reference data that the UI treats as always-present. Categories and groups
-- can still be added at runtime; these are just the starting set.

insert into modules (key, name, sort_order) values
    ('corporate_profiles', 'Corporate Profiles', 10),
    ('chart_of_accounts',  'Chart of Accounts',  20),
    ('customers',          'Customers',          30),
    ('suppliers',          'Suppliers',          40),
    ('job_orders',         'Job Order',          50);

insert into account_categories (name, sort_order) values
    ('Assets (10000 Series)',                                    10),
    ('Assets (20000 Series)',                                    20),
    ('Equity (30000 Series)',                                    30),
    ('Revenue (40000 Series)',                                   40),
    ('Cost of Sales / Service / Goods Sold (50000 series)',      50),
    ('Expenses (60000 Series)',                                  60),
    ('Non Taxable Expenses (90000 Series)',                      90);

insert into material_groups (name, sort_order) values
    ('Newsprint',   10),
    ('Bondpaper',   20),
    ('Onion Skin',  30),
    ('Carbonless',  40),
    ('Tfpaper',     50);
