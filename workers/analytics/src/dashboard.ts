export const dashboard = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Site Views</title>
<style>
  :root { --bg: #f9fafb; --surface: #fff; --ink: #111827; --muted: #6b7280; --line: #e5e7eb; --accent: #2563eb; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0b0f17; --surface: #121826; --ink: #e5e7eb; --muted: #9ca3af; --line: #1f2937; --accent: #60a5fa; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 880px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 0 0 12px; }
  form { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0 24px; }
  input, select, button { font: inherit; padding: 6px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: var(--ink); }
  input { flex: 1 1 220px; }
  button { background: var(--accent); border-color: var(--accent); color: #fff; cursor: pointer; }
  section { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
  .total { font-size: 40px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .muted { color: var(--muted); }
  .bars { display: flex; align-items: flex-end; gap: 2px; height: 120px; }
  .bars div { flex: 1; background: var(--accent); border-radius: 2px 2px 0 0; min-height: 1px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 0; border-top: 1px solid var(--line); overflow-wrap: anywhere; }
  td:last-child { text-align: right; font-variant-numeric: tabular-nums; padding-left: 12px; }
  .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
  .grid section { margin: 0; }
</style>
</head>
<body>
<main>
  <h1>Site views</h1>
  <p class="muted">Page views on ben.kallaus.me. No cookies, no visitor IDs.</p>
  <form id="controls">
    <input id="token" type="password" placeholder="Stats token" autocomplete="current-password" required>
    <select id="days">
      <option value="7">Last 7 days</option>
      <option value="30" selected>Last 30 days</option>
      <option value="90">Last 90 days</option>
      <option value="365">Last year</option>
    </select>
    <button>Load</button>
  </form>
  <p id="status" class="muted"></p>
  <div id="report" hidden>
    <section>
      <h2>Total views</h2>
      <div class="total" id="total"></div>
      <div class="bars" id="daily"></div>
    </section>
    <div class="grid">
      <section><h2>Pages</h2><table id="pages"></table></section>
      <section><h2>Referrers</h2><table id="referrers"></table></section>
    </div>
  </div>
</main>
<script>
  const $ = (id) => document.getElementById(id);
  const tokenKey = 'stats-token';
  try { $('token').value = localStorage.getItem(tokenKey) ?? ''; } catch {}

  function fillTable(table, rows, label) {
    table.replaceChildren(...rows.map((row) => {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      const views = document.createElement('td');
      name.textContent = row[label];
      views.textContent = row.views.toLocaleString();
      tr.append(name, views);
      return tr;
    }));
    if (!rows.length) table.innerHTML = '<tr><td class="muted">Nothing yet</td><td></td></tr>';
  }

  function fillDaily(stats, days) {
    const byDay = new Map(stats.daily.map((row) => [row.day, row.views]));
    const start = new Date(stats.since + 'T00:00:00Z');
    const series = Array.from({ length: days }, (_, i) => {
      const day = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
      return { day, views: byDay.get(day) ?? 0 };
    });
    const peak = Math.max(1, ...series.map((point) => point.views));
    $('daily').replaceChildren(...series.map((point) => {
      const bar = document.createElement('div');
      bar.style.height = (point.views / peak) * 100 + '%';
      bar.title = point.day + ': ' + point.views.toLocaleString();
      return bar;
    }));
  }

  async function load() {
    const token = $('token').value.trim();
    const days = Number($('days').value);
    if (!token) return;
    $('status').textContent = 'Loading…';
    const response = await fetch('/stats?days=' + days, { headers: { Authorization: 'Bearer ' + token } });
    if (!response.ok) {
      $('status').textContent = response.status === 401 ? 'That token was rejected.' : 'Could not load stats.';
      $('report').hidden = true;
      return;
    }
    try { localStorage.setItem(tokenKey, token); } catch {}
    const stats = await response.json();
    $('status').textContent = 'Since ' + stats.since + ' (UTC)';
    $('total').textContent = stats.total.toLocaleString();
    fillDaily(stats, days);
    fillTable($('pages'), stats.pages, 'path');
    fillTable($('referrers'), stats.referrers, 'host');
    $('report').hidden = false;
  }

  $('controls').addEventListener('submit', (event) => { event.preventDefault(); load(); });
  $('days').addEventListener('change', load);
  load();
</script>
</body>
</html>
`;
