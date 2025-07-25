// script.js

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const capturarBtn = document.getElementById('capturar');
const resultado = document.getElementById('resultado');
const enviarBtn = document.getElementById('enviar');
const editarBtn = document.getElementById('editar');

// Activar cámara
navigator.mediaDevices
  .getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      advanced: [{ zoom: 2.0 }],
    },
  })
  .then((stream) => {
    video.srcObject = stream;

    video.addEventListener('click', () => {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities?.focusMode?.includes('continuous')) {
        track
          .applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
          .then(() => console.log('Autofocus reactivado'))
          .catch((err) => console.warn('No se pudo aplicar autofocus:', err));
      }
    });
  })
  .catch(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => (video.srcObject = stream))
      .catch((err) => {
        mostrarToast('❌ No se pudo acceder a la cámara', 'error');
        console.error(err);
      });
  });

// Función toast
function mostrarToast(mensaje, tipo = 'ok') {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.className = 'toast mostrar' + (tipo === 'error' ? ' error' : '');

  toast.classList.remove('oculto');
  setTimeout(() => {
    toast.classList.remove('mostrar');
    setTimeout(() => toast.classList.add('oculto'), 400);
  }, 3000);
}

// Capturar imagen y hacer OCR
capturarBtn.addEventListener('click', () => {
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  mostrarPreviewDual(imageData);

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
    const value = avg > 160 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);

  capturarBtn.disabled = true;
  capturarBtn.textContent = 'Procesando...';

  Tesseract.recognize(canvas, 'eng', { logger: (m) => console.log(m) })
    .then(({ data: { text } }) => {
      resultado.value = text.trim();
      capturarBtn.disabled = false;
      capturarBtn.textContent = 'Capturar';
    })
    .catch((err) => {
      resultado.value = 'Error al procesar OCR';
      console.error(err);
      capturarBtn.disabled = false;
      capturarBtn.textContent = 'Capturar';
    });
});

// Edición manual
editarBtn.addEventListener('click', () => {
  if (resultado.hasAttribute('readonly')) {
    resultado.removeAttribute('readonly');
    resultado.focus();
    editarBtn.textContent = '✅ Bloquear edición';
  } else {
    resultado.setAttribute('readonly', true);
    editarBtn.textContent = '✏️ Editar manualmente';
  }
});

// Extraer datos OCR
function extraerDatosOCR(texto) {
  const limpiar = (str) =>
    str
      .toUpperCase()
      .replace(/[^A-Z0-9ÁÉÍÓÚÜÑ\s\-\/]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const lineas = texto.split(/\r?\n/).map(limpiar).filter(Boolean);
  const especies = [
    'LECHUGA',
    'AROMATICAS Y HOJAS',
    'ACELGA',
    'ESPINACA',
    'CANONIGO',
    'RUCULA',
    'MOSTAZA',
    'BORRAJA',
    'ESCAROLA',
    'ENDIVIA',
    'TATSOI',
    'PAK CHOI',
  ];

  let partida = '',
    lote = '',
    especie = '',
    variedad = '',
    fechas = [];

  for (const l of lineas) {
    const match = l.match(/\b\d{7}\b/);
    if (match) {
      partida = match[0];
      break;
    }
  }

  for (const l of lineas) {
    const match = l.match(/\b[A-Z0-9\-]{6,}\b/);
    if (match && match[0] !== partida) {
      lote = match[0];
      break;
    }
  }

  for (const l of lineas) {
    const match = [
      ...l.matchAll(/\b\d{2}[-\/]?\d{2}\b/g),
      ...l.matchAll(/\b\d{4}\b/g),
    ];
    for (const m of match) {
      const raw = m[0].replace('/', '-');
      const normal =
        raw.length === 4 ? raw.slice(0, 2) + '-' + raw.slice(2) : raw;
      fechas.push(normal);
    }
  }

  fechas = fechas
    .filter((f) => /^\d{2}-\d{2}$/.test(f))
    .filter((f, i, arr) => arr.indexOf(f) === i)
    .sort((a, b) => {
      const [d1, m1] = a.split('-').map(Number);
      const [d2, m2] = b.split('-').map(Number);
      return m1 !== m2 ? m1 - m2 : d1 - d2;
    });

  const fecha_siembra = fechas[0] || '';
  const fecha_carga = fechas[1] || '';

  especie = especies.find((e) => lineas.some((l) => l.includes(e))) || '';

  const claveVariedad =
    /(COGOLLO|ROMANA|ALBAHACA|VERDE|ROJA|LOLLI|ESCAROLA|ENDIVIA|A\d+)/;
  const idxVariedad = lineas.findIndex((l) => claveVariedad.test(l));
  if (idxVariedad >= 0) {
    variedad = lineas[idxVariedad].replace(/\b\d{1,4}\b/g, '').trim();
    if (!especie && idxVariedad > 0) {
      const candidata = lineas[idxVariedad - 1];
      if (
        candidata !== partida &&
        candidata !== lote &&
        !candidata.includes(partida) &&
        !candidata.includes(lote) &&
        !/\b\d{2}[-\/]?\d{2}\b/.test(candidata) &&
        !/\b\d{4,}\b/.test(candidata)
      ) {
        especie = candidata;
      }
    }
  }

  if (especie && variedad && especie === variedad) especie = '';

  return { partida, lote, especie, variedad, fecha_siembra, fecha_carga };
}

// Enviar a Google Sheets
enviarBtn.addEventListener('click', () => {
  const texto = resultado.value;
  resultado.setAttribute('readonly', true);
  editarBtn.textContent = '✏️ Editar manualmente';

  const invernadero = document.getElementById('select-invernadero').value;
  const modulo = document.getElementById('select-modulo').value;

  if (!texto || !invernadero || !modulo) {
    mostrarToast(
      '❗ Debes capturar un texto y seleccionar invernadero y módulo',
      'error'
    );
    return;
  }

  const datos = extraerDatosOCR(texto);
  const params = new URLSearchParams({
    ...datos,
    invernadero,
    modulo,
  }).toString();

  enviarBtn.disabled = true;
  enviarBtn.textContent = 'Enviando...';

  fetch(
    'https://script.google.com/macros/s/AKfycbwdAaj3-gRgFRbrzo1Oe3Vxo4fa4kXyr_8xzcpQNmlmHamjCmc9u_wJboWCz-W-9J4B/exec?' +
      params
  )
    .then((response) => {
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';
      if (response.ok) {
        mostrarToast('✅ Datos enviados correctamente');
        resultado.value = '';
      } else {
        mostrarToast('❌ Error al enviar los datos', 'error');
      }
    })
    .catch((err) => {
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';
      console.error('Error de conexión con Google Sheets:', err);
      mostrarToast('❌ Error de conexión con Sheets', 'error');
    });
});

// Vista previa monocromática
const previewCanvas = document.getElementById('preview');
const vistaPreviaBtn = document.getElementById('vista-previa');

vistaPreviaBtn.addEventListener('click', () => {
  const ctx = previewCanvas.getContext('2d');
  previewCanvas.width = video.videoWidth;
  previewCanvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, previewCanvas.width, previewCanvas.height);

  const imageData = ctx.getImageData(
    0,
    0,
    previewCanvas.width,
    previewCanvas.height
  );
  mostrarPreviewDual(imageData);

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
    const value = avg > 160 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
  previewCanvas.style.display = 'block';

  setTimeout(() => {
    previewCanvas.style.display = 'none';
  }, 5000);
});

// Previews
const canvasOriginal = document.getElementById('canvas-original');
const canvasBin = document.getElementById('canvas-bin');
const dualPreviewSection = document.querySelector('.preview-dual');

function mostrarPreviewDual(videoFrameData) {
  const w = video.videoWidth;
  const h = video.videoHeight;

  canvasOriginal.width = w;
  canvasOriginal.height = h;
  const ctxO = canvasOriginal.getContext('2d');
  ctxO.putImageData(videoFrameData, 0, 0);

  canvasBin.width = w;
  canvasBin.height = h;
  const ctxB = canvasBin.getContext('2d');
  const binData = ctxB.createImageData(w, h);
  binData.data.set(new Uint8ClampedArray(videoFrameData.data));
  const data = binData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
    const value = avg > 160 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctxB.putImageData(binData, 0, 0);
  dualPreviewSection.style.display = 'block';
}

// Coordenadas GPS invernaderos
const coordenadasInvernaderos = {
  7: { lat: 38.052052, lon: -1.054258 },
  8: { lat: 38.051676, lon: -1.053904 },
  9: { lat: 38.051114, lon: -1.053546 },
  10: { lat: 38.050512, lon: -1.053046 },
  11: { lat: 38.050154, lon: -1.052777 },
};

function distanciaEnMetros(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (x) => (x * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function detectarInvernaderoPorGPS() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      let masCercano = '';
      let minDist = Infinity;

      for (const [inv, coords] of Object.entries(coordenadasInvernaderos)) {
        const dist = distanciaEnMetros(lat, lon, coords.lat, coords.lon);
        if (dist < minDist) {
          minDist = dist;
          masCercano = inv;
        }
      }

      if (minDist <= 50) {
        document.getElementById('select-invernadero').value = masCercano;
        actualizarModulos();
      }
    },
    (err) => console.warn('No se pudo obtener ubicación:', err),
    { enableHighAccuracy: true, timeout: 5000 }
  );
}

function actualizarModulos() {
  const modulosPorInvernadero = {
    7: 5,
    8: 5,
    9: 6,
    10: 7,
    11: 7,
  };

  const selectInver = document.getElementById('select-invernadero');
  const selectModulo = document.getElementById('select-modulo');
  const selected = selectInver.value;

  selectModulo.innerHTML = '';

  if (!modulosPorInvernadero[selected]) {
    selectModulo.innerHTML =
      '<option value="">Selecciona un invernadero primero</option>';
    return;
  }

  for (let i = 1; i <= modulosPorInvernadero[selected]; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Módulo ${i}`;
    selectModulo.appendChild(opt);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document
    .getElementById('select-invernadero')
    .addEventListener('change', actualizarModulos);
  detectarInvernaderoPorGPS();
});
