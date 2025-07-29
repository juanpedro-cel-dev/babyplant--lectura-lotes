// script.js COMPLETO Y REPARADO 💚

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const capturarBtn = document.getElementById('capturar');
const resultado = document.getElementById('resultado');
const enviarBtn = document.getElementById('enviar');
const editarBtn = document.getElementById('editar');
const previewCanvas = document.getElementById('preview');
const vistaPreviaBtn = document.getElementById('vista-previa');
const canvasOriginal = document.getElementById('canvas-original');
const canvasBin = document.getElementById('canvas-bin');
const dualPreviewSection = document.querySelector('.preview-dual');
const listaHistorial = document.getElementById('lista-historial');

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
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => (video.srcObject = stream))
      .catch((err) => {
        mostrarToast('❌ No se pudo acceder a la cámara', 'error');
        console.error(err);
      });
  });

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

function actualizarModulos() {
  const modulosPorInvernadero = { 7: 5, 8: 5, 9: 6, 10: 7, 11: 7 };
  const selectInver = document.getElementById('select-invernadero');
  const selectModulo = document.getElementById('select-modulo');
  const selected = selectInver.value;
  selectModulo.innerHTML = '';
  if (!modulosPorInvernadero[selected]) {
    selectModulo.innerHTML = '<option value="">Selecciona un invernadero primero</option>';
    return;
  }
  for (let i = 1; i <= modulosPorInvernadero[selected]; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Módulo ${i}`;
    selectModulo.appendChild(opt);
  }
}

const invernaderos = {
  7: {
    nombre: "Invernadero 7",
    poligono: turf.polygon([[ 
      [-1.054376, 38.051755],
      [-1.053861, 38.052049],
      [-1.054656, 38.052064],
      [-1.054140, 38.052350],
      [-1.054376, 38.051755]
    ]])
  },
  8: {
    nombre: "Invernadero 8",
    poligono: turf.polygon([[ 
      [-1.053931, 38.051257],
      [-1.053498, 38.051497],
      [-1.054376, 38.051755],
      [-1.053861, 38.052049],
      [-1.053931, 38.051257]
    ]])
  },
  9: {
    nombre: "Invernadero 9",
    poligono: turf.polygon([[ 
      [-1.053553, 38.050713],
      [-1.053069, 38.050384],
      [-1.054003, 38.051213],
      [-1.053498, 38.051497],
      [-1.053553, 38.050713]
    ]])
  },
  10: {
    nombre: "Invernadero 10",
    poligono: turf.polygon([[ 
      [-1.052426, 38.050114],
      [-1.052608, 38.050114],
      [-1.053470, 38.050495],
      [-1.053397, 38.050535],
      [-1.053553, 38.050713],
      [-1.053113, 38.050959],
      [-1.052426, 38.050114]
    ]])
  },
  11: {
    nombre: "Invernadero 11",
    poligono: turf.polygon([[ 
      [-1.052411, 38.050179],
      [-1.052426, 38.049895],
      [-1.053123, 38.050114],
      [-1.052608, 38.050114],
      [-1.052411, 38.050179]
    ]])
  }
};

function detectarInvernaderoPorGPS() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const punto = turf.point([pos.coords.longitude, pos.coords.latitude]);
      let detectado = false;
      for (const [id, { poligono }] of Object.entries(invernaderos)) {
        if (turf.booleanPointInPolygon(punto, poligono)) {
          document.getElementById('select-invernadero').value = id;
          actualizarModulos();
          detectado = true;
          break;
        }
      }
      if (!detectado) {
  mostrarToast('📍 Ubicación no detectada. Selecciona manualmente.', 'error');
  const select = document.getElementById('select-invernadero');
  const valor = select.value;
  select.value = "";
  setTimeout(() => {
    select.value = valor;
    actualizarModulos();
  }, 50);
}
    },
    (err) => {
      console.warn('No se pudo obtener ubicación:', err);
      mostrarToast('📍 Ubicación no detectada. Selecciona manualmente.', 'error');
    },
    { enableHighAccuracy: true, timeout: 5000 }
  );
}

const btnProbar = document.getElementById('probar-conexion');

btnProbar?.addEventListener('click', () => {
  mostrarToast('⏳ Comprobando conexión...');
  fetch('https://script.google.com/macros/s/AKfycbygR4yyd2XVwHmJCp_BrUiQPm4a3_ao0zu-WQ43PMmuoETjQYnWjVpKTP3smgex3Zjv/exec?prueba=1')
    .then((res) => {
      if (res.ok) {
        mostrarToast('✅ Conexión con Sheets verificada');
      } else {
        mostrarToast('⚠️ Conectado, pero hubo un error', 'error');
      }
    })
    .catch(() => {
      mostrarToast('❌ Sin conexión con Google Sheets', 'error');
    });
});

window.addEventListener('load', () => {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('desaparecer');
    setTimeout(() => splash.remove(), 4000);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('select-invernadero').addEventListener('change', actualizarModulos);
  detectarInvernaderoPorGPS();
  mostrarHistorial();
});

// OCR captura
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

// Vista previa
vistaPreviaBtn.addEventListener('click', () => {
  const ctx = previewCanvas.getContext('2d');
  previewCanvas.width = video.videoWidth;
  previewCanvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, previewCanvas.width, previewCanvas.height);
  const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
  mostrarPreviewDual(imageData);
  previewCanvas.style.display = 'block';
  setTimeout(() => previewCanvas.style.display = 'none', 5000);
});

function mostrarPreviewDual(data) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  canvasOriginal.width = w;
  canvasOriginal.height = h;
  canvasOriginal.getContext('2d').putImageData(data, 0, 0);
  canvasBin.width = w;
  canvasBin.height = h;
  const binData = new ImageData(new Uint8ClampedArray(data.data), w, h);
  for (let i = 0; i < binData.data.length; i += 4) {
    const avg = 0.3 * binData.data[i] + 0.59 * binData.data[i + 1] + 0.11 * binData.data[i + 2];
    const value = avg > 160 ? 255 : 0;
    binData.data[i] = binData.data[i + 1] = binData.data[i + 2] = value;
  }
  canvasBin.getContext('2d').putImageData(binData, 0, 0);
  dualPreviewSection.style.display = 'block';
}

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

enviarBtn.addEventListener('click', () => {
  const texto = resultado.value;
  const invernadero = document.getElementById('select-invernadero').value;
  const modulo = document.getElementById('select-modulo').value;
  if (!texto || !invernadero || !modulo) {
    mostrarToast('❗ Debes capturar un texto y seleccionar invernadero y módulo', 'error');
    return;
  }
  resultado.setAttribute('readonly', true);
  editarBtn.textContent = '✏️ Editar manualmente';
  const datos = extraerDatosOCR(texto);
  const params = new URLSearchParams({ ...datos, invernadero, modulo }).toString();
  enviarBtn.disabled = true;
  enviarBtn.textContent = 'Enviando...';
  fetch('https://script.google.com/macros/s/AKfycbygR4yyd2XVwHmJCp_BrUiQPm4a3_ao0zu-WQ43PMmuoETjQYnWjVpKTP3smgex3Zjv/exec?' + params)
    .then((response) => {
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';
      if (response.ok) {
        mostrarToast('✅ Datos enviados correctamente');
        guardarEnHistorial({ ...datos, invernadero, modulo, fecha: new Date().toLocaleString('es-ES') });
        resultado.value = '';
      } else {
        mostrarToast('❌ Error al enviar los datos', 'error');
      }
    })
    .catch((err) => {
      console.error(err);
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';
      mostrarToast('❌ Error de conexión con Sheets', 'error');
    });
});

function guardarEnHistorial(dato) {
  const historial = JSON.parse(localStorage.getItem('babyplant_historial')) || [];
  historial.unshift(dato);
  if (historial.length > 10) historial.pop();
  localStorage.setItem('babyplant_historial', JSON.stringify(historial));
  mostrarHistorial();
}

function mostrarHistorial() {
  if (!listaHistorial) return;
  const historial = JSON.parse(localStorage.getItem('babyplant_historial')) || [];
  listaHistorial.innerHTML = '';
  historial.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `🕒 <b>${item.fecha}</b> — 🧬 ${item.variedad} | 🌱 ${item.especie} | 🔢 ${item.lote} | 📦 ${item.partida} | 🏡 ${item.invernadero}-${item.modulo}`;
    listaHistorial.appendChild(li);
  });
}

function extraerDatosOCR(texto) {
  const limpiar = (str) => str.toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÜÑ\s\-\/]/g, '').replace(/\s+/g, ' ').trim();
  const lineas = texto.split(/\r?\n/).map(limpiar).filter(Boolean);
  const especies = ['LECHUGA','AROMATICAS Y HOJAS','ACELGA','ESPINACA','CANONIGO','RUCULA','MOSTAZA','BORRAJA','ESCAROLA','ENDIVIA','TATSOI','PAK CHOI'];
  let partida = '', lote = '', especie = '', variedad = '', fechas = [];
  for (const l of lineas) {
    const match = l.match(/\b\d{7}\b/);
    if (match) { partida = match[0]; break; }
  }
  for (const l of lineas) {
    const match = l.match(/\b[A-Z0-9\-]{6,}\b/);
    if (match && match[0] !== partida) { lote = match[0]; break; }
  }
  for (const l of lineas) {
    const match = [...l.matchAll(/\b\d{2}[-\/]?\d{2}\b/g), ...l.matchAll(/\b\d{4}\b/g)];
    for (const m of match) {
      const raw = m[0].replace('/', '-');
      const normal = raw.length === 4 ? raw.slice(0, 2) + '-' + raw.slice(2) : raw;
      fechas.push(normal);
    }
  }
  fechas = fechas.filter((f) => /^\d{2}-\d{2}$/.test(f)).filter((f, i, arr) => arr.indexOf(f) === i).sort((a, b) => {
    const [d1, m1] = a.split('-').map(Number);
    const [d2, m2] = b.split('-').map(Number);
    return m1 !== m2 ? m1 - m2 : d1 - d2;
  });
  const fecha_siembra = fechas[0] || '';
  const fecha_carga = fechas[1] || '';
  especie = especies.find((e) => lineas.some((l) => l.includes(e))) || '';
  const claveVariedad = /(COGOLLO|ROMANA|ALBAHACA|VERDE|ROJA|LOLLI|ESCAROLA|ENDIVIA|A\d+)/;
  const idxVariedad = lineas.findIndex((l) => claveVariedad.test(l));
  if (idxVariedad >= 0) {
    variedad = lineas[idxVariedad].replace(/\b\d{1,4}\b/g, '').trim();
    if (!especie && idxVariedad > 0) {
      const candidata = lineas[idxVariedad - 1];
      if (candidata !== partida && candidata !== lote && !candidata.includes(partida) && !candidata.includes(lote) && !/\b\d{2}[-\/]?\d{2}\b/.test(candidata) && !/\b\d{4,}\b/.test(candidata)) {
        especie = candidata;
      }
    }
  }
  if (especie && variedad && especie === variedad) especie = '';
  return { partida, lote, especie, variedad, fecha_siembra, fecha_carga };
}

