import { $, api, fmt, state } from '/web/app.js';

const RANGES = [
  { key: '7d',  label: '7d',  days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
  { key: 'all', label: 'All', days: null },
];

function readRange() {
  const q = (location.hash.split('?')[1] || '');
  const m = /(?:^|&)range=([^&]+)/.exec(q);
  const k = m && decodeURIComponent(m[1]);
  return RANGES.find(r => r.key === k) || RANGES[1];
}

function writeRange(key) {
  const base = (location.hash.replace(/^#/, '').split('?')[0]) || '/projects';
  location.hash = '#' + base + '?range=' + encodeURIComponent(key);
}

function sinceIso(range) {
  if (!range.days) return null;
  return new Date(Date.now() - range.days * 86400 * 1000).toISOString();
}

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const day = iso => iso ? DATE.format(new Date(iso)) : '';
const name = r => r.project_name || r.project_slug;
const money = r => (r.cost_estimated ? '≈ ' : '') + fmt.usd(r.cost_usd);

// Build the summary for the chosen projects. Returns { title, period, rows, totals, notes }.
function buildSummary(rows, range, since) {
  const totals = rows.reduce((t, r) => ({
    sessions: t.sessions + (r.sessions || 0),
    turns:    t.turns + (r.turns || 0),
    tokens:   t.tokens + (r.billable_tokens || 0),
    cost:     t.cost + (r.cost_usd || 0),
    estimated: t.estimated || r.cost_estimated,
  }), { sessions: 0, turns: 0, tokens: 0, cost: 0, estimated: false });
  const start = since || rows.map(r => r.first_seen).filter(Boolean).sort()[0];
  const period = `${day(start)} to ${day(new Date().toISOString())}` +
    (range.days ? ` (last ${range.days} days)` : ' (all time)');
  const plan = state.pricing && state.pricing.plans[state.plan];
  const notes = [
    'Estimated cost uses pay-per-token API prices from pricing.json.' +
      (totals.estimated ? ' Amounts marked ≈ include models priced by family.' : ''),
    plan && plan.monthly ? `Actual spend on the ${plan.label} plan is a flat $${plan.monthly}/month.` : null,
    'Prompt text and file contents are not included in this summary.',
  ].filter(Boolean);
  return {
    title: rows.length === 1 ? `Claude Code usage: ${name(rows[0])}` : 'Claude Code usage summary',
    period, totals, notes,
    rows: rows.map(r => ({
      project: name(r),
      sessions: r.sessions || 0,
      active: r.first_seen ? `${day(r.first_seen)} to ${day(r.last_seen)}` : '',
      tokens: r.billable_tokens || 0,
      cost: money(r),
      share: totals.cost ? (r.cost_usd || 0) / totals.cost : 0,
    })),
  };
}

function summaryMarkdown(s) {
  const lines = [
    `# ${s.title}`, '',
    `**Period:** ${s.period}`,
    '',
    `**Totals:** ${s.rows.length} project${s.rows.length === 1 ? '' : 's'}, ${fmt.int(s.totals.sessions)} sessions, ` +
      `${fmt.int(s.totals.tokens)} billable tokens, ${s.totals.estimated ? '≈ ' : ''}${fmt.usd(s.totals.cost)} estimated cost`, '',
    '| Project | Sessions | Active | Billable tokens | Est. cost | Share |',
    '|---|---:|---|---:|---:|---:|',
    ...s.rows.map(r => `| ${r.project.replace(/\|/g, '/')} | ${fmt.int(r.sessions)} | ${r.active} | ${fmt.int(r.tokens)} | ${r.cost} | ${fmt.pct(r.share)} |`),
    '',
    ...s.notes.map(n => `_${n}_`),
  ];
  return lines.join('\n') + '\n';
}

function summaryHtml(s) {
  return `
    <h3 style="font-size:15px;margin-bottom:4px">${fmt.htmlSafe(s.title)}</h3>
    <p class="muted" style="margin:0 0 12px">${fmt.htmlSafe(s.period)}</p>
    <div class="row cols-4" style="margin-bottom:14px">
      <div class="kpi"><div class="label">Projects</div><div class="value">${fmt.int(s.rows.length)}</div></div>
      <div class="kpi"><div class="label">Sessions</div><div class="value">${fmt.int(s.totals.sessions)}</div></div>
      <div class="kpi"><div class="label">Billable tokens</div><div class="value">${fmt.compact(s.totals.tokens)}</div></div>
      <div class="kpi cost"><div class="label">Est. cost</div><div class="value">${s.totals.estimated ? '≈ ' : ''}${fmt.usd(s.totals.cost)}</div></div>
    </div>
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>project</th><th class="num">sessions</th><th>active</th><th class="num">billable tokens</th><th class="num">est. cost</th><th class="num">share</th></tr></thead>
      <tbody>
        ${s.rows.map(r => `
          <tr>
            <td>${fmt.htmlSafe(r.project)}</td>
            <td class="num">${fmt.int(r.sessions)}</td>
            <td class="mono">${fmt.htmlSafe(r.active)}</td>
            <td class="num">${fmt.int(r.tokens)}</td>
            <td class="num">${fmt.htmlSafe(r.cost)}</td>
            <td class="num">${fmt.pct(r.share)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    </div>
    ${s.notes.map(n => `<p class="muted" style="margin:10px 0 0;font-size:12px">${fmt.htmlSafe(n)}</p>`).join('')}`;
}

export default async function (root) {
  const range = readRange();
  const since = sinceIso(range);
  const rows = await api('/api/projects' + (since ? '?since=' + encodeURIComponent(since) : ''));

  root.innerHTML = `
    <div class="flex" style="margin-bottom:14px;flex-wrap:wrap">
      <h2 style="margin:0;font-size:16px;letter-spacing:-0.01em">Projects</h2>
      <span class="muted" style="font-size:12px">${range.days ? `last ${range.days} days` : 'all time'}</span>
      <div class="spacer"></div>
      <div class="range-tabs" role="tablist">
        ${RANGES.map(r => `<button data-range="${r.key}" class="${r.key === range.key ? 'active' : ''}">${r.label}</button>`).join('')}
      </div>
    </div>

    <div class="card" id="summary-tools" style="margin-bottom:16px">
      <div class="flex" style="flex-wrap:wrap">
        <div>
          <h3 style="margin:0">Summary</h3>
          <p class="muted" style="margin:2px 0 0">Turn this tab into a short report you can paste into an email or attach to an invoice.</p>
        </div>
        <div class="spacer"></div>
        <label for="summary-scope" class="muted">For</label>
        <select id="summary-scope">
          <option value="">All projects</option>
          ${rows.map((r, i) => `<option value="${i}">${fmt.htmlSafe(name(r))}</option>`).join('')}
        </select>
        <button class="primary" id="summary-make" ${rows.length ? '' : 'disabled'}>Create summary</button>
      </div>
      <div id="summary-out" hidden style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
        <div id="summary-body"></div>
        <div class="flex" style="margin-top:14px;flex-wrap:wrap">
          <button id="summary-copy">Copy as text</button>
          <button id="summary-download">Download .md</button>
          <button class="ghost" id="summary-close">Close</button>
          <span class="muted" id="summary-msg" role="status"></span>
        </div>
      </div>
    </div>

    <div class="card">
      <p class="muted" style="margin:0 0 14px">Sorted by billable token spend. Cache reads are billed cheaper, so high cache-read columns are good.</p>
      <div style="overflow-x:auto">
      <table>
        <thead><tr><th>project</th><th class="num">sessions</th><th class="num">turns</th><th class="num">billable tokens</th><th class="num">cache reads</th><th class="num">est. cost</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td title="${fmt.htmlSafe(r.project_slug)}">${fmt.htmlSafe(name(r))}</td>
              <td class="num">${fmt.int(r.sessions)}</td>
              <td class="num">${fmt.int(r.turns)}</td>
              <td class="num">${fmt.int(r.billable_tokens)}</td>
              <td class="num">${fmt.int(r.cache_read_tokens)}</td>
              <td class="num">${fmt.htmlSafe(money(r))}</td>
            </tr>`).join('') || '<tr><td colspan="6" class="muted">no projects in this range</td></tr>'}
        </tbody>
      </table>
      </div>
    </div>`;

  root.querySelectorAll('.range-tabs button').forEach(btn => {
    btn.addEventListener('click', () => writeRange(btn.dataset.range));
  });

  let markdown = '';
  const out = $('#summary-out', root);
  const msg = $('#summary-msg', root);

  $('#summary-make', root).addEventListener('click', () => {
    const pick = $('#summary-scope', root).value;
    const chosen = pick === '' ? rows : [rows[Number(pick)]];
    const s = buildSummary(chosen, range, since);
    markdown = summaryMarkdown(s);
    $('#summary-body', root).innerHTML = summaryHtml(s);
    msg.textContent = '';
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  $('#summary-copy', root).addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      msg.textContent = 'Copied.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents($('#summary-body', root));
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      msg.textContent = 'Copy blocked by the browser. The summary is selected; press Ctrl+C (Cmd+C on Mac).';
    }
  });

  $('#summary-download', root).addEventListener('click', () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `claude-usage-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    msg.textContent = 'Downloaded.';
  });

  $('#summary-close', root).addEventListener('click', () => { out.hidden = true; });
}
