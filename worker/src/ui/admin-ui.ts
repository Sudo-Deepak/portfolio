// Self-contained HTML served by the Worker itself, so the admin page, its login
// POST, and all /admin/api/* calls are same-origin — SameSite=Strict cookies work.
//
// Design: SaaS-style dashboard — left sidebar nav, top bar, light/dark toggle,
// compact "data-dense" layout. Charts use Chart.js (CDN) for the trend line and
// device/browser/OS doughnuts; ranked top-N lists stay hand-rolled CSS bars; the
// hour×day heatmap stays hand-rolled. Theming is driven by CSS custom properties
// switched via [data-theme] on <html>.

const INTER =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap">';

// Set the theme before first paint to avoid a flash of the wrong palette.
const THEME_BOOT =
  "<script>(function(){try{var t=localStorage.getItem('pf_admin_theme')||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();</script>";

const BASE_CSS = `
  *{box-sizing:border-box;}
  :root, html[data-theme='dark']{
    --bg:#0b1120; --surface:#111827; --surface-2:#0f1729; --line:#1f2937;
    --text:#e5e7eb; --text-dim:#94a3b8; --text-mute:#64748b;
    --brand:#3b82f6; --accent:#22d3ee; --shadow:0 1px 3px rgba(0,0,0,0.4);
    color-scheme:dark;
  }
  html[data-theme='light']{
    --bg:#f1f5f9; --surface:#ffffff; --surface-2:#f1f5f9; --line:#e2e8f0;
    --text:#0f172a; --text-dim:#475569; --text-mute:#94a3b8;
    --brand:#2563eb; --accent:#0891b2; --shadow:0 1px 2px rgba(15,23,42,0.06);
    color-scheme:light;
  }
  body{margin:0;font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--text);font-size:14px;-webkit-font-smoothing:antialiased;}
  a{color:inherit;}
  .muted{color:var(--text-dim);font-size:12.5px;}
  code{background:var(--surface-2);padding:1px 6px;border-radius:4px;font-size:12px;border:1px solid var(--line);}
  .btn{background:var(--brand);color:#fff;border:0;border-radius:9px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;}
  .btn:hover{filter:brightness(1.07);}
  .btn.ghost{background:transparent;border:1px solid var(--line);color:var(--text-dim);}
  .btn.danger{background:#dc2626;}
  .icon-btn{background:var(--surface);border:1px solid var(--line);color:var(--text-dim);width:34px;height:34px;border-radius:9px;cursor:pointer;display:inline-grid;place-items:center;font-size:15px;line-height:1;}
  .icon-btn:hover{color:var(--text);}
  input[type=text],input[type=file]{padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;font-family:inherit;}
  input[type=text]:focus,input[type=file]:focus{outline:2px solid var(--brand);outline-offset:1px;}
`;

export function loginPage(error: boolean): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Admin Login</title>
${THEME_BOOT}
${INTER}
<style>
${BASE_CSS}
  body{min-height:100vh;display:grid;place-items:center;padding:20px;
    background:
      radial-gradient(900px 500px at 15% -10%, rgba(37,99,235,0.18), transparent 60%),
      radial-gradient(700px 500px at 110% 110%, rgba(34,211,238,0.14), transparent 55%),
      var(--bg);}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:30px;width:340px;box-shadow:0 20px 60px -20px rgba(0,0,0,0.5);}
  .brand{display:flex;align-items:center;gap:10px;margin-bottom:22px;}
  .mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--brand),var(--accent));box-shadow:0 0 24px -4px var(--brand);}
  .brand h1{font-size:17px;margin:0;font-weight:800;letter-spacing:-0.3px;}
  .brand p{margin:2px 0 0;font-size:12px;color:var(--text-dim);}
  label{display:block;font-size:12.5px;color:var(--text-dim);margin:14px 0 5px;font-weight:500;}
  input{width:100%;}
  .card .btn{width:100%;margin-top:20px;padding:11px;font-size:14px;}
  .err{color:#ef4444;font-size:13px;margin:14px 0 0;text-align:center;}
</style>
</head>
<body>
<form class="card" method="POST" action="/admin/login">
  <div class="brand">
    <span class="mark"></span>
    <div><h1>Portfolio Admin</h1><p>Analytics &amp; leads</p></div>
  </div>
  <label for="username">Username</label>
  <input id="username" name="username" autocomplete="username" required />
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required />
  <button class="btn" type="submit">Log in</button>
  ${error ? '<p class="err">Invalid username or password.</p>' : ''}
</form>
</body>
</html>`;
}

// SVG icons for the sidebar (16px, currentColor).
const ICON = {
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  audience: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  traffic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  content: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  leads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};

// Client-side dashboard logic. Written with string concatenation and single
// quotes only — NO backticks and NO ${ } — so it can live inside the dashboardPage
// template literal without being interpolated.
const DASHBOARD_JS = `
(function(){
  var state = { range: 30, data: null };
  var charts = {};
  var PALETTE = ['#2563eb','#22d3ee','#8b5cf6','#f59e0b','#10b981','#ec4899','#ef4444','#14b8a6','#a855f7','#64748b'];

  if(window.Chart){ Chart.defaults.font.family = "'Inter', system-ui, sans-serif"; Chart.defaults.font.size = 11; }

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  function num(n){ n=+n||0; return n.toLocaleString(); }
  function fmtDur(sec){ sec=+sec||0; if(sec<60) return sec+'s'; var m=Math.floor(sec/60), s=sec%60; return m+'m '+(s<10?'0':'')+s+'s'; }
  function setText(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  function setHtml(id,v){ var el=document.getElementById(id); if(el) el.innerHTML=v; }
  function col(rows,key){ var a=[],i; rows=rows||[]; for(i=0;i<rows.length;i++) a.push(+rows[i][key]||0); return a; }
  function C(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function relTime(ts){
    var s=Math.floor((Date.now()-ts)/1000);
    if(s<60) return 'just now';
    if(s<3600) return Math.floor(s/60)+'m ago';
    if(s<86400) return Math.floor(s/3600)+'h ago';
    if(s<604800) return Math.floor(s/86400)+'d ago';
    return new Date(ts).toLocaleDateString();
  }

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
    var W=100,H=26,p=2,max=1,i;
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
        var val=m[d][hh], o = val? (0.18+0.82*(val/max)) : 0;
        var style = val? ('background:rgba(56,130,246,'+o.toFixed(3)+')') : '';
        out+='<span class="heat-cell" style="'+style+'" title="'+days[d]+' '+hh+':00 \\u2014 '+val+' views"></span>';
      }
      out+='</div>';
    }
    out+='</div><div class="heat-x"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>';
    return out;
  }

  function trendChart(daily){
    var el=document.getElementById('trendCanvas'); if(!el || typeof Chart==='undefined') return;
    daily=daily||[];
    var labels=[],views=[],uniq=[],i;
    for(i=0;i<daily.length;i++){ labels.push(daily[i].day); views.push(+daily[i].views||0); uniq.push(+daily[i].uniques||0); }
    if(charts.trend){ charts.trend.destroy(); charts.trend=null; }
    var brand=C('--brand'), accent=C('--accent'), line=C('--line'), dim=C('--text-dim');
    charts.trend=new Chart(el,{
      type:'line',
      data:{ labels:labels, datasets:[
        { label:'Page views', data:views, borderColor:brand, backgroundColor:'rgba(59,130,246,0.14)', fill:true, tension:0.35, pointRadius:0, borderWidth:2 },
        { label:'Unique visitors', data:uniq, borderColor:accent, backgroundColor:'transparent', fill:false, tension:0.35, pointRadius:0, borderWidth:2, borderDash:[5,4] }
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        interaction:{ mode:'index', intersect:false },
        plugins:{ legend:{ display:true, position:'top', align:'end', labels:{ usePointStyle:true, boxWidth:8, boxHeight:8, color:dim, padding:14 } }, tooltip:{ mode:'index', intersect:false } },
        scales:{ x:{ grid:{ display:false }, ticks:{ maxTicksLimit:8, color:dim, font:{ size:10 }, maxRotation:0 } },
                 y:{ beginAtZero:true, grid:{ color:line }, border:{ display:false }, ticks:{ precision:0, color:dim, font:{ size:10 }, maxTicksLimit:6 } } }
      }
    });
  }

  function donut(id, rows, lk, vk){
    var el=document.getElementById(id); if(!el || typeof Chart==='undefined') return;
    rows=rows||[];
    var labels=[],data=[],i;
    for(i=0;i<rows.length;i++){ labels.push(String(rows[i][lk]||'?')); data.push(+rows[i][vk]||0); }
    if(charts[id]){ charts[id].destroy(); charts[id]=null; }
    if(!data.length){ var p=document.getElementById(id+'-empty'); if(p) p.style.display=''; return; }
    var pe=document.getElementById(id+'-empty'); if(pe) pe.style.display='none';
    charts[id]=new Chart(el,{
      type:'doughnut',
      data:{ labels:labels, datasets:[{ data:data, backgroundColor:PALETTE, borderColor:C('--surface'), borderWidth:2, hoverOffset:4 }] },
      options:{ responsive:true, maintainAspectRatio:false, cutout:'62%',
        plugins:{ legend:{ position:'right', labels:{ usePointStyle:true, boxWidth:8, boxHeight:8, color:C('--text-dim'), font:{ size:11 }, padding:9 } } } }
    });
  }

  function updateBadge(unread){
    unread=+unread||0;
    var nb=document.getElementById('nav-leads-badge');
    var lb=document.getElementById('leads-badge');
    if(nb){ if(unread>0){ nb.textContent=unread; nb.style.display=''; } else nb.style.display='none'; }
    if(lb){ if(unread>0){ lb.textContent=unread+' new'; lb.style.display=''; } else lb.style.display='none'; }
  }

  function render(d){
    state.data = d;
    var cur=d.trend.current, prev=d.trend.previous;
    setText('pv', num(cur.pageviews)); setHtml('pv-delta', deltaHtml(cur.pageviews,prev.pageviews));
    setText('pv-all', num(d.totals.pageviews)); setHtml('pv-spark', sparkline(col(d.daily,'views')));
    setText('uv', num(cur.uniques)); setHtml('uv-delta', deltaHtml(cur.uniques,prev.uniques));
    setText('uv-all', num(d.totals.uniques)); setHtml('uv-spark', sparkline(col(d.daily,'uniques')));
    setText('dl', num(cur.downloads)); setHtml('dl-delta', deltaHtml(cur.downloads,prev.downloads));
    setText('dl-all', num(d.totals.downloads)); setHtml('dl-spark', sparkline(col(d.daily,'downloads')));
    var cc = cur.uniques? cur.downloads/cur.uniques*100 : 0;
    var pc = prev.uniques? prev.downloads/prev.uniques*100 : 0;
    setText('cv', cc.toFixed(1)); setHtml('cv-delta', deltaHtml(cc,pc)); setHtml('cv-spark', sparkline(col(d.daily,'downloads')));

    var se = d.sessions||{count:0,bounced:0,avgDuration:0};
    var vi = d.visitors||{new:0,returning:0};
    var bounce = se.count ? Math.round(se.bounced/se.count*100) : 0;
    setText('eg-sessions', num(se.count));
    setText('eg-bounce', bounce+'%');
    setText('eg-dur', fmtDur(se.avgDuration));
    setText('eg-new', num(vi.new));
    setText('eg-ret', num(vi.returning));

    trendChart(d.daily);
    setHtml('heatmap', heatmapChart(d.heatmap));

    donut('devicesCanvas', d.devices, 'device', 'n');
    donut('browsersCanvas', d.browsers, 'browser', 'n');
    donut('osCanvas', d.os, 'os', 'n');
    setHtml('countries', bars(d.countries,'country','n'));
    setHtml('cities', bars(d.cities,'city','n'));
    setHtml('regions', bars(d.regions,'region','n'));

    setHtml('channels', bars(d.channels,'channel','n'));
    setHtml('audiences', bars(d.audiences,'audience','n'));
    setHtml('referrers', bars(d.referrers,'ref','n'));

    setHtml('pages', bars(d.topPages,'path','views'));
    setHtml('sections', bars(d.sections,'section','views'));
    setHtml('interactions', bars(d.interactions,'label','n'));
    setHtml('scroll', bars(d.scroll,'label','n'));

    var lead = d.leads||{total:0,unread:0};
    updateBadge(lead.unread);
    setText('leads-total', num(lead.total));
  }

  function load(){
    fetch('/admin/api/stats?range='+state.range, { credentials:'same-origin' }).then(function(res){
      if(res.status===401){ location.href='/admin'; return null; }
      return res.json();
    }).then(function(d){ if(d) render(d); }).catch(function(){});
  }

  function renderLeads(d){
    var rows = (d && d.leads) || [];
    var seen = (d && d.seenTs) || 0;
    if(!rows.length){ setHtml('leads-list', '<p class="muted">No leads yet.</p>'); return; }
    var h='', i;
    for(i=0;i<rows.length;i++){
      var r=rows[i];
      var isNew = (+r.ts) > seen;
      var loc=[r.city,r.region,r.country].filter(Boolean).join(', ');
      var initials=(String(r.name||'?').trim().charAt(0)||'?').toUpperCase();
      var chips='<span class="chip">'+esc(r.channel||'Direct')+'</span>';
      if(loc) chips+='<span class="chip">'+esc(loc)+'</span>';
      if(!r.emailed) chips+='<span class="chip warn">email not sent</span>';
      h += '<div class="lead'+(isNew?' lead-new':'')+'">'
        +'<div class="lead-av">'+esc(initials)+'</div>'
        +'<div class="lead-body">'
        +'<div class="lead-top"><span class="lead-name">'+esc(r.name)+(isNew?' <span class="lead-dot">new</span>':'')+'</span>'
        +'<span class="lead-when" title="'+esc(new Date(+r.ts).toLocaleString())+'">'+esc(relTime(+r.ts))+'</span></div>'
        +'<div><a href="mailto:'+esc(r.email)+'">'+esc(r.email)+'</a></div>'
        +'<div class="chips">'+chips+'</div>'
        +'<div class="lead-msg">'+esc(r.message)+'</div>'
        +'</div></div>';
    }
    setHtml('leads-list', h);
  }

  function loadLeads(){
    fetch('/admin/api/leads', { credentials:'same-origin' }).then(function(res){
      if(res.status===401){ location.href='/admin'; return null; }
      return res.json();
    }).then(function(d){ if(d) renderLeads(d); }).catch(function(){});
  }

  // ---- Navigation (hash-based) ----
  var TITLES = { overview:'Overview', audience:'Audience', traffic:'Traffic', content:'Content', leads:'Leads', settings:'Settings' };
  function currentView(){ var h=(location.hash||'').replace('#',''); return TITLES[h]?h:'overview'; }
  function showView(name){
    var views=document.querySelectorAll('[data-view]'), i;
    for(i=0;i<views.length;i++) views[i].classList.toggle('hidden', views[i].getAttribute('data-view')!==name);
    var items=document.querySelectorAll('[data-nav]');
    for(i=0;i<items.length;i++) items[i].classList.toggle('on', items[i].getAttribute('data-nav')===name);
    setText('view-title', TITLES[name]||'Overview');
    var sb=document.getElementById('sidebar'); if(sb) sb.classList.remove('open');
    var ov=document.getElementById('overlay'); if(ov) ov.classList.remove('on');
    window.scrollTo(0,0);
  }
  window.addEventListener('hashchange', function(){ showView(currentView()); });

  // ---- Theme ----
  function setTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    try{ localStorage.setItem('pf_admin_theme', t); }catch(e){}
    var tb=document.getElementById('theme-btn'); if(tb) tb.textContent = (t==='dark' ? '\\u2600\\ufe0f' : '\\u263d');
    if(state.data) render(state.data); // recolor charts for the new palette
  }
  var themeBtn=document.getElementById('theme-btn');
  if(themeBtn) themeBtn.addEventListener('click', function(){
    var cur=document.documentElement.getAttribute('data-theme')||'dark';
    setTheme(cur==='dark'?'light':'dark');
  });

  // ---- Range control ----
  var rangeBox = document.getElementById('ranges');
  if(rangeBox) rangeBox.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('button[data-range]') : null;
    if(!b) return;
    state.range = +b.getAttribute('data-range');
    var bs = rangeBox.querySelectorAll('button'), i;
    for(i=0;i<bs.length;i++) bs[i].classList.toggle('on', bs[i]===b);
    load();
  });

  // ---- Mobile sidebar ----
  var menuBtn=document.getElementById('menu-btn');
  if(menuBtn) menuBtn.addEventListener('click', function(){
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('on');
  });
  var overlay=document.getElementById('overlay');
  if(overlay) overlay.addEventListener('click', function(){
    document.getElementById('sidebar').classList.remove('open');
    overlay.classList.remove('on');
  });

  // ---- Settings handlers (unchanged logic) ----
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

  var leadsSeenBtn = document.getElementById('leads-seen-btn');
  if(leadsSeenBtn) leadsSeenBtn.addEventListener('click', function(){
    fetch('/admin/api/leads/seen', { method:'POST', credentials:'same-origin' })
      .then(function(){ load(); loadLeads(); }).catch(function(){});
  });

  var exportBox = document.getElementById('exports');
  if(exportBox) exportBox.addEventListener('click', function(e){
    var b = e.target.closest ? e.target.closest('button[data-export]') : null;
    if(!b) return;
    window.location.href = '/admin/api/export?type='+b.getAttribute('data-export')+'&range='+state.range;
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

  // ---- Init ----
  var t0=document.documentElement.getAttribute('data-theme')||'dark';
  var tb0=document.getElementById('theme-btn'); if(tb0) tb0.textContent=(t0==='dark'?'\\u2600\\ufe0f':'\\u263d');
  showView(currentView());
  load();
  loadLeads();
})();
`;

function navItem(key: string, label: string, badge?: boolean): string {
  return (
    `<a class="nav-item" data-nav="${key}" href="#${key}">${(ICON as Record<string, string>)[key]}<span>${label}</span>` +
    (badge ? '<span class="nav-badge" id="nav-leads-badge" style="display:none"></span>' : '') +
    `</a>`
  );
}

function donutPanel(title: string, id: string): string {
  return (
    `<section class="panel"><h2>${title}</h2>` +
    `<div class="donut-box"><canvas id="${id}"></canvas></div>` +
    `<p class="muted" id="${id}-empty" style="display:none">No data yet.</p></section>`
  );
}

export function dashboardPage(filename: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Portfolio Analytics</title>
${THEME_BOOT}
${INTER}
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js"></script>
<style>
${BASE_CSS}
  .app{display:flex;min-height:100vh;}
  .sidebar{width:216px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--line);position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:16px 12px;gap:3px;}
  .brand{display:flex;align-items:center;gap:9px;padding:6px 10px 18px;font-weight:800;font-size:15px;letter-spacing:-0.3px;}
  .brand .mark{width:24px;height:24px;border-radius:8px;background:linear-gradient(135deg,var(--brand),var(--accent));box-shadow:0 0 18px -4px var(--brand);flex-shrink:0;}
  .nav{display:flex;flex-direction:column;gap:2px;}
  .nav-item{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;color:var(--text-dim);text-decoration:none;font-weight:500;font-size:13.5px;}
  .nav-item svg{width:17px;height:17px;flex-shrink:0;}
  .nav-item:hover{background:var(--surface-2);color:var(--text);}
  .nav-item.on{background:linear-gradient(135deg,rgba(37,99,235,0.16),rgba(34,211,238,0.12));color:var(--text);box-shadow:inset 0 0 0 1px rgba(37,99,235,0.28);}
  .nav-badge{margin-left:auto;background:#ef4444;color:#fff;font-size:10px;font-weight:700;min-width:18px;text-align:center;padding:1px 6px;border-radius:999px;}
  .sidebar-foot{margin-top:auto;padding:10px;font-size:11px;color:var(--text-mute);}

  .main{flex:1;min-width:0;display:flex;flex-direction:column;}
  .topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:10px;padding:11px 20px;background:color-mix(in srgb, var(--bg) 88%, transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);}
  .topbar h1{font-size:16px;margin:0;font-weight:700;}
  .spacer{flex:1;}
  .ranges{display:inline-flex;gap:2px;background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:3px;}
  .ranges button{background:transparent;color:var(--text-dim);border:0;border-radius:6px;padding:5px 10px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;}
  .ranges button.on{background:var(--brand);color:#fff;}
  .menu{display:none;}

  .content{padding:18px 20px 44px;max-width:1180px;width:100%;}
  .view.hidden{display:none;}

  .grid{display:grid;gap:12px;}
  .kpis{grid-template-columns:repeat(auto-fit,minmax(176px,1fr));margin-bottom:12px;}
  .stats{grid-template-columns:repeat(auto-fit,minmax(118px,1fr));}
  .g2{grid-template-columns:1fr 1fr;}
  .g3{grid-template-columns:1fr 1fr 1fr;}

  .card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px;box-shadow:var(--shadow);}
  .card .ct{display:flex;justify-content:space-between;align-items:center;gap:8px;}
  .card .l{color:var(--text-dim);font-size:12px;font-weight:500;}
  .card .n{font-size:26px;font-weight:800;margin-top:3px;font-variant-numeric:tabular-nums;letter-spacing:-0.6px;}
  .card .sub{color:var(--text-mute);font-size:11.5px;margin-top:5px;}
  .card .sub b{color:var(--text-dim);font-weight:600;}
  .spark{height:26px;margin-top:7px;color:var(--accent);}
  .spark-svg{width:100%;height:26px;display:block;}
  .spark-line{fill:none;stroke:currentColor;stroke-width:1.5;}
  .spark-area{fill:currentColor;opacity:0.14;stroke:none;}
  .delta{font-size:11.5px;font-weight:700;white-space:nowrap;}
  .delta.up{color:#10b981;} .delta.down{color:#ef4444;} .delta.flat{color:var(--text-mute);}

  .stat{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:11px 13px;box-shadow:var(--shadow);}
  .stat .l{color:var(--text-dim);font-size:11.5px;}
  .stat .v{font-size:19px;font-weight:700;margin-top:3px;font-variant-numeric:tabular-nums;}

  .panel{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px 16px;box-shadow:var(--shadow);margin-bottom:12px;}
  .panel h2{font-size:11.5px;margin:0 0 11px;color:var(--text-dim);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;}
  .panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:11px;}
  .panel-head h2{margin:0;}
  .g2 .panel, .g3 .panel{margin-bottom:0;}
  .section-label{font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-mute);font-weight:700;margin:18px 2px 10px;}

  .chart-box{position:relative;height:260px;}
  .donut-box{position:relative;height:184px;}

  .bar{margin:9px 0;}
  .bar-head{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;margin-bottom:4px;}
  .bar-l{color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:76%;}
  .bar-v{color:var(--text-dim);font-variant-numeric:tabular-nums;}
  .bar-track{height:6px;background:var(--surface-2);border-radius:999px;overflow:hidden;}
  .bar-fill{height:100%;background:linear-gradient(90deg,var(--brand),var(--accent));border-radius:999px;}

  .heat{display:flex;flex-direction:column;gap:3px;}
  .heat-row{display:grid;grid-template-columns:30px repeat(24,1fr);gap:2px;align-items:center;}
  .heat-day{font-size:10.5px;color:var(--text-dim);}
  .heat-cell{height:13px;border-radius:3px;background:var(--surface-2);}
  .heat-x{display:flex;justify-content:space-between;margin:5px 0 0 33px;color:var(--text-mute);font-size:10.5px;}

  .badge{background:#ef4444;color:#fff;font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px;}
  .lead{display:flex;gap:11px;padding:12px 0;border-top:1px solid var(--line);}
  .lead:first-child{border-top:0;}
  .lead-av{width:36px;height:36px;border-radius:10px;flex-shrink:0;display:grid;place-items:center;font-weight:700;font-size:14px;color:#fff;background:linear-gradient(135deg,var(--brand),var(--accent));}
  .lead-body{flex:1;min-width:0;}
  .lead-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline;}
  .lead-name{font-weight:600;}
  .lead-dot{background:var(--brand);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;margin-left:6px;}
  .lead-when{color:var(--text-mute);font-size:11.5px;white-space:nowrap;}
  .lead-body a{color:var(--accent);text-decoration:none;font-size:13px;}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin:5px 0 6px;}
  .chip{font-size:11px;background:var(--surface-2);color:var(--text-dim);padding:2px 9px;border-radius:999px;border:1px solid var(--line);}
  .chip.warn{color:#f59e0b;border-color:rgba(245,158,11,0.3);}
  .lead-msg{font-size:13px;color:var(--text);white-space:pre-wrap;line-height:1.5;}

  .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
  .msg{font-size:12.5px;} .msg.ok{color:#10b981;} .msg.err{color:#ef4444;}

  .overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;}
  .overlay.on{display:block;}
  @media(max-width:860px){
    .sidebar{position:fixed;left:0;top:0;transform:translateX(-100%);transition:transform .22s ease;z-index:50;}
    .sidebar.open{transform:none;}
    .menu{display:inline-grid;}
    .g2,.g3{grid-template-columns:1fr;}
  }
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar" id="sidebar">
    <div class="brand"><span class="mark"></span><span>Portfolio</span></div>
    <nav class="nav">
      ${navItem('overview', 'Overview')}
      ${navItem('audience', 'Audience')}
      ${navItem('traffic', 'Traffic')}
      ${navItem('content', 'Content')}
      ${navItem('leads', 'Leads', true)}
      ${navItem('settings', 'Settings')}
    </nav>
    <div class="sidebar-foot">Private · noindex</div>
  </aside>

  <div class="main">
    <header class="topbar">
      <button class="icon-btn menu" id="menu-btn" title="Menu">&#9776;</button>
      <h1 id="view-title">Overview</h1>
      <div class="spacer"></div>
      <div class="ranges" id="ranges">
        <button type="button" data-range="7">7d</button>
        <button type="button" data-range="30" class="on">30d</button>
        <button type="button" data-range="90">90d</button>
        <button type="button" data-range="180">180d</button>
      </div>
      <button class="icon-btn" id="theme-btn" title="Toggle theme">&#9728;</button>
      <form method="POST" action="/admin/logout" style="margin:0"><button class="btn ghost" type="submit">Log out</button></form>
    </header>

    <main class="content">
      <!-- OVERVIEW -->
      <section class="view" data-view="overview">
        <div class="grid kpis">
          <div class="card">
            <div class="ct"><span class="l">Page views</span><span id="pv-delta"></span></div>
            <div class="n" id="pv">-</div><div class="spark" id="pv-spark"></div>
            <div class="sub">all-time <b id="pv-all">-</b></div>
          </div>
          <div class="card">
            <div class="ct"><span class="l">Unique visitors</span><span id="uv-delta"></span></div>
            <div class="n" id="uv">-</div><div class="spark" id="uv-spark"></div>
            <div class="sub">all-time <b id="uv-all">-</b></div>
          </div>
          <div class="card">
            <div class="ct"><span class="l">Resume downloads</span><span id="dl-delta"></span></div>
            <div class="n" id="dl">-</div><div class="spark" id="dl-spark"></div>
            <div class="sub">all-time <b id="dl-all">-</b></div>
          </div>
          <div class="card">
            <div class="ct"><span class="l">Downloads / 100</span><span id="cv-delta"></span></div>
            <div class="n" id="cv">-</div><div class="spark" id="cv-spark"></div>
            <div class="sub">resume conversion</div>
          </div>
        </div>

        <div class="grid stats" style="margin-bottom:12px">
          <div class="stat"><div class="l">Sessions</div><div class="v" id="eg-sessions">-</div></div>
          <div class="stat"><div class="l">Bounce rate</div><div class="v" id="eg-bounce">-</div></div>
          <div class="stat"><div class="l">Avg. session</div><div class="v" id="eg-dur">-</div></div>
          <div class="stat"><div class="l">New visitors</div><div class="v" id="eg-new">-</div></div>
          <div class="stat"><div class="l">Returning</div><div class="v" id="eg-ret">-</div></div>
        </div>

        <section class="panel"><h2>Traffic trend</h2><div class="chart-box"><canvas id="trendCanvas"></canvas></div></section>
        <section class="panel"><h2>When visitors come (hour × day)</h2><div id="heatmap"></div></section>
      </section>

      <!-- AUDIENCE -->
      <section class="view hidden" data-view="audience">
        <div class="grid g3">
          ${donutPanel('Devices', 'devicesCanvas')}
          ${donutPanel('Browsers', 'browsersCanvas')}
          ${donutPanel('Operating systems', 'osCanvas')}
        </div>
        <div class="section-label">Geography</div>
        <div class="grid g3">
          <section class="panel"><h2>Countries</h2><div id="countries"></div></section>
          <section class="panel"><h2>Cities</h2><div id="cities"></div></section>
          <section class="panel"><h2>States / regions</h2><div id="regions"></div></section>
        </div>
      </section>

      <!-- TRAFFIC -->
      <section class="view hidden" data-view="traffic">
        <div class="grid g2">
          <section class="panel">
            <h2>Traffic sources</h2>
            <p class="muted" style="margin:-4px 0 10px">Tag shared links, e.g. <code>?ref=linkedin</code>. Untagged visits fall back to the referrer.</p>
            <div id="channels"></div>
          </section>
          <section class="panel">
            <h2>Audience</h2>
            <p class="muted" style="margin:-4px 0 10px">From <code>?aud=</code> tags, e.g. <code>?ref=linkedin&amp;aud=recruiter</code>.</p>
            <div id="audiences"></div>
          </section>
        </div>
        <section class="panel" style="margin-top:12px"><h2>Referrer hosts</h2><div id="referrers"></div></section>
      </section>

      <!-- CONTENT -->
      <section class="view hidden" data-view="content">
        <div class="grid g2">
          <section class="panel"><h2>Top pages</h2><div id="pages"></div></section>
          <section class="panel"><h2>Section engagement</h2><div id="sections"></div></section>
        </div>
        <div class="grid g2" style="margin-top:12px">
          <section class="panel"><h2>Top interactions (CTA clicks)</h2><div id="interactions"></div></section>
          <section class="panel"><h2>Scroll depth</h2><div id="scroll"></div></section>
        </div>
      </section>

      <!-- LEADS -->
      <section class="view hidden" data-view="leads">
        <section class="panel">
          <div class="panel-head">
            <h2>Leads <span class="badge" id="leads-badge" style="display:none"></span></h2>
            <button class="btn ghost" id="leads-seen-btn" type="button">Mark all read</button>
          </div>
          <p class="muted" style="margin:-4px 0 12px">Every contact-form submission is stored here — <b id="leads-total">-</b> total. You're emailed too, but this list never misses one.</p>
          <div class="leads-list" id="leads-list"><p class="muted">Loading…</p></div>
        </section>
      </section>

      <!-- SETTINGS -->
      <section class="view hidden" data-view="settings">
        <section class="panel">
          <h2>Resume</h2>
          <form id="resume-form" class="row">
            <input type="file" name="resume" accept="application/pdf" required />
            <button class="btn" type="submit">Upload new resume</button>
            <span class="msg" id="resume-msg"></span>
          </form>
          <div class="row" style="margin-top:12px">
            <input id="resume-name" type="text" value="${filename}" aria-label="Download filename" spellcheck="false" style="min-width:260px;flex:1 1 260px" />
            <button class="btn ghost" id="name-btn" type="button">Save download name</button>
            <span class="msg" id="name-msg"></span>
          </div>
          <p class="muted" style="margin:10px 0 0">Served as <strong id="name-shown">${filename}</strong> at <code>/resume</code>. Name change is immediate; the file updates within ~5&nbsp;min. <code>.pdf</code> is added automatically.</p>
        </section>

        <section class="panel">
          <h2>Export data (CSV)</h2>
          <div class="row" id="exports">
            <button class="btn ghost" type="button" data-export="leads">Leads</button>
            <button class="btn ghost" type="button" data-export="events">Events (current range)</button>
            <button class="btn ghost" type="button" data-export="daily">Daily totals (current range)</button>
          </div>
        </section>

        <section class="panel">
          <h2>Danger zone</h2>
          <div class="row">
            <button class="btn danger" id="reset-btn" type="button">Reset all analytics</button>
            <span class="msg" id="reset-msg"></span>
          </div>
          <p class="muted" style="margin:10px 0 0">Clears analytics events only. Leads and your resume are kept.</p>
        </section>
      </section>
    </main>
  </div>
</div>
<div class="overlay" id="overlay"></div>
<script>${DASHBOARD_JS}</script>
</body>
</html>`;
}
