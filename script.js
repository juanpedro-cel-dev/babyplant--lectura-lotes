const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const capturarBtn = document.getElementById('capturar');
const resultado = document.getElementById('resultado');
const enviarBtn = document.getElementById('enviar');
const editarBtn = document.getElementById('editar');

// 🟢 Activar cámara trasera con zoom digital y reenfoque táctil
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

    // 👆 Reenfoque por click si la cámara lo soporta
    video.addEventListener('click', () => {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities?.focusMode?.includes('continuous')) {
        track
          .applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
          .then(() => console.log('🔍 Autofocus reactivado'))
          .catch((err) =>
            console.warn('⚠️ No se pudo aplicar autofocus:', err)
          );
      }
    });
  })
  .catch(() =>
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => (video.srcObject = stream))
      .catch((err) => {
        alert('❌ No se pudo acceder a ninguna cámara');
        console.error(err);
      })
  );

// 📸 Capturar imagen y hacer OCR con binarización
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

// ✏️ Edición manual
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

// 🧠 Extraer datos con limpieza avanzada
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
      const [d1, m1] = a.split('-').map(Number),
        [d2, m2] = b.split('-').map(Number);
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

// 📤 Enviar a Google Sheets
enviarBtn.addEventListener('click', () => {
  const texto = resultado.value;
  resultado.setAttribute('readonly', true);
  editarBtn.textContent = '✏️ Editar manualmente';

  if (!texto) {
    alert('❗ No hay texto OCR para enviar');
    return;
  }

  const datos = extraerDatosOCR(texto);
  const params = new URLSearchParams(datos).toString();

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
        alert('✅ Datos enviados correctamente');
        resultado.value = '';
      } else {
        alert('❌ Error al enviar los datos');
      }
    })
    .catch((err) => {
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';
      console.error('Error de conexión con Google Sheets:', err);
    });
});

const previewCanvas = document.getElementById('preview');
const vistaPreviaBtn = document.getElementById('vista-previa');

// 🎞️ Vista previa monocromática sin OCR
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

// 🎬 Mostrar imagen original y binarizada en sección aparte
const canvasOriginal = document.getElementById('canvas-original');
const canvasBin = document.getElementById('canvas-bin');
const dualPreviewSection = document.querySelector('.preview-dual');

function mostrarPreviewDual(videoFrameData) {
  const w = video.videoWidth;
  const h = video.videoHeight;

  // Original
  canvasOriginal.width = w;
  canvasOriginal.height = h;
  const ctxO = canvasOriginal.getContext('2d');
  ctxO.putImageData(videoFrameData, 0, 0);

  // Binarizada
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
