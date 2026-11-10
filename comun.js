/* Funciones comunes – Votación electrónica QR · NSM 2027 */
(function () {
  'use strict';

  async function api(accion, datos, intentos) {
    intentos = intentos || 1;
    const url = window.WEBAPP_URL;
    if (!url || url.indexOf('PEGAR_AQUI') === 0) {
      throw Object.assign(new Error('Falta configurar WEBAPP_URL en config.js'), { codigo: 'CONFIG' });
    }
    let ultimoError;
    for (let i = 0; i < intentos; i++) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(Object.assign({ accion: accion }, datos || {})),
          redirect: 'follow'
        });
        const j = await r.json();
        if (!j.ok) throw Object.assign(new Error(j.error || 'Error'), { codigo: j.codigo || 'ERROR', servidor: true });
        return j;
      } catch (e) {
        if (e.servidor) throw e;
        ultimoError = Object.assign(new Error('Sin conexión con el servidor. Verifique el internet.'), { codigo: 'RED' });
        if (i < intentos - 1) await esperar(1200 * (i + 1));
      }
    }
    throw ultimoError;
  }

  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const almacen = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } }
  };

  function gradoTexto(g) { return g ? g + '.° grado' : 'sin grado'; }

  function toast(msg, tipo) {
    let c = document.getElementById('toasts');
    if (!c) { c = document.createElement('div'); c.id = 'toasts'; document.body.appendChild(c); }
    const t = document.createElement('div');
    t.className = 'toast ' + (tipo || '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(function () { t.classList.add('fuera'); }, 3500);
    setTimeout(function () { t.remove(); }, 4000);
  }

  // Reduce una imagen a máx. 320 px y la convierte en dataURL de menos de ~45 000 caracteres
  function imagenADataURL(archivo) {
    return new Promise(function (resolve, reject) {
      const lector = new FileReader();
      lector.onerror = function () { reject(new Error('No se pudo leer la imagen.')); };
      lector.onload = function () {
        const img = new Image();
        img.onerror = function () { reject(new Error('El archivo no es una imagen válida.')); };
        img.onload = function () {
          let lado = 320;
          for (let intento = 0; intento < 6; intento++) {
            const k = Math.min(1, lado / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * k));
            const h = Math.max(1, Math.round(img.height * k));
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            const cx = cv.getContext('2d');
            cx.drawImage(img, 0, 0, w, h);
            let url = cv.toDataURL('image/png');
            if (url.length > 45000) {
              const cv2 = document.createElement('canvas');
              cv2.width = w; cv2.height = h;
              const c2 = cv2.getContext('2d');
              c2.fillStyle = '#ffffff'; c2.fillRect(0, 0, w, h); c2.drawImage(cv, 0, 0);
              for (let q = 0.9; q >= 0.5 && url.length > 45000; q -= 0.1) url = cv2.toDataURL('image/jpeg', q);
            }
            if (url.length <= 45000) return resolve(url);
            lado = Math.round(lado * 0.8);
          }
          reject(new Error('La imagen es demasiado grande.'));
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  }

  function pitido(ok) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      pitido.ctx = pitido.ctx || new Ctx();
      const c = pitido.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = ok ? 1046 : 220;
      o.type = ok ? 'sine' : 'square';
      g.gain.setValueAtTime(0.15, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (ok ? 0.18 : 0.45));
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + (ok ? 0.2 : 0.5));
    } catch (e) { /* sin audio */ }
  }

  function simboloHTML(lista, clase) {
    if (lista.simbolo) return '<img class="' + (clase || 'simbolo') + '" src="' + esc(lista.simbolo) + '" alt="Símbolo de la lista ' + esc(lista.numero) + '">';
    return '<div class="' + (clase || 'simbolo') + ' sin-simbolo" style="background:' + esc(lista.color || '#1d3f72') + '">' + esc(lista.numero) + '</div>';
  }

  window.NSM = { api: api, esc: esc, almacen: almacen, gradoTexto: gradoTexto, toast: toast, imagenADataURL: imagenADataURL, pitido: pitido, esperar: esperar, simboloHTML: simboloHTML };
})();
