// ═══════════════════════════════════════════════
// DB
// ═══════════════════════════════════════════════
const DB_KEY = 'taxiadmin_v2';

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) return JSON.parse(raw);
  // migrate v1
  const old = localStorage.getItem('taxiadmin_v1');
  if (old) {
    const d = JSON.parse(old);
    if (!d.facturas) d.facturas = [];
    d.registros.forEach(r => { if (r.ahorro === undefined) r.ahorro = false; });
    d.conductores.forEach(c => { if (!c.fotoCedula) c.fotoCedula = null; if (!c.fotoLicencia) c.fotoLicencia = null; });
    return d;
  }
  return { taxis: [], conductores: [], registros: [], facturas: [], settings: { password: 'admin123' } };
}

function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

let db = loadDB();
if (!db.facturas) db.facturas = [];
db.registros.forEach(r => { if (r.ahorro === undefined) r.ahorro = false; });

function nextId(arr) { return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1; }

// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════
let isLoggedIn = false;

function doLogin() {
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');
  if (pass === db.settings.password) {
    isLoggedIn = true; err.classList.remove('show');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    initApp();
  } else {
    err.classList.add('show');
    document.getElementById('login-pass').value = '';
  }
}

function doLogout() {
  isLoggedIn = false;
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-pass').value = '';
}

function cambiarPassword() {
  const actual = document.getElementById('pass-actual').value;
  const nueva = document.getElementById('pass-nueva').value;
  const confirmar = document.getElementById('pass-confirmar').value;
  if (actual !== db.settings.password) return toast('Contraseña actual incorrecta', 'error');
  if (!nueva || nueva.length < 4) return toast('La nueva contraseña debe tener al menos 4 caracteres', 'error');
  if (nueva !== confirmar) return toast('Las contraseñas no coinciden', 'error');
  db.settings.password = nueva; saveDB(db);
  document.getElementById('pass-actual').value = '';
  document.getElementById('pass-nueva').value = '';
  document.getElementById('pass-confirmar').value = '';
  toast('Contraseña actualizada ✓', 'success');
}

// ═══════════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════════
function goTo(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + section).classList.add('active');
  const navItem = document.querySelector('[data-section="' + section + '"]');
  if (navItem) navItem.classList.add('active');
  if (section === 'dashboard') renderDashboard();
  if (section === 'registros') renderRegistros();
  if (section === 'taxis') renderTaxis();
  if (section === 'conductores') renderConductores();
  if (section === 'facturas') { populateSelectsFactura(); renderFacturas(); }
  if (section === 'exportar') renderExportPreview();
}

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════
const AHORRO = 5000;

function cop(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function today() { return new Date().toISOString().split('T')[0]; }
function fmtFecha(str) { if (!str) return ''; const [y,m,d] = str.split('-'); return `${d}/${m}/${y}`; }
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = type ? `show ${type}` : 'show';
  setTimeout(() => t.className = '', 2800);
}
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function verImagen(src) {
  if (!src) return;
  document.getElementById('img-preview-grande').src = src;
  document.getElementById('img-preview-overlay').classList.add('open');
}

// ═══════════════════════════════════════════════
// MONTO DISPLAY con ahorro
// ═══════════════════════════════════════════════
function actualizarMontoDisplay() {
  const base = parseFloat(document.getElementById('registro-monto').value) || 0;
  const ahorro = document.getElementById('registro-ahorro').checked ? AHORRO : 0;
  const total = base + ahorro;
  const d = document.getElementById('registro-monto-display');
  if (total > 0) {
    d.style.display = 'block';
    d.innerHTML = ahorro > 0
      ? `${cop(total)} <span style="font-size:18px;color:var(--accent)">+${cop(ahorro)} ahorro</span>`
      : cop(total);
  } else {
    d.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
function initApp() {
  const now = new Date();
  document.getElementById('today-date').textContent = now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const mes = now.toISOString().slice(0,7);
  document.getElementById('export-mes').value = mes;
  document.getElementById('registro-fecha').value = today();
  document.getElementById('factura-fecha').value = today();
  renderDashboard();
  populateSelects();
}

function populateSelects() {
  const taxis = db.taxis.filter(t => t.estado === 'activo');
  const fTaxi = document.getElementById('filtro-taxi');
  fTaxi.innerHTML = '<option value="">Todos los taxis</option>';
  taxis.forEach(t => fTaxi.innerHTML += `<option value="${t.id}">${t.placa}</option>`);
  const eTaxi = document.getElementById('export-taxi');
  eTaxi.innerHTML = '<option value="">Todos los taxis</option>';
  taxis.forEach(t => eTaxi.innerHTML += `<option value="${t.id}">${t.placa}</option>`);
  const rTaxi = document.getElementById('registro-taxi');
  const curr = rTaxi.value;
  rTaxi.innerHTML = '<option value="">Seleccionar taxi...</option>';
  taxis.forEach(t => rTaxi.innerHTML += `<option value="${t.id}">${t.placa} — ${t.modelo || ''}</option>`);
  rTaxi.value = curr;
  const cTaxi = document.getElementById('conductor-taxi');
  const cCurr = cTaxi.value;
  cTaxi.innerHTML = '<option value="">Sin asignar</option>';
  taxis.forEach(t => cTaxi.innerHTML += `<option value="${t.id}">${t.placa}</option>`);
  cTaxi.value = cCurr;
  onTaxiChange();
}

function populateSelectsFactura() {
  const taxis = db.taxis.filter(t => t.estado === 'activo');
  const sel1 = document.getElementById('factura-taxi');
  const curr = sel1.value;
  sel1.innerHTML = '<option value="">Seleccionar taxi...</option>';
  taxis.forEach(t => sel1.innerHTML += `<option value="${t.id}">${t.placa} — ${t.modelo || ''}</option>`);
  sel1.value = curr;
  const sel2 = document.getElementById('filtro-factura-taxi');
  const curr2 = sel2.value;
  sel2.innerHTML = '<option value="">Todos los taxis</option>';
  taxis.forEach(t => sel2.innerHTML += `<option value="${t.id}">${t.placa}</option>`);
  sel2.value = curr2;
}

function onTaxiChange() {
  const taxiId = parseInt(document.getElementById('registro-taxi').value);
  const sel = document.getElementById('registro-conductor');
  sel.innerHTML = '<option value="">Seleccionar conductor...</option>';
  if (!taxiId) return;
  db.conductores.filter(c => c.estado === 'activo').forEach(c => {
    const label = c.taxiId === taxiId ? `${c.nombre} ★` : c.nombre;
    sel.innerHTML += `<option value="${c.id}" ${c.taxiId === taxiId ? 'selected' : ''}>${label}</option>`;
  });
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
function renderDashboard() {
  const todayStr = today();
  const recaudosHoy = db.registros.filter(r => r.fecha === todayStr);
  const totalHoy = recaudosHoy.reduce((s, r) => s + r.monto + (r.ahorro ? AHORRO : 0), 0);
  const totalMes = db.registros.filter(r => r.fecha.startsWith(todayStr.slice(0,7))).reduce((s, r) => s + r.monto + (r.ahorro ? AHORRO : 0), 0);
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-value">${db.taxis.filter(t=>t.estado==='activo').length}</div><div class="stat-label">Taxis activos</div></div>
    <div class="stat-card"><div class="stat-value">${db.conductores.filter(c=>c.estado==='activo').length}</div><div class="stat-label">Conductores</div></div>
    <div class="stat-card" style="grid-column:span 2;"><div class="stat-value" style="font-size:22px;">${cop(totalHoy)}</div><div class="stat-label">Recaudado hoy</div></div>
    <div class="stat-card" style="grid-column:span 2;"><div class="stat-value" style="font-size:22px;">${cop(totalMes)}</div><div class="stat-label">Total del mes</div></div>
  `;
  const contHoy = document.getElementById('today-recaudos');
  if (recaudosHoy.length === 0) {
    contHoy.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">No hay registros para hoy</div></div>`;
  } else {
    contHoy.innerHTML = recaudosHoy.map(r => {
      const taxi = db.taxis.find(t => t.id === r.taxiId);
      const conductor = db.conductores.find(c => c.id === r.conductorId);
      const total = r.monto + (r.ahorro ? AHORRO : 0);
      return `<div class="recaudo-item">
        <div>
          <div class="recaudo-placa">${taxi ? taxi.placa : '?'}</div>
          <div class="recaudo-conductor">${conductor ? conductor.nombre : 'Sin conductor'}${r.ahorro ? ' · <span style="color:var(--accent)">+ahorro</span>' : ''}</div>
        </div>
        <div style="text-align:right"><div class="recaudo-monto">${cop(total)}</div></div>
      </div>`;
    }).join('');
  }
  const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7);
  const recent = db.registros.filter(r => new Date(r.fecha) >= hace7).sort((a,b) => b.fecha.localeCompare(a.fecha));
  const contRecent = document.getElementById('recent-recaudos');
  if (recent.length === 0) {
    contRecent.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">Sin registros recientes</div></div>`;
  } else {
    const byDate = {};
    recent.forEach(r => { if (!byDate[r.fecha]) byDate[r.fecha] = []; byDate[r.fecha].push(r); });
    contRecent.innerHTML = Object.entries(byDate).map(([fecha, regs]) => {
      const total = regs.reduce((s,r) => s + r.monto + (r.ahorro ? AHORRO : 0), 0);
      return `<div class="recaudo-item">
        <div><div style="font-weight:600;font-size:15px;">${fmtFecha(fecha)}</div><div style="font-size:13px;color:var(--text2)">${regs.length} taxi${regs.length!==1?'s':''}</div></div>
        <div class="recaudo-monto">${cop(total)}</div>
      </div>`;
    }).join('');
  }
}

// ═══════════════════════════════════════════════
// TAXIS + DETALLE
// ═══════════════════════════════════════════════
function openModalTaxi(id = null) {
  document.getElementById('modal-taxi-title').textContent = id ? 'Editar Taxi' : 'Agregar Taxi';
  document.getElementById('taxi-edit-id').value = id || '';
  if (id) {
    const t = db.taxis.find(x => x.id === id);
    document.getElementById('taxi-placa').value = t.placa;
    document.getElementById('taxi-modelo').value = t.modelo || '';
    document.getElementById('taxi-color').value = t.color || '';
    document.getElementById('taxi-estado').value = t.estado;
    document.getElementById('taxi-placa').disabled = true;
  } else {
    document.getElementById('taxi-placa').value = '';
    document.getElementById('taxi-modelo').value = '';
    document.getElementById('taxi-color').value = '';
    document.getElementById('taxi-estado').value = 'activo';
    document.getElementById('taxi-placa').disabled = false;
  }
  openModal('modal-taxi');
}

function guardarTaxi() {
  const placa = document.getElementById('taxi-placa').value.trim().toUpperCase();
  const modelo = document.getElementById('taxi-modelo').value.trim();
  const color = document.getElementById('taxi-color').value.trim();
  const estado = document.getElementById('taxi-estado').value;
  const editId = parseInt(document.getElementById('taxi-edit-id').value) || null;
  if (!placa) return toast('La placa es obligatoria', 'error');
  if (!editId) {
    if (db.taxis.find(t => t.placa === placa)) return toast('Ya existe un taxi con esa placa', 'error');
    db.taxis.push({ id: nextId(db.taxis), placa, modelo, color, estado, creado: today() });
    toast('Taxi agregado ✓', 'success');
  } else {
    Object.assign(db.taxis.find(x => x.id === editId), { modelo, color, estado });
    toast('Taxi actualizado ✓', 'success');
  }
  saveDB(db); closeModal('modal-taxi'); renderTaxis(); populateSelects();
}

function renderTaxis() {
  const tbody = document.getElementById('tbody-taxis');
  if (db.taxis.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🚖</div><div class="empty-text">No hay taxis registrados</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = db.taxis.map(t => {
    const conductor = db.conductores.find(c => c.taxiId === t.id && c.estado === 'activo');
    const recaudos = db.registros.filter(r => r.taxiId === t.id);
    const totalRecaudo = recaudos.reduce((s,r) => s + r.monto + (r.ahorro ? AHORRO : 0), 0);
    const totalFacturas = db.facturas.filter(f => f.taxiId === t.id).reduce((s,f) => s + f.monto, 0);
    const neto = totalRecaudo - totalFacturas;
    return `<tr style="cursor:pointer" onclick="verDetalleTaxi(${t.id})">
      <td><strong style="font-family:var(--font-display);font-size:18px;color:var(--accent)">${t.placa}</strong><div style="font-size:12px;color:var(--text3)">${t.modelo || ''}</div></td>
      <td>${t.modelo || '—'}</td>
      <td>${conductor ? conductor.nombre : '<span style="color:var(--text3)">Sin conductor</span>'}</td>
      <td><strong style="color:var(--green);font-family:var(--font-display)">${cop(neto)}</strong><div style="font-size:11px;color:var(--text3)">bruto: ${cop(totalRecaudo)} · fact: ${cop(totalFacturas)}</div></td>
      <td><span class="badge ${t.estado==='activo'?'badge-green':'badge-red'}">${t.estado}</span></td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="openModalTaxi(${t.id})">✏️</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="confirmDelete('taxi',${t.id})">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function verDetalleTaxi(taxiId) {
  const t = db.taxis.find(x => x.id === taxiId);
  if (!t) return;
  const conductor = db.conductores.find(c => c.taxiId === taxiId && c.estado === 'activo');
  const regs = db.registros.filter(r => r.taxiId === taxiId).sort((a,b) => b.fecha.localeCompare(a.fecha));
  const facturas = db.facturas.filter(f => f.taxiId === taxiId);
  const totalRecaudo = regs.reduce((s,r) => s + r.monto + (r.ahorro ? AHORRO : 0), 0);
  const totalFacturas = facturas.reduce((s,f) => s + f.monto, 0);
  const neto = totalRecaudo - totalFacturas;

  let html = `
    <div class="taxi-detail-header">
      <div class="taxi-detail-placa">${t.placa}</div>
      <div class="taxi-detail-info">${t.modelo || ''} ${t.color ? '· ' + t.color : ''} · <span class="badge ${t.estado==='activo'?'badge-green':'badge-red'}" style="font-size:11px">${t.estado}</span></div>
      ${conductor ? `<div style="margin-top:8px;font-size:14px;color:var(--text2)">👤 Conductor: <strong style="color:var(--text)">${conductor.nombre}</strong></div>` : '<div style="margin-top:8px;font-size:14px;color:var(--text3)">Sin conductor asignado</div>'}
    </div>
    <div class="taxi-summary-grid">
      <div class="taxi-summary-card"><div class="taxi-summary-val" style="color:var(--green)">${cop(totalRecaudo)}</div><div class="taxi-summary-lbl">Total Recaudado</div></div>
      <div class="taxi-summary-card"><div class="taxi-summary-val" style="color:var(--red)">${cop(totalFacturas)}</div><div class="taxi-summary-lbl">Total Facturas</div></div>
      <div class="taxi-summary-card" style="grid-column:span 2"><div class="taxi-summary-val" style="color:var(--accent)">${cop(neto)}</div><div class="taxi-summary-lbl">Neto (recaudo − facturas)</div></div>
    </div>
    <div class="card">
      <div class="card-title">📅 Registros Diarios (${regs.length})</div>
      ${regs.length === 0 ? '<div class="empty-state" style="padding:24px"><div class="empty-icon">📭</div><div class="empty-text">Sin registros</div></div>' : `
      <div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Conductor</th><th>Entrega</th><th>Ahorro</th><th>Total</th></tr></thead>
        <tbody>${regs.map(r => {
          const c = db.conductores.find(x => x.id === r.conductorId);
          const tot = r.monto + (r.ahorro ? AHORRO : 0);
          return `<tr>
            <td>${fmtFecha(r.fecha)}</td>
            <td>${c ? c.nombre : '—'}</td>
            <td>${cop(r.monto)}</td>
            <td>${r.ahorro ? `<span class="badge badge-yellow">+${cop(AHORRO)}</span>` : '—'}</td>
            <td><strong style="color:var(--green)">${cop(tot)}</strong></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
    <div class="card">
      <div class="card-title">🧾 Facturas (${facturas.length})</div>
      ${facturas.length === 0 ? '<div class="empty-state" style="padding:24px"><div class="empty-icon">🧾</div><div class="empty-text">Sin facturas</div></div>' : `
      <div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Descripción</th><th>Monto</th><th>Foto</th></tr></thead>
        <tbody>${facturas.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(f => `<tr>
          <td>${fmtFecha(f.fecha)}</td>
          <td>${f.desc}</td>
          <td><strong style="color:var(--red)">${cop(f.monto)}</strong></td>
          <td>${f.img ? `<img src="${f.img}" class="factura-img-thumb" onclick="verImagen('${f.img}')" />` : '—'}</td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>
  `;

  document.getElementById('taxi-detalle-contenido').innerHTML = html;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-taxi-detalle').classList.add('active');
}

// ═══════════════════════════════════════════════
// CONDUCTORES + FOTOS
// ═══════════════════════════════════════════════
let fotosTempConductor = { cedula: null, licencia: null };

function cargarFoto(input, previewId, tipo) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    fotosTempConductor[tipo] = e.target.result;
    const el = document.getElementById(previewId);
    el.outerHTML = `<img id="${previewId}" src="${e.target.result}" class="foto-preview" onclick="verImagen('${e.target.result}')" />`;
  };
  reader.readAsDataURL(file);
}

function openModalConductor(id = null) {
  fotosTempConductor = { cedula: null, licencia: null };
  document.getElementById('modal-conductor-title').textContent = id ? 'Editar Conductor' : 'Agregar Conductor';
  document.getElementById('conductor-edit-id').value = id || '';
  populateSelects();
  ['cedula','licencia'].forEach(tipo => {
    const pid = `preview-${tipo}`;
    const el = document.getElementById(pid);
    if (el) el.outerHTML = `<div class="foto-placeholder" id="${pid}" onclick="document.getElementById('input-${tipo}').click()">🪪</div>`;
  });
  document.getElementById('input-cedula').value = '';
  document.getElementById('input-licencia').value = '';
  if (id) {
    const c = db.conductores.find(x => x.id === id);
    document.getElementById('conductor-nombre').value = c.nombre;
    document.getElementById('conductor-documento').value = c.documento || '';
    document.getElementById('conductor-telefono').value = c.telefono || '';
    document.getElementById('conductor-taxi').value = c.taxiId || '';
    document.getElementById('conductor-estado').value = c.estado;
    if (c.fotoCedula) {
      fotosTempConductor.cedula = c.fotoCedula;
      document.getElementById('preview-cedula').outerHTML = `<img id="preview-cedula" src="${c.fotoCedula}" class="foto-preview" onclick="verImagen('${c.fotoCedula}')" />`;
    }
    if (c.fotoLicencia) {
      fotosTempConductor.licencia = c.fotoLicencia;
      document.getElementById('preview-licencia').outerHTML = `<img id="preview-licencia" src="${c.fotoLicencia}" class="foto-preview" onclick="verImagen('${c.fotoLicencia}')" />`;
    }
  } else {
    document.getElementById('conductor-nombre').value = '';
    document.getElementById('conductor-documento').value = '';
    document.getElementById('conductor-telefono').value = '';
    document.getElementById('conductor-taxi').value = '';
    document.getElementById('conductor-estado').value = 'activo';
  }
  openModal('modal-conductor');
}

function guardarConductor() {
  const nombre = document.getElementById('conductor-nombre').value.trim();
  const documento = document.getElementById('conductor-documento').value.trim();
  const telefono = document.getElementById('conductor-telefono').value.trim();
  const taxiId = parseInt(document.getElementById('conductor-taxi').value) || null;
  const estado = document.getElementById('conductor-estado').value;
  const editId = parseInt(document.getElementById('conductor-edit-id').value) || null;
  if (!nombre) return toast('El nombre es obligatorio', 'error');
  if (!editId) {
    db.conductores.push({ id: nextId(db.conductores), nombre, documento, telefono, taxiId, estado, fotoCedula: fotosTempConductor.cedula, fotoLicencia: fotosTempConductor.licencia, creado: today() });
    toast('Conductor agregado ✓', 'success');
  } else {
    const c = db.conductores.find(x => x.id === editId);
    Object.assign(c, { nombre, documento, telefono, taxiId, estado, fotoCedula: fotosTempConductor.cedula || c.fotoCedula, fotoLicencia: fotosTempConductor.licencia || c.fotoLicencia });
    toast('Conductor actualizado ✓', 'success');
  }
  saveDB(db); closeModal('modal-conductor'); renderConductores(); populateSelects();
}

function renderConductores() {
  const tbody = document.getElementById('tbody-conductores');
  if (db.conductores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👤</div><div class="empty-text">No hay conductores registrados</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = db.conductores.map(c => {
    const taxi = db.taxis.find(t => t.id === c.taxiId);
    const fotos = [
      c.fotoCedula ? `<img src="${c.fotoCedula}" class="factura-img-thumb" onclick="event.stopPropagation();verImagen('${c.fotoCedula}')" title="Cédula" />` : '',
      c.fotoLicencia ? `<img src="${c.fotoLicencia}" class="factura-img-thumb" onclick="event.stopPropagation();verImagen('${c.fotoLicencia}')" title="Licencia" />` : ''
    ].filter(Boolean).join('');
    return `<tr style="cursor:pointer" onclick="verDetalleConductor(${c.id})">
      <td><strong style="color:var(--accent)">${c.nombre}</strong></td>
      <td>${c.documento || '—'}</td>
      <td>${c.telefono || '—'}</td>
      <td>${taxi ? `<span style="font-family:var(--font-display);color:var(--accent);font-weight:700">${taxi.placa}</span>` : '—'}</td>
      <td><div style="display:flex;gap:4px;">${fotos || '<span style="color:var(--text3);font-size:12px">Sin fotos</span>'}</div></td>
      <td><span class="badge ${c.estado==='activo'?'badge-green':'badge-red'}">${c.estado}</span></td>
      <td><div style="display:flex;gap:6px;" onclick="event.stopPropagation()"><button class="btn btn-ghost btn-sm btn-icon" onclick="openModalConductor(${c.id})">✏️</button><button class="btn btn-ghost btn-sm btn-icon" onclick="confirmDelete('conductor',${c.id})">🗑️</button></div></td>
    </tr>`;
  }).join('');
}

function verDetalleConductor(conductorId) {
  const c = db.conductores.find(x => x.id === conductorId);
  if (!c) return;
  const taxi = db.taxis.find(t => t.id === c.taxiId);
  const regs = db.registros.filter(r => r.conductorId === conductorId).sort((a,b) => b.fecha.localeCompare(a.fecha));
  const totalEntregas = regs.reduce((s,r) => s + r.monto + (r.ahorro ? AHORRO : 0), 0);
  const diasTrabajados = regs.length;
  const promedioDia = diasTrabajados > 0 ? totalEntregas / diasTrabajados : 0;

  let html = `
    <div class="taxi-detail-header">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        ${c.fotoCedula ? `<img src="${c.fotoCedula}" style="width:72px;height:72px;object-fit:cover;border-radius:10px;border:2px solid var(--accent);cursor:pointer" onclick="verImagen('${c.fotoCedula}')" title="Cédula" />` : `<div style="width:72px;height:72px;border-radius:10px;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;font-size:32px;background:var(--surface2)">👤</div>`}
        <div>
          <div class="taxi-detail-placa" style="font-size:30px">${c.nombre}</div>
          <div class="taxi-detail-info">
            ${c.documento ? `📄 Doc: ${c.documento}` : ''}
            ${c.telefono ? ` · 📞 ${c.telefono}` : ''}
            · <span class="badge ${c.estado==='activo'?'badge-green':'badge-red'}" style="font-size:11px">${c.estado}</span>
          </div>
          ${taxi ? `<div style="margin-top:6px;font-size:14px;color:var(--text2)">🚖 Taxi asignado: <strong style="color:var(--accent);font-family:var(--font-display);font-size:18px">${taxi.placa}</strong>${taxi.modelo ? ` · ${taxi.modelo}` : ''}</div>` : '<div style="margin-top:6px;font-size:14px;color:var(--text3)">Sin taxi asignado</div>'}
        </div>
      </div>
      ${c.fotoLicencia ? `<div style="margin-top:12px;"><div style="font-size:12px;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Licencia de conducción</div><img src="${c.fotoLicencia}" style="height:60px;border-radius:8px;border:1px solid var(--border);cursor:pointer" onclick="verImagen('${c.fotoLicencia}')" /></div>` : ''}
    </div>
    <div class="taxi-summary-grid">
      <div class="taxi-summary-card"><div class="taxi-summary-val" style="color:var(--blue)">${diasTrabajados}</div><div class="taxi-summary-lbl">Días Trabajados</div></div>
      <div class="taxi-summary-card"><div class="taxi-summary-val" style="color:var(--green);font-size:18px">${cop(totalEntregas)}</div><div class="taxi-summary-lbl">Total Entregado</div></div>
      <div class="taxi-summary-card" style="grid-column:span 2"><div class="taxi-summary-val" style="color:var(--accent);font-size:18px">${cop(promedioDia)}</div><div class="taxi-summary-lbl">Promedio por Día</div></div>
    </div>
    <div class="card">
      <div class="card-title">📅 Historial de Entregas (${regs.length})</div>
      ${regs.length === 0 ? '<div class="empty-state" style="padding:24px"><div class="empty-icon">📭</div><div class="empty-text">Sin registros</div></div>' : `
      <div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Taxi</th><th>Entrega</th><th>Ahorro</th><th>Total</th><th>Obs.</th></tr></thead>
        <tbody>${regs.map(r => {
          const tx = db.taxis.find(x => x.id === r.taxiId);
          const tot = r.monto + (r.ahorro ? AHORRO : 0);
          return `<tr>
            <td>${fmtFecha(r.fecha)}</td>
            <td><span style="font-family:var(--font-display);color:var(--accent);font-weight:700">${tx ? tx.placa : '—'}</span></td>
            <td>${cop(r.monto)}</td>
            <td>${r.ahorro ? `<span class="badge badge-yellow">+${cop(AHORRO)}</span>` : '—'}</td>
            <td><strong style="color:var(--green)">${cop(tot)}</strong></td>
            <td style="font-size:12px;color:var(--text3)">${r.obs || '—'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
    <div style="margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn btn-ghost" style="width:auto;padding:10px 18px;font-size:14px" onclick="openModalConductor(${c.id})">✏️ Editar conductor</button>
    </div>
  `;

  document.getElementById('conductor-detalle-contenido').innerHTML = html;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-conductor-detalle').classList.add('active');
}

// ═══════════════════════════════════════════════
// REGISTROS
// ═══════════════════════════════════════════════
function openModalRegistro(id = null) {
  populateSelects();
  document.getElementById('modal-registro-title').textContent = id ? 'Editar Registro' : 'Nuevo Registro';
  document.getElementById('registro-edit-id').value = id || '';
  document.getElementById('registro-monto-display').style.display = 'none';
  document.getElementById('registro-ahorro').checked = false;
  document.getElementById('registro-tiene-factura').checked = false;
  document.getElementById('factura-inline-panel').style.display = 'none';
  fotoTempFacturaInline = null;
  if (id) {
    const r = db.registros.find(x => x.id === id);
    document.getElementById('registro-fecha').value = r.fecha;
    document.getElementById('registro-taxi').value = r.taxiId;
    onTaxiChange();
    document.getElementById('registro-conductor').value = r.conductorId || '';
    document.getElementById('registro-monto').value = r.monto;
    document.getElementById('registro-ahorro').checked = !!r.ahorro;
    document.getElementById('registro-obs').value = r.obs || '';
    actualizarMontoDisplay();
  } else {
    document.getElementById('registro-fecha').value = today();
    document.getElementById('registro-taxi').value = '';
    document.getElementById('registro-conductor').value = '';
    document.getElementById('registro-monto').value = '';
    document.getElementById('registro-obs').value = '';
    onTaxiChange();
  }
  openModal('modal-registro');
}

function guardarRegistro() {
  const fecha = document.getElementById('registro-fecha').value;
  const taxiId = parseInt(document.getElementById('registro-taxi').value) || null;
  const conductorId = parseInt(document.getElementById('registro-conductor').value) || null;
  const monto = parseFloat(document.getElementById('registro-monto').value) || 0;
  const ahorro = document.getElementById('registro-ahorro').checked;
  const obs = document.getElementById('registro-obs').value.trim();
  const editId = parseInt(document.getElementById('registro-edit-id').value) || null;
  if (!fecha) return toast('La fecha es obligatoria', 'error');
  if (!taxiId) return toast('Selecciona un taxi', 'error');
  if (monto <= 0) return toast('El monto debe ser mayor a 0', 'error');
  const dup = db.registros.find(r => r.taxiId === taxiId && r.fecha === fecha && r.id !== editId);
  if (dup) return toast('Ya existe un registro para ese taxi en esa fecha', 'error');
  if (!editId) {
    db.registros.push({ id: nextId(db.registros), fecha, taxiId, conductorId, monto, ahorro, obs, creado: today() });
    toast('Registro guardado ✓', 'success');
  } else {
    Object.assign(db.registros.find(x => x.id === editId), { fecha, taxiId, conductorId, monto, ahorro, obs });
    toast('Registro actualizado ✓', 'success');
  }
  const tieneFactura = document.getElementById('registro-tiene-factura').checked;
  if (tieneFactura && !editId) {
    const fiDesc = document.getElementById('fi-desc').value.trim();
    const fiMonto = parseFloat(document.getElementById('fi-monto').value) || 0;
    if (fiDesc && fiMonto > 0) {
      db.facturas.push({ id: nextId(db.facturas), taxiId, desc: fiDesc, monto: fiMonto, fecha, img: fotoTempFacturaInline, creado: today() });
      toast('Registro y factura guardados ✓', 'success');
    }
  }
  saveDB(db); closeModal('modal-registro'); renderRegistros();
  if (document.getElementById('section-dashboard').classList.contains('active')) renderDashboard();
}

function renderRegistros() {
  const taxiId = parseInt(document.getElementById('filtro-taxi').value) || null;
  const fecha = document.getElementById('filtro-fecha').value;
  let regs = [...db.registros];
  if (taxiId) regs = regs.filter(r => r.taxiId === taxiId);
  if (fecha) regs = regs.filter(r => r.fecha === fecha);
  regs.sort((a,b) => b.fecha.localeCompare(a.fecha));
  const tbody = document.getElementById('tbody-registros');
  if (regs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">No hay registros con esos filtros</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = regs.map(r => {
    const taxi = db.taxis.find(t => t.id === r.taxiId);
    const conductor = db.conductores.find(c => c.id === r.conductorId);
    const total = r.monto + (r.ahorro ? AHORRO : 0);
    return `<tr>
      <td>${fmtFecha(r.fecha)}</td>
      <td><strong style="font-family:var(--font-display);color:var(--accent);font-size:17px">${taxi ? taxi.placa : '?'}</strong></td>
      <td>${conductor ? conductor.nombre : '—'}</td>
      <td>${cop(r.monto)}</td>
      <td>${r.ahorro ? `<span class="badge badge-yellow">+${cop(AHORRO)}</span>` : '—'}</td>
      <td><strong style="color:var(--green)">${cop(total)}</strong></td>
      <td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2);font-size:13px">${r.obs || '—'}</td>
      <td><div style="display:flex;gap:6px;"><button class="btn btn-ghost btn-sm btn-icon" onclick="openModalRegistro(${r.id})">✏️</button><button class="btn btn-ghost btn-sm btn-icon" onclick="confirmDelete('registro',${r.id})">🗑️</button></div></td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════
// FACTURAS
// ═══════════════════════════════════════════════
let fotoTempFacturaInline = null;
let fotoTempFactura = null;

function toggleFacturaInline() {
  const on = document.getElementById('registro-tiene-factura').checked;
  document.getElementById('factura-inline-panel').style.display = on ? 'block' : 'none';
  if (!on) {
    fotoTempFacturaInline = null;
    document.getElementById('fi-desc').value = '';
    document.getElementById('fi-monto').value = '';
    document.getElementById('fi-img-input').value = '';
    document.getElementById('fi-img-wrap').style.display = 'none';
  }
}

function cargarFotoFacturaInline(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    fotoTempFacturaInline = e.target.result;
    document.getElementById('fi-img-preview').src = e.target.result;
    document.getElementById('fi-img-wrap').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function cargarFotoFactura(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    fotoTempFactura = e.target.result;
    document.getElementById('factura-img-preview').src = e.target.result;
    document.getElementById('factura-img-preview-wrap').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function openModalFactura(id = null) {
  fotoTempFactura = null;
  document.getElementById('modal-factura-title').textContent = id ? 'Editar Factura' : 'Nueva Factura';
  document.getElementById('factura-edit-id').value = id || '';
  document.getElementById('factura-img-preview-wrap').style.display = 'none';
  document.getElementById('factura-img-input').value = '';
  populateSelectsFactura();
  if (id) {
    const f = db.facturas.find(x => x.id === id);
    document.getElementById('factura-taxi').value = f.taxiId;
    document.getElementById('factura-desc').value = f.desc;
    document.getElementById('factura-monto').value = f.monto;
    document.getElementById('factura-fecha').value = f.fecha;
    if (f.img) {
      fotoTempFactura = f.img;
      document.getElementById('factura-img-preview').src = f.img;
      document.getElementById('factura-img-preview-wrap').style.display = 'block';
    }
  } else {
    document.getElementById('factura-taxi').value = '';
    document.getElementById('factura-desc').value = '';
    document.getElementById('factura-monto').value = '';
    document.getElementById('factura-fecha').value = today();
  }
  openModal('modal-factura');
}

function guardarFactura() {
  const taxiId = parseInt(document.getElementById('factura-taxi').value) || null;
  const desc = document.getElementById('factura-desc').value.trim();
  const monto = parseFloat(document.getElementById('factura-monto').value) || 0;
  const fecha = document.getElementById('factura-fecha').value;
  const editId = parseInt(document.getElementById('factura-edit-id').value) || null;
  if (!taxiId) return toast('Selecciona un taxi', 'error');
  if (!desc) return toast('La descripción es obligatoria', 'error');
  if (monto <= 0) return toast('El monto debe ser mayor a 0', 'error');
  if (!editId) {
    db.facturas.push({ id: nextId(db.facturas), taxiId, desc, monto, fecha, img: fotoTempFactura, creado: today() });
    toast('Factura guardada ✓', 'success');
  } else {
    const f = db.facturas.find(x => x.id === editId);
    Object.assign(f, { taxiId, desc, monto, fecha, img: fotoTempFactura !== null ? fotoTempFactura : f.img });
    toast('Factura actualizada ✓', 'success');
  }
  saveDB(db); closeModal('modal-factura'); renderFacturas();
}

function renderFacturas() {
  const taxiId = parseInt(document.getElementById('filtro-factura-taxi').value) || null;
  let facts = [...db.facturas];
  if (taxiId) facts = facts.filter(f => f.taxiId === taxiId);
  facts.sort((a,b) => b.fecha.localeCompare(a.fecha));
  const cont = document.getElementById('lista-facturas');
  if (facts.length === 0) {
    cont.innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><div class="empty-text">No hay facturas registradas</div></div>`;
    return;
  }
  const total = facts.reduce((s,f) => s + f.monto, 0);
  cont.innerHTML = `<div class="card" style="background:var(--red-dim);border-color:var(--red);margin-bottom:16px;padding:14px 20px;">
    <span style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--red)">Total facturas: ${cop(total)}</span>
  </div>` + facts.map(f => {
    const taxi = db.taxis.find(t => t.id === f.taxiId);
    return `<div class="factura-card">
      <div class="factura-card-header">
        <div>
          <div class="factura-desc">${f.desc}</div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
            ${taxi ? `<span style="font-family:var(--font-display);color:var(--accent);font-weight:700;font-size:15px">${taxi.placa}</span>` : ''}
            <span class="factura-fecha">${fmtFecha(f.fecha)}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="factura-monto">${cop(f.monto)}</div>
          <div style="display:flex;gap:6px;">
            ${f.img ? `<button class="btn btn-ghost btn-sm btn-icon" onclick="verImagen('${f.img}')">🖼️</button>` : ''}
            <button class="btn btn-ghost btn-sm btn-icon" onclick="openModalFactura(${f.id})">✏️</button>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="confirmDelete('factura',${f.id})">🗑️</button>
          </div>
        </div>
      </div>
      ${f.img ? `<img src="${f.img}" class="factura-img-thumb" style="width:100%;height:120px;margin-top:10px;" onclick="verImagen('${f.img}')" />` : ''}
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
// ELIMINAR
// ═══════════════════════════════════════════════
function confirmDelete(tipo, id) {
  const msgs = {
    taxi: 'Este taxi y todos sus registros y facturas serán eliminados.',
    conductor: 'Este conductor será eliminado.',
    registro: 'Este registro de recaudo será eliminado.',
    factura: 'Esta factura será eliminada.'
  };
  document.getElementById('confirm-text').textContent = msgs[tipo] || '¿Confirmar eliminación?';
  document.getElementById('confirm-btn').onclick = () => { doDelete(tipo, id); closeModal('modal-confirm'); };
  openModal('modal-confirm');
}

function doDelete(tipo, id) {
  if (tipo === 'taxi') { db.taxis = db.taxis.filter(t => t.id !== id); db.registros = db.registros.filter(r => r.taxiId !== id); db.facturas = db.facturas.filter(f => f.taxiId !== id); renderTaxis(); populateSelects(); }
  else if (tipo === 'conductor') { db.conductores = db.conductores.filter(c => c.id !== id); renderConductores(); populateSelects(); }
  else if (tipo === 'registro') { db.registros = db.registros.filter(r => r.id !== id); renderRegistros(); }
  else if (tipo === 'factura') { db.facturas = db.facturas.filter(f => f.id !== id); renderFacturas(); }
  saveDB(db); toast('Eliminado correctamente', 'success');
}

// ═══════════════════════════════════════════════
// EXPORTAR EXCEL
// ═══════════════════════════════════════════════
function renderExportPreview() {
  populateSelects();
  const mes = document.getElementById('export-mes').value;
  const taxiId = parseInt(document.getElementById('export-taxi').value) || null;
  let regs = [...db.registros];
  if (mes) regs = regs.filter(r => r.fecha.startsWith(mes));
  if (taxiId) regs = regs.filter(r => r.taxiId === taxiId);
  const total = regs.reduce((s,r) => s + r.monto + (r.ahorro ? AHORRO : 0), 0);
  const totalFact = db.facturas.filter(f => !taxiId || f.taxiId === taxiId).reduce((s,f) => s + f.monto, 0);
  document.getElementById('preview-content').innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <div class="stat-card" style="flex:1;min-width:120px;background:var(--surface2)"><div class="stat-value">${regs.length}</div><div class="stat-label">Registros</div></div>
      <div class="stat-card" style="flex:1;min-width:120px;background:var(--surface2)"><div class="stat-value" style="font-size:18px">${cop(total)}</div><div class="stat-label">Recaudo</div></div>
      <div class="stat-card" style="flex:1;min-width:120px;background:var(--surface2)"><div class="stat-value" style="font-size:18px;color:var(--red)">${cop(totalFact)}</div><div class="stat-label">Facturas</div></div>
    </div>
    <p style="margin-top:12px;font-size:13px;color:var(--text2)">Excel con hojas por taxi (recaudos + facturas juntos) · pestaña RESUMEN con gran total · ${[...new Set(regs.map(r=>r.taxiId))].length} taxi(s).</p>
  `;
}

function exportarExcel() {
  const mes = document.getElementById('export-mes').value;
  const taxiId = parseInt(document.getElementById('export-taxi').value) || null;
  let regs = [...db.registros];
  if (mes) regs = regs.filter(r => r.fecha.startsWith(mes));
  if (taxiId) regs = regs.filter(r => r.taxiId === taxiId);
  if (regs.length === 0) return toast('No hay datos para exportar', 'error');

  const wb = XLSX.utils.book_new();
  const taxisEnRegs = [...new Set(regs.map(r => r.taxiId))];
  const totalesPorTaxi = [];

  const COLOR = {
    headerTaxi:   { fgColor: { rgb: '1A1A2E' } },
    headerRec:    { fgColor: { rgb: '0D3B66' } },
    headerFact:   { fgColor: { rgb: '6B0D0D' } },
    headerRes:    { fgColor: { rgb: '0A3D2C' } },
    totalRec:     { fgColor: { rgb: '0D4F1C' } },
    totalFact:    { fgColor: { rgb: '6B1A1A' } },
    totalNeto:    { fgColor: { rgb: '5C4A00' } },
    granTotal:    { fgColor: { rgb: '0A2A1F' } },
    rowEven:      { fgColor: { rgb: '0F0F1A' } },
    rowOdd:       { fgColor: { rgb: '16161F' } },
    subHeader:    { fgColor: { rgb: '111827' } },
  };
  const WHITE   = { rgb: 'FFFFFF' };
  const YELLOW  = { rgb: 'F5C518' };
  const GREEN   = { rgb: '22C55E' };
  const RED     = { rgb: 'EF4444' };
  const GRAY    = { rgb: '999999' };
  const LGRAY   = { rgb: 'CCCCCC' };

  const fontH  = (bold=true, sz=11, color=WHITE) => ({ name:'Calibri', sz, bold, color });
  const fontB  = (sz=11, color=WHITE) => ({ name:'Calibri', sz, bold:true, color });
  const fontN  = (sz=10, color=WHITE) => ({ name:'Calibri', sz, bold:false, color });

  const border = {
    top:    { style:'thin', color:{ rgb:'333333' } },
    bottom: { style:'thin', color:{ rgb:'333333' } },
    left:   { style:'thin', color:{ rgb:'333333' } },
    right:  { style:'thin', color:{ rgb:'333333' } },
  };
  const borderBold = {
    top:    { style:'medium', color:{ rgb:'555555' } },
    bottom: { style:'medium', color:{ rgb:'555555' } },
    left:   { style:'medium', color:{ rgb:'555555' } },
    right:  { style:'medium', color:{ rgb:'555555' } },
  };

  function cell(v, fill, font, align='left', numFmt=null, borders=border) {
    const c = { v, t: typeof v === 'number' ? 'n' : 's',
      s: { fill:{ patternType:'solid', ...fill }, font, alignment:{ horizontal:align, vertical:'center', wrapText:false }, border: borders }
    };
    if (numFmt) c.s.numFmt = numFmt;
    return c;
  }

  function emptyCell(fill=COLOR.rowOdd) {
    return cell('', fill, fontN());
  }

  const COP_FMT = '#,##0';

  taxisEnRegs.forEach(tid => {
    const taxi   = db.taxis.find(t => t.id === tid);
    const placa  = taxi ? taxi.placa : 'SIN_PLACA';
    const regsT  = regs.filter(r => r.taxiId === tid).sort((a,b) => a.fecha.localeCompare(b.fecha));
    const factsT = db.facturas.filter(f => f.taxiId === tid);
    const totalRec  = regsT.reduce((s,r) => s + r.monto + (r.ahorro ? AHORRO : 0), 0);
    const totalFact = factsT.reduce((s,f) => s + f.monto, 0);
    const neto      = totalRec - totalFact;
    totalesPorTaxi.push({ placa, modelo: taxi?.modelo||'', registros: regsT.length, facturas: factsT.length, totalRec, totalFact, neto });

    const rows = [];

    rows.push([ cell(`🚖  ${placa}${taxi?.modelo ? '  ·  '+taxi.modelo : ''}`, COLOR.headerTaxi, fontB(14, YELLOW), 'center', null, borderBold), null, null, null, null, null, null ]);
    rows.push([ emptyCell(COLOR.headerTaxi), null, null, null, null, null, null ]);
    rows.push([ cell('RECAUDOS DIARIOS', COLOR.headerRec, fontB(11, { rgb:'93C5FD' }), 'center', null, borderBold), null, null, null, null, null, null ]);
    rows.push([
      cell('FECHA',        COLOR.subHeader, fontH(true,10,LGRAY), 'center'),
      cell('CONDUCTOR',    COLOR.subHeader, fontH(true,10,LGRAY), 'center'),
      cell('ENTREGA',      COLOR.subHeader, fontH(true,10,LGRAY), 'center'),
      cell('AHORRO',       COLOR.subHeader, fontH(true,10,LGRAY), 'center'),
      cell('TOTAL',        COLOR.subHeader, fontH(true,10,LGRAY), 'center'),
      cell('OBSERVACIONES',COLOR.subHeader, fontH(true,10,LGRAY), 'center'),
      emptyCell(COLOR.subHeader),
    ]);

    regsT.forEach((r, i) => {
      const cond  = db.conductores.find(x => x.id === r.conductorId);
      const ahorroV = r.ahorro ? AHORRO : 0;
      const tot   = r.monto + ahorroV;
      const fill  = i % 2 === 0 ? COLOR.rowEven : COLOR.rowOdd;
      rows.push([
        cell(fmtFecha(r.fecha),          fill, fontN(10,LGRAY), 'center'),
        cell(cond ? cond.nombre : '—',   fill, fontN(10,WHITE), 'left'),
        cell(r.monto,  fill, fontN(10,{ rgb:'86EFAC' }), 'right', COP_FMT),
        cell(ahorroV,  fill, ahorroV > 0 ? fontN(10,YELLOW) : fontN(10,GRAY), 'right', COP_FMT),
        cell(tot,      fill, fontB(10,  { rgb:'4ADE80' }), 'right', COP_FMT),
        cell(r.obs||'',fill, fontN(10,GRAY), 'left'),
        emptyCell(fill),
      ]);
    });

    rows.push([
      cell('TOTAL RECAUDOS', COLOR.totalRec, fontB(11, WHITE), 'right', null, borderBold),
      emptyCell(COLOR.totalRec),
      cell(regsT.reduce((s,r)=>s+r.monto,0), COLOR.totalRec, fontB(11,{ rgb:'86EFAC' }), 'right', COP_FMT, borderBold),
      cell(regsT.filter(r=>r.ahorro).length * AHORRO, COLOR.totalRec, fontB(11,YELLOW), 'right', COP_FMT, borderBold),
      cell(totalRec, COLOR.totalRec, fontB(12,{ rgb:'4ADE80' }), 'right', COP_FMT, borderBold),
      emptyCell(COLOR.totalRec),
      emptyCell(COLOR.totalRec),
    ]);

    rows.push([ emptyCell(), null, null, null, null, null, null ]);

    if (factsT.length > 0) {
      rows.push([ cell('FACTURAS / GASTOS', COLOR.headerFact, fontB(11, { rgb:'FCA5A5' }), 'center', null, borderBold), null, null, null, null, null, null ]);
      rows.push([
        cell('FECHA',        COLOR.subHeader, fontH(true,10,LGRAY), 'center'),
        cell('DESCRIPCIÓN',  COLOR.subHeader, fontH(true,10,LGRAY), 'left'),
        cell('MONTO',        COLOR.subHeader, fontH(true,10,LGRAY), 'center'),
        emptyCell(COLOR.subHeader), emptyCell(COLOR.subHeader), emptyCell(COLOR.subHeader), emptyCell(COLOR.subHeader),
      ]);
      factsT.sort((a,b)=>a.fecha.localeCompare(b.fecha)).forEach((f, i) => {
        const fill = i % 2 === 0 ? COLOR.rowEven : COLOR.rowOdd;
        rows.push([
          cell(fmtFecha(f.fecha), fill, fontN(10,LGRAY), 'center'),
          cell(f.desc,            fill, fontN(10,WHITE), 'left'),
          cell(f.monto,           fill, fontN(10,{ rgb:'FCA5A5' }), 'right', COP_FMT),
          emptyCell(fill), emptyCell(fill), emptyCell(fill), emptyCell(fill),
        ]);
      });
      rows.push([
        cell('TOTAL FACTURAS', COLOR.totalFact, fontB(11,WHITE), 'right', null, borderBold),
        emptyCell(COLOR.totalFact),
        cell(totalFact, COLOR.totalFact, fontB(12,{ rgb:'FCA5A5' }), 'right', COP_FMT, borderBold),
        emptyCell(COLOR.totalFact), emptyCell(COLOR.totalFact), emptyCell(COLOR.totalFact), emptyCell(COLOR.totalFact),
      ]);
      rows.push([ emptyCell(), null, null, null, null, null, null ]);
    }

    rows.push([ cell('📊 RESUMEN FINAL', COLOR.totalNeto, fontB(11, YELLOW), 'center', null, borderBold), null, null, null, null, null, null ]);
    rows.push([
      cell('',               COLOR.totalNeto, fontN(10,GRAY), 'center', null, borderBold),
      cell('RECAUDO TOTAL',  COLOR.totalNeto, fontB(10,{ rgb:'86EFAC' }), 'center', null, borderBold),
      cell(totalRec,         COLOR.totalNeto, fontB(12,{ rgb:'4ADE80' }), 'right', COP_FMT, borderBold),
      cell('FACTURAS',       COLOR.totalNeto, fontB(10,{ rgb:'FCA5A5' }), 'center', null, borderBold),
      cell(totalFact,        COLOR.totalNeto, fontB(12,{ rgb:'FCA5A5' }), 'right', COP_FMT, borderBold),
      cell('NETO',           COLOR.totalNeto, fontB(10, YELLOW), 'center', null, borderBold),
      cell(neto,             COLOR.totalNeto, fontB(14,YELLOW), 'right', COP_FMT, borderBold),
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:14},{wch:18},{wch:16},{wch:14},{wch:18},{wch:14},{wch:18}];
    const merges = [];
    rows.forEach((row, ri) => { if (row && row[1] === null) merges.push({ s:{r:ri,c:0}, e:{r:ri,c:6} }); });
    ws['!merges'] = merges;
    ws['!rows'] = rows.map((r,i) => { if (i===0) return { hpt: 28 }; if (r && r[1]===null && i>0) return { hpt: 20 }; return { hpt: 18 }; });
    XLSX.utils.book_append_sheet(wb, ws, placa.substring(0,31));
  });

  const resRows = [];
  resRows.push([ cell('📊  RESUMEN GENERAL — TAXIADMIN', COLOR.headerRes, fontB(14, { rgb:'6EE7B7' }), 'center', null, borderBold), null, null, null, null, null ]);
  resRows.push([ cell(mes ? `Período: ${mes}` : 'Todos los períodos', { fgColor:{ rgb:'0C2A1E' } }, fontN(10,{ rgb:'6EE7B7' }), 'center'), null, null, null, null, null ]);
  resRows.push([ cell('', { fgColor:{ rgb:'0A1F16' } }, fontN()), null, null, null, null, null ]);
  resRows.push([
    cell('PLACA',          COLOR.subHeader, fontH(true,11,LGRAY), 'center'),
    cell('MODELO',         COLOR.subHeader, fontH(true,11,LGRAY), 'center'),
    cell('DÍAS TRABAJO',   COLOR.subHeader, fontH(true,11,LGRAY), 'center'),
    cell('TOTAL RECAUDO',  COLOR.subHeader, fontH(true,11,LGRAY), 'center'),
    cell('TOTAL FACTURAS', COLOR.subHeader, fontH(true,11,LGRAY), 'center'),
    cell('NETO',           COLOR.subHeader, fontH(true,11,LGRAY), 'center'),
  ]);

  totalesPorTaxi.forEach((t, i) => {
    const fill = i % 2 === 0 ? COLOR.rowEven : COLOR.rowOdd;
    resRows.push([
      cell(t.placa,      fill, fontB(11,YELLOW), 'center'),
      cell(t.modelo,     fill, fontN(10,LGRAY),  'left'),
      cell(t.registros,  fill, fontN(10,{ rgb:'93C5FD' }), 'center'),
      cell(t.totalRec,   fill, fontN(10,{ rgb:'86EFAC' }), 'right', COP_FMT),
      cell(t.totalFact,  fill, fontN(10,{ rgb:'FCA5A5' }), 'right', COP_FMT),
      cell(t.neto,       fill, fontB(11, t.neto >= 0 ? { rgb:'4ADE80' } : { rgb:'F87171' }), 'right', COP_FMT),
    ]);
  });

  resRows.push([ cell('', { fgColor:{rgb:'0A1A12'} }, fontN()), null, null, null, null, null ]);
  const gt = {
    registros: totalesPorTaxi.reduce((s,t)=>s+t.registros,0),
    totalRec:  totalesPorTaxi.reduce((s,t)=>s+t.totalRec,0),
    totalFact: totalesPorTaxi.reduce((s,t)=>s+t.totalFact,0),
    neto:      totalesPorTaxi.reduce((s,t)=>s+t.neto,0),
  };
  resRows.push([
    cell('🏆  GRAN TOTAL', COLOR.granTotal, fontB(13, YELLOW), 'center', null, borderBold),
    cell('Todos los taxis', COLOR.granTotal, fontN(10,GRAY), 'center', null, borderBold),
    cell(gt.registros,  COLOR.granTotal, fontB(12,{ rgb:'93C5FD' }), 'center', null, borderBold),
    cell(gt.totalRec,   COLOR.granTotal, fontB(12,{ rgb:'4ADE80' }), 'right', COP_FMT, borderBold),
    cell(gt.totalFact,  COLOR.granTotal, fontB(12,{ rgb:'FCA5A5' }), 'right', COP_FMT, borderBold),
    cell(gt.neto,       COLOR.granTotal, fontB(14, YELLOW),           'right', COP_FMT, borderBold),
  ]);

  const wsRes = XLSX.utils.aoa_to_sheet(resRows);
  wsRes['!cols'] = [{wch:16},{wch:22},{wch:14},{wch:20},{wch:20},{wch:20}];
  const resMerges = [];
  resRows.forEach((row, ri) => { if (row && row[1] === null) resMerges.push({ s:{r:ri,c:0}, e:{r:ri,c:5} }); });
  wsRes['!merges'] = resMerges;
  wsRes['!rows'] = resRows.map((r,i) => i===0 ? {hpt:30} : i===resRows.length-1 ? {hpt:26} : {hpt:20});
  XLSX.utils.book_append_sheet(wb, wsRes, 'RESUMEN');

  const nombre = `TaxiAdmin_${mes || 'completo'}_${today()}`;
  const excelBytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const zip = new JSZip();
  zip.file(`${nombre}.xlsx`, excelBytes);

  const facturasConImg = db.facturas.filter(f => {
    if (!f.img) return false;
    if (taxiId && f.taxiId !== taxiId) return false;
    if (mes && !f.fecha.startsWith(mes)) return false;
    return true;
  });

  if (facturasConImg.length > 0) {
    const carpeta = zip.folder('facturas');
    facturasConImg.forEach(f => {
      try {
        const taxi = db.taxis.find(t => t.id === f.taxiId);
        const placa = taxi ? taxi.placa : 'SIN_PLACA';
        const desc = (f.desc || 'factura').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim().replace(/\s+/g, '_').substring(0, 30);
        const fechaFmt = f.fecha || today();
        const mime = f.img.split(';')[0].replace('data:image/', '');
        const ext = mime === 'jpeg' ? 'jpg' : (mime || 'jpg');
        const nombreArchivo = `${placa}_${fechaFmt}_${desc}.${ext}`;
        const base64 = f.img.split(',')[1];
        carpeta.file(nombreArchivo, base64, { base64: true });
      } catch(e) { /* saltar foto corrupta */ }
    });
  }

  zip.generateAsync({ type: 'blob' }).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${nombre}.zip`; a.click();
    URL.revokeObjectURL(url);
    const msg = facturasConImg.length > 0
      ? `ZIP descargado ✓ (${facturasConImg.length} foto${facturasConImg.length>1?'s':''})`
      : 'Excel descargado ✓ (sin fotos de facturas)';
    toast(msg, 'success');
  });
}

// ═══════════════════════════════════════════════
// BACKUP
// ═══════════════════════════════════════════════
function exportarBackup() {
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `TaxiAdmin_backup_${today()}.json`; a.click();
  URL.revokeObjectURL(url);
  toast('Backup descargado ✓', 'success');
}

function importarBackup() {
  const file = document.getElementById('backup-file').files[0];
  if (!file) return toast('Selecciona un archivo .json', 'error');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.taxis || !data.conductores || !data.registros) throw new Error('Formato inválido');
      db = data;
      if (!db.settings) db.settings = { password: 'admin123' };
      if (!db.facturas) db.facturas = [];
      saveDB(db); populateSelects(); renderDashboard();
      document.getElementById('backup-file').value = '';
      toast('Datos importados correctamente ✓', 'success');
    } catch(err) { toast('Archivo inválido o corrupto', 'error'); }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});
document.getElementById('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('taxi-placa').addEventListener('input', function() { this.value = this.value.toUpperCase(); });

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
