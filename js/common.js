// Funciones compartidas entre la página de familias y la app de la profesional

export const DOW = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
export const DOWS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
export const MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
export const pad = n => String(n).padStart(2, '0');
export const keyOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const toMin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
export const fromMin = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const soloNum = s => String(s || '').replace(/\D/g, '');
export const nombreCorto = n => String(n || '').split(' ')[0];
export const ocupadoId = (fecha, hora) => fecha + '_' + hora.replace(':', '');

export function ahora() { const n = new Date(); return { HOY: keyOf(n), MANANA: keyOf(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1)), min: n.getHours() * 60 + n.getMinutes(), n }; }
export const fechaLarga = k => { const d = parseKey(k); return DOW[d.getDay()] + ' ' + d.getDate() + ' de ' + MES[d.getMonth()]; };
export const fechaCorta = k => { const d = parseKey(k); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
export function diaNombre(k) { const t = ahora(); return k === t.HOY ? 'Hoy' : (k === t.MANANA ? 'Mañana ' + DOW[parseKey(k).getDay()].toLowerCase() : fechaLarga(k)); }
export function proximos(n) { const a = []; const t = ahora().n; const d = new Date(t.getFullYear(), t.getMonth(), t.getDate()); for (let i = 0; i < n; i++) { a.push(keyOf(d)); d.setDate(d.getDate() + 1); } return a; }
export function edad(f) {
  if (!f) return 'edad sin cargar';
  const now = new Date(), b = parseKey(f);
  let m = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) m--;
  if (m < 1) return 'recién nacido';
  if (m < 24) return m + (m === 1 ? ' mes' : ' meses');
  return Math.floor(m / 12) + ' años';
}
export function iniciales(n) { return String(n || '').replace(/^(dra?\.?|dr\.?)\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }
export const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- Agenda ---------- */
// ocupado(fecha, hora) -> devuelve el turno (o true) si está tomado
// Minutos entre pacientes de ese día: el propio del día o, si no tiene, el general
export const pasoDe = (P, fecha) => { const h = (P.horarios || {})[parseKey(fecha).getDay()]; return (h && Number(h.dur)) || P.duracion || 20; };
export function slotsFor(P, fecha, ocupado, pasados) {
  const t = ahora(), d = parseKey(fecha), h = P.horarios[d.getDay()];
  if (!h || !h.on || bloqueoDe(P, fecha)) return [];
  const out = [];
  const paso = pasoDe(P, fecha);
  for (let m = toMin(h.desde); m + paso <= toMin(h.hasta); m += paso) {
    if (!pasados && fecha === t.HOY && m <= t.min) continue;
    const hora = fromMin(m);
    out.push({ hora, t: ocupado(fecha, hora) || null });
  }
  return out;
}
export function inicios(P, fecha, n, ocupado) {
  const sl = slotsFor(P, fecha, ocupado), d = pasoDe(P, fecha);
  return sl.filter((s, i) => { for (let j = 0; j < n; j++) { const x = sl[i + j]; if (!x || x.t) return false; if (j && toMin(x.hora) - toMin(sl[i + j - 1].hora) !== d) return false; } return true; }).map(s => s.hora);
}
export function primerLibre(P, n, ocupado) { for (const k of proximos(14)) { const h = inicios(P, k, n, ocupado); if (h.length) return { fecha: k, hora: h[0] }; } return null; }
export function tramo(P, fecha, hora, n, ocupado) {
  const sl = slotsFor(P, fecha, ocupado), i = sl.findIndex(s => s.hora === hora), tr = sl.slice(i, i + n);
  return i >= 0 && tr.length === n && tr.every((s, j) => !s.t && (j === 0 || toMin(s.hora) - toMin(tr[j - 1].hora) === pasoDe(P, fecha))) ? tr.map(s => s.hora) : null;
}
export function textoHorarios(P) {
  const h = P.horarios;
  const l = [1, 2, 3, 4, 5, 6, 0].filter(d => h[d] && h[d].on).map(d => DOW[d] + ' de ' + fmtHora(h[d].desde, P) + ' a ' + conH(h[d].hasta, P));
  return l.length > 1 ? l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1] : (l[0] || '');
}

/* ---------- Formato de hora: 24 h (16:30) o AM/PM (4:30 PM) ---------- */
export function fmtHora(h, P) {
  if (!h || !P || P.formatoHora !== '12') return h;
  const m = toMin(h), hh = Math.floor(m / 60) % 24, mm = m % 60;
  return ((hh % 12) || 12) + ':' + pad(mm) + ' ' + (hh < 12 ? 'AM' : 'PM');
}
export const conH = (h, P) => P && P.formatoHora === '12' ? fmtHora(h, P) : h + ' h';
export function opcionesHora(sel, P) {
  let o = ''; for (let m = 6 * 60; m <= 23 * 60 + 55; m += 5) { const h = fromMin(m); o += `<option value="${h}"${h === sel ? ' selected' : ''}>${fmtHora(h, P)}</option>`; }
  return o;
}

/* ---------- Días bloqueados (un día suelto o un período) ---------- */
export const desdeDe = b => b.desde || b.fecha;
export const hastaDe = b => b.hasta || b.fecha;
export const bloqueoDe = (P, fecha) => (P.bloqueos || []).find(b => desdeDe(b) <= fecha && fecha <= hastaDe(b));
export function sumarDias(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
// Períodos que la página tiene que anunciar hoy (desde X días antes hasta que terminan)
export function avisosVigentes(P) {
  const H = ahora().HOY;
  return (P.bloqueos || []).filter(b => hastaDe(b) >= H && sumarDias(desdeDe(b), -(Number(b.avisoDias) || 0)) <= H)
    .sort((a, b) => desdeDe(a).localeCompare(desdeDe(b)));
}
export function textoPeriodo(b) {
  const d = desdeDe(b), h = hastaDe(b);
  return d === h ? 'el ' + fechaLarga(d).toLowerCase() : 'del ' + fechaLarga(d).toLowerCase() + ' al ' + fechaLarga(h).toLowerCase();
}

/* ---------- Configuración inicial de un profesional nuevo ---------- */
export function configNueva(slug, nombre, email) {
  const h = {}; for (let d = 0; d < 7; d++) h[d] = { on: d >= 1 && d <= 5, desde: '09:00', hasta: '12:00' };
  return {
    slug, nombre: nombre || 'Nombre del profesional', especialidad: 'Pediatría', lugar: '', direccion: '', telefono: '',
    tema: 'clasico', dibujos: true, colorPropio: '', logo: '', duracion: 20, limite: 1,
    obras: ['Particulares'], obraExterna: '', aviso: '', motivos: ['Control', 'Vacunas', 'Está enfermo', 'Certificado'],
    horarios: h, bloqueos: [], owners: [String(email || '').toLowerCase()]
  };
}

/* ---------- Temas (dibujos propios) ---------- */
const daisy = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><g fill="#ffffff" stroke="#ed93b1" stroke-width=".8">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<ellipse rx="3.6" ry="8.5" cy="-8.5" transform="rotate(${a})"/>`).join('')}</g><circle r="4.6" fill="#ef9f27"/></g>`;
const cat = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M-10 -4 L-8 -16 L-2 -9 Z M10 -4 L8 -16 L2 -9 Z" fill="#afa9ec"/><circle r="11" fill="#afa9ec"/><circle cx="-4" cy="-1" r="1.6" fill="#26215c"/><circle cx="4" cy="-1" r="1.6" fill="#26215c"/><path d="M-1.5 3 L0 4.2 L1.5 3" stroke="#26215c" stroke-width="1" fill="none"/><path d="M-16 2 H-8 M-16 5 H-8 M8 2 H16 M8 5 H16" stroke="#534ab7" stroke-width=".8"/></g>`;
const paw = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})" fill="#cecbf6"><ellipse rx="5" ry="4" cy="3"/><circle cx="-5" cy="-4" r="2"/><circle cx="-1.7" cy="-6.5" r="2"/><circle cx="1.7" cy="-6.5" r="2"/><circle cx="5" cy="-4" r="2"/></g>`;
const leaf = (x, y, r, s) => `<path d="M0 0 C6 -9 16 -9 22 0 C16 9 6 9 0 0Z M0 0 L22 0" fill="#9fe1cb" stroke="#1d9e75" stroke-width=".8" transform="translate(${x},${y}) rotate(${r}) scale(${s})"/>`;
const dots = () => `<circle cx="112" cy="20" r="14" fill="#b5d4f4"/><circle cx="86" cy="58" r="9" fill="#85b7eb" opacity=".6"/><circle cx="130" cy="64" r="6" fill="#378add" opacity=".4"/>`;
export const TEMAS = {
  flores: { nombre: 'Flores', accent: '#c94f7c', head: '#fbeaf0', fg: '#72243e', sub: '#993556', deco: () => daisy(110, 24, 1.25) + daisy(72, 58, .8) + daisy(128, 66, .55) + daisy(40, 18, .45) },
  gatitos: { nombre: 'Gatitos', accent: '#6b5fc7', head: '#eeedfe', fg: '#3c3489', sub: '#534ab7', deco: () => cat(108, 40, 1.3) + cat(66, 62, .7) + paw(36, 22, .7) + paw(132, 74, .5) },
  clasico: { nombre: 'Clásico', accent: '#2f6fd6', head: '#e6f1fb', fg: '#0c447c', sub: '#185fa5', deco: dots },
  menta: { nombre: 'Menta', accent: '#15876a', head: '#e1f5ee', fg: '#085041', sub: '#0f6e56', deco: () => leaf(84, 30, -30, 1.4) + leaf(104, 60, 20, 1.1) + leaf(60, 64, -60, .8) + leaf(120, 14, 40, .7) },
  oceano: { nombre: 'Océano', accent: '#1f78b4', head: '#dff0fb', fg: '#0b3a5c', sub: '#1d5f8f', deco: () => `<path d="M0 70 q12-10 24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#1f78b4" stroke-width="3"/><path d="M0 78 q12-10 24 0 t24 0 t24 0 t24 0 t24 0 t24 0" fill="none" stroke="#7fb8de" stroke-width="3"/><path d="M96 56 l0-34 l22 28z" fill="#fff" stroke="#1f78b4" stroke-width="2"/><path d="M90 58 h36 l-6 10 h-24z" fill="#1f78b4"/>` },
  autitos: { nombre: 'Autitos', accent: '#d9482b', head: '#fdebe5', fg: '#6b1f10', sub: '#a63a22', deco: () => `<rect x="60" y="40" width="64" height="20" rx="8" fill="#d9482b"/><path d="M72 40 l8-14 h28 l8 14z" fill="#f08a73"/><circle cx="78" cy="62" r="8" fill="#333"/><circle cx="108" cy="62" r="8" fill="#333"/><path d="M0 76 h140" stroke="#999" stroke-width="3" stroke-dasharray="10 8"/>` },
  espacio: { nombre: 'Espacio', accent: '#5b4fd1', head: '#e8e6fb', fg: '#231a6b', sub: '#4338b0', deco: () => `<circle cx="100" cy="36" r="16" fill="#5b4fd1"/><ellipse cx="100" cy="36" rx="26" ry="6" fill="none" stroke="#a9a1f0" stroke-width="3"/><path d="M40 20 l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z" fill="#f5b700"/><path d="M118 70 l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#f5b700"/>` },
  bosque: { nombre: 'Bosque', accent: '#2e7d32', head: '#e3f4e4', fg: '#14411a', sub: '#2a6a30', deco: () => `<path d="M90 70 l16-40 16 40z" fill="#2e7d32"/><path d="M70 74 l12-28 12 28z" fill="#66a96a"/><rect x="102" y="70" width="8" height="10" fill="#6d4c2f"/><circle cx="40" cy="30" r="9" fill="#f5b700"/>` }
};
export const decoSvg = (t, cls) => `<svg class="${cls || 'deco'}" viewBox="0 0 140 84" preserveAspectRatio="xMaxYMin meet" aria-hidden="true">${(TEMAS[t] || TEMAS.clasico).deco()}</svg>`;
export function aplicarTema(P) {
  const t = TEMAS[P.tema] || TEMAS.clasico, r = document.documentElement.style;
  r.setProperty('--accent', P.colorPropio || t.accent); r.setProperty('--head-bg', t.head); r.setProperty('--head-fg', t.fg); r.setProperty('--head-sub', t.sub);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t.head);
}
export const deco = P => P.dibujos ? decoSvg(P.tema) : '';
export function logoHtml(P, sm) { return P.logo ? `<img class="logo${sm ? ' sm' : ''}${P.logoForma === 'cuadrado' ? ' cuadrado' : ''}" src="${esc(P.logo)}" alt="Logo de ${esc(P.nombre)}">` : `<div class="logo${sm ? ' sm' : ''}" aria-hidden="true">${esc(iniciales(P.nombre))}</div>`; }

const SVG = b => `<svg viewBox="0 0 24 24" aria-hidden="true">${b}</svg>`;
// Galería de íconos para los motivos de consulta (dibujos propios)
export const ICONOS = {
  control: ['Control', '<path d="M4 20h16M7 20v-6M12 20V8M17 20v-9"/><circle cx="12" cy="4.5" r="1.5"/>'],
  vacuna: ['Vacuna', '<path d="M18 3l3 3M19.5 4.5l-9 9M15 5l4 4M7 11l6 6M5 17l2 2M3 21l3-3"/>'],
  fiebre: ['Fiebre', '<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v8"/>'],
  certificado: ['Certificado', '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/>'],
  estetoscopio: ['Consulta', '<path d="M6 3v6a4 4 0 0 0 8 0V3M10 13v3a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="12" r="2"/>'],
  mamadera: ['Alimentación', '<path d="M10 2h4M10.5 2v2.5L9 6.5V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6.5l-1.5-2V2"/><path d="M9 11h6M9 15h6"/>'],
  oido: ['Oído', '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.7"/><path d="M10 9a2 2 0 0 1 4 0c0 1.5-2 2-2 3.5"/>'],
  ojo: ['Ojos', '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'],
  curita: ['Herida', '<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M10 10h.01M14 14h.01M10 14h.01M14 10h.01"/>'],
  pulmones: ['Respiración', '<path d="M12 3v8M12 11c-1.5 1-3 1-3 1M12 11c1.5 1 3 1 3 1"/><path d="M8.5 7C5 7 3 12 3 16.5 3 19 5 20 7 19c2-.8 2-3 2-5V8.5A1.5 1.5 0 0 0 8.5 7zM15.5 7C19 7 21 12 21 16.5c0 2.5-2 3.5-4 2.5-2-.8-2-3-2-5V8.5A1.5 1.5 0 0 1 15.5 7z"/>'],
  diente: ['Dientes', '<path d="M7 3c-2.5 0-4 2-4 4.5 0 3 1.5 4.5 2 7.5.4 2.6 1 6 2.5 6 1.7 0 1.5-5 4.5-5s2.8 5 4.5 5c1.5 0 2.1-3.4 2.5-6 .5-3 2-4.5 2-7.5C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z"/>'],
  corazon: ['Corazón', '<path d="M12 20s-7.5-4.6-9-9.5C2 6.5 5 4 8 4c2 0 3.2 1.2 4 2.4C12.8 5.2 14 4 16 4c3 0 6 2.5 5 6.5-1.5 4.9-9 9.5-9 9.5z"/><path d="M3.5 12h4l2-3 2.5 6 2-3h6"/>'],
  balanza: ['Peso', '<path d="M5 4h14l2 16H3z"/><circle cx="12" cy="10" r="3"/><path d="M12 10l1.5-1.5"/>'],
  hueso: ['Huesos', '<path d="M15 4.5a2.5 2.5 0 1 1 4 2.5 2.5 2.5 0 1 1-2.5 4L11 16.5a2.5 2.5 0 1 1-4 2.5 2.5 2.5 0 1 1 2.5-4L15 9.5a2.5 2.5 0 0 1 0-5z"/>'],
  remedio: ['Medicación', '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>'],
  bebe: ['Recién nacido', '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0M12 3c-1 1.5-1 3 0 4"/>'],
  manzana: ['Nutrición', '<path d="M12 7c-1.5-1-5-1.5-6.5 1.5C4 12 6 20 9 20c1.3 0 1.8-.6 3-.6s1.7.6 3 .6c3 0 5-8 3.5-11.5C17 5.5 13.5 6 12 7z"/><path d="M12 7c0-2 1-3.5 3-4"/>'],
  gota: ['Análisis', '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>'],
  piel: ['Piel', '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1"/><circle cx="14.5" cy="9" r="1.2"/><circle cx="13" cy="14.5" r="1"/><circle cx="8.5" cy="15" r=".8"/>'],
  panza: ['Panza', '<path d="M8 3v3c-3 1.5-4 4.5-4 7.5A7.5 7.5 0 0 0 12 21a7.5 7.5 0 0 0 8-7.5c0-3-1-6-4-7.5V3"/><circle cx="12" cy="14" r="1.2"/>']
};
export const iconoSvg = k => SVG((ICONOS[k] || ICONOS.estetoscopio)[1]);
export function iconoAuto(m) {
  const t = String(m).toLowerCase();
  if (t.includes('control')) return 'control';
  if (t.includes('vacun')) return 'vacuna';
  if (t.includes('enferm') || t.includes('fiebre')) return 'fiebre';
  if (t.includes('certif')) return 'certificado';
  if (t.includes('oíd') || t.includes('oid')) return 'oido';
  if (t.includes('ojo') || t.includes('vista')) return 'ojo';
  if (t.includes('peso')) return 'balanza';
  if (t.includes('análisis') || t.includes('analisis') || t.includes('laboratorio')) return 'gota';
  if (t.includes('recién') || t.includes('recien') || t.includes('nacido')) return 'bebe';
  return 'estetoscopio';
}
export const icono = (m, P) => iconoSvg((P && P.motivosIcono && P.motivosIcono[m]) || iconoAuto(m));
export const urgenciaDefecto = P => (P.tipo === 'general' ? 'Si es una urgencia, no esperes al turno: ' : 'Si tiene fiebre alta, le cuesta respirar o es urgente, no esperes al turno: ') + (P.telefono ? 'llamá al ' + P.telefono + ' o ' : '') + 'andá a la guardia.';
export const textoUrgencia = P => P.urgencia === undefined ? urgenciaDefecto(P) : P.urgencia;

/* ---------- Avisos cortos ---------- */
export function toast(m) { const t = document.getElementById('toast'); if (!t) return; t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2800); }

// Achica una imagen a un cuadrado de 256 px para guardarla liviana
export function achicarImagen(file) {
  return new Promise((ok, mal) => {
    const r = new FileReader();
    r.onerror = mal;
    r.onload = () => { const img = new Image(); img.onerror = mal; img.onload = () => {
      const S = 256, c = document.createElement('canvas'); c.width = S; c.height = S; const x = c.getContext('2d');
      const m = Math.min(img.width, img.height); x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
      ok(c.toDataURL('image/png')); }; img.src = r.result; };
    r.readAsDataURL(file);
  });
}
export const sinConfig = `<div class="card"><h2>Falta conectar la base de datos</h2><p class="muted">Pegá el bloque <b>firebaseConfig</b> en <b>js/firebase-config.js</b>. Los pasos están en el archivo LEEME.md.</p></div>`;

/* ---------- Textos según el tipo de consultorio ---------- */
// 'pediatria' (por defecto): los turnos son de chicos. 'general': pacientes de cualquier edad.
export const TIPOS = { pediatria: 'Pediatría (turnos para chicos)', general: 'Otra especialidad (turnos para adultos)' };
export function textos(P) {
  if (P && P.tipo === 'general') return {
    guardados: 'Mis pacientes', agregar: 'Agregar paciente', agregarOtro: '+ Agregar otro paciente', sinGuardados: 'Todavía no guardaste pacientes en este celular.',
    quien: '¿Para quién es el turno?', quienSub: 'Si el turno es para más de una persona, elegilas a todas: les damos turnos seguidos.',
    motivo: '¿Para qué querés el turno?', nombre: 'Nombre y apellido del paciente', dni: 'DNI del paciente', resp: 'Tu nombre y apellido',
    elegir: 'Tocá el nombre del paciente para seguir.', dniMal: 'Revisá el DNI: tiene que tener 7 u 8 números.', libre: 'para otra persona', nombreCorto: 'del paciente'
  };
  return {
    guardados: 'Mis hijos', agregar: 'Agregar hijo o hija', agregarOtro: '+ Agregar otro hijo o hija', sinGuardados: 'Todavía no guardaste hijos en este celular.',
    quien: '¿Para quién es el turno?', quienSub: 'Si traés a más de uno, elegilos a todos: les damos turnos seguidos.',
    motivo: '¿Para qué querés el turno?', nombre: 'Nombre y apellido del paciente', dni: 'DNI del paciente', resp: 'Tu nombre (mamá, papá o responsable)',
    elegir: 'Tocá el nombre de tu hijo o hija para seguir.', dniMal: 'Revisá el DNI del paciente: tiene que tener 7 u 8 números.', libre: 'para otra familia', nombreCorto: 'del chico'
  };
}

/* ---------- Modelos de especialidad: motivos y recomendaciones para empezar ---------- */
const DOC = 'Llegá 10 minutos antes con tu DNI y la credencial de la obra social.';
export const ESPECIALIDADES = {
  pediatria: { nombre: 'Pediatría', tipo: 'pediatria', motivos: ['Control', 'Vacunas', 'Está enfermo', 'Certificado'],
    recs: ['Llegá 10 minutos antes con el DNI y la credencial de la obra social.', 'Traé el carnet de vacunación y el último control.', 'Si tiene fiebre alta o dificultad para respirar, no esperes el turno: andá a una guardia.'] },
  clinica: { nombre: 'Clínica médica', tipo: 'general', motivos: ['Control general', 'Consulta', 'Certificado', 'Renovación de receta', 'Resultados de estudios'],
    recs: [DOC, 'Traé tus estudios y la lista de los medicamentos que tomás.', 'Si no podés venir, cancelá el turno para que lo use otra persona.'] },
  odontologia: { nombre: 'Odontología', tipo: 'general', motivos: ['Consulta', 'Limpieza', 'Dolor de muela', 'Arreglo o caries', 'Control', 'Ortodoncia'],
    recs: [DOC, 'Si tomás algún medicamento o tenés alguna alergia, avisanos.', 'Si tenés mucho dolor o la cara hinchada, llamanos para ver si te atendemos antes.'] },
  psicologia: { nombre: 'Psicología', tipo: 'general', motivos: ['Primera consulta', 'Sesión de seguimiento', 'Terapia de pareja', 'Orientación a padres'],
    recs: ['Conectate o llegá unos minutos antes de la hora.', 'Cancelá o reprogramá con al menos 24 horas de aviso.', 'Si estás en una situación de urgencia, no esperes el turno: pedí ayuda en una guardia.'] },
  kinesiologia: { nombre: 'Kinesiología', tipo: 'general', motivos: ['Evaluación inicial', 'Sesión de rehabilitación', 'Masaje o descontracturante', 'Control'],
    recs: [DOC, 'Traé la orden médica y los estudios que tengas.', 'Vení con ropa cómoda.'] },
  nutricion: { nombre: 'Nutrición', tipo: 'general', motivos: ['Primera consulta', 'Control', 'Plan de alimentación', 'Seguimiento'],
    recs: [DOC, 'Traé tus análisis recientes si los tenés.', 'Si podés, anotá lo que comés durante tres días antes de venir.'] },
  dermatologia: { nombre: 'Dermatología', tipo: 'general', motivos: ['Consulta', 'Control de lunares', 'Acné', 'Alergia o erupción', 'Control'],
    recs: [DOC, 'Vení sin maquillaje ni cremas en la zona a revisar.', 'Traé los estudios y la lista de cremas o medicamentos que usás.'] },
  ginecologia: { nombre: 'Ginecología', tipo: 'general', motivos: ['Control anual', 'Consulta', 'Embarazo', 'Anticoncepción', 'Resultados de estudios'],
    recs: [DOC, 'Traé tus estudios anteriores (PAP, ecografías, análisis).', 'Si podés, anotá la fecha de tu última menstruación.'] },
  oftalmologia: { nombre: 'Oftalmología', tipo: 'general', motivos: ['Control de la vista', 'Receta de anteojos', 'Molestia o dolor en el ojo', 'Control'],
    recs: [DOC, 'Traé tus anteojos o lentes de contacto actuales.', 'Si te van a dilatar las pupilas, andá acompañado y no manejes.'] },
  fonoaudiologia: { nombre: 'Fonoaudiología', tipo: 'general', motivos: ['Evaluación', 'Sesión', 'Voz', 'Lenguaje', 'Audición'],
    recs: [DOC, 'Traé la orden o derivación si la tenés.', 'Cancelá o reprogramá con 24 horas de aviso.'] },
  cardiologia: { nombre: 'Cardiología', tipo: 'general', motivos: ['Control', 'Primera consulta', 'Electrocardiograma', 'Resultados de estudios', 'Apto físico'],
    recs: [DOC, 'Traé tus estudios anteriores y la lista de medicamentos.', 'Si tenés dolor en el pecho o falta de aire, no esperes el turno: andá a una guardia.'] },
  traumatologia: { nombre: 'Traumatología', tipo: 'general', motivos: ['Dolor o lesión', 'Control', 'Resultados de estudios', 'Certificado'],
    recs: [DOC, 'Traé las radiografías, resonancias y estudios que tengas.', 'Si tuviste un golpe fuerte o no podés apoyar, andá a una guardia.'] },
  otra: { nombre: 'Otra especialidad', tipo: 'general', motivos: ['Primera consulta', 'Control', 'Consulta'],
    recs: [DOC, 'Si no podés venir, cancelá el turno para que lo use otra persona.', 'Traé tus estudios anteriores si los tenés.'] }
};

/* ---------- Hora y clima (hora del celular; clima de Open-Meteo, gratis y sin claves) ---------- */
const clima = { ciudad: '', t: null, code: null, quando: 0, pidiendo: false };
const iconoClima = c => c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌦️' : '⛈️';
export function horaAhora(P) { const n = new Date(), h = pad(n.getHours()) + ':' + pad(n.getMinutes()); return fmtHora(h, P); }
export function textoClima(P) { return P && P.ciudad && clima.ciudad === P.ciudad && clima.t !== null ? iconoClima(clima.code) + ' ' + clima.t + '°' : ''; }
export function relojHtml(P) { return `<span data-reloj>${horaAhora(P)}</span>`; }
export function climaHtml(P) { return P && P.ciudad ? `<span data-clima>${textoClima(P)}</span>` : ''; }
async function pedirClima(P) {
  if (!P || !P.ciudad || clima.pidiendo) return;
  if (clima.ciudad === P.ciudad && Date.now() - clima.quando < 30 * 60000) return;
  clima.pidiendo = true;
  try {
    const g = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=5&language=es&name=' + encodeURIComponent(P.ciudad))).json();
    const l = (g.results || []).find(r => r.country_code === 'AR') || (g.results || [])[0];
    if (l) {
      const w = await (await fetch('https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code&timezone=auto&latitude=' + l.latitude + '&longitude=' + l.longitude)).json();
      if (w.current) { clima.ciudad = P.ciudad; clima.t = Math.round(w.current.temperature_2m); clima.code = w.current.weather_code; clima.quando = Date.now(); }
    }
  } catch (e) { /* sin clima: no pasa nada */ }
  clima.pidiendo = false;
}
// Mantiene al día la hora y el clima que estén en pantalla. getP devuelve el profesional actual.
export function iniciarReloj(getP) {
  const tic = () => {
    const P = getP(); document.querySelectorAll('[data-reloj]').forEach(e => { e.textContent = horaAhora(P); });
    document.querySelectorAll('[data-clima]').forEach(e => { e.textContent = textoClima(P); });
  };
  const clim = async () => { await pedirClima(getP()); tic(); };
  setInterval(tic, 15000); setInterval(clim, 10 * 60000); setTimeout(clim, 800);
  return clim;
}

/* ---------- Frase debajo del botón "Sacar turno" ---------- */
export const FRASE_DEFECTO = 'Sin registrarte ni contraseñas.';
export const TAMANOS_FRASE = { normal: ['Normal', 12], medio: ['Un poquito más grande', 14], grande: ['Grande', 17] };
export const fraseSinRegistro = P => P.frase === undefined ? FRASE_DEFECTO : P.frase;
export const tamanoFrase = P => (TAMANOS_FRASE[P.fraseTam] || TAMANOS_FRASE.medio)[1];

/* ---------- Logos chiquitos de las obras sociales ---------- */
const COLORES_OBRA = ['#2f6fd6', '#d9482b', '#15876a', '#7a4fc9', '#c94f7c', '#b7791f', '#0f7b8a', '#5c6bc0'];
export function obraLogo(P, nombre, cls) {
  const src = P && P.obrasLogos && P.obrasLogos[nombre];
  if (src) return `<span class="olg ${cls || ''}"><img src="${src}" alt=""></span>`;
  let h = 0; for (const c of String(nombre)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const ini = String(nombre).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  return `<span class="olg ${cls || ''}" style="background:${COLORES_OBRA[h % COLORES_OBRA.length]}" aria-hidden="true">${ini.replace(/[<>&]/g, '')}</span>`;
}
// Achica una imagen (dataURL) a un cuadrado de px x px para que pese poco
export function reducirImagen(src, px) {
  return new Promise((ok, mal) => {
    const i = new Image(); i.onerror = () => mal(new Error('imagen')); i.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, px, px); x.drawImage(i, 0, 0, px, px); ok(c.toDataURL('image/jpeg', 0.85));
    }; i.src = src;
  });
}

export const TITULO_DATOS = 'Completá los datos del turno';
export const tituloDatos = P => P.tituloDatos === undefined ? TITULO_DATOS : P.tituloDatos;
