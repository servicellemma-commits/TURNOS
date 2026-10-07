// App de la profesional
import { configurado, auth, db, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  doc, setDoc, updateDoc, collection, query, where, onSnapshot, writeBatch, serverTimestamp, getDocs } from './fb.js';
import { ADMINS, PLATAFORMA } from './firebase-config.js';
import { abrirRecorte } from './recorte.js';
import { esc, soloNum, nombreCorto, ocupadoId, ahora, fechaLarga, fechaCorta, proximos, edad, parseKey, toMin, DOW, DOWS,
  slotsFor, aplicarTema, deco, decoSvg, logoHtml, TEMAS, toast, sinConfig, configNueva,
  fmtHora, conH, opcionesHora, bloqueoDe, desdeDe, hastaDe, textoPeriodo, sumarDias, uid } from './common.js';

const app = document.getElementById('app');
const S = { user: null, cargando: true, slug: null, P: null, turnos: [], pacx: {}, tab: 'agenda', dia: ahora().HOY, dar: {}, ficha: null, copia: null, sec: 'apariencia', err: '', confirmar: null, buscar: '', hor: null, blq: null, afect: null };
const esAdmin = () => S.user && ADMINS.map(a => a.toLowerCase()).includes((S.user.email || '').toLowerCase());
const errHtml = () => S.err ? `<p class="err" role="alert">${esc(S.err)}</p>` : '';
const top = () => window.scrollTo(0, 0);
const refP = () => doc(db, 'profesionales', S.slug);
const activos = () => S.turnos.filter(t => t.estado !== 'cancelado');
const turnoEn = (f, h) => activos().find(t => t.fecha === f && t.hora === h);
const libre = (f, h) => !turnoEn(f, h);
const linkPublico = () => location.href.replace(/app\/.*$/, '') + '#' + S.slug;
const claveP = t => (t.paciente && t.paciente.dni) || ('t-' + t.id);

async function guardarP(cambios, msg) {
  try { await updateDoc(refP(), cambios); if (msg) toast(msg); }
  catch (e) { console.error(e); toast('No se pudo guardar. Revisá la conexión.'); }
}

/* ---------- Pacientes (se arman a partir de los turnos + datos extra de la ficha) ---------- */
function pacientes() {
  const m = new Map();
  [...S.turnos].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).forEach(t => {
    const k = claveP(t), x = m.get(k) || { clave: k, turnos: [] };
    Object.assign(x, { nombre: t.paciente.nombre, dni: t.paciente.dni || '', nac: x.nac || t.paciente.nac || '', obra: t.paciente.obra || x.obra || '', resp: (t.responsable && t.responsable.nombre) || x.resp || '', contacto: (t.responsable && t.responsable.contacto) || x.contacto || '' });
    x.turnos.push(t); m.set(k, x);
  });
  for (const [k, x] of m) { const e = S.pacx[k]; if (e) { if (e.nac) x.nac = e.nac; x.afiliado = e.afiliado || ''; x.notas = e.notas || []; x.recs = e.recordatorios || []; } else { x.afiliado = ''; x.notas = []; x.recs = []; } }
  return [...m.values()];
}

/* ---------- Pantallas ---------- */
function vista() {
  if (!configurado) return sinConfig;
  if (S.cargando) return `<div class="card"><p class="muted">Cargando…</p></div>`;
  if (!S.user) return `<div class="card banded"><div class="band" style="min-height:110px">${decoSvg('flores')}<div class="txt"><h2>Tu consultorio</h2><p class="sub">${esc(PLATAFORMA)}</p></div></div>
    <div class="pad"><p class="muted small">Entrá con tu cuenta de Google. Activá la verificación en dos pasos de tu cuenta para más seguridad.</p>${errHtml()}<button class="btn pri block" data-a="entrar">Entrar con Google</button></div></div>`;
  if (!S.slug) return esAdmin() ? crearProfesional() : `<div class="card"><h2>Tu cuenta no tiene un consultorio asignado</h2><p class="muted small">Entraste como ${esc(S.user.email)}. Pedile al administrador que te dé de alta con este mail.</p><button class="btn" data-a="salir">Salir</button></div>`;
  if (!S.P) return `<div class="card"><p class="muted">Cargando…</p></div>`;
  const P = S.P, tabs = [['agenda', 'Agenda'], ['dar', 'Dar turno'], ['pacientes', 'Pacientes'], ['bloqueos', 'Bloquear días']];
  return `<div class="card banded"><div class="band band-app">${deco(P)}${logoHtml(P, true)}<div class="txt grow"><p class="sub">${esc(fechaLarga(ahora().HOY))}</p><h2>Hola, ${esc(nombreCorto(P.nombre.replace(/^(dra?\.?|dr\.?)\s+/i, '')))}</h2></div><button class="btn-redondo${S.tab === 'config' ? ' sel' : ''}" data-a="tab" data-t="config" aria-label="Configuración" title="Configuración"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.8.5 1.8 3 0 3.5a1.7 1.7 0 0 0-1 2.5c.9 1.6-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1.1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.6-1.1c-1.5.9-3.3-.8-2.4-2.4a1.7 1.7 0 0 0-1-2.5c-1.8-.5-1.8-3 0-3.5a1.7 1.7 0 0 0 1-2.5c-.9-1.6.9-3.3 2.4-2.4a1.7 1.7 0 0 0 2.6-1.1z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="btn sm" data-a="salir">Salir</button></div>
    <div class="pad"><div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="chip${S.tab === k ? ' sel' : ''}" role="tab" aria-selected="${S.tab === k}" data-a="tab" data-t="${k}">${l}</button>`).join('')}</div></div></div>
    ${PRO[S.tab]()}`;
}

function crearProfesional() {
  return `<div class="card"><h2>Dar de alta un profesional</h2><p class="small muted">Sos administrador. Creá la página de un profesional; después entra con su propio Gmail.</p>
    <label for="n-nom">Nombre como se muestra</label><input id="n-nom" placeholder="Dra. Cintia Chavez">
    <label for="n-slug">Link (sin espacios)</label><input id="n-slug" placeholder="dra-chavez">
    <label for="n-mail">Gmail del profesional</label><input id="n-mail" type="email" placeholder="nombre@gmail.com">
    <label class="recordar" for="n-yo"><input type="checkbox" id="n-yo" checked>Que yo también pueda administrarlo</label>
    ${errHtml()}<button class="btn pri block" data-a="crear">Crear</button><button class="btn" data-a="salir">Salir</button></div>`;
}

function filaTurno(t) {
  return `<div class="item" style="align-items:flex-start"><span class="time">${fmtHora(t.hora, S.P)}</span><div class="grow">
    <button class="btn link" data-a="verFicha" data-k="${esc(claveP(t))}" style="font-size:15px">${esc(t.paciente.nombre)}</button> · ${esc(edad(t.paciente.nac))}
    <p class="small muted">${esc(t.motivo)} · ${esc(t.paciente.obra || 'Sin obra social')}${t.origen === 'manual' ? ' · cargado por vos' : ''}</p>
    ${t.responsable && (t.responsable.nombre || t.responsable.contacto) ? `<p class="small muted">${esc(t.responsable.nombre)}${t.responsable.contacto ? ' · <span class="wa">' + esc(t.responsable.contacto) + '</span>' : ''}</p>` : ''}
    <div class="row" style="margin-top:6px;flex-wrap:wrap">${t.estado === 'atendido' ? `<span class="pill ok">Atendido</span>` : `<button class="btn sm" data-a="atendido" data-id="${t.id}">Marcar atendido</button>`}
    ${S.confirmar === t.id ? `<button class="btn sm danger" data-a="cancelar" data-id="${t.id}">Sí, cancelar</button><button class="btn sm" data-a="noCancelar">No</button>` : (t.estado === 'activo' ? `<button class="btn sm danger" data-a="pregCancelar" data-id="${t.id}">Cancelar</button>` : '')}</div></div></div>`;
}

const PRO = {
  agenda() {
    const P = S.P, slots = slotsFor(P, S.dia, turnoEn, true), ocup = slots.filter(s => s.t).length, H = ahora().HOY;
    const canc = S.turnos.filter(t => t.fecha === S.dia && t.estado === 'cancelado');
    const dias = proximos(21).filter(k => slotsFor(P, k, turnoEn, true).length || k === S.dia).slice(0, 8);
    const recs = []; pacientes().forEach(x => x.recs.forEach(r => { if (!r.hecho && r.fecha <= H) recs.push({ ...r, clave: x.clave, nombre: x.nombre }); }));
    recs.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return `${recs.length ? `<div class="card recs"><h3>Recordatorios de hoy (${recs.length})</h3>${recs.map(r => `<div class="row between rec"><div class="grow"><button class="btn link" data-a="verFicha" data-k="${esc(r.clave)}">${esc(nombreCorto(r.nombre))}</button> · ${esc(r.texto)}${r.fecha < H ? `<p class="small">Desde el ${fechaCorta(r.fecha)}</p>` : ''}</div><button class="btn sm" data-a="recListo" data-k="${esc(r.clave)}" data-id="${r.id}">Listo</button></div>`).join('')}</div>` : ''}
    <div class="card"><div class="days">${dias.map(k => { const d = parseKey(k), c = slotsFor(P, k, turnoEn, true).filter(s => s.t).length; return `<button class="chip${S.dia === k ? ' sel' : ''}" data-a="dia" data-k="${k}">${k === H ? 'Hoy' : DOWS[d.getDay()]}<b>${d.getDate()}</b><span class="small">${c ? c + ' turnos' : 'libre'}</span></button>`; }).join('')}</div>
      <div class="stats"><div class="stat"><span class="small muted">Turnos</span><b>${ocup}</b></div><div class="stat"><span class="small muted">Libres</span><b>${slots.length - ocup}</b></div></div>
      <button class="btn pri block" data-a="irDar">+ Dar turno a mano</button></div>
    <div class="card"><h3>${esc(fechaLarga(S.dia))}</h3>
      ${slots.length ? `<div class="list">${slots.map(s => s.t ? filaTurno(s.t) : `<div class="item"><span class="time">${fmtHora(s.hora, P)}</span><div class="grow muted small">Libre</div><button class="btn sm" data-a="darEn" data-h="${s.hora}">Dar</button></div>`).join('')}</div>` : `<p class="muted">Este día no atendés${bloqueoDe(P, S.dia) ? ' (' + esc((bloqueoDe(P, S.dia).motivo || 'día bloqueado').toLowerCase()) + ')' : ''}.</p>`}
      ${canc.length ? `<p class="small muted">Cancelados: ${canc.map(t => esc(nombreCorto(t.paciente.nombre)) + ' (' + fmtHora(t.hora, P) + ')').join(', ')}</p>` : ''}</div>
    <div class="card"><h3>Tu link para las familias</h3><p class="wa small" style="word-break:break-all">${esc(linkPublico())}</p><button class="btn" data-a="copiarLink">Copiar link</button></div>`;
  },

  dar() {
    const P = S.P, d = S.dar, dias = proximos(21).filter(k => slotsFor(P, k, turnoEn).some(s => !s.t));
    if (!d.fecha && dias.length) d.fecha = dias[0];
    const libres = d.fecha ? slotsFor(P, d.fecha, turnoEn).filter(s => !s.t) : [];
    return `<div class="card"><h2>Dar turno</h2><p class="small muted">Para cuando te llaman por teléfono. Si el chico ya es paciente, escribí su DNI y se completa solo.</p>
      <div class="days">${dias.slice(0, 8).map(k => { const x = parseKey(k); return `<button class="chip${d.fecha === k ? ' sel' : ''}" data-a="darDia" data-k="${k}">${k === ahora().HOY ? 'Hoy' : DOWS[x.getDay()]}<b>${x.getDate()}</b><span class="small">${slotsFor(P, k, turnoEn).filter(s => !s.t).length} libres</span></button>`; }).join('')}</div>
      ${d.fecha ? `<p class="franja">${esc(fechaLarga(d.fecha))}</p><div class="slots">${libres.map(s => `<button class="chip${d.hora === s.hora ? ' sel' : ''}" data-a="darHora" data-h="${s.hora}">${fmtHora(s.hora, P)}</button>`).join('')}</div>` : '<p class="muted">No hay horarios libres.</p>'}
      <div class="grid2"><div><label for="d-dni">DNI del chico</label><input id="d-dni" inputmode="numeric" value="${esc(d.dni)}" data-c="darDni"></div><div><label for="d-mot">Motivo</label><select id="d-mot">${(P.motivos || []).map(m => `<option${d.motivo === m ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></div></div>
      <label for="d-nom">Nombre del chico o chica</label><input id="d-nom" value="${esc(d.nombre)}">
      <div class="grid2"><div><label for="d-tel">Teléfono de la familia</label><input id="d-tel" inputmode="tel" value="${esc(d.tel)}"></div><div><label for="d-obra">Obra social</label><select id="d-obra"><option value="">Sin cargar</option>${(P.obras || []).map(o => `<option${d.obra === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></div></div>
      ${errHtml()}<button class="btn pri block" data-a="guardarDar" ${S.enviando ? 'disabled' : ''}>${S.enviando ? 'Guardando…' : 'Guardar turno'}</button></div>`;
  },

  pacientes() {
    if (S.ficha) return ficha();
    const q = S.buscar.toLowerCase(), l = pacientes().sort((a, b) => a.nombre.localeCompare(b.nombre)).filter(x => !q || x.nombre.toLowerCase().includes(q) || x.dni.includes(q));
    return `<div class="card"><h3>Pacientes</h3><p class="small muted">Solo vos podés ver esta lista. Tocá un paciente para ver su ficha.</p>
      <label for="buscar">Buscar por nombre o DNI</label><input id="buscar" value="${esc(S.buscar)}" placeholder="Nombre o DNI">
      <div class="list">${l.map(x => `<button class="linkrow" data-a="verFicha" data-k="${esc(x.clave)}"><div class="logo sm" aria-hidden="true">${esc(x.nombre[0] || '?')}</div><div class="grow"><b>${esc(x.nombre)}</b><p class="small muted">${esc(edad(x.nac))} · ${esc(x.obra || 'Sin obra social')}</p></div><span class="small muted">Ver</span></button>`).join('') || '<p class="item muted">Todavía no hay pacientes.</p>'}</div></div>`;
  },

  horarios() {
    const P = S.P, hb = borradorHor(), cambio = JSON.stringify(hb.h) !== JSON.stringify(P.horarios) || hb.dur !== P.duracion;
    return `<div class="card"><h3>Formato de hora</h3><div class="grid2"><button class="chip formato${P.formatoHora !== '12' ? ' sel' : ''}" data-a="formato" data-f="24"><b>16:30</b><span class="small">24 horas</span></button><button class="chip formato${P.formatoHora === '12' ? ' sel' : ''}" data-a="formato" data-f="12"><b>4:30 PM</b><span class="small">AM / PM</span></button></div></div>
    <div class="card"><h3>Días y horarios de atención</h3><p class="small muted">Cambiá lo que quieras y tocá <b>Guardar horarios</b> al final.</p>
      <div class="hrow cab"><span></span><span class="small muted">Desde</span><span class="small muted">Hasta</span></div>
      ${[1, 2, 3, 4, 5, 6, 0].map(d => { const h = hb.h[d]; return `<div class="hrow"><label class="chk" for="hd-${d}"><input type="checkbox" id="hd-${d}" data-c="hOn" data-d="${d}" ${h.on ? 'checked' : ''}>${DOWS[d]}</label>
        ${h.on ? `<select id="hdes-${d}" aria-label="${DOW[d]} desde" data-c="hDesde" data-d="${d}">${opcionesHora(h.desde, P)}</select><select id="hhas-${d}" aria-label="${DOW[d]} hasta" data-c="hHasta" data-d="${d}">${opcionesHora(h.hasta, P)}</select>` : `<span class="small muted" style="grid-column:span 2">No atiende</span>`}</div>`; }).join('')}
      <label for="dur">Duración de cada turno</label><select id="dur" data-c="dur">${[10, 15, 20, 30, 40, 60].map(m => `<option value="${m}"${hb.dur === m ? ' selected' : ''}>${m} minutos</option>`).join('')}</select>
      ${errHtml()}<button class="btn pri block" data-a="guardarHorarios">${cambio ? 'Guardar horarios' : 'Horarios guardados'}</button>
      ${cambio ? `<button class="btn link" data-a="descartarHorarios">Descartar cambios</button>` : ''}</div>`;
  },

  bloqueos() {
    const P = S.P, b = S.blq || (S.blq = { desde: '', hasta: '', motivo: 'Vacaciones', otro: '', aviso: 5 }), H = ahora().HOY;
    const l = (P.bloqueos || []).map((x, i) => ({ ...x, i })).filter(x => hastaDe(x) >= H).sort((a, c) => desdeDe(a).localeCompare(desdeDe(c)));
    return `${S.afect && S.afect.length ? `<div class="card recs"><h3>Hay ${S.afect.length} turno${S.afect.length > 1 ? 's' : ''} dado${S.afect.length > 1 ? 's' : ''} en esos días</h3>${S.afect.map(t => `<div class="row between rec"><span>${esc(DOWS[parseKey(t.fecha).getDay()])} ${parseKey(t.fecha).getDate()} · ${fmtHora(t.hora, P)} · ${esc(nombreCorto(t.paciente.nombre))}</span><span class="wa">${esc((t.responsable && t.responsable.contacto) || 'sin teléfono')}</span></div>`).join('')}<p class="small">Avisales para reprogramar. Podés cancelarlos desde la Agenda.</p><button class="btn sm" data-a="cerrarAfect">Entendido</button></div>` : ''}
    <div class="card"><h3>Bloquear días</h3><p class="small muted">Vacaciones, congresos o feriados. Esos días no aparecen para sacar turno.</p>
      <div class="grid2"><div><label for="b-desde">Desde</label><input type="date" id="b-desde" min="${H}" value="${esc(b.desde)}"></div><div><label for="b-hasta">Hasta</label><input type="date" id="b-hasta" min="${esc(b.desde || H)}" value="${esc(b.hasta)}"></div></div>
      <p class="small muted">Si es un solo día, dejá "Hasta" vacío.</p>
      <div><p class="small muted" style="margin-bottom:6px">Motivo</p><div class="chips">${['Vacaciones', 'Congreso', 'Feriado', 'Otro'].map(m => `<button class="chip${b.motivo === m ? ' sel' : ''}" data-a="blqMotivo" data-m="${m}">${m}</button>`).join('')}</div></div>
      ${b.motivo === 'Otro' ? `<label for="b-otro">Escribí el motivo</label><input id="b-otro" value="${esc(b.otro)}" placeholder="Licencia, capacitación…">` : ''}
      <div class="row between"><span>Avisar en mi página</span><span class="row"><button class="btn sm" data-a="blqAviso" data-n="-1" aria-label="Menos días">−</button><b>${b.aviso}</b><button class="btn sm" data-a="blqAviso" data-n="1" aria-label="Más días">+</button><span class="small">días antes</span></span></div>
      ${errHtml()}<button class="btn pri block" data-a="bloquear">Bloquear</button></div>
    <div class="card"><h3>Días bloqueados</h3>${l.length ? `<div class="list">${l.map(x => `<div class="item"><div class="grow"><b>${esc(x.motivo || 'Bloqueado')}</b><p class="small muted">${esc(textoPeriodo(x))}</p>${x.avisoDias ? `<p class="small muted">Se avisa en tu página desde el ${fechaCorta(sumarDias(desdeDe(x), -x.avisoDias))}</p>` : ''}</div><button class="btn sm" data-a="desbloquear" data-i="${x.i}">Quitar</button></div>`).join('')}</div>` : `<p class="muted small">No hay días bloqueados.</p>`}</div>`;
  },

  config() {
    const P = S.P, secs = [['apariencia', 'Apariencia'], ['info', 'Mi información'], ['horarios', 'Horarios'], ['avisos', 'Avisos'], ['turnos', 'Turnos']];
    let c = '';
    if (S.sec === 'apariencia') c = `<h3>Elegí tu tema</h3><div class="temas">${Object.entries(TEMAS).map(([k, t]) => `<button class="tema${P.tema === k ? ' sel' : ''}" data-a="tema" data-t="${k}" aria-pressed="${P.tema === k}"><div class="mini" style="background:${t.head}">${decoSvg(k, 'x')}</div><div class="nm"><span class="dot" style="background:${t.accent}"></span>${t.nombre}</div></button>`).join('')}</div>
      <label class="switch" for="c-dib">Dibujitos en el encabezado<input type="checkbox" id="c-dib" data-c="dibujos" ${P.dibujos ? 'checked' : ''}></label>
      <div class="row"><label class="grow" for="c-col">Color de los botones<input type="color" id="c-col" data-c="color" value="${esc(P.colorPropio || TEMAS[P.tema].accent)}" style="height:44px;padding:4px"></label>${P.colorPropio ? `<button class="btn sm" data-a="colorTema" style="align-self:flex-end">Usar el del tema</button>` : ''}</div>
      <div class="row">${logoHtml(P)}<div class="grow"><label for="c-logo">Tu logo o foto</label><input type="file" id="c-logo" accept="image/*" data-c="logo"></div></div>
      ${P.logo ? `<div class="grid2"><button class="btn sm" data-a="ajustarLogo">Acomodar logo</button><button class="btn sm" data-a="quitarLogo">Quitar logo</button></div>
      <div><p class="small muted" style="margin-bottom:6px">Forma del logo</p><div class="grid2"><button class="chip${P.logoForma !== 'cuadrado' ? ' sel' : ''}" data-a="formaLogo" data-f="redondo">Redondo</button><button class="chip${P.logoForma === 'cuadrado' ? ' sel' : ''}" data-a="formaLogo" data-f="cuadrado">Cuadrado</button></div></div>` : ''}
      <p class="small muted">Así lo ven las familias:</p>
      <div class="preview"><div class="band">${deco(P)}${logoHtml(P, true)}<div class="txt grow"><h3>${esc(P.nombre)}</h3><p class="sub">${esc(P.especialidad)}</p></div></div><div style="padding:12px"><span class="btn pri block" aria-hidden="true">Sacar turno</span></div></div>`;
    else if (S.sec === 'info') c = `<h3>Mi información</h3>
      <label for="c-nom">Nombre</label><input id="c-nom" value="${esc(P.nombre)}">
      <div class="grid2"><div><label for="c-esp">Especialidad</label><input id="c-esp" value="${esc(P.especialidad)}"></div><div><label for="c-lug">Consultorio</label><input id="c-lug" value="${esc(P.lugar)}"></div></div>
      <label for="c-dir">Dirección</label><input id="c-dir" value="${esc(P.direccion)}"><label for="c-tel">Teléfono</label><input id="c-tel" value="${esc(P.telefono)}">
      <button class="btn pri block" data-a="guardarInfo">Guardar</button>`;
    else if (S.sec === 'avisos') c = `<h3>Avisos para las familias</h3>
      <label for="c-aviso">Aviso en tu página</label><textarea id="c-aviso" style="min-height:80px">${esc(P.aviso)}</textarea>
      <label for="c-ext">Obra social que saca turno por su propio sistema</label><select id="c-ext"><option value="">Ninguna</option>${(P.obras || []).map(o => `<option${P.obraExterna === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>
      <p class="small muted">Si una familia elige esa obra social, la página le avisa y no la deja reservar.</p>
      <button class="btn pri block" data-a="guardarAvisos">Guardar</button>`;
    else c = `<h3>Turnos</h3>
      <label for="c-obras">Obras sociales (una por línea)</label><textarea id="c-obras">${esc((P.obras || []).join('\n'))}</textarea>
      <label for="c-mot">Motivos de consulta (uno por línea)</label><textarea id="c-mot">${esc((P.motivos || []).join('\n'))}</textarea>
      <label for="c-lim">Turnos pendientes por chico</label><select id="c-lim">${[1, 2, 3].map(n => `<option value="${n}"${P.limite === n ? ' selected' : ''}>${n}</option>`).join('')}</select>
      <button class="btn pri block" data-a="guardarTurnos">Guardar</button>`;
    if (S.sec === 'horarios') return `<div class="card"><h2>Configuración</h2><div class="secs">${secs.map(([k, l]) => `<button class="chip${S.sec === k ? ' sel' : ''}" data-a="sec" data-s="${k}">${l}</button>`).join('')}</div></div>${PRO.horarios()}`;
    return `<div class="card"><h2>Configuración</h2><div class="secs">${secs.map(([k, l]) => `<button class="chip${S.sec === k ? ' sel' : ''}" data-a="sec" data-s="${k}">${l}</button>`).join('')}</div></div><div class="card">${c}</div>`;
  }
};

function ficha() {
  const x = pacientes().find(p => p.clave === S.ficha); if (!x) { S.ficha = null; return PRO.pacientes(); }
  const ts = [...x.turnos].reverse();
  return `<div class="card"><button class="btn link" data-a="cerrarFicha">← Pacientes</button>
    <div class="row"><div class="logo sm" aria-hidden="true">${esc(x.nombre[0] || '?')}</div><div class="grow"><h2>${esc(x.nombre)}</h2><p class="small muted">${esc(edad(x.nac))} · ${esc(x.obra || 'Sin obra social')}</p></div></div>
    <div class="resumen"><div><span>DNI</span><span>${esc(x.dni || 'Sin cargar')}</span></div><div><span>Nacimiento</span><span>${x.nac ? fechaCorta(x.nac) : 'Sin cargar'}</span></div><div><span>Obra social</span><span>${esc(x.obra || 'Sin cargar')}</span></div><div><span>Responsable</span><span>${esc(x.resp || 'Sin cargar')}</span></div><div><span>Contacto</span><span class="wa">${esc(x.contacto || 'Sin cargar')}</span></div></div>
    <div class="grid2"><div><label for="fa-afil">N.º de afiliado</label><input id="fa-afil" value="${esc(x.afiliado)}"></div><div><label for="fa-nac">Nacimiento</label><input id="fa-nac" type="date" max="${ahora().HOY}" value="${esc(x.nac)}"></div></div>
    <button class="btn" data-a="guardarFicha">Guardar cambios</button>
    <button class="btn pri block" data-a="copiar">Copiar datos para la receta</button>
    ${S.copia ? `<p class="small muted">Tu celular no dejó copiar solo. Mantené apretado el texto para copiarlo:</p><div class="copybox">${esc(S.copia)}</div>` : ''}
    <p class="small muted">Pegalos en la plataforma de recetas electrónicas que usás.</p></div>
  <div class="card"><h3>Recordatorios</h3>
    <div class="grid2"><div><label for="r-f">Fecha</label><input type="date" id="r-f" min="${ahora().HOY}" value="${esc(S.recF || '')}"></div><div><label for="r-t">Qué recordar</label><input id="r-t" placeholder="Control de peso"></div></div>
    <div class="chips">${[['1 mes', 1], ['3 meses', 3], ['6 meses', 6], ['1 año', 12]].map(([l, m]) => `<button class="chip" data-a="recEn" data-m="${m}">En ${l}</button>`).join('')}</div>
    <button class="btn" data-a="recAgregar">Agregar recordatorio</button>
    ${x.recs.length ? `<div class="list">${[...x.recs].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(r => `<div class="item"><div class="grow${r.hecho ? ' muted' : ''}"><b>${fechaCorta(r.fecha)}</b> · ${esc(r.texto)}${r.hecho ? ' · listo' : ''}</div>${r.hecho ? '' : `<button class="btn sm" data-a="recListo" data-k="${esc(x.clave)}" data-id="${r.id}">Listo</button>`}<button class="btn sm danger" data-a="recBorrar" data-id="${r.id}" aria-label="Borrar recordatorio">Borrar</button></div>`).join('')}</div>` : '<p class="muted small">Sin recordatorios. El día que elijas, aparece arriba en la Agenda.</p>'}</div>
  <div class="card"><h3>Notas y pedidos</h3>
    <label for="fa-nota">Nueva nota</label><textarea id="fa-nota" style="min-height:70px" placeholder="Pedido de hemograma, control de peso…"></textarea>
    ${errHtml()}<button class="btn" data-a="agregarNota">Agregar nota</button>
    ${x.notas.length ? x.notas.map(n => `<p class="nota"><span>${fechaCorta(n.fecha)}</span><br>${esc(n.texto)}</p>`).join('') : '<p class="muted small">Sin notas todavía.</p>'}</div>
  <div class="card"><h3>Turnos</h3><div class="list">${ts.map(t => `<div class="item"><div class="grow">${esc(fechaLarga(t.fecha))}, ${conH(t.hora, S.P)}<p class="small muted">${esc(t.motivo)}</p></div><span class="pill ${t.estado === 'cancelado' ? 'warn' : t.estado === 'atendido' ? 'ok' : 'free'}">${t.estado === 'cancelado' ? 'Cancelado' : t.estado === 'atendido' ? 'Atendido' : 'Pendiente'}</span></div>`).join('')}</div></div>
  <div class="card">${S.borrar === x.clave ? `<div class="borrar"><b>¿Eliminar a ${esc(nombreCorto(x.nombre))}?</b><p class="small">Se borran su ficha, notas e historial de turnos.${x.turnos.some(t => t.estado === 'activo') ? ' Sus turnos pendientes se cancelan y el horario queda libre.' : ''} No se puede deshacer.</p><div class="grid2"><button class="btn" data-a="noBorrar">No, volver</button><button class="btn rojo" data-a="eliminarPaciente" ${S.enviando ? 'disabled' : ''}>${S.enviando ? 'Eliminando…' : 'Sí, eliminar'}</button></div></div>` : `<button class="btn block danger borde-rojo" data-a="pregBorrar">Eliminar paciente</button>`}</div>`;
}

function render() {
  if (S.P) aplicarTema(S.P);
  const foco = document.activeElement && document.activeElement.id === 'buscar' ? document.activeElement.selectionStart : null;
  app.innerHTML = `<div class="top"></div>${vista()}<p class="foot">${esc(PLATAFORMA)} · app del consultorio</p>`;
  if (foco !== null) { const b = document.getElementById('buscar'); if (b) { b.focus(); try { b.setSelectionRange(foco, foco); } catch (_) {} } }
}
const val = id => (document.getElementById(id)?.value || '').trim();
function borradorHor() { if (!S.hor) S.hor = { h: JSON.parse(JSON.stringify(S.P.horarios)), dur: S.P.duracion }; return S.hor; }
function leerBlq() { const b = S.blq; if (!b || !document.getElementById('b-desde')) return; b.desde = val('b-desde'); b.hasta = val('b-hasta'); if (document.getElementById('b-otro')) b.otro = val('b-otro'); }
function borradorDar() { const d = S.dar; if (document.getElementById('d-nom')) { d.nombre = val('d-nom'); d.dni = soloNum(val('d-dni')); d.tel = val('d-tel'); d.motivo = val('d-mot'); d.obra = val('d-obra'); } }

const A = {
  entrar: async () => {
    S.err = '';
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) {
      console.error(e);
      const c = e.code || '';
      if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment' || c === 'auth/web-storage-unsupported') { signInWithRedirect(auth, new GoogleAuthProvider()); return; }
      if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
      S.err = c === 'auth/unauthorized-domain' ? 'Falta autorizar este sitio en Firebase (Authentication → Configuración → Dominios autorizados).'
        : c === 'auth/operation-not-allowed' ? 'El acceso con Google no está activado en Firebase.'
        : c === 'auth/network-request-failed' ? 'Sin conexión. Revisá internet y probá de nuevo.'
        : 'No se pudo entrar (' + (c || 'error desconocido') + '). Si lo abriste desde otra app, probá en Chrome.';
      render();
    }
  },
  salir: () => signOut(auth),
  crear: async () => {
    const nombre = val('n-nom'), slug = val('n-slug').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''), mail = val('n-mail').toLowerCase();
    if (!nombre || !slug || !mail.includes('@')) { S.err = 'Completá nombre, link y Gmail.'; return render(); }
    const P = configNueva(slug, nombre, mail); if (document.getElementById('n-yo')?.checked && !P.owners.includes(S.user.email.toLowerCase())) P.owners.push(S.user.email.toLowerCase());
    try { await setDoc(doc(db, 'profesionales', slug), P); toast('Profesional creado'); buscarConsultorio(); }
    catch (e) { console.error(e); S.err = 'No se pudo crear. ¿Ya existe ese link? ¿Tu mail está en las reglas como administrador?'; render(); }
  },
  tab: d => { if (S.tab === d.t && !S.ficha) return; S.tab = d.t; S.hor = null; S.blq = null; S.afect = null; S.err = ''; S.confirmar = null; S.ficha = null; S.copia = null; marcar(); render(); },
  dia: d => { S.dia = d.k; S.confirmar = null; render(); },
  pregCancelar: d => { S.confirmar = d.id; render(); },
  noCancelar: () => { S.confirmar = null; render(); },
  cancelar: async d => {
    const t = S.turnos.find(x => x.id === d.id); if (!t) return;
    try { const b = writeBatch(db); b.update(doc(db, 'profesionales', S.slug, 'turnos', t.id), { estado: 'cancelado' }); b.delete(doc(db, 'profesionales', S.slug, 'ocupados', ocupadoId(t.fecha, t.hora))); await b.commit(); S.confirmar = null; toast('Turno cancelado. El horario quedó libre.'); }
    catch (e) { console.error(e); toast('No se pudo cancelar.'); }
  },
  atendido: async d => { try { await updateDoc(doc(db, 'profesionales', S.slug, 'turnos', d.id), { estado: 'atendido' }); } catch (e) { console.error(e); toast('No se pudo guardar.'); } },
  copiarLink: () => { const l = linkPublico(); try { navigator.clipboard.writeText(l).then(() => toast('Link copiado'), () => toast('Mantené apretado el link para copiarlo')); } catch (e) { toast('Mantené apretado el link para copiarlo'); } },
  irDar: () => { S.dar = { fecha: slotsFor(S.P, S.dia, turnoEn).some(s => !s.t) ? S.dia : null, hora: null, motivo: (S.P.motivos || [])[0] }; S.tab = 'dar'; marcar(); S.err = ''; render(); top(); },
  darEn: d => { S.dar = { fecha: S.dia, hora: d.h, motivo: (S.P.motivos || [])[0] }; S.tab = 'dar'; marcar(); S.err = ''; render(); top(); },
  darDia: d => { borradorDar(); S.dar.fecha = d.k; S.dar.hora = null; render(); },
  darHora: d => { borradorDar(); S.dar.hora = d.h; render(); },
  guardarDar: async () => {
    borradorDar(); const d = S.dar;
    if (!d.fecha || !d.hora) { S.err = 'Elegí día y horario.'; return render(); }
    if (!d.nombre) { S.err = 'Escribí el nombre del chico o chica.'; return render(); }
    if (!libre(d.fecha, d.hora)) { S.err = 'Ese horario ya está ocupado.'; return render(); }
    const prev = d.dni ? pacientes().find(p => p.dni === d.dni) : null;
    S.enviando = true; S.err = ''; render();
    try {
      const b = writeBatch(db), ref = doc(collection(db, 'profesionales', S.slug, 'turnos'));
      b.set(ref, { fecha: d.fecha, hora: d.hora, estado: 'activo', motivo: d.motivo || '', origen: 'manual', uid: null,
        paciente: { nombre: d.nombre, dni: d.dni || '', nac: prev ? prev.nac : '', obra: d.obra || (prev ? prev.obra : '') },
        responsable: { nombre: prev ? prev.resp : '', contacto: d.tel || (prev ? prev.contacto : '') }, creado: serverTimestamp() });
      b.set(doc(db, 'profesionales', S.slug, 'ocupados', ocupadoId(d.fecha, d.hora)), { fecha: d.fecha, hora: d.hora, turnoId: ref.id });
      await b.commit();
      toast('Turno guardado: ' + nombreCorto(d.nombre) + ', ' + conH(d.hora, S.P)); S.dia = d.fecha; S.dar = {}; S.enviando = false; S.tab = 'agenda'; history.replaceState({ tab: 'agenda', ficha: null }, ''); render(); top(); top();
    } catch (e) { console.error(e); S.enviando = false; S.err = 'No se pudo guardar. Puede que alguien haya tomado ese horario recién.'; render(); }
  },
  verFicha: d => { S.borrar = null; S.ficha = d.k; S.tab = 'pacientes'; S.copia = null; S.err = ''; marcar(); render(); top(); },
  cerrarFicha: () => history.back(),
  guardarFicha: async () => {
    const x = pacientes().find(p => p.clave === S.ficha);
    try { await setDoc(doc(db, 'profesionales', S.slug, 'pacientes', S.ficha), { afiliado: val('fa-afil'), nac: val('fa-nac') || x.nac || '', notas: x.notas }, { merge: true }); toast('Ficha guardada'); }
    catch (e) { console.error(e); toast('No se pudo guardar.'); }
  },
  pregBorrar: () => { S.borrar = S.ficha; render(); },
  noBorrar: () => { S.borrar = null; render(); },
  eliminarPaciente: async () => {
    const x = pacientes().find(p => p.clave === S.ficha); if (!x) return;
    S.enviando = true; render();
    try {
      const b = writeBatch(db);
      x.turnos.forEach(t => {
        b.delete(doc(db, 'profesionales', S.slug, 'turnos', t.id));
        if (t.estado !== 'cancelado') b.delete(doc(db, 'profesionales', S.slug, 'ocupados', ocupadoId(t.fecha, t.hora)));
      });
      b.delete(doc(db, 'profesionales', S.slug, 'pacientes', x.clave));
      await b.commit();
      S.enviando = false; S.borrar = null; toast(nombreCorto(x.nombre) + ' eliminado'); history.back();
    } catch (e) { console.error(e); S.enviando = false; toast('No se pudo eliminar. Probá de nuevo.'); render(); }
  },
  copiar: () => {
    const x = pacientes().find(p => p.clave === S.ficha);
    const txt = ['Paciente: ' + x.nombre, 'DNI: ' + (x.dni || '-'), 'Fecha de nacimiento: ' + (x.nac ? fechaCorta(x.nac) : '-'), 'Obra social: ' + (x.obra || '-'), 'N.º de afiliado: ' + (x.afiliado || '-'), 'Responsable: ' + (x.resp || '-')].join('\n');
    try { navigator.clipboard.writeText(txt).then(() => { S.copia = null; toast('Datos copiados'); render(); }, () => { S.copia = txt; render(); }); } catch (e) { S.copia = txt; render(); }
  },
  agregarNota: async () => {
    const t = val('fa-nota'); if (!t) { S.err = 'Escribí la nota primero.'; return render(); }
    const x = pacientes().find(p => p.clave === S.ficha);
    try { await setDoc(doc(db, 'profesionales', S.slug, 'pacientes', S.ficha), { notas: [{ fecha: ahora().HOY, texto: t }, ...x.notas] }, { merge: true }); S.err = ''; toast('Nota agregada'); }
    catch (e) { console.error(e); toast('No se pudo guardar.'); }
  },
  formato: d => guardarP({ formatoHora: d.f }, d.f === '12' ? 'Horas en AM / PM' : 'Horas en formato 24 h'),
  guardarHorarios: async () => {
    const hb = borradorHor();
    for (const d of [1, 2, 3, 4, 5, 6, 0]) { const h = hb.h[d]; if (h.on && toMin(h.desde) >= toMin(h.hasta)) { S.err = 'El ' + DOW[d].toLowerCase() + ', la hora de "Hasta" tiene que ser después de "Desde".'; return render(); } }
    S.err = ''; await guardarP({ horarios: hb.h, duracion: hb.dur }, 'Horarios guardados'); S.hor = null; render();
  },
  descartarHorarios: () => { S.hor = null; S.err = ''; render(); },
  recEn: d => { const f = new Date(); f.setMonth(f.getMonth() + Number(d.m)); S.recF = f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0'); const t = val('r-t'); render(); const el = document.getElementById('r-t'); if (el) el.value = t; },
  recAgregar: async () => {
    const f = val('r-f'), t = val('r-t'); if (!f || !t) { S.err = 'Elegí la fecha y escribí qué recordar.'; return render(); }
    const x = pacientes().find(p => p.clave === S.ficha); S.err = '';
    try { await setDoc(doc(db, 'profesionales', S.slug, 'pacientes', S.ficha), { recordatorios: [...x.recs, { id: uid(), fecha: f, texto: t, hecho: false }] }, { merge: true }); S.recF = ''; toast('Recordatorio para el ' + fechaCorta(f)); }
    catch (e) { console.error(e); toast('No se pudo guardar.'); }
  },
  recListo: async d => {
    const x = pacientes().find(p => p.clave === d.k); if (!x) return;
    try { await setDoc(doc(db, 'profesionales', S.slug, 'pacientes', d.k), { recordatorios: x.recs.map(r => r.id === d.id ? { ...r, hecho: true } : r) }, { merge: true }); toast('Listo'); }
    catch (e) { console.error(e); toast('No se pudo guardar.'); }
  },
  recBorrar: async d => {
    const x = pacientes().find(p => p.clave === S.ficha); if (!x) return;
    try { await setDoc(doc(db, 'profesionales', S.slug, 'pacientes', S.ficha), { recordatorios: x.recs.filter(r => r.id !== d.id) }, { merge: true }); toast('Recordatorio borrado'); }
    catch (e) { console.error(e); toast('No se pudo borrar.'); }
  },
  blqMotivo: d => { leerBlq(); S.blq.motivo = d.m; render(); },
  blqAviso: d => { leerBlq(); S.blq.aviso = Math.max(0, Math.min(30, S.blq.aviso + Number(d.n))); render(); },
  cerrarAfect: () => { S.afect = null; render(); },
  bloquear: async () => {
    leerBlq(); const b = S.blq, hasta = b.hasta || b.desde;
    if (!b.desde) { S.err = 'Elegí desde qué día.'; return render(); }
    if (hasta < b.desde) { S.err = '"Hasta" tiene que ser el mismo día o después de "Desde".'; return render(); }
    const motivo = b.motivo === 'Otro' ? (b.otro || 'Otro') : b.motivo;
    const pis = (S.P.bloqueos || []).find(x => desdeDe(x) <= hasta && b.desde <= hastaDe(x));
    if (pis) { S.err = 'Esos días se superponen con otro bloqueo (' + textoPeriodo(pis) + ').'; return render(); }
    S.err = ''; S.afect = activos().filter(t => t.estado === 'activo' && t.fecha >= b.desde && t.fecha <= hasta).sort((a, c) => (a.fecha + a.hora).localeCompare(c.fecha + c.hora));
    await guardarP({ bloqueos: [...(S.P.bloqueos || []), { desde: b.desde, hasta, motivo, avisoDias: b.aviso }] }, 'Días bloqueados');
    S.blq = null; render(); top();
  },
  desbloquear: d => guardarP({ bloqueos: (S.P.bloqueos || []).filter((b, i) => i !== Number(d.i)) }, 'Días desbloqueados'),
  sec: d => { S.sec = d.s; S.hor = null; S.err = ''; render(); },
  tema: d => guardarP({ tema: d.t, colorPropio: '' }, 'Tema ' + TEMAS[d.t].nombre + ' aplicado'),
  colorTema: () => guardarP({ colorPropio: '' }),
  quitarLogo: () => guardarP({ logo: '' }, 'Logo quitado'),
  ajustarLogo: () => recortar(S.P.logo),
  formaLogo: d => guardarP({ logoForma: d.f }, d.f === 'cuadrado' ? 'Logo cuadrado' : 'Logo redondo'),
  guardarInfo: () => guardarP({ nombre: val('c-nom') || S.P.nombre, especialidad: val('c-esp'), lugar: val('c-lug'), direccion: val('c-dir'), telefono: val('c-tel') }, 'Cambios guardados'),
  guardarAvisos: () => guardarP({ aviso: val('c-aviso'), obraExterna: val('c-ext') }, 'Avisos guardados'),
  guardarTurnos: () => { const lines = id => (document.getElementById(id).value || '').split('\n').map(s => s.trim()).filter(Boolean); guardarP({ obras: lines('c-obras'), motivos: lines('c-mot'), limite: Number(val('c-lim')) || 1 }, 'Cambios guardados'); }
};

document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el || el.disabled) return; const fn = A[el.dataset.a]; if (fn) { e.preventDefault(); fn(el.dataset); } });
document.addEventListener('input', e => { if (e.target.id === 'buscar') { S.buscar = e.target.value; render(); } });
document.addEventListener('change', async e => {
  const el = e.target, c = el.dataset && el.dataset.c; if (!c || !S.P) return; const P = S.P;
  if (c === 'hOn' || c === 'hDesde' || c === 'hHasta' || c === 'dur') {
    const hb = borradorHor(), d = el.dataset.d;
    if (c === 'hOn') hb.h[d].on = el.checked;
    else if (c === 'dur') hb.dur = Number(el.value);
    else hb.h[d][c === 'hDesde' ? 'desde' : 'hasta'] = el.value;
    S.err = ''; return render();
  }
  if (c === 'dibujos') return guardarP({ dibujos: el.checked });
  if (c === 'color') return guardarP({ colorPropio: el.value });
  if (c === 'logo' && el.files && el.files[0]) { const f = el.files[0]; el.value = ''; const r = new FileReader(); r.onload = () => recortar(r.result); r.onerror = () => toast('No se pudo leer la imagen'); r.readAsDataURL(f); return; }
  if (c === 'darDni') { borradorDar(); const p = pacientes().find(x => x.dni && x.dni === S.dar.dni); if (p) { S.dar.nombre = p.nombre; S.dar.tel = S.dar.tel || p.contacto; S.dar.obra = S.dar.obra || p.obra; toast('Paciente encontrado: ' + p.nombre); render(); } }
});

/* ---------- Conexión con los datos ---------- */
let subs = [];
async function buscarConsultorio() {
  subs.forEach(f => f()); subs = []; S.slug = null; S.P = null;
  try {
    const r = await getDocs(query(collection(db, 'profesionales'), where('owners', 'array-contains', S.user.email.toLowerCase())));
    if (!r.empty) {
      S.slug = r.docs[0].id;
      subs.push(onSnapshot(refP(), s => { S.P = s.data(); render(); }));
      subs.push(onSnapshot(collection(db, 'profesionales', S.slug, 'turnos'), s => { S.turnos = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); }, e => console.error(e)));
      subs.push(onSnapshot(collection(db, 'profesionales', S.slug, 'pacientes'), s => { S.pacx = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); render(); }, e => console.error(e)));
    }
  } catch (e) { console.error(e); }
  S.cargando = false; render();
}
if (configurado) {
  getRedirectResult(auth).catch(() => {});
  onAuthStateChanged(auth, u => {
    S.user = u && !u.isAnonymous ? u : null;
    if (!S.user) { subs.forEach(f => f()); subs = []; S.slug = null; S.P = null; S.cargando = false; render(); return; }
    S.cargando = true; render(); buscarConsultorio();
  });
} else { S.cargando = false; }
function recortar(src) {
  abrirRecorte(src, S.P.logoForma, S.P.nombre, (res, err) => {
    if (err) return toast(err);
    if (res) guardarP({ logo: res.logo, logoForma: res.forma }, 'Logo guardado');
  });
}
// Botón "atrás" del celular: vuelve a la pantalla anterior de la app en vez de cerrarla
function marcar() { history.pushState({ tab: S.tab, ficha: S.ficha || null }, ''); }
window.addEventListener('popstate', e => {
  if (document.querySelector('.modal-fondo')) return;
  const st = e.state || { tab: 'agenda', ficha: null };
  S.tab = st.tab || 'agenda'; S.ficha = st.ficha || null; S.copia = null; S.err = ''; S.confirmar = null; render(); top();
});
history.replaceState({ tab: 'agenda', ficha: null }, '');
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
