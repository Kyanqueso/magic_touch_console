import { peso, formatDate } from './format.js'

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const row = ([label, value]) => `
  <div class="f"><span class="l">${esc(label)}</span><span class="v">${esc(value || '—')}</span></div>`

const itemRow = (i, n) => `
  <tr>
    <td class="c">${n}</td>
    <td>${esc(i.materialCode)}</td>
    <td>${esc(i.description)}</td>
    <td class="r">${esc(i.qty)}</td>
    <td>${esc(i.unit)}</td>
    <td class="r">${esc(peso(i.unitPrice))}</td>
    <td class="r">${esc(peso(i.amount))}</td>
  </tr>`

const signature = ([label, name]) => `
  <div class="sig"><div class="line">${esc(name || '')}</div><div class="cap">${esc(label)}</div></div>`

// An arbitrary table, for records that are not priced line items.
const table = ({ caption, headers, rows }) => `
  ${caption ? `<h2 class="sec">${esc(caption)}</h2>` : ''}
  <table>
    <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c === 0 || c ? c : '—')}</td>`).join('')}</tr>`)
      .join('')}</tbody>
  </table>`

/**
 * Renders a document and opens the browser's print dialog.
 *
 * Uses a hidden iframe rather than window.open: popup blockers routinely kill
 * the latter, and it would fail silently after the user clicked Print.
 */
export function printDocument({
  docTitle,
  number,
  company = 'Magic Touch Console',
  meta = [],
  items = [],
  total = null,
  extras = [],
  tables = [],
  signatures = [],
  landscape = false,
}) {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(number || docTitle)}</title><style>
  @page { margin: 14mm; ${landscape ? 'size: landscape;' : ''} }
  * { box-sizing: border-box; }
  body { margin:0; font: 12px/1.5 Lato, Helvetica, Arial, sans-serif; color:#1a1d21; }
  header { display:flex; justify-content:space-between; align-items:flex-start;
           border-bottom:2px solid #8122E0; padding-bottom:10px; margin-bottom:16px; }
  .co { font-size:16px; font-weight:800; color:#8122E0; }
  .doc { font-size:15px; font-weight:800; letter-spacing:.5px; text-align:right; }
  .no { font-size:12px; color:#5b6470; text-align:right; }
  .meta { display:grid; grid-template-columns:1fr 1fr; gap:4px 24px; margin-bottom:16px; }
  .f { display:flex; gap:8px; }
  .l { color:#5b6470; min-width:110px; }
  .v { font-weight:600; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.4px;
       color:#5b6470; border-bottom:1px solid #CECBF6; padding:6px 4px; }
  td { padding:6px 4px; border-bottom:1px solid #eee; }
  td.r, th.r { text-align:right; } td.c { text-align:center; color:#5b6470; }
  tfoot td { border-top:2px solid #1a1d21; border-bottom:none; font-weight:800; padding-top:8px; }
  .sec { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.5px;
         color:#8122E0; margin:18px 0 0; }
  .sigs { display:flex; gap:40px; margin-top:48px; }
  .sig { flex:1; }
  .line { border-bottom:1px solid #1a1d21; min-height:22px; font-weight:600; }
  .cap { font-size:11px; color:#5b6470; margin-top:4px; }
  footer { margin-top:28px; font-size:10px; color:#5b6470; }
</style></head><body>
  <header>
    <div class="co">${esc(company)}</div>
    <div><div class="doc">${esc(docTitle)}</div><div class="no">${esc(number || '')}</div></div>
  </header>
  <div class="meta">${meta.map(row).join('')}</div>
  ${
    items.length
      ? `<table>
    <thead><tr><th class="c">#</th><th>Code</th><th>Description</th><th class="r">Qty</th>
    <th>Unit</th><th class="r">Unit Price</th><th class="r">Amount</th></tr></thead>
    <tbody>${items.map((i, n) => itemRow(i, n + 1)).join('')}</tbody>
    ${total != null ? `<tfoot><tr><td colspan="6" class="r">Total</td><td class="r">${esc(peso(total))}</td></tr></tfoot>` : ''}
  </table>`
      : ''
  }
  ${extras.length ? `<div class="meta" style="margin-top:16px">${extras.map(row).join('')}</div>` : ''}
  ${tables.map(table).join('')}
  ${signatures.length ? `<div class="sigs">${signatures.map(signature).join('')}</div>` : ''}
  <footer>Printed ${esc(formatDate(new Date().toISOString().slice(0, 10)))}</footer>
</body></html>`

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  frame.onload = () => {
    try {
      frame.contentWindow.focus()
      frame.contentWindow.print()
    } finally {
      // Give the dialog time to take a snapshot before the frame goes away.
      setTimeout(() => frame.remove(), 1000)
    }
  }
  frame.srcdoc = html
  document.body.appendChild(frame)
}
