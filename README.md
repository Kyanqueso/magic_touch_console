# Magic Touch Console

As of September 7, 2026, this project is still a work of progress and many more features will be included in the near future

Currently just finalizing the base features and user flows and making sure it does not break in deployment / production mode, Moreover, I aim to ensure the system is reliable enough for target users to explore the experience, provide early feedback, and get a feel for the product as it continues to take shape.

Printing ERP: corporate profiles, chart of accounts, customers, suppliers,
materials, job orders, and purchasing (PO → invoice → voucher).

- `web/` — React + Vite
- `api/` — Quarkus (Java 21), deployed to AWS Lambda
- Supabase — Postgres and login
