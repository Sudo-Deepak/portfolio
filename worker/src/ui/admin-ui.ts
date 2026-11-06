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
// literal without being interpolated. All charts are hand-rolled inline SVG/HTML
// (no library, no CDN) so the page stays fully self-contained and private.
const DASHBOARD_JS = `
(function(){
  var state = { range: 30 };

  function esc(s){
    return String(s==null?'':s).replace(/[&<>"]/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];
    });
  }
  function num(n){ n=+n||0; return n.toLocaleString(); }
  function setText(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  function setHtml(id,v){ var el=document.getElementById(id); if(el) el.innerHTML=v; }
  function col(rows,key){ var a=[],i; rows=rows||[]; for(i=0;i<rows.length;i++) a.push(+rows[i][key]||0); return a; }

  // Map a value series to an SVG polyline + filled-area path.
  function series(vals,W,H,p,max){
    var n=vals.length, step = n>1 ? (W-2*p)/(n-1) : 0;
    var line='', area='M '+p.toFixed(1)+' '+(H-p).toFixed(1), i;
    for(i=0;i<n;i++){
      var x=p+i*step, y=H-p-(max?(vals[i]/max):0)*(H-2*p);
      line += (i?' ':'')+x.toFixed(1)+','+y.toFixed(1);
      area += ' L '+x.toFixed(1)+' '+y.toFixed(1);
    }
    area += ' L '+(p+(n-1)*step).toFixed(1)+' '+(H-p).toFixed(1)+' Z';
    return { line:line, area:area };
  }

  function sparkline(vals){
    vals=vals||[]; if(!vals.length) return '';
    var W=100,H=28,p=2,max=1,i;
    for(i=0;i<vals.length;i++){ if(vals[i]>max) max=vals[i]; }
    var s=series(vals,W,H,p,max);
    return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" class="spark-svg">'
      +'<path d="'+s.area+'" class="spark-area"/>'
      +'<polyline points="'+s.line+'" class="spark-line" vector-effect="non-scaling-stroke"/></svg>';
  }

  function deltaHtml(cur,prev){
    cur=+cur||0; prev=+prev||0;
    if(prev<=0){ return cur>0 ? '<span class="delta up">new</span>' : '<span class="delta flat">\\u2013</span>'; }
    var pct = Math.round((cur-prev)/prev*100);
    if(pct>0) return '<span class="delta up">\\u25b2 '+pct+'%</span>';
    if(pct<0) return '<span class="delta down">\\u25bc '+(-pct)+'%</span>';
    return '<span class="delta flat">0%</span>';
  }

  function trendChart(daily){
    if(!daily || !daily.length) return '<p class="muted">No data in this range yet.</p>';
    var views=col(daily,'views'), uniq=col(daily,'uniques'), i;
    var W=600,H=200,p=10,max=1;
    for(i=0;i<views.length;i++){ if(views[i]>max)max=views[i]; if(uniq[i]>max)max=uniq[i]; }
    var sv=series(views,W,H,p,max), su=series(uniq,W,H,p,max);
    var first=daily[0].day, last=daily[daily.length-1].day;
    return '<div class="chart"><svg viewBox="0 0 '+W+' '+H+'" class="chart-svg" preserveAspectRatio="none">'
      +'<path d="'+sv.area+'" class="area-v"/>'
      +'<polyline points="'+sv.line+'" class="line-v" vector-effect="non-scaling-stroke"/>'
      +'<polyline points="'+su.line+'" class="line-u" vector-effect="non-scaling-stroke"/></svg></div>'
      +'<div class="axis"><span>'+esc(first)+'</span><span>peak '+num(max)+'</span><span>'+esc(last)+'</span></div>'
      +'<div class="legend"><span class="lg lg-v">Page views</span><span class="lg lg-u">Unique visitors</span></div>';
  }

  function bars(rows,lk,vk){
    if(!rows || !rows.length) return '<p class="muted">No data yet.</p>';
    var max=1,i; for(i=0;i<rows.length;i++){ var v=+rows[i][vk]||0; if(v>max)max=v; }
    var h='';
    for(i=0;i<rows.length;i++){
      var v=+rows[i][vk]||0, pct=Math.round(v/max*100);
      h += '<div class="bar"><div class="bar-head"><span class="bar-l" title="'+esc(rows[i][lk])+'">'+esc(rows[i][lk])+'</span>'
        +'<span class="bar-v">'+num(v)+'</span></div>'
        +'<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%"></div></div></div>';
    }
    return h;
  }

  function heatmapChart(rows){
    var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var m=[],d,hh; for(d=0;d<7;d++){ m[d]=[]; for(hh=0;hh<24;hh++) m[d][hh]=0; }
    var max=1,i; rows=rows||[];
    for(i=0;i<rows.length;i++){
      var dd=+rows[i].dow, h2=+rows[i].hour, n=+rows[i].n||0;
      if(dd>=0&&dd<7&&h2>=0&&h2<24){ m[dd][h2]=n; if(n>max)max=n; }
    }
    if(!rows.length) return '<p class="muted">No data in this range yet.</p>';
    var out='<div class="heat">';
    for(d=0;d<7;d++){
      out+='<div class="heat-row"><span class="heat-day">'+days[d]+'</span>';
      for(hh=0;hh<24;hh++){
        var val=m[d][hh], o = val? (0.15+0.85*(val/max)) : 0.04;
        out+='<span class="heat-cell" style="background:rgba(56,189,248,'+o.toFixed(3)+')" title="'+days[d]+' '+hh+':00 — '+val+' views"></span>';
      }
      out+='</div>';
    }
    out+='</div><div class="heat-x"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>';
    return out;
  }

  function render(d){
    var cur=d.trend.current, prev=d.trend.previous;
    setText('pv', num(cur.pageviews)); setHtml('pv-delta', deltaHtml(cur.pageviews,prev.pageviews));
    setText('pv-all', num(d.totals.pageviews)); setHtml('pv-spark', sparkline(col(d.daily,'views')));
    setText('uv', num(cur.uniques)); setHtml('uv-delta', deltaHtml(cur.uniques,prev.uniques));
    setText('uv-all', num(d.totals.uniques)); setHtml('uv-spark', sparkline(col(d.daily,'uniques')));
    setText('dl', num(cur.downloads)); setHtml('dl-delta', deltaHtml(cur.downloads,prev.downloads));
    setText('dl-all', num(d.totals.downloads)); setHtml('dl-spark', sparkline(col(d.daily,'downloads')));
    var cc = cur.uniques? cur.downloads/cur.uniques*100 : 0;
    var pc = prev.uniques? prev.downloads/prev.uniques*100 : 0;
    setText('cv', cc.toFixed(1)); setHtml('cv-delta', deltaHtml(cc,pc));
    setHtml('cv-spark', sparkline(col(d.daily,'downloads')));
    setHtml('trend', trendChart(d.daily));
    setHtml('heatmap', heatmapChart(d.heatmap));
    setHtml('channels', bars(d.channels,'channel','n'));
    setHtml('audiences', bars(d.audiences,'audience','n'));
    setHtml('pages', bars(d.topPages,'path','views'));
    setHtml('sections', bars(d.sections,'section','views'));
    setHtml('countries', bars(d.countries,'country','n'));
    setHtml('cities', bars(d.cities,'city','n'));
    setHtml('regions', bars(d.regions,'region','n'));
    setHtml('referrers', bars(d.referrers,'ref','n'));
    setHtml('devices', bars(d.devices,'device','n'));
    setHtml('browsers', bars(d.browsers,'browser','n'));
    setHtml('os', bars(d.os,'os','n'));
  }

  function load(){
    fetch('/admin/api/stats?range='+state.range, { credentials:'same-origin' }).then(function(res){
      if(res.status===401){ location.href='/admin'; return null; }
      return res.json();
    }).then(function(d){ if(d) render(d); }).catch(function(){});
  }

  var rangeBox = document.getElementById('ranges');
  rangeBox.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('button[data-range]') : null;
    if(!b) return;
    state.range = +b.getAttribute('data-range');
    var bs = rangeBox.querySelectorAll('button'), i;
    for(i=0;i<bs.length;i++) bs[i].classList.toggle('on', bs[i]===b);
    load();
  });

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

  document.getElementById('name-btn').addEventListener('click', function(){
    var msg = document.getElementById('name-msg');
    var input = document.getElementById('resume-name');
    msg.className='msg'; msg.textContent='Saving...';
    fetch('/admin/api/resume-name', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body: JSON.stringify({ filename: input.value }) })
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j}; }); })
      .then(function(o){
        if(o.ok){ msg.className='msg ok'; msg.textContent='Saved.'; input.value=o.j.filename; var sh=document.getElementById('name-shown'); if(sh) sh.textContent=o.j.filename; }
        else { msg.className='msg err'; msg.textContent='Failed: '+(o.j.error||'error'); }
      }).catch(function(){ msg.className='msg err'; msg.textContent='Save failed.'; });
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
  header { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:16px 24px; border-bottom:1px solid #1e293b; position:sticky; top:0; background:#0b1120; z-index:5; }
  header h1 { font-size:18px; margin:0; }
  main { max-width:1000px; margin:0 auto; padding:24px; }
  .btn { background:#2563eb; color:#fff; border:0; border-radius:8px; padding:9px 14px; font-size:14px; font-weight:600; cursor:pointer; }
  .btn.secondary { background:#1e293b; }
  .btn.danger { background:#b91c1c; }
  .muted { color:#94a3b8; font-size:13px; }

  .ranges { display:inline-flex; gap:4px; background:#111827; border:1px solid #1e293b; border-radius:10px; padding:4px; }
  .ranges button { background:transparent; color:#94a3b8; border:0; border-radius:7px; padding:6px 12px; font-size:13px; font-weight:600; cursor:pointer; }
  .ranges button.on { background:#2563eb; color:#fff; }

  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; margin-bottom:24px; }
  .card { background:#111827; border:1px solid #1e293b; border-radius:12px; padding:16px; }
  .card-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .card-top .l { color:#94a3b8; font-size:13px; }
  .card .n { font-size:30px; font-weight:800; margin-top:2px; font-variant-numeric:tabular-nums; }
  .card .sub { color:#64748b; font-size:12px; margin-top:6px; }
  .card .sub b { color:#94a3b8; font-weight:600; }
  .spark { height:28px; margin-top:8px; color:#38bdf8; }
  .spark-svg { width:100%; height:28px; display:block; }
  .spark-line { fill:none; stroke:currentColor; stroke-width:1.5; }
  .spark-area { fill:currentColor; opacity:0.14; stroke:none; }
  .delta { font-size:12px; font-weight:700; white-space:nowrap; }
  .delta.up { color:#34d399; }
  .delta.down { color:#f87171; }
  .delta.flat { color:#64748b; }

  section.panel { background:#111827; border:1px solid #1e293b; border-radius:12px; padding:18px; margin-bottom:20px; }
  section.panel h2 { font-size:15px; margin:0 0 12px; color:#cbd5e1; }

  .chart-svg { width:100%; height:auto; display:block; }
  .area-v { fill:#2563eb; opacity:0.16; stroke:none; }
  .line-v { fill:none; stroke:#2563eb; stroke-width:2; }
  .line-u { fill:none; stroke:#38bdf8; stroke-width:2; stroke-dasharray:4 3; }
  .axis { display:flex; justify-content:space-between; color:#64748b; font-size:12px; margin-top:6px; }
  .legend { display:flex; gap:16px; margin-top:8px; font-size:12px; color:#94a3b8; }
  .lg::before { content:''; display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:6px; vertical-align:middle; }
  .lg-v::before { background:#2563eb; }
  .lg-u::before { background:#38bdf8; }

  .bar { margin:10px 0; }
  .bar-head { display:flex; justify-content:space-between; gap:8px; font-size:13px; margin-bottom:4px; }
  .bar-l { color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:78%; }
  .bar-v { color:#94a3b8; font-variant-numeric:tabular-nums; }
  .bar-track { height:7px; background:#1e293b; border-radius:999px; overflow:hidden; }
  .bar-fill { height:100%; background:linear-gradient(90deg,#2563eb,#38bdf8); border-radius:999px; }

  .heat { display:flex; flex-direction:column; gap:3px; }
  .heat-row { display:grid; grid-template-columns:34px repeat(24,1fr); gap:3px; align-items:center; }
  .heat-day { font-size:11px; color:#94a3b8; }
  .heat-cell { height:14px; border-radius:3px; }
  .heat-x { display:flex; justify-content:space-between; margin:6px 0 0 37px; color:#64748b; font-size:11px; }

  .row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
  input[type=file] { color:#cbd5e1; font-size:14px; }
  input[type=text] { padding:8px 10px; border-radius:8px; border:1px solid #334155; background:#0b1120; color:#e2e8f0; font-size:14px; min-width:260px; flex:1 1 260px; }
  .msg { font-size:13px; }
  .msg.ok { color:#34d399; } .msg.err { color:#f87171; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; }
  @media (max-width:720px){ .grid2, .grid3 { grid-template-columns:1fr; } }
  code { background:#1e293b; padding:1px 6px; border-radius:4px; }
</style>
</head>
<body>
<header>
  <h1>Portfolio Analytics</h1>
  <div class="ranges" id="ranges">
    <button type="button" data-range="7">7d</button>
    <button type="button" data-range="30" class="on">30d</button>
    <button type="button" data-range="90">90d</button>
    <button type="button" data-range="180">180d</button>
  </div>
  <form method="POST" action="/admin/logout" style="margin:0"><button class="btn secondary" type="submit">Log out</button></form>
</header>
<main>
  <div class="cards">
    <div class="card">
      <div class="card-top"><span class="l">Page views</span><span id="pv-delta"></span></div>
      <div class="n" id="pv">-</div>
      <div class="spark" id="pv-spark"></div>
      <div class="sub">all-time <b id="pv-all">-</b></div>
    </div>
    <div class="card">
      <div class="card-top"><span class="l">Unique visitors</span><span id="uv-delta"></span></div>
      <div class="n" id="uv">-</div>
      <div class="spark" id="uv-spark"></div>
      <div class="sub">all-time <b id="uv-all">-</b></div>
    </div>
    <div class="card">
      <div class="card-top"><span class="l">Resume downloads</span><span id="dl-delta"></span></div>
      <div class="n" id="dl">-</div>
      <div class="spark" id="dl-spark"></div>
      <div class="sub">all-time <b id="dl-all">-</b></div>
    </div>
    <div class="card">
      <div class="card-top"><span class="l">Downloads / 100 visitors</span><span id="cv-delta"></span></div>
      <div class="n" id="cv">-</div>
      <div class="spark" id="cv-spark"></div>
      <div class="sub">resume conversion rate</div>
    </div>
  </div>

  <section class="panel">
    <h2>Traffic trend</h2>
    <div id="trend"></div>
  </section>

  <section class="panel">
    <h2>When visitors come (hour × day)</h2>
    <div id="heatmap"></div>
  </section>

  <div class="grid2">
    <section class="panel">
      <h2>Traffic sources</h2>
      <p class="muted" style="margin:-4px 0 10px">Tag the links you share, e.g. <code>?ref=linkedin</code> · <code>?ref=resume</code>. Untagged visits fall back to the referrer.</p>
      <div id="channels"></div>
    </section>
    <section class="panel">
      <h2>Audience</h2>
      <p class="muted" style="margin:-4px 0 10px">From <code>?aud=</code> tags you add, e.g. <code>?ref=linkedin&amp;aud=recruiter</code> · <code>?aud=hr</code>.</p>
      <div id="audiences"></div>
    </section>
  </div>

  <div class="grid2">
    <section class="panel"><h2>Top pages</h2><div id="pages"></div></section>
    <section class="panel"><h2>Section engagement</h2><div id="sections"></div></section>
  </div>

  <div class="grid2">
    <section class="panel"><h2>Countries</h2><div id="countries"></div></section>
    <section class="panel"><h2>Cities</h2><div id="cities"></div></section>
  </div>

  <div class="grid2">
    <section class="panel"><h2>States / regions</h2><div id="regions"></div></section>
    <section class="panel"><h2>Referrer hosts</h2><div id="referrers"></div></section>
  </div>

  <div class="grid3">
    <section class="panel"><h2>Devices</h2><div id="devices"></div></section>
    <section class="panel"><h2>Browsers</h2><div id="browsers"></div></section>
    <section class="panel"><h2>Operating systems</h2><div id="os"></div></section>
  </div>

  <section class="panel">
    <h2>Resume</h2>
    <form id="resume-form" class="row">
      <input type="file" name="resume" accept="application/pdf" required />
      <button class="btn" type="submit">Upload new resume</button>
      <span class="msg" id="resume-msg"></span>
    </form>
    <div class="row" style="margin-top:12px">
      <input id="resume-name" type="text" value="${filename}" aria-label="Download filename" spellcheck="false" />
      <button class="btn secondary" id="name-btn" type="button">Save download name</button>
      <span class="msg" id="name-msg"></span>
    </div>
    <p class="muted" style="margin:10px 0 0">Served as <strong id="name-shown">${filename}</strong> at <code>/resume</code>. Changing the name takes effect immediately; the file itself updates within ~5&nbsp;min (cache / hard refresh). <code>.pdf</code> is added automatically.</p>
  </section>

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
