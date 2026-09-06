/**
 * Magic Touch Console API — a modular monolith on Quarkus.
 *
 * <p>Every feature module is a package with three layers:
 * <ul>
 *   <li>{@code api}    — JAX-RS resources and request/response DTOs</li>
 *   <li>{@code domain} — services and business rules</li>
 *   <li>{@code data}   — Panache entities and repositories</li>
 * </ul>
 * Only DTOs and service classes cross a module boundary; entities stay in their
 * own module.
 *
 * <p>Modules:
 * <ul>
 *   <li>{@code common}     — shared kernel: base entity, paging, error envelope, constraints</li>
 *   <li>{@code directory}  — customers &amp; suppliers &nbsp;(built)</li>
 *   <li>{@code profiles}   — corporate profiles &amp; registrations &nbsp;(planned)</li>
 *   <li>{@code access}     — users &amp; the permission matrix &nbsp;(planned)</li>
 *   <li>{@code coa}        — chart of accounts &nbsp;(planned)</li>
 *   <li>{@code materials}  — material groups &amp; materials &nbsp;(planned)</li>
 *   <li>{@code joborders}  — job orders &amp; their per-job material specs &nbsp;(planned)</li>
 *   <li>{@code purchasing} — PO &#8594; supplier invoice &#8594; voucher &nbsp;(planned)</li>
 * </ul>
 */
package com.magictouch.console;
