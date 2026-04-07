// ═══════════════════════════════════════════════════════════
//  CLS LEADERBOARD — Client-side rendering
//  Extracted to external file for CSP compliance
// ═══════════════════════════════════════════════════════════

let LB = null;           // Leaderboard data
let sortCol = 'rank';
let sortDir = 'asc';
let searchQ = '';
let coverageFilter = 'all';

const DATA_URL = 'https://storage.googleapis.com/cls-factory-data/leaderboard_data.json';

function esc(s) { const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

function scoreClass(score) {
  if (score >= 60) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 20) return 'moderate';
  return 'low';
}

function coverageBars(tier) {
  const levels = {FULL:4, BROAD:3, PARTIAL:2, LIMITED:1};
  const n = levels[tier] || 1;
  let h = '<div class="lb-coverage">';
  for (let i = 0; i < 4; i++) h += `<div class="lb-coverage-bar${i<n?' filled':''}"></div>`;
  h += `<span class="lb-coverage-label">${tier}</span></div>`;
  return h;
}

function severityBars(dist) {
  if (!dist) return '<span style="font-size:0.7rem;color:var(--text-muted)">—</span>';
  const total = dist.critical + dist.high + dist.medium + dist.low;
  if (total === 0) return '—';
  const pct = k => Math.max(2, (dist[k] / total) * 30);
  return `<div class="lb-severity">
    <div class="lb-severity-bar" style="height:${pct('low')}px;background:#22C55E" title="Low: ${dist.low}"></div>
    <div class="lb-severity-bar" style="height:${pct('medium')}px;background:#3B82F6" title="Medium: ${dist.medium}"></div>
    <div class="lb-severity-bar" style="height:${pct('high')}px;background:#F59E0B" title="High: ${dist.high}"></div>
    <div class="lb-severity-bar" style="height:${pct('critical')}px;background:#EF4444" title="Critical: ${dist.critical}"></div>
  </div>`;
}

function topRiskBadges(blocks) {
  if (!blocks || !blocks.length) return '';
  return blocks.slice(0, 2).map(b => {
    const tier = b.rate >= 80 ? 'infra' : b.rate >= 50 ? 'agent' : 'text';
    return `<span class="lb-badge ${tier}" title="${esc(b.name)}: ${b.rate}%">${esc(b.name.split('/')[0])}</span>`;
  }).join(' ');
}

function shortModel(name) {
  const parts = name.split('/');
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

function renderTable() {
  let entries = LB.leaderboard.filter(e => {
    if (searchQ && !e.model.toLowerCase().includes(searchQ)) return false;
    if (coverageFilter !== 'all') {
      const levels = {FULL:4, BROAD:3, PARTIAL:2, LIMITED:1};
      const minLevel = levels[coverageFilter] || 1;
      if ((levels[e.coverage_tier] || 1) < minLevel) return false;
    }
    return true;
  });

  entries.sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (va == null) va = sortDir === 'asc' ? Infinity : -Infinity;
    if (vb == null) vb = sortDir === 'asc' ? Infinity : -Infinity;
    if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb||'').toLowerCase(); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const tbody = document.getElementById('lb-body');
  let h = '';
  entries.forEach(e => {
    h += `<tr data-model="${esc(e.model)}">
      <td><span class="lb-rank${e.rank<=3?' top3':''}">${e.rank}</span></td>
      <td><span class="lb-model-name">${esc(shortModel(e.model))}</span>
        ${e.providers?.length > 1 ? `<span style="font-size:0.65rem;color:var(--text-muted);margin-left:4px">${e.providers.length} providers</span>` : ''}
      </td>
      <td style="text-align:center"><span class="lb-score ${scoreClass(e.risk_score)}">${e.risk_score.toFixed(1)}</span></td>
      <td style="text-align:center;font-family:var(--font-mono)">${e.breach_rate}%</td>
      <td style="text-align:center;font-family:var(--font-mono);font-size:0.8rem">${e.total_probes.toLocaleString()}</td>
      <td style="text-align:center">${coverageBars(e.coverage_tier)}</td>
      <td style="text-align:center">${severityBars(e.severity_dist)}</td>
      <td style="text-align:center">${topRiskBadges(e.top_risk_blocks)}</td>
    </tr>`;
  });
  tbody.innerHTML = h;
  document.getElementById('lb-count').textContent = `${entries.length} of ${LB.leaderboard.length} models`;

  // Attach row click handlers (delegated)
  tbody.querySelectorAll('tr[data-model]').forEach(tr => {
    tr.addEventListener('click', () => openModel(tr.dataset.model));
  });
}

function sortTable(col, type) {
  if (sortCol === col) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortCol = col;
    sortDir = type === 'num' ? 'desc' : 'asc';
  }
  document.querySelectorAll('.lb-table th').forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));
  const th = document.querySelector(`.lb-table th[data-col="${col}"]`);
  if (th) th.classList.add(sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
  renderTable();
}

function filterCoverage(tier, btn) {
  coverageFilter = tier;
  document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

function openModel(name) {
  const e = LB.leaderboard.find(x => x.model === name);
  if (!e) return;
  const mc = document.getElementById('modal-content');

  let h = `<h2>${esc(shortModel(e.model))}</h2>`;
  if (e.providers?.length) {
    h += `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">
      Providers: ${e.providers.map(p => esc(p)).join(', ')}
    </div>`;
  }
  h += `<div style="font-size:0.7rem;color:var(--text-muted)">Last updated: ${LB.generated?.split('T')[0] || '—'} · ${e.total_probes.toLocaleString()} probes across ${e.modules_tested} modules</div>`;

  h += `<div class="modal-stats">
    <div class="modal-stat"><div class="modal-stat-num ${scoreClass(e.risk_score)}">${e.risk_score.toFixed(1)}</div><div class="modal-stat-label">Risk Score</div></div>
    <div class="modal-stat"><div class="modal-stat-num" style="color:var(--red)">${e.breach_rate}%</div><div class="modal-stat-label">Breach Rate</div></div>
    <div class="modal-stat"><div class="modal-stat-num" style="color:var(--text-primary)">${e.total_breaches.toLocaleString()}</div><div class="modal-stat-label">Breaches</div></div>
    <div class="modal-stat"><div class="modal-stat-num" style="color:var(--purple)">${e.coverage_tier}</div><div class="modal-stat-label">Coverage (${e.coverage_pct}%)</div></div>
    ${e.median_ais ? `<div class="modal-stat"><div class="modal-stat-num" style="color:var(--blue)">${e.median_ais}</div><div class="modal-stat-label">Median AIS</div></div>` : ''}
  </div>`;

  if (e.tier_rates && Object.keys(e.tier_rates).length) {
    h += `<div class="modal-chart-wrap"><canvas id="modal-tier-chart" height="200"></canvas></div>`;
  }

  if (e.block_rates && Object.keys(e.block_rates).length) {
    h += `<div class="modal-section"><h3>Attack Domain Breakdown</h3><div class="modal-risk-blocks">`;
    const blockNames = {'1':'Text Jailbreaking','2':'Agent Exploitation','3':'Vision/Multimodal','4':'OT/ICS','5':'MCP Protocol','6':'Containment','7':'Robotics/VLA','8':'World Model','9':'AV Reasoning','10':'Supply Chain','11':'Audio','12':'RAG-Specific','13':'Inference Infra','14':'Alignment/RL'};
    Object.entries(e.block_rates).sort((a,b) => b[1] - a[1]).forEach(([bid, rate]) => {
      const sc = rate >= 80 ? 'var(--red)' : rate >= 50 ? '#F59E0B' : rate >= 25 ? 'var(--blue)' : '#22C55E';
      h += `<div class="modal-risk-block">
        <div class="modal-risk-block-name">${esc(blockNames[bid] || 'Block '+bid)}</div>
        <div class="modal-risk-block-rate" style="color:${sc}">${rate}%</div>
      </div>`;
    });
    h += '</div></div>';
  }

  if (e.severity_dist) {
    const d = e.severity_dist;
    const total = d.critical + d.high + d.medium + d.low;
    if (total > 0) {
      h += `<div class="modal-section"><h3>Breach Severity Distribution</h3>
        <div style="display:flex;gap:1rem;flex-wrap:wrap">
          <div style="flex:1;min-width:60px;text-align:center"><div style="font-family:var(--font-mono);font-size:1.5rem;font-weight:700;color:#EF4444">${d.critical}</div><div style="font-size:0.7rem;color:var(--text-muted)">Critical</div></div>
          <div style="flex:1;min-width:60px;text-align:center"><div style="font-family:var(--font-mono);font-size:1.5rem;font-weight:700;color:#F59E0B">${d.high}</div><div style="font-size:0.7rem;color:var(--text-muted)">High</div></div>
          <div style="flex:1;min-width:60px;text-align:center"><div style="font-family:var(--font-mono);font-size:1.5rem;font-weight:700;color:#3B82F6">${d.medium}</div><div style="font-size:0.7rem;color:var(--text-muted)">Medium</div></div>
          <div style="flex:1;min-width:60px;text-align:center"><div style="font-family:var(--font-mono);font-size:1.5rem;font-weight:700;color:#22C55E">${d.low}</div><div style="font-size:0.7rem;color:var(--text-muted)">Low</div></div>
        </div>
      </div>`;
    }
  }

  // Upgrade CTA — uses data attributes instead of inline onclick
  h += `<div class="modal-section">
    <h3>Want the Full Picture?</h3>
    <div class="upgrade-cta">
      <div class="upgrade-card">
        <div class="price-label">Free</div>
        <div class="price" style="color:#22C55E">$0</div>
        <div class="desc">Risk Snapshot — 3 pages, risk score, breach rates, severity</div>
        <button class="btn btn-outline js-scroll-capture" style="font-size:0.8rem;padding:8px 16px">Get Snapshot</button>
      </div>
      <div class="upgrade-card">
        <div class="price-label">Detailed</div>
        <div class="price">$149</div>
        <div class="desc">Category Breakdown — 8-10 pages. Domain heatmap, per-category breach rates, top 10 findings with remediation, peer comparison</div>
        <a class="btn btn-primary js-buy-report" data-price="149" data-model="${esc(e.model)}" style="font-size:0.8rem;padding:8px 16px" href="#">Buy Report</a>
      </div>
      <div class="upgrade-card">
        <div class="price-label">Intelligence</div>
        <div class="price">$499</div>
        <div class="desc">Intelligence Report — 20-25 pages. Full module table, 30 findings, defense gap analysis, strategic recommendations, breach type breakdown</div>
        <a class="btn btn-primary js-buy-report" data-price="499" data-model="${esc(e.model)}" style="font-size:0.8rem;padding:8px 16px" href="#">Buy Report</a>
      </div>
    </div>
  </div>`;

  mc.innerHTML = h;
  document.getElementById('modal-overlay').classList.add('open');

  // Bind modal button handlers
  mc.querySelectorAll('.js-buy-report').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      buyReport(btn.dataset.model, parseInt(btn.dataset.price));
    });
  });
  mc.querySelectorAll('.js-scroll-capture').forEach(btn => {
    btn.addEventListener('click', () => scrollToCapture());
  });

  // Render tier chart
  if (e.tier_rates && Object.keys(e.tier_rates).length) {
    setTimeout(() => {
      const ctx = document.getElementById('modal-tier-chart');
      if (!ctx) return;
      const labels = Object.keys(e.tier_rates);
      const values = Object.values(e.tier_rates);
      const colors = labels.map(l => {
        if (l.includes('Safety')) return 'rgba(255,179,0,0.7)';
        if (l.includes('Infra')) return 'rgba(239,68,68,0.7)';
        if (l.includes('Agent')) return 'rgba(59,130,246,0.7)';
        return 'rgba(139,92,246,0.7)';
      });
      new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, barThickness: 40 }] },
        options: {
          responsive: true,
          plugins: { legend: { display: false }, title: { display: true, text: 'Breach Rate by Domain Tier', color: '#A0A0B8', font: { family: 'JetBrains Mono', size: 11 } } },
          scales: {
            y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6B6B80', font: { family: 'JetBrains Mono', size: 10 }, callback: v => v + '%' } },
            x: { grid: { display: false }, ticks: { color: '#A0A0B8', font: { family: 'JetBrains Mono', size: 10 } } }
          }
        }
      });
    }, 100);
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function scrollToCapture() {
  closeModal();
  document.getElementById('capture-box').scrollIntoView({ behavior: 'smooth' });
}

async function submitCapture() {
  const email = document.getElementById('capture-email').value.trim();
  const model = document.getElementById('capture-model').value;
  if (!email || !email.includes('@')) { alert('Enter a valid email'); return; }
  if (!model) { alert('Select a model'); return; }

  const btn = document.querySelector('.capture-form button');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    await fetch('https://script.google.com/macros/s/AKfycbwkbPEhTOnjQumVuRoEoHhOS0-T5wXI_z9mCp54-sHEmO9_T2I995CLTGMv-0VcI4lWOw/exec', {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email, model, source: 'leaderboard', type: 'snapshot' })
    });
  } catch (e) {
    console.warn('Form submit error (may still succeed with no-cors):', e);
  }

  try { localStorage.setItem('cls_capture_email', email); } catch(e) {}

  document.getElementById('capture-success').style.display = 'block';
  document.querySelector('.capture-form').style.display = 'none';
}

// ── Stripe Payment Links ──
const STRIPE_LINKS = {
  149: 'https://buy.stripe.com/6oU28s4uT6pm8ojegX8Vi00',
  499: 'https://buy.stripe.com/00wdRa2mL296awr8WD8Vi01',
};

function buyReport(model, price) {
  const baseUrl = STRIPE_LINKS[price];
  if (!baseUrl || baseUrl.startsWith('PASTE')) {
    window.location.href = `mailto:info@clsecuritylabs.com?subject=${encodeURIComponent(`Report Request: ${model} ($${price})`)}&body=${encodeURIComponent(`I'd like to purchase the $${price} report for ${model}.`)}`;
    return;
  }
  const email = localStorage.getItem('cls_capture_email') || '';
  const params = new URLSearchParams({
    client_reference_id: model,
    ...(email && { prefilled_email: email }),
  });
  window.location.href = `${baseUrl}?${params.toString()}`;
}

// ── DOM Ready ──
document.addEventListener('DOMContentLoaded', () => {
  // Sort header clicks
  document.querySelectorAll('.lb-table th[data-col]').forEach(th => {
    th.addEventListener('click', () => sortTable(th.dataset.col, th.dataset.type));
  });

  // Search input
  const searchInput = document.getElementById('lb-search');
  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { searchQ = searchInput.value.trim().toLowerCase(); renderTable(); }, 200);
  });

  // Filter buttons (via delegation instead of inline onclick)
  document.querySelectorAll('.lb-filter[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => filterCoverage(btn.dataset.filter, btn));
  });

  // Capture form submit button
  const captureBtn = document.querySelector('.capture-form .btn');
  if (captureBtn) {
    captureBtn.addEventListener('click', submitCapture);
  }

  // Modal overlay close on background click
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', ev => { if (ev.target === overlay) closeModal(); });
  }

  // Modal close button
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  // Keyboard: Escape closes modal
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Reveal on scroll
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // Mobile nav
  document.querySelector('.nav-toggle')?.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('open');
  });

  // Load data
  loadLeaderboard();
});

// ── Load data ──
async function loadLeaderboard() {
  try {
    const r = await fetch(DATA_URL);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    LB = await r.json();
  } catch (e) {
    console.warn('GCS fetch failed, trying local:', e);
    try {
      const r2 = await fetch('data/leaderboard_data.json');
      if (!r2.ok) throw new Error(`Local fetch failed: ${r2.status}`);
      LB = await r2.json();
    } catch (e2) {
      document.getElementById('lb-loading').innerHTML = `
        <div style="color:var(--red)">Failed to load leaderboard data</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem">${esc(e2.message)}</div>`;
      return;
    }
  }

  // Populate stats
  document.getElementById('stat-models').textContent = LB.total_models.toLocaleString();
  document.getElementById('stat-modules').textContent = LB.total_modules.toLocaleString();
  document.getElementById('stat-probes').textContent = (LB.total_probes || 0).toLocaleString();

  // Populate model selector
  const sel = document.getElementById('capture-model');
  LB.leaderboard.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.model;
    opt.textContent = shortModel(e.model);
    sel.appendChild(opt);
  });

  // Show table
  document.getElementById('lb-loading').style.display = 'none';
  document.getElementById('lb-table').style.display = '';
  renderTable();
}
