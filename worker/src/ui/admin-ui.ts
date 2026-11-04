// Self-contained HTML served by the Worker itself, so the admin page, its login
// POST, and all /admin/api/* calls are same-origin — SameSite=Strict cookies work.

export function loginPage(error: boolean): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Admin Login</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:#0b1120; color:#e2e8f0; }
  form { background:#111827; border:1px solid #1e293b; border-radius:14px; padding:28px; width:300px; }
  h1 { font-size:18px; margin:0 0 18px; }
  label { display:block; font-size:13px; color:#94a3b8; margin:12px 0 4px; }
  input { width:100%; padding:10px; border-radius:8px; border:1px solid #334155; background:#0b1120; color:#e2e8f0; font-size:14px; }
  button { width:100%; margin-top:18px; background:#2563eb; color:#fff; border:0; border-radius:8px; padding:11px; font-weight:600; font-size:14px; cursor:pointer; }
  .err { color:#f87171; font-size:13px; margin-top:12px; }
</style>
</head>
<body>
<form method="POST" action="/admin/login">
  <h1>Portfolio Admin</h1>
  <label for="username">Username</label>
  <input id="username" name="username" autocomplete="username" required />
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required />
  <button type="submit">Log in</button>
  ${error ? '<p class="err">Invalid username or password.</p>' : ''}
</form>
</body>
</html>`;
}

// Client-side dashboard logic. Written with string concatenation and single
// quotes only — NO backticks and NO ${ } — so it can live inside this template
// literal without being interpolated.
const DASHBOARD_JS = `
(function(){
  function esc(s){
    return String(s==null?'':s).replace(/[&<>"]/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];
    });
  }
  function cls(n){ return n ? ' class="n"' : ''; }
  function table(rows, cols){
    if(!rows || !rows.length) return '<p class="muted">No data yet.</p>';
    var h = '<table><thead><tr>';
    for(var i=0;i<cols.length;i++){ h += '<th'+cls(cols[i].n)+'>'+esc(cols[i].label)+'</th>'; }
    h += '</tr></thead><tbody>';
    for(var r=0;r<rows.length;r++){
      h += '<tr>';
      for(var c=0;c<cols.length;c++){ h += '<td'+cls(cols[c].n)+'>'+esc(rows[r][cols[c].key])+'</td>'; }
      h += '</tr>';
    }
    return h + '</tbody></table>';
  }
  function setText(id,v){ document.getElementById(id).textContent = v; }
  function setHtml(id,v){ document.getElementById(id).innerHTML = v; }

  function load(){
    fetch('/admin/api/stats', { credentials:'same-origin' }).then(function(res){
      if(res.status===401){ location.href='/admin'; return null; }
      return res.json();
    }).then(function(d){
      if(!d) return;
      setText('pv', d.totals.pageviews);
      setText('uv', d.totals.uniques);
      setText('dl', d.totals.downloads);
      setHtml('daily', table(d.daily, [{key:'day',label:'Day'},{key:'views',label:'Views',n:true}]));
      setHtml('sections', table(d.sections, [{key:'section',label:'Section'},{key:'views',label:'Views',n:true},{key:'unique_viewers',label:'Unique',n:true}]));
      setHtml('referrers', table(d.referrers, [{key:'ref',label:'Referrer'},{key:'n',label:'Views',n:true}]));
      setHtml('countries', table(d.countries, [{key:'country',label:'Country'},{key:'n',label:'Views',n:true}]));
      setHtml('devices', table(d.devices, [{key:'device',label:'Device'},{key:'n',label:'Views',n:true}]));
      setHtml('browsers', table(d.browsers, [{key:'browser',label:'Browser'},{key:'n',label:'Views',n:true}]));
    }).catch(function(){});
  }

  document.getElementById('resume-form').addEventListener('submit', function(e){
    e.preventDefault();
    var msg = document.getElementById('resume-msg');
    msg.className='msg'; msg.textContent='Uploading...';
    var fd = new FormData(e.target);
    fetch('/admin/api/resume', { method:'POST', body:fd, credentials:'same-origin' })
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j}; }); })
      .then(function(o){
        if(o.ok){ msg.className='msg ok'; msg.textContent='Uploaded ('+Math.round(o.j.size/1024)+' KB). Live within ~5 min.'; e.target.reset(); }
        else { msg.className='msg err'; msg.textContent='Failed: '+(o.j.error||'error'); }
      }).catch(function(){ msg.className='msg err'; msg.textContent='Upload failed.'; });
  });

  document.getElementById('reset-btn').addEventListener('click', function(){
    if(!confirm('Delete ALL analytics data? This cannot be undone.')) return;
    var msg = document.getElementById('reset-msg');
    msg.className='msg'; msg.textContent='Resetting...';
    fetch('/admin/api/reset', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify({confirm:'RESET'}) })
      .then(function(r){ return r.json(); })
      .then(function(j){ if(j.ok){ msg.className='msg ok'; msg.textContent='Cleared.'; load(); } else { msg.className='msg err'; msg.textContent='Failed.'; } })
      .catch(function(){ msg.className='msg err'; msg.textContent='Failed.'; });
  });

  load();
})();
`;

export function dashboardPage(filename: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Portfolio Analytics</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:#0b1120; color:#e2e8f0; }
  header { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; border-bottom:1px solid #1e293b; position:sticky; top:0; background:#0b1120; z-index:5; }
  header h1 { font-size:18px; margin:0; }
  main { max-width:1000px; margin:0 auto; padding:24px; }
  .btn { background:#2563eb; color:#fff; border:0; border-radius:8px; padding:9px 14px; font-size:14px; font-weight:600; cursor:pointer; }
  .btn.secondary { background:#1e293b; }
  .btn.danger { background:#b91c1c; }
  .muted { color:#94a3b8; font-size:13px; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px; margin-bottom:24px; }
  .card { background:#111827; border:1px solid #1e293b; border-radius:12px; padding:18px; }
  .card .n { font-size:32px; font-weight:800; }
  .card .l { color:#94a3b8; font-size:13px; margin-top:4px; }
  section.panel { background:#111827; border:1px solid #1e293b; border-radius:12px; padding:18px; margin-bottom:20px; }
  section.panel h2 { font-size:15px; margin:0 0 12px; color:#cbd5e1; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th, td { text-align:left; padding:6px 8px; border-bottom:1px solid #1e293b; }
  th { color:#94a3b8; font-weight:600; }
  td.n, th.n { text-align:right; font-variant-numeric:tabular-nums; }
  .row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
  input[type=file] { color:#cbd5e1; font-size:14px; }
  .msg { font-size:13px; }
  .msg.ok { color:#34d399; } .msg.err { color:#f87171; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  @media (max-width:720px){ .grid2 { grid-template-columns:1fr; } }
  code { background:#1e293b; padding:1px 6px; border-radius:4px; }
</style>
</head>
<body>
<header>
  <h1>Portfolio Analytics</h1>
  <form method="POST" action="/admin/logout" style="margin:0"><button class="btn secondary" type="submit">Log out</button></form>
</header>
<main>
  <div class="cards">
    <div class="card"><div class="n" id="pv">-</div><div class="l">Page views</div></div>
    <div class="card"><div class="n" id="uv">-</div><div class="l">Unique visitors</div></div>
    <div class="card"><div class="n" id="dl">-</div><div class="l">Resume downloads</div></div>
  </div>

  <section class="panel">
    <h2>Resume</h2>
    <form id="resume-form" class="row">
      <input type="file" name="resume" accept="application/pdf" required />
      <button class="btn" type="submit">Upload new resume</button>
      <span class="msg" id="resume-msg"></span>
    </form>
    <p class="muted" style="margin:10px 0 0">Served as <strong>${filename}</strong> at <code>/resume</code>. Uploads replace it immediately (allow ~5&nbsp;min cache / hard refresh).</p>
  </section>

  <div class="grid2">
    <section class="panel"><h2>Page views (last 30 days)</h2><div id="daily"></div></section>
    <section class="panel"><h2>Section engagement</h2><div id="sections"></div></section>
    <section class="panel"><h2>Top referrers</h2><div id="referrers"></div></section>
    <section class="panel"><h2>Countries</h2><div id="countries"></div></section>
    <section class="panel"><h2>Devices</h2><div id="devices"></div></section>
    <section class="panel"><h2>Browsers</h2><div id="browsers"></div></section>
  </div>

  <section class="panel">
    <h2>Danger zone</h2>
    <div class="row">
      <button class="btn danger" id="reset-btn" type="button">Reset all analytics</button>
      <span class="msg" id="reset-msg"></span>
    </div>
  </section>
</main>
<script>${DASHBOARD_JS}</script>
</body>
</html>`;
}
