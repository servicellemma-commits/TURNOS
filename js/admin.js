// Panel del administrador: dar de alta profesionales, pausarlos y llevar los cobros
import { configurado, auth, db, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  doc, setDoc, updateDoc, collection, getDocs } from './fb.js?v=20261026j';
import { ADMINS, PLATAFORMA } from './firebase-config.js?v=20261026j';
import { esc, toast, sinConfig, configNueva, ESPECIALIDADES, ahora, parseKey, keyOf, fechaCorta } from './common.js?v=20261026j';

const app = document.getElementById('app');
const S = { user: null, cargando: true, lista: [], err: '', abierto: null };
const esAdmin = () => S.user && ADMINS.map(a => a.toLowerCase()).includes((S.user.email || '').toLowerCase());
const val = id => (document.getElementById(id)?.value || '').trim();
const errHtml = () => S.err ? `<p class="err" role="alert">${esc(S.err)}</p>` : '';
const linkDe = slug => location.href.replace(/admin\/.*$/, '') + '#' + slug;
const linkApp = () => location.href.replace(/admin\/.*$/, '') + 'app/';

function estadoPago(p) {
  if (p.estado === 'pausado') return ['Pausado', 'err'];
  if (!p.pagadoHasta) return ['Sin cobro cargado', 'muted'];
  if (p.pagadoHasta >= '9999') return ['Para siempre (sin cobro)', 'muted'];
  return p.pagadoHasta < ahora().HOY ? ['Vencido el ' + fechaCorta(p.pagadoHasta), 'err'] : ['Al día hasta el ' + fechaCorta(p.pagadoHasta), 'muted'];
}

function fila(p) {
  const [txt, cls] = estadoPago(p), ab = S.abierto === p.slug;
  return `<div class="item" style="flex-direction:column;align-items:stretch">
    <div class="row"><div class="grow"><b>${esc(p.nombre)}</b><p class="small ${cls}">${esc(txt)}</p></div><button class="btn sm" data-a="abrir" data-s="${esc(p.slug)}">${ab ? 'Cerrar' : 'Ver'}</button></div>
    ${ab ? `<div class="stack" style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <p class="small muted">Página de las familias:<br><b>${esc(linkDe(p.slug))}</b></p>
      <p class="small muted">Dueños (pueden entrar a la app): <b>${esc((p.owners || []).join(', '))}</b></p>
      <label for="pg-${esc(p.slug)}">Pagó hasta</label><input type="date" id="pg-${esc(p.slug)}" value="${esc(p.pagadoHasta >= '9999' ? '' : (p.pagadoHasta || ''))}">
      <button class="btn" data-a="siempre" data-s="${esc(p.slug)}">Para siempre (sin cobro)</button>
      <div class="grid2"><button class="btn" data-a="mes" data-s="${esc(p.slug)}">+1 mes (pagó)</button><button class="btn pri" data-a="guardarPago" data-s="${esc(p.slug)}">Guardar fecha</button></div>
      <label for="nt-${esc(p.slug)}">Nota (precio, cómo paga…)</label><input id="nt-${esc(p.slug)}" value="${esc(p.notaAdmin || '')}">
      <button class="btn" data-a="guardarNota" data-s="${esc(p.slug)}">Guardar nota</button>
      <label for="ow-${esc(p.slug)}">Agregar otro dueño (Gmail)</label><input id="ow-${esc(p.slug)}" type="email" placeholder="otro@gmail.com">
      <button class="btn" data-a="agregarDuenio" data-s="${esc(p.slug)}">Agregar dueño</button>
      ${p.estado === 'pausado'
        ? `<button class="btn pri block" data-a="reactivar" data-s="${esc(p.slug)}">Reactivar</button>`
        : `<button class="btn danger block" data-a="pausar" data-s="${esc(p.slug)}">Pausar (no se pueden sacar turnos)</button>`}
    </div>` : ''}</div>`;
}

function vista() {
  if (!configurado) return sinConfig;
  if (S.cargando) return `<div class="card"><p class="muted">Cargando…</p></div>`;
  if (!S.user) return `<div class="card"><h2>Administrador</h2><p class="muted small">${esc(PLATAFORMA)}</p>${errHtml()}<button class="btn pri block" data-a="entrar">Entrar con Google</button></div>`;
  if (!esAdmin()) return `<div class="card"><h2>Sin acceso</h2><p class="muted small">Entraste como ${esc(S.user.email)}. Esta pantalla es solo para el administrador.</p><button class="btn" data-a="salir">Salir</button></div>`;
  const act = S.lista.filter(p => p.estado !== 'pausado').length;
  return `<div class="card"><div class="row"><div class="grow"><h2>Administrador</h2><p class="small muted">${S.lista.length} profesionales · ${act} activos</p></div><button class="btn sm" data-a="salir">Salir</button></div>
      <p class="small muted">App de los profesionales: <b>${esc(linkApp())}</b></p></div>
    <div class="card"><h3>Profesionales</h3><div class="list">${S.lista.map(fila).join('') || '<p class="item muted">Todavía no hay ninguno.</p>'}</div></div>
    <div class="card"><h3>Agregar profesional</h3><p class="small muted">Se crea su página y su app. Entra con su Gmail.</p>
      <label for="n-nom">Nombre como se muestra</label><input id="n-nom" placeholder="Dra. Cintia Chavez">
      <label for="n-slug">Link (sin espacios)</label><input id="n-slug" placeholder="dra-chavez">
      <label for="n-mail">Gmail del profesional</label><input id="n-mail" type="email" placeholder="nombre@gmail.com">
      <label for="n-esp">Especialidad</label><select id="n-esp">${Object.entries(ESPECIALIDADES).map(([k, v]) => `<option value="${k}">${esc(v.nombre)}</option>`).join('')}</select>
      ${errHtml()}<button class="btn pri block" data-a="crear">Crear</button></div>`;
}
function render() { app.innerHTML = vista() + `<p class="foot">${esc(PLATAFORMA)} · administrador</p>`; }

async function cargar() {
  try { const r = await getDocs(collection(db, 'profesionales')); S.lista = r.docs.map(d => ({ slug: d.id, ...d.data() })).sort((a, b) => a.nombre.localeCompare(b.nombre)); }
  catch (e) { console.error(e); S.err = 'No se pudo leer la lista (' + (e.code || 'error') + ').'; }
  S.cargando = false; render();
}
async function cambiar(slug, cambios, msg) {
  try { await updateDoc(doc(db, 'profesionales', slug), cambios); toast(msg); await cargar(); }
  catch (e) { console.error(e); toast('No se pudo guardar (' + (e.code || 'error') + ')'); }
}
const modeloNuevo = id => { const m = ESPECIALIDADES[id] || ESPECIALIDADES.pediatria; return { tipo: m.tipo, especialidad: id === 'otra' ? '' : m.nombre, motivos: m.motivos, recomendaciones: m.recs }; };
const de = s => S.lista.find(p => p.slug === s);

const A = {
  entrar: async () => {
    S.err = '';
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) {
      const c = e.code || '';
      if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment') { signInWithRedirect(auth, new GoogleAuthProvider()); return; }
      if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
      S.err = 'No se pudo entrar (' + (c || 'error') + ').'; render();
    }
  },
  salir: () => signOut(auth),
  abrir: d => { S.abierto = S.abierto === d.s ? null : d.s; render(); },
  crear: async () => {
    const nombre = val('n-nom'), slug = val('n-slug').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''), mail = val('n-mail').toLowerCase();
    if (!nombre || !slug || !mail.includes('@')) { S.err = 'Completá nombre, link y Gmail.'; return render(); }
    if (de(slug)) { S.err = 'Ya existe un profesional con ese link.'; return render(); }
    try { await setDoc(doc(db, 'profesionales', slug), { ...configNueva(slug, nombre, mail), ...modeloNuevo(val('n-esp')), estado: 'activo', pagadoHasta: '', notaAdmin: '' }); S.err = ''; toast('Profesional creado'); S.abierto = slug; await cargar(); }
    catch (e) { console.error(e); S.err = 'No se pudo crear (' + (e.code || 'error') + ').'; render(); }
  },
  mes: d => {
    const p = de(d.s), base = p.pagadoHasta && p.pagadoHasta >= ahora().HOY ? p.pagadoHasta : ahora().HOY, f = parseKey(base);
    f.setMonth(f.getMonth() + 1);
    cambiar(d.s, { pagadoHasta: keyOf(f), estado: 'activo' }, 'Cobro anotado');
  },
  siempre: d => cambiar(d.s, { pagadoHasta: '9999-12-31', estado: 'activo' }, 'Queda para siempre'),
  guardarPago: d => cambiar(d.s, { pagadoHasta: val('pg-' + d.s) }, 'Fecha guardada'),
  guardarNota: d => cambiar(d.s, { notaAdmin: val('nt-' + d.s) }, 'Nota guardada'),
  agregarDuenio: d => {
    const m = val('ow-' + d.s).toLowerCase(), p = de(d.s);
    if (!m.includes('@')) return toast('Escribí un Gmail');
    if ((p.owners || []).includes(m)) return toast('Ya es dueño');
    cambiar(d.s, { owners: [...(p.owners || []), m] }, 'Dueño agregado');
  },
  pausar: d => { if (confirm('¿Pausar a ' + de(d.s).nombre + '? Las familias no podrán sacar turnos.')) cambiar(d.s, { estado: 'pausado' }, 'Pausado'); },
  reactivar: d => cambiar(d.s, { estado: 'activo' }, 'Reactivado')
};
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const fn = A[el.dataset.a]; if (fn) { e.preventDefault(); fn(el.dataset); } });

if (configurado) {
  onAuthStateChanged(auth, u => {
    S.user = u && !u.isAnonymous ? u : null;
    if (S.user && esAdmin()) { S.cargando = true; render(); cargar(); } else { S.cargando = false; render(); }
  });
} else { S.cargando = false; render(); }
