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
export function slotsFor(P, fecha, ocupado, pasados) {
  const t = ahora(), d = parseKey(fecha), h = P.horarios[d.getDay()];
  if (!h || !h.on || (P.bloqueos || []).some(b => b.fecha === fecha)) return [];
  const out = [];
  for (let m = toMin(h.desde); m + P.duracion <= toMin(h.hasta); m += P.duracion) {
    if (!pasados && fecha === t.HOY && m <= t.min) continue;
    const hora = fromMin(m);
    out.push({ hora, t: ocupado(fecha, hora) || null });
  }
  return out;
}
export function inicios(P, fecha, n, ocupado) {
  const sl = slotsFor(P, fecha, ocupado), d = P.duracion;
  return sl.filter((s, i) => { for (let j = 0; j < n; j++) { const x = sl[i + j]; if (!x || x.t) return false; if (j && toMin(x.hora) - toMin(sl[i + j - 1].hora) !== d) return false; } return true; }).map(s => s.hora);
}
export function primerLibre(P, n, ocupado) { for (const k of proximos(14)) { const h = inicios(P, k, n, ocupado); if (h.length) return { fecha: k, hora: h[0] }; } return null; }
export function tramo(P, fecha, hora, n, ocupado) {
  const sl = slotsFor(P, fecha, ocupado), i = sl.findIndex(s => s.hora === hora), tr = sl.slice(i, i + n);
  return i >= 0 && tr.length === n && tr.every((s, j) => !s.t && (j === 0 || toMin(s.hora) - toMin(tr[j - 1].hora) === P.duracion)) ? tr.map(s => s.hora) : null;
}
export function textoHorarios(P) {
  const h = P.horarios;
  const l = [1, 2, 3, 4, 5, 6, 0].filter(d => h[d] && h[d].on).map(d => DOW[d] + ' de ' + h[d].desde + ' a ' + h[d].hasta + ' h');
  return l.length > 1 ? l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1] : (l[0] || '');
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
  menta: { nombre: 'Menta', accent: '#15876a', head: '#e1f5ee', fg: '#085041', sub: '#0f6e56', deco: () => leaf(84, 30, -30, 1.4) + leaf(104, 60, 20, 1.1) + leaf(60, 64, -60, .8) + leaf(120, 14, 40, .7) }
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
export function icono(m) {
  const t = String(m).toLowerCase();
  if (t.includes('control')) return SVG('<path d="M4 20h16M7 20v-6M12 20V8M17 20v-9"/><circle cx="12" cy="4.5" r="1.5"/>');
  if (t.includes('vacun')) return SVG('<path d="M18 3l3 3M19.5 4.5l-9 9M15 5l4 4M7 11l6 6M5 17l2 2M3 21l3-3"/>');
  if (t.includes('enferm') || t.includes('fiebre')) return SVG('<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v8"/>');
  if (t.includes('certif')) return SVG('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/>');
  return SVG('<path d="M6 3v6a4 4 0 0 0 8 0V3M10 13v3a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="12" r="2"/>');
}

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
