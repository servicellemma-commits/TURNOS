// Ventana para acomodar el logo: mover con el dedo, agrandar/achicar, centrar y elegir forma.
// Devuelve { logo (PNG 256x256), forma: 'redondo' | 'cuadrado' } o null si se cancela.
import { esc } from './common.js';

const LADO = 260, CORTE = 210, SALIDA = 256;

export function abrirRecorte(src, formaInicial, nombre, alCerrar) {
  const img = new Image();
  img.onerror = () => alCerrar(null, 'No se pudo leer la imagen');
  img.onload = () => armar(img, formaInicial === 'cuadrado' ? 'cuadrado' : 'redondo', nombre, alCerrar);
  img.src = src;
}

function armar(img, forma, nombre, alCerrar) {
  const base = CORTE / Math.min(img.naturalWidth, img.naturalHeight); // escala mínima que cubre el recorte
  const st = { zoom: 1, x: 0, y: 0, forma };
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="rc-tit">
    <h3 id="rc-tit">Acomodá tu logo</h3>
    <p class="small muted">Arrastrá la foto con el dedo para moverla. Pellizcá o usá la barra para el tamaño.</p>
    <canvas class="rc-lienzo" width="${LADO * 2}" height="${LADO * 2}" style="width:${LADO}px;height:${LADO}px" aria-label="Foto para recortar"></canvas>
    <div class="row"><span aria-hidden="true" class="muted">−</span><input type="range" class="grow" id="rc-zoom" min="1" max="4" step="0.01" value="1" aria-label="Tamaño de la foto"><span aria-hidden="true" class="muted">+</span></div>
    <div class="grid2"><button class="btn" data-rc="centrar">Centrar</button><button class="btn" data-rc="otra">Otra foto</button></div>
    <div><p class="small muted" style="margin-bottom:6px">Forma</p><div class="grid2"><button class="chip" data-rc="redondo">Redondo</button><button class="chip" data-rc="cuadrado">Cuadrado</button></div></div>
    <div class="rc-previa band"><img alt="" class="logo sm"><div class="txt grow"><h3>${esc(nombre)}</h3><p class="sub">Así se ve en la app y en tu página</p></div></div>
    <div class="grid2"><button class="btn" data-rc="cancelar">Cancelar</button><button class="btn pri" data-rc="guardar">Guardar logo</button></div>
    <input type="file" accept="image/*" id="rc-archivo" hidden>
  </div>`;
  document.body.appendChild(fondo);
  document.body.style.overflow = 'hidden';
  const cv = fondo.querySelector('canvas'), cx = cv.getContext('2d'), zoomEl = fondo.querySelector('#rc-zoom'), previa = fondo.querySelector('.rc-previa img');

  const tam = () => ({ w: img.naturalWidth * base * st.zoom, h: img.naturalHeight * base * st.zoom });
  function limitar() { const { w, h } = tam(), mx = Math.max(0, (w - CORTE) / 2), my = Math.max(0, (h - CORTE) / 2); st.x = Math.min(mx, Math.max(-mx, st.x)); st.y = Math.min(my, Math.max(-my, st.y)); }
  function forma(c, x0, y0, l) { c.beginPath(); if (st.forma === 'cuadrado') { const r = l * 0.22; c.moveTo(x0 + r, y0); c.arcTo(x0 + l, y0, x0 + l, y0 + l, r); c.arcTo(x0 + l, y0 + l, x0, y0 + l, r); c.arcTo(x0, y0 + l, x0, y0, r); c.arcTo(x0, y0, x0 + l, y0, r); c.closePath(); } else c.arc(x0 + l / 2, y0 + l / 2, l / 2, 0, Math.PI * 2); }
  let pend = false;
  function dibujar() {
    if (pend) return; pend = true;
    requestAnimationFrame(() => {
      pend = false; limitar();
      const { w, h } = tam(), k = 2;
      cx.setTransform(k, 0, 0, k, 0, 0); cx.clearRect(0, 0, LADO, LADO);
      cx.fillStyle = '#f1f1f1'; cx.fillRect(0, 0, LADO, LADO);
      cx.drawImage(img, LADO / 2 - w / 2 + st.x, LADO / 2 - h / 2 + st.y, w, h);
      const o = (LADO - CORTE) / 2;
      cx.save(); cx.beginPath(); cx.rect(0, 0, LADO, LADO); forma(cx, o, o, CORTE); cx.fillStyle = 'rgba(0,0,0,.5)'; cx.fill('evenodd'); cx.restore();
      forma(cx, o, o, CORTE); cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.stroke();
      previa.src = salida(); previa.classList.toggle('cuadrado', st.forma === 'cuadrado');
      fondo.querySelectorAll('[data-rc="redondo"],[data-rc="cuadrado"]').forEach(b => b.classList.toggle('sel', b.dataset.rc === st.forma));
      zoomEl.value = st.zoom;
    });
  }
  function salida() {
    const c = document.createElement('canvas'); c.width = SALIDA; c.height = SALIDA; const x = c.getContext('2d');
    const f = SALIDA / CORTE, { w, h } = tam();
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, SALIDA, SALIDA);
    x.drawImage(img, (CORTE / 2 - w / 2 + st.x) * f, (CORTE / 2 - h / 2 + st.y) * f, w * f, h * f);
    return c.toDataURL('image/png');
  }
  function zoomA(z) { st.zoom = Math.min(4, Math.max(1, z)); dibujar(); }

  // Arrastrar y pellizcar
  const dedos = new Map(); let dist0 = 0, zoom0 = 1;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); dedos.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (dedos.size === 2) { const [a, b] = [...dedos.values()]; dist0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = st.zoom; } });
  cv.addEventListener('pointermove', e => {
    const p = dedos.get(e.pointerId); if (!p) return;
    if (dedos.size === 1) { st.x += e.clientX - p.x; st.y += e.clientY - p.y; }
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 2 && dist0) { const [a, b] = [...dedos.values()]; zoomA(zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / dist0); return; }
    dibujar();
  });
  const soltar = e => { dedos.delete(e.pointerId); if (dedos.size < 2) dist0 = 0; };
  cv.addEventListener('pointerup', soltar); cv.addEventListener('pointercancel', soltar);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoomA(st.zoom * (e.deltaY < 0 ? 1.08 : 0.92)); }, { passive: false });
  zoomEl.addEventListener('input', () => zoomA(Number(zoomEl.value)));

  const archivo = fondo.querySelector('#rc-archivo');
  archivo.addEventListener('change', () => { const f = archivo.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { cerrar(); abrirRecorte(r.result, st.forma, nombre, alCerrar); }; r.readAsDataURL(f); });

  let cerrado = false;
  function cerrar() { if (cerrado) return; cerrado = true; fondo.remove(); document.body.style.overflow = ''; window.removeEventListener('popstate', atras); }
  function atras() { cerrar(); alCerrar(null); }
  history.pushState({ recorte: true }, ''); window.addEventListener('popstate', atras);
  const fin = res => { cerrar(); history.back(); setTimeout(() => alCerrar(res), 0); };

  fondo.addEventListener('click', e => {
    const b = e.target.closest('[data-rc]'); if (!b) return;
    const a = b.dataset.rc;
    if (a === 'centrar') { st.x = 0; st.y = 0; dibujar(); }
    else if (a === 'redondo' || a === 'cuadrado') { st.forma = a; dibujar(); }
    else if (a === 'otra') archivo.click();
    else if (a === 'cancelar') fin(null);
    else if (a === 'guardar') fin({ logo: salida(), forma: st.forma });
  });
  document.addEventListener('keydown', function esc(e) { if (cerrado) return document.removeEventListener('keydown', esc); if (e.key === 'Escape') fin(null); });
  dibujar();
  fondo.querySelector('[data-rc="guardar"]').focus();
}
