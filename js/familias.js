// Página pública: lo que ven las familias
import { configurado, auth, db, onAuthStateChanged, signInAnonymously, RecaptchaVerifier, linkWithPhoneNumber,
  doc, setDoc, collection, query, where, onSnapshot, writeBatch, serverTimestamp } from './fb.js';
import { PROFESIONAL_POR_DEFECTO, VERIFICAR_SMS, PLATAFORMA } from './firebase-config.js';
import { textoUrgencia, fmtHora, conH, avisosVigentes, textoPeriodo, bloqueoDe, esc, soloNum, nombreCorto, ocupadoId, ahora, fechaLarga, diaNombre, proximos, edad, parseKey, toMin, fromMin, DOWS, MES,
  slotsFor, inicios, primerLibre, tramo, textoHorarios, aplicarTema, deco, logoHtml, icono, toast, sinConfig, uid } from './common.js';

const app = document.getElementById('app');
const slug = (location.hash.replace('#', '') || new URLSearchParams(location.search).get('p') || PROFESIONAL_POR_DEFECTO).toLowerCase();
const S = { P: null, noExiste: false, ocup: new Map(), user: null, fam: null, mis: [], pant: 'cartilla', res: null, err: '', ultima: [], confirmar: null, enviando: false, sms: null };

const ocupado = (f, h) => S.ocup.get(f + ' ' + h);
const hijosFam = () => (S.fam && S.fam.hijos) || [];
const misActivos = () => S.mis.filter(t => t.estado === 'activo' && (t.fecha > ahora().HOY || (t.fecha === ahora().HOY && toMin(t.hora) >= ahora().min)));
const pendientesDe = dni => !dni ? 0 : misActivos().filter(t => t.paciente && t.paciente.dni === dni).length;
const limiteMsg = n => nombreCorto(n) + ' ya tiene ' + (S.P.limite === 1 ? 'un turno pendiente' : S.P.limite + ' turnos pendientes') + '. Podés cancelarlo desde "Mis turnos".';
const errHtml = () => S.err ? `<p class="err" role="alert">${esc(S.err)}</p>` : '';
const top = () => window.scrollTo(0, 0);

function cabecera(extra) { const P = S.P; return `<div class="card banded"><div class="band">${deco(P)}${logoHtml(P, true)}<div class="txt grow"><h3>${esc(P.nombre)}</h3><p class="sub">${esc(P.especialidad)}${P.lugar ? ' · ' + esc(P.lugar) : ''}</p></div>${extra || ''}</div></div>`; }

const PASOS_CUENTA = ['hijos', 'motivo', 'dia', 'revisar'], PASOS_RAPIDO = ['motivo', 'dia', 'datos'];
const NOMBRE_PASO = { hijos: 'Para quién', motivo: 'Motivo', dia: 'Día y hora', revisar: 'Revisar', datos: 'Tus datos' };
const pasos = () => S.res.cuenta ? PASOS_CUENTA : PASOS_RAPIDO;
const pasoAct = () => pasos()[S.res.paso - 1];
const cuantos = () => S.res.cuenta ? Math.max(S.res.hijos.length, 1) : 1;

function carteles(P) {
  return avisosVigentes(P).map(b => `<p class="cartel"><b>${esc(b.motivo || 'Aviso')}:</b> ${esc(P.nombre)} no atiende ${esc(textoPeriodo(b))}. Esos días no hay turnos.</p>`).join('');
}

const V = {
  cartilla() {
    const P = S.P, hay = !!primerLibre(P, 1, ocupado), n = misActivos().length;
    return `<div class="card banded"><div class="band" style="min-height:120px">${deco(P)}${logoHtml(P)}<div class="txt"><h1>${esc(P.nombre)}</h1><p class="sub">${esc(P.especialidad)}${P.lugar ? ' · ' + esc(P.lugar) : ''}</p></div></div>
    <div class="pad">
      <div>${hay ? `<span class="pill ok">Turnos disponibles</span>` : `<span class="pill warn">Sin turnos en las próximas 2 semanas</span>`}</div>
      ${P.direccion || P.telefono ? `<p class="small">${esc(P.direccion)}${P.telefono ? `<br>Tel: <span class="wa">${esc(P.telefono)}</span>` : ''}</p>` : ''}
      <div class="hint"><b>Atiende</b><br>${esc(textoHorarios(P)) || 'Sin días cargados'}</div>
      ${carteles(P)}
      ${P.aviso ? `<p class="alerta">${esc(P.aviso)}</p>` : ''}
      <button class="btn pri block" data-a="reservar">Sacar turno</button>
      <p class="small muted" style="text-align:center">Sin registrarte ni contraseñas.</p>
      ${n || hijosFam().length ? `<button class="btn block" data-a="ir" data-p="inicio">Mis turnos${n ? ' (' + n + ')' : ''}</button>` : ''}
    </div></div>
    <div class="card"><h3>Obras sociales</h3><div class="chips">${(P.obras || []).map(o => `<span class="pill free">${esc(o)}</span>`).join('')}</div></div>`;
  },

  inicio() {
    const mis = misActivos().sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    return `${cabecera()}
    <div class="card"><h2>${S.fam && S.fam.resp ? 'Hola, ' + esc(nombreCorto(S.fam.resp)) : 'Mis turnos'}</h2><button class="btn pri block" data-a="reservar">Sacar turno</button></div>
    <div class="card"><h3>Próximos turnos</h3>
      ${mis.length ? `<div class="list">${mis.map(t => `<div class="item"><div class="grow"><b>${esc(nombreCorto(t.paciente.nombre))}</b> · ${esc(t.motivo)}<p class="small muted">${esc(fechaLarga(t.fecha))}, ${conH(t.hora, S.P)}</p></div>${S.confirmar === t.id ? `<div class="row"><button class="btn sm danger" data-a="cancelar" data-id="${t.id}">Sí, cancelar</button><button class="btn sm" data-a="noCancelar">No</button></div>` : `<button class="btn sm" data-a="pregCancelar" data-id="${t.id}">Cancelar</button>`}</div>`).join('')}</div>` : `<p class="muted small">No tenés turnos pendientes en este celular.</p>`}</div>
    <div class="card"><div class="row between"><h3>Mis hijos</h3><button class="btn sm" data-a="ir" data-p="hijo">Agregar</button></div>
      ${hijosFam().length ? `<div class="list">${hijosFam().map(h => `<div class="item"><div class="logo sm" aria-hidden="true">${esc(h.nombre[0] || '?')}</div><div class="grow"><b>${esc(h.nombre)}</b><p class="small muted">${esc(edad(h.nac))} · ${esc(h.obra)}</p></div></div>`).join('')}</div>` : `<p class="muted small">Todavía no guardaste hijos en este celular.</p>`}</div>
    <button class="btn link" data-a="ir" data-p="cartilla">Volver</button>`;
  },

  hijo() {
    return `${cabecera()}<div class="card"><h2>Agregar hijo o hija</h2>
      <label for="h-nom">Nombre y apellido</label><input id="h-nom">
      <div class="grid2"><div><label for="h-dni">DNI</label><input id="h-dni" inputmode="numeric"></div><div><label for="h-nac">Fecha de nacimiento</label><input id="h-nac" type="date" max="${ahora().HOY}"></div></div>
      <label for="h-obra">Obra social</label><select id="h-obra">${(S.P.obras || []).map(o => `<option>${esc(o)}</option>`).join('')}</select>
      ${errHtml()}<button class="btn pri block" data-a="guardarHijo">Guardar</button>
      <button class="btn link" data-a="ir" data-p="inicio">Volver</button></div>`;
  },

  reservar() {
    const P = S.P, r = S.res, ps = pasos(), act = pasoAct(), n = cuantos(), t = ahora();
    const bar = `<div class="steps"><div class="row between"><span>Paso ${r.paso} de ${ps.length}</span><span>${NOMBRE_PASO[act]}</span></div><div class="bar"><i style="width:${r.paso / ps.length * 100}%"></i></div></div>`;
    let c = '';
    if (act === 'hijos') {
      c = `<h2>¿Para quién es el turno?</h2><p class="small muted">Si traés a más de uno, elegilos a todos: les damos turnos seguidos.</p>
      <div class="kids">${hijosFam().map(h => { const s = r.hijos.includes(h.id); return `<button class="kid${s ? ' sel' : ''}" data-a="togHijo" data-id="${h.id}" aria-pressed="${s}"><span class="logo" aria-hidden="true">${esc(h.nombre[0] || '?')}</span>${esc(nombreCorto(h.nombre))}<small>${esc(edad(h.nac))}</small></button>`; }).join('')}</div>
      <button class="btn link" data-a="ir" data-p="hijo">+ Agregar otro hijo o hija</button>`;
    } else if (act === 'motivo') {
      c = `<h2>¿Por qué lo traés?</h2>
      <div class="tiles">${(P.motivos || []).map(m => `<button class="tile${r.motivo === m ? ' sel' : ''}" data-a="motivo" data-m="${esc(m)}" aria-pressed="${r.motivo === m}">${icono(m, P)}${esc(m)}</button>`).join('')}</div>
      ${textoUrgencia(P) ? `<p class="alerta" role="note">${esc(textoUrgencia(P))}</p>` : ''}`;
    } else if (act === 'dia') {
      const pl = primerLibre(P, n, ocupado), dias = proximos(14).filter(k => inicios(P, k, n, ocupado).length), hs = r.fecha ? inicios(P, r.fecha, n, ocupado) : [];
      const grupo = (ti, l) => l.length ? `<p class="franja">${ti}</p><div class="slots">${l.map(h => `<button class="chip${r.hora === h ? ' sel' : ''}" data-a="hora" data-h="${h}" aria-pressed="${r.hora === h}">${fmtHora(h, P)}</button>`).join('')}</div>` : '';
      c = `<h2>¿Qué día te queda bien?</h2>${carteles(P)}
      ${pl ? `<button class="rapido${r.fecha === pl.fecha && r.hora === pl.hora ? ' sel' : ''}" data-a="primero"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg><span class="grow"><b>Primer turno libre</b><br><span class="small muted">${esc(diaNombre(pl.fecha))}, ${conH(pl.hora, P)}</span></span><span class="small" style="color:var(--accent);font-weight:700">Elegir</span></button>` : ''}
      ${dias.length ? `<p class="small muted">O elegí el día</p><div class="days">${dias.map(k => { const d = parseKey(k); const corto = k === t.HOY ? 'Hoy' : (k === t.MANANA ? 'Mañana' : DOWS[d.getDay()]); return `<button class="chip${r.fecha === k ? ' sel' : ''}" data-a="dia" data-k="${k}" aria-pressed="${r.fecha === k}">${corto}<b>${d.getDate()}</b><span class="small">${MES[d.getMonth()]}</span></button>`; }).join('')}</div>`
        : `<p class="muted">No hay turnos libres en las próximas dos semanas.${P.telefono ? ` Llamá al consultorio al <span class="wa">${esc(P.telefono)}</span>.` : ''}</p>`}
      ${r.fecha ? `<h3>${esc(fechaLarga(r.fecha))}</h3>${n > 1 ? `<p class="small muted">Elegí la hora del primer turno; el resto va a continuación.</p>` : ''}${grupo('Mañana', hs.filter(h => toMin(h) < 780))}${grupo('Tarde', hs.filter(h => toMin(h) >= 780))}` : ''}`;
    } else if (act === 'revisar') {
      const tr = tramo(P, r.fecha, r.hora, n, ocupado) || [];
      c = `<h2>Revisá ${n > 1 ? 'tus turnos' : 'tu turno'}</h2><div class="resumen">${r.hijos.map((id, j) => { const h = hijosFam().find(x => x.id === id); return `<div><span>${esc(nombreCorto(h.nombre))} · ${esc(edad(h.nac))}</span><span>${tr[j] ? conH(tr[j], P) : ''}</span></div>`; }).join('')}
       <div><span>Motivo</span><span>${esc(r.motivo)}</span></div><div><span>Día</span><span>${esc(fechaLarga(r.fecha))}</span></div>${P.direccion ? `<div><span>Dónde</span><span>${esc(P.lugar)}<br>${esc(P.direccion)}</span></div>` : ''}</div>
      <p class="small muted">Llegá 10 minutos antes con el DNI y la credencial de la obra social.</p>`;
    } else {
      const g = r.g;
      c = `<h2>¿A nombre de quién?</h2>
      <div class="hint"><b>${esc(fechaLarga(r.fecha))}, ${conH(r.hora, P)}</b> · ${esc(r.motivo)}</div>
      <label for="g-chico">Nombre y apellido del chico o chica</label><input id="g-chico" value="${esc(g.chico)}">
      <div class="grid2"><div><label for="g-dni">DNI del chico</label><input id="g-dni" inputmode="numeric" value="${esc(g.dni)}"></div><div><label for="g-nac">Nacimiento</label><input id="g-nac" type="date" max="${t.HOY}" value="${esc(g.nac)}"></div></div>
      <label for="g-obra">Obra social</label><select id="g-obra"><option value="">Elegí una</option>${(P.obras || []).map(o => `<option${g.obra === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>
      <label for="g-resp">Tu nombre (mamá, papá o responsable)</label><input id="g-resp" value="${esc(g.resp)}" autocomplete="name">
      <label for="g-cont">Tu celular</label><input id="g-cont" type="tel" inputmode="tel" value="${esc(g.cont)}" placeholder="2604 123456" autocomplete="tel-national">
      <p class="small muted">Código de área sin el 0 y número sin el 15.</p>
      <label class="recordar" for="g-guardar"><input type="checkbox" id="g-guardar" ${g.guardar ? 'checked' : ''}>Guardar mis datos en este celular para la próxima</label>`;
    }
    const final = act === 'revisar' || act === 'datos';
    const sig = final ? `<button class="btn pri" data-a="${act === 'datos' ? 'enviarReserva' : 'confirmar'}" ${S.enviando ? 'disabled' : ''}>${S.enviando ? 'Reservando…' : (VERIFICAR_SMS && act === 'datos' ? 'Enviarme el código' : 'Confirmar ' + (n > 1 ? n + ' turnos' : 'turno'))}</button>` : `<button class="btn pri" data-a="sig">Siguiente</button>`;
    const atras = r.paso > 1 ? `<button class="btn" data-a="atras">${act === 'revisar' ? 'Cambiar algo' : 'Atrás'}</button>` : `<button class="btn" data-a="ir" data-p="cartilla">Salir</button>`;
    return `${cabecera()}<div class="card">${bar}${c}</div><div id="recaptcha"></div><div class="navbar">${errHtml()}<div class="row">${atras}${sig}</div></div>`;
  },

  codigo() {
    return `${cabecera()}<div class="card"><h2>Escribí el código</h2><p class="muted small">Te lo mandamos por SMS al ${esc(S.res.g.cont)}.</p>
      <label for="c-cod">Código</label><input id="c-cod" inputmode="numeric" maxlength="6" class="code" autocomplete="one-time-code">
      ${errHtml()}<button class="btn pri block" data-a="verificarSms" ${S.enviando ? 'disabled' : ''}>${S.enviando ? 'Confirmando…' : 'Confirmar turno'}</button>
      <button class="btn link" data-a="volverReserva">Volver</button></div>`;
  },

  listo() {
    const P = S.P, t0 = S.ultima[0], tN = S.ultima[S.ultima.length - 1];
    const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(P.direccion || P.lugar || '');
    const fx = (f, h) => f.replace(/-/g, '') + 'T' + h.replace(':', '') + '00';
    const fin = fromMin(toMin(tN.hora) + P.duracion);
    const quien = S.ultima.map(t => nombreCorto(t.paciente.nombre)).join(' y ');
    const cal = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Turno ' + String(P.especialidad || '').toLowerCase() + ': ' + quien) + '&dates=' + fx(t0.fecha, t0.hora) + '/' + fx(tN.fecha, fin) + '&ctz=America/Argentina/Mendoza&location=' + encodeURIComponent(P.direccion || '') + '&details=' + encodeURIComponent(P.nombre + ' · ' + t0.motivo);
    return `${cabecera()}<div class="card"><h2>¡Listo, ${S.ultima.length > 1 ? 'turnos reservados' : 'turno reservado'}!</h2>
      <div class="list">${S.ultima.map(t => `<div class="item"><span class="time">${fmtHora(t.hora, P)}</span><div class="grow"><b>${esc(nombreCorto(t.paciente.nombre))}</b><p class="small muted">${esc(fechaLarga(t.fecha))} · ${esc(t.motivo)}</p></div><span class="pill ok">Confirmado</span></div>`).join('')}</div>
      <div class="grid2">${P.direccion ? `<a class="btn" href="${maps}" target="_blank" rel="noopener">Cómo llegar</a>` : ''}<a class="btn" href="${cal}" target="_blank" rel="noopener">Agendar en mi celular</a></div>
      <p class="small muted">Si no podés ir, cancelalo desde "Mis turnos" así el horario queda libre para otra familia.</p>
      <button class="btn pri block" data-a="ir" data-p="inicio">Ver mis turnos</button></div>`;
  }
};

function render() {
  if (!configurado) { app.innerHTML = sinConfig; return; }
  if (S.noExiste) { app.innerHTML = `<div class="card"><h2>No encontramos esta página</h2><p class="muted">Revisá el link que te pasaron.</p></div>`; return; }
  if (!S.P || !S.user) { app.innerHTML = `<div class="card"><p class="muted">Cargando…</p></div>`; return; }
  aplicarTema(S.P); document.title = 'Turnos · ' + S.P.nombre;
  app.innerHTML = `<div class="top"></div>${V[S.pant]()}<p class="foot">${esc(PLATAFORMA)} · turnos online</p>`;
}
function ir(p, sinHistorial) {
  S.pant = p; S.err = ''; S.confirmar = null;
  if (p === 'cartilla' || p === 'inicio') S.res = null;
  if (!sinHistorial) history.pushState({ pant: p, paso: S.res ? S.res.paso : 0 }, '');
  render(); top();
}
// Botón "atrás" del celular: vuelve al paso anterior en vez de salir de la página
window.addEventListener('popstate', e => {
  const st = e.state || { pant: 'cartilla', paso: 0 };
  if (S.enviando) { history.pushState({ pant: S.pant, paso: S.res ? S.res.paso : 0 }, ''); return; }
  leerSiHay();
  if ((st.pant === 'reservar' || st.pant === 'codigo') && !S.res) { S.pant = 'cartilla'; history.replaceState({ pant: 'cartilla', paso: 0 }, ''); }
  else { S.pant = st.pant; if (S.res && st.paso) S.res.paso = st.paso; }
  S.err = ''; S.confirmar = null; render(); top();
});
function leerSiHay() { if (S.pant === 'reservar' && S.res && pasoAct() === 'datos') { leerG(); return true; } return false; }
const val = id => (document.getElementById(id)?.value || '').trim();
function leerG() { const g = S.res.g; g.chico = val('g-chico'); g.dni = soloNum(val('g-dni')); g.nac = val('g-nac'); g.obra = val('g-obra'); g.resp = val('g-resp'); g.cont = val('g-cont'); g.guardar = !!document.getElementById('g-guardar')?.checked; }

// Graba los turnos en un solo paso: si alguien tomó el horario un segundo antes, no se graba nada
async function grabarTurnos(pacientes, horas, responsable) {
  const r = S.res, batch = writeBatch(db), hechos = [];
  pacientes.forEach((p, j) => {
    const ref = doc(collection(db, 'profesionales', slug, 'turnos'));
    const t = { fecha: r.fecha, hora: horas[j], estado: 'activo', motivo: r.motivo, origen: 'web', uid: S.user.uid,
      paciente: { nombre: p.nombre, dni: p.dni, nac: p.nac, obra: p.obra }, responsable, creado: serverTimestamp() };
    batch.set(ref, t);
    batch.set(doc(db, 'profesionales', slug, 'ocupados', ocupadoId(r.fecha, horas[j])), { fecha: r.fecha, hora: horas[j], turnoId: ref.id });
    hechos.push({ ...t, id: ref.id });
  });
  await batch.commit();
  return hechos;
}
async function terminarReserva(pacientes, responsable, guardar) {
  const r = S.res, n = pacientes.length, horas = tramo(S.P, r.fecha, r.hora, n, ocupado);
  if (!horas) { S.err = 'Justo alguien tomó ese horario. Volvé y elegí otro.'; S.enviando = false; return render(); }
  try {
    S.ultima = await grabarTurnos(pacientes, horas, responsable);
    if (guardar) {
      const hijos = [...hijosFam()];
      pacientes.forEach(p => { if (!hijos.some(h => h.dni && h.dni === p.dni)) hijos.push({ id: uid(), ...p }); });
      await setDoc(doc(db, 'familias', S.user.uid), { resp: responsable.nombre, contacto: responsable.contacto, hijos }, { merge: true });
    }
    S.enviando = false; S.res = null; history.replaceState({ pant: 'listo', paso: 0 }, ''); ir('listo', true);
  } catch (e) {
    console.error(e); S.enviando = false;
    S.err = e.code === 'permission-denied' ? 'Justo alguien tomó ese horario. Volvé y elegí otro.' : 'No pudimos reservar. Revisá tu conexión y probá de nuevo.';
    render();
  }
}
function telefonoAR(t) { let d = soloNum(t); if (d.startsWith('54')) d = d.slice(2); if (d.startsWith('9')) d = d.slice(1); if (d.startsWith('0')) d = d.slice(1); return '+549' + d; }

const A = {
  ir: d => ir(d.p),
  reservar: () => { const hs = hijosFam(); S.res = { cuenta: hs.length > 0, paso: 1, hijos: hs.length === 1 ? [hs[0].id] : [], fecha: null, hora: null, motivo: '', g: { guardar: true, resp: S.fam?.resp || '', cont: S.fam?.contacto || '' } }; ir('reservar'); },
  togHijo: d => { const r = S.res; r.hijos = r.hijos.includes(d.id) ? r.hijos.filter(x => x !== d.id) : [...r.hijos, d.id]; r.fecha = null; r.hora = null; S.err = ''; render(); },
  motivo: d => { S.res.motivo = d.m; S.err = ''; render(); },
  dia: d => { S.res.fecha = d.k; S.res.hora = null; S.err = ''; render(); },
  hora: d => { S.res.hora = d.h; S.err = ''; render(); },
  primero: () => { const pl = primerLibre(S.P, cuantos(), ocupado); if (pl) { S.res.fecha = pl.fecha; S.res.hora = pl.hora; S.err = ''; } render(); },
  atras: () => history.back(),
  sig: () => {
    const r = S.res, P = S.P, act = pasoAct();
    if (act === 'hijos') {
      if (!r.hijos.length) { S.err = 'Tocá el nombre de tu hijo o hija para seguir.'; return render(); }
      const elegidos = r.hijos.map(id => hijosFam().find(h => h.id === id));
      const ext = elegidos.filter(h => P.obraExterna && h.obra === P.obraExterna);
      if (ext.length) { S.err = ext.map(h => nombreCorto(h.nombre)).join(' y ') + ' ' + (ext.length > 1 ? 'tienen' : 'tiene') + ' ' + P.obraExterna + '. ' + (P.aviso || ''); return render(); }
      for (const h of elegidos) if (pendientesDe(h.dni) >= P.limite) { S.err = limiteMsg(h.nombre); return render(); }
    }
    if (act === 'motivo' && !r.motivo) { S.err = 'Elegí el motivo de la consulta.'; return render(); }
    if (act === 'dia' && (!r.fecha || !r.hora)) { S.err = 'Elegí un día y un horario.'; return render(); }
    r.paso++; S.err = ''; history.pushState({ pant: 'reservar', paso: r.paso }, ''); render(); top();
  },
  confirmar: () => {
    const r = S.res; S.enviando = true; S.err = ''; render();
    const pacientes = r.hijos.map(id => { const h = hijosFam().find(x => x.id === id); return { nombre: h.nombre, dni: h.dni || '', nac: h.nac || '', obra: h.obra || '' }; });
    terminarReserva(pacientes, { nombre: S.fam.resp || '', contacto: S.fam.contacto || '' }, false);
  },
  enviarReserva: async () => {
    leerG(); const g = S.res.g, P = S.P;
    if (!g.chico || !g.dni || !g.nac || !g.obra || !g.resp || !g.cont) { S.err = 'Completá todos los datos para reservar.'; return render(); }
    if (g.dni.length < 7) { S.err = 'Revisá el DNI del chico: tiene que tener 7 u 8 números.'; return render(); }
    if (soloNum(g.cont).length < 10) { S.err = 'Revisá el celular: código de área sin 0 y número sin 15 (10 números en total).'; return render(); }
    if (P.obraExterna && g.obra === P.obraExterna) { S.err = P.aviso || 'Esa obra social saca turno por su propio sistema.'; return render(); }
    if (pendientesDe(g.dni) >= P.limite) { S.err = limiteMsg(g.chico); return render(); }
    if (VERIFICAR_SMS && !S.user.phoneNumber) {
      S.enviando = true; S.err = ''; render();
      try {
        if (!S.recaptcha) S.recaptcha = new RecaptchaVerifier(auth, 'recaptcha', { size: 'invisible' });
        S.sms = await linkWithPhoneNumber(S.user, telefonoAR(g.cont), S.recaptcha);
        S.enviando = false; ir('codigo');
      } catch (e) { console.error(e); S.enviando = false; S.err = 'No pudimos mandar el SMS. Revisá el número y probá de nuevo.'; render(); }
      return;
    }
    S.enviando = true; S.err = ''; render();
    terminarReserva([{ nombre: g.chico, dni: g.dni, nac: g.nac, obra: g.obra }], { nombre: g.resp, contacto: g.cont }, g.guardar);
  },
  verificarSms: async () => {
    const cod = soloNum(val('c-cod')); if (cod.length < 6) { S.err = 'Escribí los 6 números del SMS.'; return render(); }
    S.enviando = true; S.err = ''; render();
    try { await S.sms.confirm(cod); const g = S.res.g; terminarReserva([{ nombre: g.chico, dni: g.dni, nac: g.nac, obra: g.obra }], { nombre: g.resp, contacto: g.cont }, g.guardar); }
    catch (e) { console.error(e); S.enviando = false; S.err = 'El código no coincide. Revisalo y probá de nuevo.'; render(); }
  },
  volverReserva: () => history.back(),
  guardarHijo: async () => {
    const h = { id: uid(), nombre: val('h-nom'), dni: soloNum(val('h-dni')), nac: val('h-nac'), obra: val('h-obra') };
    if (!h.nombre || !h.nac) { S.err = 'Completá el nombre y la fecha de nacimiento.'; return render(); }
    try { await setDoc(doc(db, 'familias', S.user.uid), { hijos: [...hijosFam(), h] }, { merge: true }); toast(nombreCorto(h.nombre) + ' agregado'); }
    catch (e) { console.error(e); S.err = 'No pudimos guardar. Probá de nuevo.'; return render(); }
    if (S.res && S.res.cuenta) { S.res.hijos.push(h.id); S.err = ''; history.back(); }
    else if (S.res && !S.res.cuenta) { A.reservar(); } else ir('inicio');
  },
  pregCancelar: d => { S.confirmar = d.id; render(); },
  noCancelar: () => { S.confirmar = null; render(); },
  cancelar: async d => {
    const t = S.mis.find(x => x.id === d.id); if (!t) return;
    try { const b = writeBatch(db); b.update(doc(db, 'profesionales', slug, 'turnos', t.id), { estado: 'cancelado' }); b.delete(doc(db, 'profesionales', slug, 'ocupados', ocupadoId(t.fecha, t.hora))); await b.commit(); S.confirmar = null; toast('Turno cancelado. El horario quedó libre.'); }
    catch (e) { console.error(e); toast('No pudimos cancelar. Probá de nuevo.'); }
  }
};

document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el || el.disabled) return; const fn = A[el.dataset.a]; if (fn) { e.preventDefault(); fn(el.dataset); } });
window.addEventListener('hashchange', () => location.reload());

/* ---------- Conexión con los datos ---------- */
if (configurado) {
  onSnapshot(doc(db, 'profesionales', slug), s => { S.noExiste = !s.exists(); S.P = s.exists() ? s.data() : null; render(); }, e => { console.error(e); S.noExiste = true; render(); });
  onSnapshot(query(collection(db, 'profesionales', slug, 'ocupados'), where('fecha', '>=', ahora().HOY)), s => { S.ocup = new Map(s.docs.map(d => [d.data().fecha + ' ' + d.data().hora, true])); if (S.pant !== 'reservar' || pasoAct() !== 'datos') render(); });
  let unsub = [];
  onAuthStateChanged(auth, u => {
    unsub.forEach(f => f()); unsub = [];
    if (!u) { signInAnonymously(auth).catch(e => { console.error(e); app.innerHTML = `<div class="card"><h2>No pudimos abrir la página</h2><p class="muted">Revisá tu conexión y volvé a intentar.</p></div>`; }); return; }
    S.user = u;
    unsub.push(onSnapshot(doc(db, 'familias', u.uid), s => { S.fam = s.exists() ? s.data() : null; if (S.pant !== 'reservar') render(); }));
    unsub.push(onSnapshot(query(collection(db, 'profesionales', slug, 'turnos'), where('uid', '==', u.uid)), s => { S.mis = s.docs.map(d => ({ id: d.id, ...d.data() })); if (S.pant !== 'reservar' && S.pant !== 'listo') render(); }));
    render();
  });
}
history.replaceState({ pant: 'cartilla', paso: 0 }, '');
render();
