-- The console's nav has six destinations but V002 seeded only five module
-- keys, so "Materials" had no row in `modules` and therefore could never
-- appear in a user's access matrix or a corporate profile's module gates.
--
-- sort_order 45 places it between Suppliers (40) and Job Order (50), matching
-- the order of NAV_ITEMS in web/src/components/AppHeader.jsx.
--
-- Existing users pick this up as NO_ACCESS: `user_modules` stores only granted
-- rows, and AccessService.matrixFor() defaults anything absent to NO_ACCESS.
insert into modules (key, name, sort_order)
values ('materials', 'Materials', 45)
on conflict (key) do nothing;
