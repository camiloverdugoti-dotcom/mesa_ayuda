const recentCasesList = document.getElementById('recentCases');
const caseForm = document.getElementById('caseForm');
const messageBox = document.getElementById('message');
const departmentSelect = document.getElementById('department');
const caseTypeSelect = document.getElementById('case_type');
const causeFields = document.getElementById('causeFields');

const CASE_TYPES = {
  equipo_no_enciende: {
    label: 'Equipo no enciende',
    causes: [
      'No hay energía en el equipo',
      'El equipo se queda en pantalla negra',
      'No responde al encendido',
      'Falla de alimentación o batería',
      'El equipo se apaga de forma inesperada'
    ]
  },
  impresora_no_enciende: {
    label: 'Impresora no enciende',
    causes: [
      'No hay conexión al tomacorriente',
      'Cable de alimentación defectuoso',
      'La impresora no reconoce el cable USB',
      'No hay tinta o tóner disponible',
      'La impresora no responde por error de hardware'
    ]
  },
  reimpresion_de_facturas: {
    label: 'Reimpresión de facturas',
    causes: [
      'La factura se imprimió con formato incorrecto',
      'La factura se duplicó en la impresión',
      'Se perdió la información del cliente',
      'La impresora está configurada con mala hoja de estilo',
      'La factura no coincide con la serie o número'
    ]
  },
  dano_en_cableado: {
    label: 'Daño en cableado',
    causes: [
      'Cable de energía dañado',
      'Cable de red cortado o desconectado',
      'Conector suelto o en mal estado',
      'Cable de monitor o teclado defectuoso',
      'Cableado en mal estado por manipulación'
    ]
  },
  sin_servicio_de_internet: {
    label: 'Sin servicio de internet',
    causes: [
      'No hay señal Wi‑Fi en el área',
      'El router no tiene servicio activo',
      'Cable de red desconectado',
      'El proveedor presenta un corte de servicio',
      'La configuración IP o red está incorrecta'
    ]
  },
  soporte_en_correo: {
    label: 'Soporte en correo',
    causes: [
      'No puede enviar correos',
      'No puede recibir correos',
      'La contraseña del correo está vencida',
      'El servidor SMTP está configurado incorrectamente',
      'El buzón está bloqueado o saturado'
    ]
  }
};

function renderCauseFields() {
  const selectedType = caseTypeSelect.value;
  const selectedMeta = CASE_TYPES[selectedType];

  if (!selectedMeta) {
    causeFields.classList.add('hidden');
    causeFields.innerHTML = '';
    return;
  }

  causeFields.classList.remove('hidden');
  causeFields.innerHTML = selectedMeta.causes
    .map(
      (cause, index) => `
        <div class="field">
          <label for="cause_${index + 1}">Causa ${index + 1}</label>
          <select id="cause_${index + 1}" name="cause_${index + 1}" required>
            <option value="">Selecciona una opción</option>
            ${selectedMeta.causes
              .map((option) => `<option value="${option}">${option}</option>`)
              .join('')}
          </select>
        </div>
      `
    )
    .join('');
}

async function loadDepartments() {
  const res = await fetch('/api/recipients');
  const recipients = await res.json();

  Object.entries(recipients).forEach(([key, value]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${value.label} (${value.email})`;
    departmentSelect.appendChild(option);
  });
}

async function loadRecentCases() {
  const res = await fetch('/api/cases');
  const cases = await res.json();

  if (!cases.length) {
    recentCasesList.innerHTML = '<li class="case-item">No hay casos registrados todavía.</li>';
    return;
  }

  recentCasesList.innerHTML = cases
    .slice(0, 6)
    .map((item) => {
      let causesSummary = 'Sin información';

      try {
        const parsedCauses = JSON.parse(item.causes || '{}');
        const values = Object.values(parsedCauses || {}).filter(Boolean);
        causesSummary = values.length ? values.join(' | ') : 'Sin información';
      } catch (error) {
        causesSummary = 'Sin información';
      }

      return `
        <li class="case-item">
          <strong>#${item.id} - ${item.subject}</strong>
          <div>${item.name}</div>
          <div class="case-meta">Tipo: ${CASE_TYPES[item.case_type]?.label || item.case_type || 'No indicado'}</div>
          <div class="case-meta">Causas: ${causesSummary}</div>
          <div class="case-meta">${item.department} · ${item.priority}</div>
          <div class="case-meta">${new Date(item.created_at).toLocaleString('es-MX')}</div>
        </li>
      `;
    })
    .join('');
}

function showMessage(text, type = 'success') {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
  messageBox.classList.remove('hidden');
}

caseTypeSelect.addEventListener('change', renderCauseFields);

caseForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(caseForm);
  const payload = Object.fromEntries(formData.entries());
  const selectedType = payload.case_type;

  if (!selectedType) {
    showMessage('Debes seleccionar un tipo de caso.', 'error');
    return;
  }

  const selectedMeta = CASE_TYPES[selectedType];
  if (!selectedMeta) {
    showMessage('El tipo de caso seleccionado no es válido.', 'error');
    return;
  }

  const causeValues = selectedMeta.causes.map((_, index) => payload[`cause_${index + 1}`]).filter(Boolean);

  if (causeValues.length !== 5) {
    showMessage('Debes completar las 5 causas obligatorias para este tipo de caso.', 'error');
    return;
  }

  try {
    const response = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'No se pudo enviar el caso.');
    }

    showMessage(`Caso registrado correctamente. Se envió a ${result.recipientEmail}.`, 'success');
    caseForm.reset();
    renderCauseFields();
    await loadRecentCases();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

loadDepartments();
renderCauseFields();
loadRecentCases();
