require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { faker } = require('@faker-js/faker/locale/es');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// ── Credenciales del administrador ────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SCBA_Admin_Profe_2026_#Sec';

// Token de sesión dinámico: se genera al iniciar el servidor (no es fijo)
let ADMIN_TOKEN = crypto.randomBytes(32).toString('hex');

// ── Rate Limiting (sin dependencias externas) ─────────────────────────────────
const loginAttempts = new Map();
const RATE_LIMIT_MAX    = 5;        // intentos máximos
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos en ms

function rateLimitLogin(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (entry) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
      loginAttempts.set(ip, { count: 1, firstAttempt: now });
      return next();
    }
    if (entry.count >= RATE_LIMIT_MAX) {
      const waitMin = Math.ceil((RATE_LIMIT_WINDOW - (now - entry.firstAttempt)) / 60000);
      return res.status(429).json({
        success: false,
        error: `Demasiados intentos fallidos. Intente nuevamente en ${waitMin} minuto(s).`
      });
    }
    entry.count++;
  } else {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  }
  next();
}

function resetRateLimit(ip) {
  loginAttempts.delete(ip);
}

// ── Sanitización de inputs ────────────────────────────────────────────────────
function sanitizeString(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .slice(0, maxLen)
    .trim();
}

function sanitizeBody(obj, fields) {
  const clean = {};
  fields.forEach(({ key, max }) => {
    clean[key] = sanitizeString(obj[key] || '', max || 500);
  });
  return clean;
}

// ── Middleware de seguridad HTTP ──────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.removeHeader('X-Powered-By');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';"
  );
  next();
});

// ── Bloquear acceso directo a archivos sensibles ──────────────────────────────
app.use((req, res, next) => {
  const blocked = ['/db.json', '/package.json', '/package-lock.json', '/server.js', '/.env', '/prisma'];
  const urlPath = req.path.toLowerCase();
  if (blocked.some(b => urlPath === b || urlPath.startsWith(b))) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const DEPARTAMENTOS = [
  'AZUL', 'BAHIA BLANCA', 'DOLORES', 'GENERAL SAN MARTIN', 'JUNIN', 
  'LA MATANZA', 'LA PLATA', 'LOMAS DE ZAMORA', 'MAR DEL PLATA', 
  'MERCEDES', 'MORENO - GENERAL RODRIGUEZ', 'MORON', 'NECOCHEA', 
  'PERGAMINO', 'QUILMES', 'SAN ISIDRO', 'SAN NICOLAS', 'TRENQUE LAUQUEN', 
  'ZARATE - CAMPANA'
];

const FUEROS = [
  'Civil y Comercial',
  'Contencioso Administrativo',
  'Familia',
  'Laboral',
  'Paz',
  'Penal'
];

const OBJETOS = [
  'ACCION CONFESORIA (Código: 58)',
  'ACCION CONTRA LEGATARIO (Código: 610)',
  'ACCION DE COLACION (Código: 3)',
  'ACCION DE COMPLEMENTO DE LA PARTICION (Código: 611)',
  'ACCION DE DESLINDE (Código: 601)',
  'ACCION DE DESPOJO (Código: 642)',
  'ACCION DE ENTREGA DE LA LEGITIMA (Código: 612)',
  'ACCION DE HABEAS DATA (Código: 281)',
  'ACCION DE MANTENER TENENCIA O POSESION (Código: 643)',
  'ACCION DE REAJUSTE (Código: 613)',
  'ACCION DE REDUCCION (Código: 78)',
  'ACCION DE REEMBOLSO (Código: 614)',
  'ACCION DE RESTITUCION (Código: 127)',
  'ACCION DE SECUESTRO (ART. 39 LEY 12962) (Código: 296)',
  'ACCION DECLARATIVA (SUMARIO) (Código: 128)',
  'DAÑOS Y PERJ. AUTOM. C/LES. O MUERTE (EXC. ESTADO) (Código: 99)',
  'DAÑOS Y PERJUICIOS (Código: 100)',
  'ALIMENTOS (Código: 5)',
  'DESPIDO (Código: 22)'
];

const ROLES_PROCESALES = [
  'ACTOR',
  'ACTOR RECONVENIDO',
  'ADOPTADO',
  'AUSENTE',
  'CAUSANTE',
  'CONCURSADO',
  'DEMANDADO / CODEMANDADO',
  'DEMANDADO RECONVINIENTE',
  'DENUNCIADO / A',
  'DENUNCIANTE',
  'DENUNCIANTE/VICTIMA',
  'INHABILITADO',
  'PRES. PERSONA CAP. RESTRINGIDA',
  'PRESUMTO QUEBRADO',
  'QUERELLANTE',
  'TUTELADO'
];

const TIPOS_PERSONA = [
  'Física',
  'Jurídica',
  'No Informado',
  'Organismo Del Estado'
];

// Middleware de autenticación básica para el administrador
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: 'No autorizado. Token de administrador inválido o inexistente.' });
  }
}

// Check admin por header o query (para descargas como excel)
function checkAdminOrToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`) {
    return next();
  }
  if (req.query.token === ADMIN_TOKEN) {
    return next();
  }
  res.status(401).json({ error: 'No autorizado. Token de administrador inválido o inexistente.' });
}

/* ==================== ENDPOINTS DE LA API (PostgreSQL + Prisma) ==================== */

// 1. Enviar una nueva queja o presentación (Alumno)
app.post('/api/complaints', async (req, res) => {
  try {
    const s = sanitizeBody(req.body, [
      { key: 'title', max: 300 },
      { key: 'content', max: 5000 },
      { key: 'type', max: 100 },
      { key: 'sender', max: 200 },
      { key: 'organism', max: 300 },
      { key: 'causaNumber', max: 100 }
    ]);

    const senderFinal   = s.sender || 'Alumno Anónimo';
    const titleFinal    = s.title  || `Presentación de ${senderFinal}`;
    const contentFinal  = s.content || '(Sin texto en el escrito)';

    const newComplaint = await prisma.complaint.create({
      data: {
        id:          Date.now().toString() + '-' + Math.floor(Math.random() * 1000),
        title:       titleFinal,
        content:     contentFinal,
        type:        s.type        || 'Presentación',
        sender:      senderFinal,
        organism:    s.organism    || 'No especificado',
        causaNumber: s.causaNumber || 'No especificado',
        createdAt:   new Date().toISOString(),
        status:      'Pendiente',
        feedback:    '',
        grade:       ''
      }
    });

    console.log(`Nueva presentación registrada. ID: ${newComplaint.id} - Remitente: ${newComplaint.sender}`);
    res.status(201).json({ success: true, message: 'Presentación registrada con éxito.', data: newComplaint });
  } catch (error) {
    console.error('Error al registrar presentación:', error);
    res.status(500).json({ error: 'Error al registrar la presentación en el sistema.' });
  }
});

// 1b. Obtener presentaciones enviadas (Alumnos / Público)
app.get('/api/complaints', async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany();
    const sorted = complaints.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(sorted);
  } catch (error) {
    console.error('Error al consultar presentaciones:', error);
    res.status(500).json({ error: 'Error al consultar las presentaciones.' });
  }
});

// 2. Login del Alumno
app.post('/api/student/login', rateLimitLogin, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const emailRaw = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const passwordRaw = typeof req.body.password === 'string' ? req.body.password : '';

    if (!emailRaw && !passwordRaw) {
      return res.status(400).json({ success: false, error: 'Debe ingresar el domicilio electrónico y la contraseña.' });
    }
    if (!emailRaw) {
      return res.status(400).json({ success: false, error: 'Debe ingresar el domicilio electrónico.' });
    }
    if (!passwordRaw) {
      return res.status(400).json({ success: false, error: 'Debe ingresar la contraseña.' });
    }

    const username = emailRaw.split('@')[0].toLowerCase();
    const students = await prisma.alumno.findMany();
    const student = students.find(s => 
      (s.email || '').toLowerCase() === username || 
      (s.email || '').toLowerCase() === emailRaw.toLowerCase()
    );

    if (!student) {
      return res.status(401).json({ success: false, error: 'Domicilio electrónico incorrecto.' });
    }

    if (student.disabled) {
      return res.status(403).json({ success: false, error: 'Tu cuenta está deshabilitada. Contactá al docente para rehabilitarla.' });
    }

    if (student.password !== passwordRaw) {
      return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
    }

    resetRateLimit(ip);

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const loginTime = `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;

    console.log(`Alumno conectado: ${student.name} - IP: ${ip} - Hora: ${loginTime}`);
    return res.json({
      success: true,
      name: student.name,
      loginTime: loginTime
    });
  } catch (error) {
    console.error('Error al iniciar sesión de alumno:', error);
    res.status(500).json({ success: false, error: 'Error interno en la autenticación.' });
  }
});

// 3. Login del Profesor (Admin)
app.post('/api/admin/login', rateLimitLogin, (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const passwordRaw = typeof req.body.password === 'string' ? req.body.password : '';

  if (passwordRaw === ADMIN_PASSWORD) {
    resetRateLimit(ip);
    console.log(`Admin login exitoso desde IP: ${ip}`);
    return res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    console.warn(`Admin login fallido desde IP: ${ip}`);
    return res.status(401).json({ success: false, error: 'Contraseña incorrecta. Inténtelo de nuevo.' });
  }
});

// 4. Obtener la lista de quejas/presentaciones recibidas (Profesor)
app.get('/api/admin/complaints', requireAdminAuth, async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany();
    const sorted = complaints.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(sorted);
  } catch (error) {
    console.error('Error al obtener quejas:', error);
    res.status(500).json({ error: 'Error al consultar las presentaciones.' });
  }
});

// 4b. Guardar evaluación/corrección de una presentación (Profesor)
app.patch('/api/admin/complaints/:id/feedback', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  const { status, feedback, grade } = req.body;
  try {
    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: status || 'Corregido',
        feedback: feedback !== undefined ? feedback : '',
        grade: grade !== undefined ? grade : ''
      }
    });
    console.log(`Presentación ID ${id} evaluada por el profesor. Estado: ${updated.status}`);
    res.json({ success: true, message: 'Evaluación guardada correctamente.', data: updated });
  } catch (error) {
    console.error('Error al evaluar presentación:', error);
    res.status(404).json({ error: 'No se pudo guardar la evaluación.' });
  }
});

// 5. Eliminar una queja (Profesor)
app.delete('/api/admin/complaints/:id', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.complaint.delete({ where: { id } });
    console.log(`Queja con ID: ${id} eliminada por el profesor.`);
    res.json({ success: true, message: 'Queja eliminada correctamente.' });
  } catch (error) {
    res.status(404).json({ error: 'La queja no existe.' });
  }
});

// 5b. Registrar un Inicio de Causa (Alumno)
app.post('/api/inicios-causa', async (req, res) => {
  try {
    const s = sanitizeBody(req.body, [
      { key: 'fuero',              max: 100 },
      { key: 'objeto',             max: 200 },
      { key: 'localidad',          max: 100 },
      { key: 'monto',              max: 50  },
      { key: 'radicacion',         max: 100 },
      { key: 'organismo',          max: 300 },
      { key: 'titulo',             max: 300 },
      { key: 'textoPresentacion',  max: 10000 },
      { key: 'tipo',               max: 100 },
      { key: 'sender',             max: 200 }
    ]);
    const intervinientes = Array.isArray(req.body.intervinientes) ? req.body.intervinientes.slice(0, 20) : [];

    const senderFinal = s.sender || 'Alumno Anónimo';
    const tituloFinal = s.titulo || (s.fuero && s.objeto ? `${s.fuero} — ${s.objeto}` : `Inicio de Causa de ${senderFinal}`);
    const textoFinal  = s.textoPresentacion || '(Sin texto escrito)';

    const newInicio = await prisma.inicioCausa.create({
      data: {
        id:                Date.now().toString() + '-' + Math.floor(Math.random() * 1000),
        sender:            senderFinal,
        tipo:              s.tipo              || 'Inicio de Causa',
        fuero:             s.fuero             || 'No especificado',
        objeto:            s.objeto            || 'No especificado',
        localidad:         s.localidad         || 'No especificado',
        monto:             s.monto             || '',
        radicacion:        s.radicacion        || '',
        intervinientes:    intervinientes,
        organismo:         s.organismo         || 'No especificado',
        titulo:            tituloFinal,
        textoPresentacion: textoFinal,
        createdAt:         new Date().toISOString(),
        status:            'Pendiente',
        feedback:          '',
        grade:             ''
      }
    });

    console.log(`Nuevo Inicio de Causa registrado. ID: ${newInicio.id} - Remitente: ${newInicio.sender}`);
    res.status(201).json({ success: true, message: 'Inicio de causa registrado con éxito.', data: newInicio });
  } catch (error) {
    console.error('Error al registrar inicio de causa:', error);
    res.status(500).json({ error: 'Error al registrar inicio de causa en el sistema.' });
  }
});

// 5b-2. Obtener Inicios de Causa (Alumnos / Público)
app.get('/api/inicios-causa', async (req, res) => {
  try {
    const inicios = await prisma.inicioCausa.findMany();
    const sorted = inicios.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(sorted);
  } catch (error) {
    console.error('Error al consultar inicios de causa:', error);
    res.status(500).json({ error: 'Error al consultar inicios de causa.' });
  }
});

// 5c. Obtener Inicios de Causa (Profesor)
app.get('/api/admin/inicios-causa', requireAdminAuth, async (req, res) => {
  try {
    const inicios = await prisma.inicioCausa.findMany();
    const sorted = inicios.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(sorted);
  } catch (error) {
    console.error('Error al obtener inicios de causa:', error);
    res.status(500).json({ error: 'Error al consultar inicios de causa.' });
  }
});

// 5c-2. Guardar evaluación/corrección de Inicio de Causa (Profesor)
app.patch('/api/admin/inicios-causa/:id/feedback', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  const { status, feedback, grade } = req.body;
  try {
    const updated = await prisma.inicioCausa.update({
      where: { id },
      data: {
        status: status || 'Corregido',
        feedback: feedback !== undefined ? feedback : '',
        grade: grade !== undefined ? grade : ''
      }
    });
    console.log(`Inicio de Causa ID ${id} evaluado por el profesor. Estado: ${updated.status}`);
    res.json({ success: true, message: 'Evaluación guardada correctamente.', data: updated });
  } catch (error) {
    console.error('Error al evaluar inicio de causa:', error);
    res.status(404).json({ error: 'No se pudo guardar la evaluación.' });
  }
});

// 5d. Eliminar un Inicio de Causa (Profesor)
app.delete('/api/admin/inicios-causa/:id', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.inicioCausa.delete({ where: { id } });
    console.log(`Inicio de Causa con ID: ${id} eliminado por el profesor.`);
    res.json({ success: true, message: 'Inicio de causa eliminado correctamente.' });
  } catch (error) {
    res.status(404).json({ error: 'El inicio de causa no existe.' });
  }
});

// 6. Obtener causas (Estudiantes y Profesor)
app.get('/api/causas', async (req, res) => {
  try {
    const causas = await prisma.causa.findMany();
    res.json(causas);
  } catch (error) {
    console.error('Error al consultar causas:', error);
    res.status(500).json({ error: 'Error al consultar las causas.' });
  }
});

// 7. Crear causa (Profesor)
app.post('/api/admin/causas', requireAdminAuth, async (req, res) => {
  try {
    const { caratula, numero, letra, ext, departamento, fuero, objeto, organismo } = req.body;

    if (!caratula || !numero) {
      return res.status(400).json({ error: 'La carátula y el número de causa son obligatorios.' });
    }

    const prefixStr = ext ? `${letra ? letra + '-' : ''}${numero}-${ext}` : `${numero} ${letra || ''}`;
    const title = `${prefixStr} ${caratula}`.trim();

    const newCausa = await prisma.causa.create({
      data: {
        id: 'causa-' + Date.now(),
        title,
        caratula,
        letra: letra || '',
        numero: numero.toString(),
        ext: ext || '',
        departamento: departamento || 'No informado',
        fuero: fuero || 'Civil y Comercial',
        objeto: objeto || 'General',
        organismo: organismo || 'No especificado'
      }
    });

    console.log(`Nueva Causa creada por el Profesor: ${newCausa.title}`);
    res.status(201).json({ success: true, message: 'Causa creada con éxito.', data: newCausa });
  } catch (error) {
    console.error('Error al crear causa:', error);
    res.status(500).json({ error: 'Error al crear la causa.' });
  }
});

// 8. Eliminar causa (Profesor)
app.delete('/api/admin/causas/:id', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.causa.delete({ where: { id } });
    res.json({ success: true, message: 'Causa eliminada correctamente.' });
  } catch (error) {
    res.status(404).json({ error: 'La causa no existe.' });
  }
});

// 9. Obtener destinatarios/partes (Estudiantes y Profesor)
app.get('/api/destinatarios', async (req, res) => {
  try {
    const [destinatarios, personasFisicas, personasJuridicas] = await Promise.all([
      prisma.destinatario.findMany(),
      prisma.personaFisica.findMany(),
      prisma.personaJuridica.findMany()
    ]);

    const allDest = [...destinatarios, ...personasFisicas, ...personasJuridicas];
    res.json(allDest);
  } catch (error) {
    console.error('Error al obtener destinatarios:', error);
    res.status(500).json({ error: 'Error al consultar destinatarios.' });
  }
});

// 10. Crear destinatario/persona/empresa (Profesor)
app.post('/api/admin/destinatarios', requireAdminAuth, async (req, res) => {
  try {
    const { tipoEntity, rawName, cuit, rawEmail, rolProcesal, departamento, registrarUsuario, password } = req.body;

    if (!rawName || !cuit) {
      return res.status(400).json({ error: 'Nombre/Razón Social y CUIT/CUIL son obligatorios.' });
    }

    if (registrarUsuario) {
      if (!rawEmail || !password) {
        return res.status(400).json({ error: 'Domicilio Electrónico y Contraseña son obligatorios si se registra como usuario de acceso.' });
      }
      const existingAlumno = await prisma.alumno.findFirst({
        where: { email: { equals: rawEmail.trim(), mode: 'insensitive' } }
      });
      if (existingAlumno) {
        return res.status(400).json({ error: 'El domicilio electrónico ya se encuentra registrado como usuario.' });
      }
    }

    const isEmpresa = tipoEntity === 'empresa' || tipoEntity === 'Jurídica';
    const tipoPersona = isEmpresa ? 'Jurídica' : 'Física';
    const icon = isEmpresa ? '🏢' : '👤';
    const labelTipo = isEmpresa ? 'EMPRESA / PERSONA JURÍDICA' : 'PERSONA FÍSICA';
    const newId = 'dest-' + Date.now();
    const createdAt = new Date().toISOString();

    const newDest = await prisma.destinatario.create({
      data: {
        id: newId,
        tipoPersona,
        icon,
        title: `${rawName} - ${rawEmail || 'No especificado'}`,
        sub: `${labelTipo} - ${departamento || 'No informado'} - CUIT/CUIL ${cuit}`,
        cuit: cuit.toString(),
        rawName,
        rawEmail: rawEmail || '',
        rolProcesal: rolProcesal || 'PARTE',
        departamento: departamento || 'No informado',
        localidad: departamento || 'No informado',
        createdAt
      }
    });

    if (registrarUsuario) {
      await prisma.alumno.create({
        data: {
          id: newId,
          email: rawEmail.trim(),
          password: password.trim(),
          name: rawName,
          createdAt,
          esFicticio: false
        }
      });
    }

    console.log(`Nuevo Destinatario (${tipoPersona}) creado por el Profesor: ${newDest.rawName}`);
    res.status(201).json({ success: true, message: `${labelTipo} creada con éxito.`, data: newDest });
  } catch (error) {
    console.error('Error al crear destinatario:', error);
    res.status(500).json({ error: 'Error al crear el destinatario.' });
  }
});

// 11. Eliminar destinatario/persona/empresa (Profesor)
app.delete('/api/admin/destinatarios/:id', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.destinatario.delete({ where: { id } });
    res.json({ success: true, message: 'Registro eliminado correctamente.' });
  } catch (error) {
    res.status(404).json({ error: 'El registro no existe.' });
  }
});

// 12. Obtener listas completas de Departamentos, Fueros y Materias
app.get('/api/lists', (req, res) => {
  res.json({
    departamentos: DEPARTAMENTOS,
    fueros: FUEROS,
    objetos: OBJETOS,
    rolesProcesales: ROLES_PROCESALES,
    tiposPersona: TIPOS_PERSONA
  });
});

/* ==================== MÓDULO DE GESTIÓN Y CREACIÓN AUTOMÁTICA DE USUARIOS ==================== */

// AFIP CUIT/CUIL check-digit calculator (Modulo 11)
function generateCuit(gender, dni) {
  let prefix = '30';
  if (gender === 'male') prefix = '20';
  if (gender === 'female') prefix = '27';
  
  const dniStr = String(dni).padStart(8, '0');
  
  function calculateDigit(pref, num) {
    const base = pref + num;
    const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(base[i], 10) * factors[i];
    }
    const remainder = sum % 11;
    if (remainder === 0) return 0;
    if (remainder === 1) return -1;
    return 11 - remainder;
  }
  
  let digit = calculateDigit(prefix, dniStr);
  if (digit === -1) {
    prefix = '23';
    digit = calculateDigit(prefix, dniStr);
    if (digit === -1) {
      digit = 9;
    }
  }
  return `${prefix}-${dniStr}-${digit}`;
}

// Secure password generator helper
function generateSecurePassword() {
  const length = Math.floor(Math.random() * 3) + 10;
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowers = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = [
    uppers[Math.floor(Math.random() * uppers.length)],
    lowers[Math.floor(Math.random() * lowers.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];
  
  const allChars = uppers + lowers + numbers + symbols;
  for (let i = 4; i < length; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }
  
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }
  
  return password.join('');
}

// 1. Generar Usuarios Ficticios
app.post('/api/admin/generate-fictitious', requireAdminAuth, async (req, res) => {
  try {
    const { cantidad, tipo } = req.body;
    const numCantidad = parseInt(cantidad, 10);
    
    if (isNaN(numCantidad) || numCantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser un número entero mayor a 0.' });
    }

    const rubros = ['CONSTRUCTORA', 'TRANSPORTES', 'AGROPECUARIA', 'TECNOLOGIA', 'LOGISTICA', 'SERVICIOS', 'DISTRIBUIDORA', 'INMOBILIARIA', 'SOLUCIONES'];
    let generados = 0;

    for (let i = 0; i < numCantidad; i++) {
      if (tipo === 'usuario') {
        const id = 'user-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        const plainPassword = generateSecurePassword();
        const currentCount = await prisma.alumno.count();
        const alumnoNum = currentCount + 1;
        const alumnoEmail = `alumno${alumnoNum}@notificaciones-simulacion.gob.ar`;
        const alumnoName = `ALUMNO ${alumnoNum}`;
        const createdAt = new Date().toISOString();

        await prisma.alumno.create({
          data: { id, email: alumnoEmail, password: plainPassword, name: alumnoName, createdAt, esFicticio: true }
        });
        await prisma.credencialGenerada.create({
          data: { id, domicilioElectronico: alumnoEmail, passwordPlano: plainPassword, fechaGeneracion: createdAt }
        });
        generados++;
        continue;
      }

      let itemType = 'Física';
      if (tipo === 'juridica') itemType = 'Jurídica';
      else if (tipo === 'mixto') itemType = Math.random() > 0.5 ? 'Física' : 'Jurídica';

      const id = 'dest-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
      const plainPassword = generateSecurePassword();
      const passwordHash = bcrypt.hashSync(plainPassword, 10);
      const depto = DEPARTAMENTOS[Math.floor(Math.random() * DEPARTAMENTOS.length)];
      const createdAt = new Date().toISOString();

      if (itemType === 'Física') {
        const isMale = Math.random() > 0.5;
        const firstName = (isMale ? faker.person.firstName('male') : faker.person.firstName('female')).toUpperCase();
        const lastName = faker.person.lastName().toUpperCase();
        const rawName = `${lastName} ${firstName}`;
        const dniVal = Math.floor(10000000 + Math.random() * 40000000);
        const cuit = generateCuit(isMale ? 'male' : 'female', dniVal);
        const normalizedEmail = `${lastName}.${firstName}.${Math.floor(1000 + Math.random() * 9000)}@notificaciones-simulacion.gob.ar`
          .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9.@-]/g, "");

        await prisma.personaFisica.create({
          data: {
            id, tipoPersona: 'Física', icon: '👤',
            title: `${rawName} - ${normalizedEmail}`,
            sub: `PERSONA FÍSICA - ${depto} - CUIT / Cuil ${cuit}`,
            cuit: cuit.replace(/-/g, ''), rawName, rawEmail: normalizedEmail,
            rolProcesal: 'PARTE', departamento: depto, localidad: depto,
            esFicticio: true, passwordHash, createdAt
          }
        });
        await prisma.credencialGenerada.create({
          data: { id, domicilioElectronico: normalizedEmail, passwordPlano: plainPassword, fechaGeneracion: createdAt }
        });
        await prisma.alumno.create({
          data: { id, email: normalizedEmail, password: plainPassword, name: rawName, createdAt, esFicticio: true }
        });
        generados++;
      } else {
        const rubro = rubros[Math.floor(Math.random() * rubros.length)];
        const compWord = (faker.word.adjective() || 'Global').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const typeStr = Math.random() > 0.5 ? 'S.A.' : 'S.R.L.';
        const rawName = `${rubro} ${compWord} ${typeStr}`;
        const randNum = Math.floor(30000000 + Math.random() * 10000000);
        const cuit = generateCuit('company', randNum);
        const cleanName = rawName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        const normalizedEmail = `${cleanName}.${Math.floor(1000 + Math.random() * 9000)}@notificaciones-simulacion.gob.ar`;

        await prisma.personaJuridica.create({
          data: {
            id, tipoPersona: 'Jurídica', icon: '🏢',
            title: `${rawName} - ${normalizedEmail}`,
            sub: `EMPRESA / PERSONA JURÍDICA - ${depto} - CUIT / Cuil ${cuit}`,
            cuit: cuit.replace(/-/g, ''), rawName, rawEmail: normalizedEmail,
            rolProcesal: 'PARTE', departamento: depto, localidad: depto,
            esFicticio: true, passwordHash, createdAt
          }
        });
        await prisma.credencialGenerada.create({
          data: { id, domicilioElectronico: normalizedEmail, passwordPlano: plainPassword, fechaGeneracion: createdAt }
        });
        await prisma.alumno.create({
          data: { id, email: normalizedEmail, password: plainPassword, name: rawName, createdAt, esFicticio: true }
        });
        generados++;
      }
    }

    res.json({ success: true, message: `Se generaron ${generados} usuarios correctamente.` });
  } catch (error) {
    console.error('Error al generar usuarios ficticios:', error);
    res.status(500).json({ error: 'Error al generar usuarios ficticios en la base de datos.' });
  }
});

// 2. Obtener Lista de Alumnos/Usuarios
app.get('/api/admin/users', requireAdminAuth, async (req, res) => {
  try {
    const alumnos = await prisma.alumno.findMany();
    const allUsers = alumnos.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password: u.password || '',
      disabled: u.disabled === true,
      esFicticio: u.esFicticio,
      createdAt: u.createdAt || 'Histórico'
    })).sort((a, b) => {
      if (a.createdAt === 'Histórico') return 1;
      if (b.createdAt === 'Histórico') return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(allUsers);
  } catch (error) {
    console.error('Error al obtener lista de usuarios:', error);
    res.status(500).json({ error: 'Error al consultar usuarios.' });
  }
});

// 3. Eliminar Usuario (Alumno)
app.delete('/api/admin/users/:id', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await Promise.allSettled([
      prisma.alumno.delete({ where: { id } }),
      prisma.personaFisica.delete({ where: { id } }),
      prisma.personaJuridica.delete({ where: { id } }),
      prisma.destinatario.delete({ where: { id } }),
      prisma.credencialGenerada.delete({ where: { id } })
    ]);
    res.json({ success: true, message: 'Usuario eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
});

// 3b. Habilitar / Deshabilitar Usuario (ban toggle)
app.patch('/api/admin/users/:id/toggle-status', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const alumno = await prisma.alumno.findUnique({ where: { id } });
    if (!alumno) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const updated = await prisma.alumno.update({
      where: { id },
      data: { disabled: !alumno.disabled }
    });
    console.log(`Usuario ${updated.email} ${updated.disabled ? 'DESHABILITADO' : 'HABILITADO'} por el profesor.`);
    res.json({ success: true, disabled: updated.disabled });
  } catch (error) {
    console.error('Error al modificar estado de usuario:', error);
    res.status(500).json({ error: 'Error al cambiar estado de usuario.' });
  }
});

// 4. Exportar Credenciales a Excel (.xlsx)
app.get('/api/admin/export-credentials', checkAdminOrToken, async (req, res) => {
  try {
    const alumnos = await prisma.alumno.findMany({ where: { esFicticio: true } });
    const rows = alumnos.map(a => ({
      'Nombre / Persona': a.name,
      'Domicilio Electrónico': a.email,
      'Contraseña': a.password,
      'Fecha de Generación': a.createdAt && a.createdAt !== 'Histórico' ? new Date(a.createdAt).toLocaleString('es-AR') : ''
    }));

    if (rows.length === 0) {
      return res.status(404).send('No se encontraron credenciales de usuarios ficticios para exportar.');
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Credenciales");

    const colWidths = [
      { wch: 30 },
      { wch: 45 },
      { wch: 15 },
      { wch: 22 }
    ];
    ws['!cols'] = colWidths;

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=credenciales_ficticias.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar credenciales:', error);
    res.status(500).json({ error: 'Error al generar planilla de credenciales.' });
  }
});

// Servir la carpeta de archivos estáticos (el sitio web principal)
app.use(express.static(path.join(__dirname)));

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`Servidor de Simulación SCBA ejecutándose en puerto ${PORT}`);
  console.log(`Base de Datos: PostgreSQL (vía Prisma ORM)`);
  console.log(`Acceso para Alumnos: http://localhost:${PORT}/index.html`);
  console.log(`Acceso para Profesores: http://localhost:${PORT}/admin.html`);
  console.log(`Contraseña del Profesor: ${ADMIN_PASSWORD}`);
  console.log(`===================================================`);
});
