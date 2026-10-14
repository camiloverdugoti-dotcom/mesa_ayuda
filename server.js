require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');

fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(path.join(dataDir, 'helpdesk.db'));

const RECIPIENTS = {
  soporte: { label: 'Soporte IT', email: process.env.MAIL_SUPPORT || 'brayanverdugo274@gmail.com' },
  rrhh: { label: 'Recursos Humanos', email: process.env.MAIL_RRHH || 'brayanverdugo274@gmail.com' },
  finanzas: { label: 'Finanzas', email: process.env.MAIL_FINANZAS || 'brayanverdugo274@gmail.com' },
  logistica: { label: 'Logística', email: process.env.MAIL_LOGISTICA || 'brayanverdugo274@gmail.com' },
  general: { label: 'Mesa de ayuda', email: process.env.MAIL_GENERAL || 'brayanverdugo274@gmail.com' }
};

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

function normalizeCaseId(value) {
  return String(value || '').trim();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
}

function getDepartmentMeta(department) {
  const key = normalizeCaseId(department);
  return RECIPIENTS[key] || RECIPIENTS.general;
}

function normalizeCaseType(value) {
  return String(value || '').trim();
}

function getCaseTypeMeta(caseType) {
  const key = normalizeCaseType(caseType);
  return CASE_TYPES[key] || CASE_TYPES.equipo_no_enciende;
}

function validateCaseCauses(caseType, causes) {
  const typeMeta = getCaseTypeMeta(caseType);
  const validCauses = new Set(typeMeta.causes);

  for (const cause of Object.values(causes || {})) {
    if (!cause || !validCauses.has(cause)) {
      return false;
    }
  }

  return Object.keys(causes || {}).length === 5;
}

async function sendCaseEmail(caseData) {
  const recipientEmail = caseData.recipient_email || getDepartmentMeta(caseData.department).email;

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT || 587),
    secure: Number(process.env.MAIL_PORT || 587) === 465,
    auth:
      process.env.MAIL_USER && process.env.MAIL_PASS
        ? {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
          }
        : undefined
  });

  const mailOptions = {
    from: process.env.MAIL_FROM || process.env.MAIL_USER || 'Mesa de ayuda <mesa@localhost>',
    to: recipientEmail,
    subject: `[Caso #${caseData.id}] ${caseData.subject}`,
    text: `
      Caso: #${caseData.id}
      Solicitante: ${caseData.name}
      Correo: ${caseData.email}
      Departamento: ${getDepartmentMeta(caseData.department).label}
      Asunto: ${caseData.subject}
      Prioridad: ${caseData.priority}

      Descripción:
      ${caseData.description}
    `,
    html: `
      <h2>Caso #${caseData.id}</h2>
      <p><strong>Solicitante:</strong> ${caseData.name}</p>
      <p><strong>Correo:</strong> ${caseData.email}</p>
      <p><strong>Departamento:</strong> ${getDepartmentMeta(caseData.department).label}</p>
      <p><strong>Asunto:</strong> ${caseData.subject}</p>
      <p><strong>Prioridad:</strong> ${caseData.priority}</p>
      <p><strong>Descripción:</strong></p>
      <p>${caseData.description.replace(/\n/g, '<br>')}</p>
    `
  };

  try {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.log(`[EMAIL MOCK] Caso #${caseData.id} enviado a: ${recipientEmail}`);
      return { messageId: `mock-${caseData.id}`, preview: recipientEmail };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a ${recipientEmail}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error al enviar correo:', error.message);
    return { error: error.message };
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/recipients', (req, res) => {
  res.json(RECIPIENTS);
});

app.get('/api/cases', (req, res) => {
  db.all(
    'SELECT id, name, email, department, recipient_email, case_type, causes, subject, description, priority, status, created_at FROM cases ORDER BY created_at DESC LIMIT 20',
    [],
    (err, rows) => {
      if (err) {
        console.error('Error consultando casos:', err.message);
        return res.status(500).json({ error: 'No se pudieron consultar los casos' });
      }

      res.json(rows);
    }
  );
});

app.post('/api/cases', async (req, res) => {
  const { name, email, department, subject, description, priority, recipientEmail, case_type, cause_1, cause_2, cause_3, cause_4, cause_5 } = req.body;

  if (!name || !email || !department || !subject || !description || !case_type) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'El correo del solicitante no es válido.' });
  }

  const causes = {
    cause_1: String(cause_1 || '').trim(),
    cause_2: String(cause_2 || '').trim(),
    cause_3: String(cause_3 || '').trim(),
    cause_4: String(cause_4 || '').trim(),
    cause_5: String(cause_5 || '').trim()
  };

  const missingCauses = Object.entries(causes).filter(([, value]) => !value);

  if (missingCauses.length > 0) {
    return res.status(400).json({ error: 'Debes completar las 5 causas del caso seleccionando una opción en cada campo.' });
  }

  if (!validateCaseCauses(case_type, causes)) {
    return res.status(400).json({ error: 'Las causas seleccionadas no corresponden al tipo de caso indicado.' });
  }

  const finalDepartment = getDepartmentMeta(department).label ? department : 'general';
  const selectedDepartment = getDepartmentMeta(finalDepartment);
  const finalRecipient = recipientEmail && isValidEmail(recipientEmail) ? recipientEmail : selectedDepartment.email;
  const finalCaseType = getCaseTypeMeta(case_type).label ? case_type : 'equipo_no_enciende';
  const causesText = JSON.stringify(causes);

  const newCase = {
    name: String(name).trim(),
    email: String(email).trim(),
    department: finalDepartment,
    case_type: finalCaseType,
    causes: causesText,
    subject: String(subject).trim(),
    description: String(description).trim(),
    priority: String(priority || 'media').trim(),
    recipient_email: finalRecipient,
    status: 'nuevo'
  };

  console.log('DEBUG newCase:', newCase);

  db.run(
    `INSERT INTO cases (name, email, department, recipient_email, case_type, causes, subject, description, priority, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      newCase.name,
      newCase.email,
      newCase.department,
      newCase.recipient_email,
      newCase.case_type,
      newCase.causes,
      newCase.subject,
      newCase.description,
      newCase.priority,
      newCase.status
    ],
    async function (err) {
      if (err) {
        console.error('Error guardando caso:', err.message);
        return res.status(500).json({ error: 'No se pudo guardar el caso.' });
      }

      const savedCase = {
        id: this.lastID,
        ...newCase,
        created_at: new Date().toISOString()
      };

      const emailResult = await sendCaseEmail(savedCase);

      return res.status(201).json({
        success: true,
        case: savedCase,
        email: emailResult,
        recipientEmail: finalRecipient
      });
    }
  );
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function ensureCaseColumns() {
  db.all('PRAGMA table_info(cases)', (err, columns) => {
    if (err) {
      console.error('No se pudo consultar la estructura de la tabla cases:', err.message);
      return;
    }

    if (!columns || columns.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS cases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          department TEXT NOT NULL,
          recipient_email TEXT NOT NULL,
          case_type TEXT DEFAULT 'equipo_no_enciende',
          causes TEXT,
          subject TEXT NOT NULL,
          description TEXT NOT NULL,
          priority TEXT DEFAULT 'media',
          status TEXT DEFAULT 'nuevo',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return;
    }

    const existingColumns = new Set(columns.map((column) => column.name));

    if (!existingColumns.has('case_type')) {
      db.run("ALTER TABLE cases ADD COLUMN case_type TEXT DEFAULT 'equipo_no_enciende'");
    }

    if (!existingColumns.has('causes')) {
      db.run('ALTER TABLE cases ADD COLUMN causes TEXT');
    }
  });
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      department TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      case_type TEXT DEFAULT 'equipo_no_enciende',
      causes TEXT,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'media',
      status TEXT DEFAULT 'nuevo',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  ensureCaseColumns();
});

app.listen(PORT, () => {
  console.log(`Mesa de ayuda iniciada en http://localhost:${PORT}`);
  console.log('Destinatarios configurados:', Object.fromEntries(Object.entries(RECIPIENTS).map(([key, value]) => [key, value.email])));
});
