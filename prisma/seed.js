const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada.');
}

const prisma = new PrismaClient();
const DB_FILE = path.join(__dirname, '..', 'db.json');

const DEFAULT_DB = {
  complaints: [],
  iniciosCausa: [],
  personasFisicas: [],
  personasJuridicas: [],
  credencialesGeneradas: [],
  alumnos: [],
  causas: [
    {
      id: 'causa-1',
      title: '60969 BANCO DEL SUR S.A. C/ GÓMEZ MARTÍN ALEJANDRO S/ EJECUCION HIPOTECARIA',
      caratula: 'BANCO DEL SUR S.A. C/ GÓMEZ MARTÍN ALEJANDRO S/ EJECUCION HIPOTECARIA',
      letra: 'B',
      numero: '60969',
      ext: '2023',
      departamento: 'Mar del Plata',
      fuero: 'Civil y Comercial',
      objeto: 'DAÑOS Y PERJUICIOS (Código: 100)',
      organismo: 'JUZGADO EN LO CIVIL Y COMERCIAL N° 1 - MAR DEL PLATA'
    },
    {
      id: 'causa-2',
      title: 'MP-27253-2023 ROJAS CARLOS ALBERTO Y OTRO/A C/ SUCESORES DE LÓPEZ LUIS EDUARDO S/ EJECUCION DE SENTENCIA',
      caratula: 'ROJAS CARLOS ALBERTO Y OTRO/A C/ SUCESORES DE LÓPEZ LUIS EDUARDO S/ EJECUCION DE SENTENCIA',
      letra: 'MP',
      numero: '27253',
      ext: '2023',
      departamento: 'Mar del Plata',
      fuero: 'Civil y Comercial',
      objeto: 'ACCION DECLARATIVA (SUMARIO) (Código: 128)',
      organismo: 'JUZGADO EN LO CIVIL Y COMERCIAL N° 2 - MAR DEL PLATA'
    },
    {
      id: 'causa-3',
      title: '78520591 ROJAS CARLOS ALBERTO Y OTRO C/ SUCESORES DE LÓPEZ LUIS EDUARDO S/ QUEJA POR APELACION DENEGADA',
      caratula: 'ROJAS CARLOS ALBERTO Y OTRO C/ SUCESORES DE LÓPEZ LUIS EDUARDO S/ QUEJA POR APELACION DENEGADA',
      letra: 'R',
      numero: '78520591',
      ext: '2022',
      departamento: 'La Plata',
      fuero: 'Civil y Comercial',
      objeto: 'ACCION DE REAJUSTE (Código: 613)',
      organismo: 'JUZGADO CIVIL Y COMERCIAL Nº 1 - LA PLATA'
    }
  ],
  destinatarios: [
    {
      id: 'dest-1',
      tipoPersona: 'Organismo Del Estado',
      icon: '⚖',
      title: 'OFICINA DE MANDAMIENTOS Y NOTIFICACIONES LA PLATA - mandamientos-laplata@jusbuenosaires.gov.ar',
      sub: 'OFICINA DE MANDAMIENTOS Y NOTIFICACIONES - LA PLATA - CUIT / Cuil 30709845129',
      cuit: '30709845129',
      rawName: 'OFICINA DE MANDAMIENTOS Y NOTIFICACIONES LA PLATA',
      rawEmail: 'mandamientos-laplata@jusbuenosaires.gov.ar',
      rolProcesal: 'DENUNCIANTE',
      departamento: 'La Plata',
      localidad: 'La Plata'
    },
    {
      id: 'dest-2',
      tipoPersona: 'Física',
      icon: '👤',
      title: 'PEREZ CARLOS HORACIO - carlos.perez@pjba.gov.ar',
      sub: 'PERSONA FÍSICA - La Plata - CUIT / Cuil 23356104609',
      cuit: '23356104609',
      rawName: 'PEREZ CARLOS HORACIO',
      rawEmail: 'carlos.perez@pjba.gov.ar',
      rolProcesal: 'ACTOR',
      departamento: 'La Plata',
      localidad: 'La Plata'
    },
    {
      id: 'dest-3',
      tipoPersona: 'Física',
      icon: '👤',
      title: 'FERNANDEZ MARIA LAURA - maria.fernandez@pjba.gov.ar',
      sub: 'PERSONA FÍSICA - La Plata - CUIT / Cuil 20258692668',
      cuit: '20258692668',
      rawName: 'FERNANDEZ MARIA LAURA',
      rawEmail: 'maria.fernandez@pjba.gov.ar',
      rolProcesal: 'DEMANDADO / CODEMANDADO',
      departamento: 'La Plata',
      localidad: 'La Plata'
    },
    {
      id: 'dest-4',
      tipoPersona: 'Jurídica',
      icon: '🏢',
      title: 'BANCO PROVINCIAL DE CRÉDITO S.A. DEMANDAS - 30500001234-demandas@acuerdo3989.notificaciones',
      sub: 'EMPRESA / PERSONA JURÍDICA - La Plata - CUIT / Cuil 30500001234',
      cuit: '30500001234',
      rawName: 'BANCO PROVINCIAL DE CRÉDITO S.A. DEMANDAS',
      rawEmail: '30500001234-demandas@acuerdo3989.notificaciones',
      rolProcesal: 'DEMANDADO / CODEMANDADO',
      departamento: 'La Plata',
      localidad: 'La Plata'
    }
  ]
};

async function seed() {
  console.log('🌱 Iniciando migración de datos desde db.json a PostgreSQL...');

  let dbData = DEFAULT_DB;
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        dbData = { ...DEFAULT_DB, complaints: parsed };
      } else {
        dbData = { ...DEFAULT_DB, ...parsed };
      }
    } catch (err) {
      console.error('⚠️ Error al leer db.json, usando valores por defecto:', err.message);
    }
  }

  // 1. Complaints
  if (dbData.complaints && dbData.complaints.length > 0) {
    for (const c of dbData.complaints) {
      if (!c.id) continue;
      await prisma.complaint.upsert({
        where: { id: String(c.id) },
        update: {
          title: c.title || '',
          content: c.content || '',
          type: c.type || '',
          sender: c.sender || '',
          organism: c.organism || 'No especificado',
          causaNumber: c.causaNumber || 'No especificado',
          createdAt: c.createdAt || new Date().toISOString()
        },
        create: {
          id: String(c.id),
          title: c.title || '',
          content: c.content || '',
          type: c.type || '',
          sender: c.sender || '',
          organism: c.organism || 'No especificado',
          causaNumber: c.causaNumber || 'No especificado',
          createdAt: c.createdAt || new Date().toISOString()
        }
      });
    }
    console.log(`✅ ${dbData.complaints.length} presentaciones migrada(s)`);
  }

  // 2. IniciosCausa
  if (dbData.iniciosCausa && dbData.iniciosCausa.length > 0) {
    for (const ic of dbData.iniciosCausa) {
      if (!ic.id) continue;
      await prisma.inicioCausa.upsert({
        where: { id: String(ic.id) },
        update: {
          sender: ic.sender || '',
          tipo: ic.tipo || '',
          fuero: ic.fuero || '',
          objeto: ic.objeto || '',
          localidad: ic.localidad || '',
          monto: ic.monto || '',
          radicacion: ic.radicacion || '',
          intervinientes: ic.intervinientes || [],
          organismo: ic.organismo || '',
          titulo: ic.titulo || '',
          textoPresentacion: ic.textoPresentacion || '',
          createdAt: ic.createdAt || new Date().toISOString()
        },
        create: {
          id: String(ic.id),
          sender: ic.sender || '',
          tipo: ic.tipo || '',
          fuero: ic.fuero || '',
          objeto: ic.objeto || '',
          localidad: ic.localidad || '',
          monto: ic.monto || '',
          radicacion: ic.radicacion || '',
          intervinientes: ic.intervinientes || [],
          organismo: ic.organismo || '',
          titulo: ic.titulo || '',
          textoPresentacion: ic.textoPresentacion || '',
          createdAt: ic.createdAt || new Date().toISOString()
        }
      });
    }
    console.log(`✅ ${dbData.iniciosCausa.length} inicio(s) de causa migrado(s)`);
  }

  // 3. PersonasFisicas
  if (dbData.personasFisicas && dbData.personasFisicas.length > 0) {
    for (const pf of dbData.personasFisicas) {
      if (!pf.id) continue;
      await prisma.personaFisica.upsert({
        where: { id: String(pf.id) },
        update: {
          tipoPersona: pf.tipoPersona || 'Física',
          icon: pf.icon || '👤',
          title: pf.title || '',
          sub: pf.sub || '',
          cuit: pf.cuit || '',
          rawName: pf.rawName || '',
          rawEmail: pf.rawEmail || '',
          rolProcesal: pf.rolProcesal || '',
          departamento: pf.departamento || '',
          localidad: pf.localidad || '',
          esFicticio: Boolean(pf.esFicticio),
          passwordHash: pf.passwordHash || '',
          createdAt: pf.createdAt || new Date().toISOString()
        },
        create: {
          id: String(pf.id),
          tipoPersona: pf.tipoPersona || 'Física',
          icon: pf.icon || '👤',
          title: pf.title || '',
          sub: pf.sub || '',
          cuit: pf.cuit || '',
          rawName: pf.rawName || '',
          rawEmail: pf.rawEmail || '',
          rolProcesal: pf.rolProcesal || '',
          departamento: pf.departamento || '',
          localidad: pf.localidad || '',
          esFicticio: Boolean(pf.esFicticio),
          passwordHash: pf.passwordHash || '',
          createdAt: pf.createdAt || new Date().toISOString()
        }
      });
    }
    console.log(`✅ ${dbData.personasFisicas.length} persona(s) física(s) migrada(s)`);
  }

  // 4. PersonasJuridicas
  if (dbData.personasJuridicas && dbData.personasJuridicas.length > 0) {
    for (const pj of dbData.personasJuridicas) {
      if (!pj.id) continue;
      await prisma.personaJuridica.upsert({
        where: { id: String(pj.id) },
        update: {
          tipoPersona: pj.tipoPersona || 'Jurídica',
          icon: pj.icon || '🏢',
          title: pj.title || '',
          sub: pj.sub || '',
          cuit: pj.cuit || '',
          rawName: pj.rawName || '',
          rawEmail: pj.rawEmail || '',
          rolProcesal: pj.rolProcesal || '',
          departamento: pj.departamento || '',
          localidad: pj.localidad || '',
          esFicticio: Boolean(pj.esFicticio),
          passwordHash: pj.passwordHash || '',
          createdAt: pj.createdAt || new Date().toISOString()
        },
        create: {
          id: String(pj.id),
          tipoPersona: pj.tipoPersona || 'Jurídica',
          icon: pj.icon || '🏢',
          title: pj.title || '',
          sub: pj.sub || '',
          cuit: pj.cuit || '',
          rawName: pj.rawName || '',
          rawEmail: pj.rawEmail || '',
          rolProcesal: pj.rolProcesal || '',
          departamento: pj.departamento || '',
          localidad: pj.localidad || '',
          esFicticio: Boolean(pj.esFicticio),
          passwordHash: pj.passwordHash || '',
          createdAt: pj.createdAt || new Date().toISOString()
        }
      });
    }
    console.log(`✅ ${dbData.personasJuridicas.length} persona(s) jurídica(s) migrada(s)`);
  }

  // 5. CredencialesGeneradas
  if (dbData.credencialesGeneradas && dbData.credencialesGeneradas.length > 0) {
    for (const cg of dbData.credencialesGeneradas) {
      if (!cg.id) continue;
      await prisma.credencialGenerada.upsert({
        where: { id: String(cg.id) },
        update: {
          domicilioElectronico: cg.domicilioElectronico || cg.email || '',
          passwordPlano: cg.passwordPlano || cg.password || '',
          fechaGeneracion: cg.fechaGeneracion || cg.createdAt || new Date().toISOString()
        },
        create: {
          id: String(cg.id),
          domicilioElectronico: cg.domicilioElectronico || cg.email || '',
          passwordPlano: cg.passwordPlano || cg.password || '',
          fechaGeneracion: cg.fechaGeneracion || cg.createdAt || new Date().toISOString()
        }
      });
    }
    console.log(`✅ ${dbData.credencialesGeneradas.length} credencial(es) generada(s) migrada(s)`);
  }

  // 6. Alumnos
  let alumnosData = dbData.alumnos || [];
  if (alumnosData.length === 0) {
    for (let i = 1; i <= 10; i++) {
      alumnosData.push({
        id: `alumno-${i}`,
        email: `alumno${i}`,
        password: `clave${i}`,
        name: `ALUMNO ${i}`,
        createdAt: new Date().toISOString(),
        esFicticio: false
      });
    }
  }

  for (const a of alumnosData) {
    if (!a.id) continue;
    await prisma.alumno.upsert({
      where: { id: String(a.id) },
      update: {
        name: a.name || a.nombre || '',
        email: a.email || '',
        password: a.password || '',
        disabled: Boolean(a.disabled),
        esFicticio: Boolean(a.esFicticio),
        createdAt: a.createdAt || new Date().toISOString()
      },
      create: {
        id: String(a.id),
        name: a.name || a.nombre || '',
        email: a.email || '',
        password: a.password || '',
        disabled: Boolean(a.disabled),
        esFicticio: Boolean(a.esFicticio),
        createdAt: a.createdAt || new Date().toISOString()
      }
    });
  }
  console.log(`✅ ${alumnosData.length} alumno(s) migrado(s)`);

  // 7. Causas
  if (dbData.causas && dbData.causas.length > 0) {
    for (const cs of dbData.causas) {
      if (!cs.id) continue;
      await prisma.causa.upsert({
        where: { id: String(cs.id) },
        update: {
          title: cs.title || '',
          caratula: cs.caratula || '',
          letra: cs.letra || '',
          numero: cs.numero || '',
          ext: cs.ext || '',
          departamento: cs.departamento || '',
          fuero: cs.fuero || '',
          objeto: cs.objeto || '',
          organismo: cs.organismo || ''
        },
        create: {
          id: String(cs.id),
          title: cs.title || '',
          caratula: cs.caratula || '',
          letra: cs.letra || '',
          numero: cs.numero || '',
          ext: cs.ext || '',
          departamento: cs.departamento || '',
          fuero: cs.fuero || '',
          objeto: cs.objeto || '',
          organismo: cs.organismo || ''
        }
      });
    }
    console.log(`✅ ${dbData.causas.length} causa(s) migrada(s)`);
  }

  // 8. Destinatarios
  if (dbData.destinatarios && dbData.destinatarios.length > 0) {
    for (const d of dbData.destinatarios) {
      if (!d.id) continue;
      await prisma.destinatario.upsert({
        where: { id: String(d.id) },
        update: {
          tipoPersona: d.tipoPersona || '',
          icon: d.icon || '',
          title: d.title || '',
          sub: d.sub || '',
          cuit: d.cuit || '',
          rawName: d.rawName || '',
          rawEmail: d.rawEmail || '',
          rolProcesal: d.rolProcesal || '',
          departamento: d.departamento || '',
          localidad: d.localidad || '',
          createdAt: d.createdAt || new Date().toISOString()
        },
        create: {
          id: String(d.id),
          tipoPersona: d.tipoPersona || '',
          icon: d.icon || '',
          title: d.title || '',
          sub: d.sub || '',
          cuit: d.cuit || '',
          rawName: d.rawName || '',
          rawEmail: d.rawEmail || '',
          rolProcesal: d.rolProcesal || '',
          departamento: d.departamento || '',
          localidad: d.localidad || '',
          createdAt: d.createdAt || new Date().toISOString()
        }
      });
    }
    console.log(`✅ ${dbData.destinatarios.length} destinatario(s) migrado(s)`);
  }

  console.log('🎉 ¡Migración de datos completada con éxito!');
}

seed()
  .catch((e) => {
    console.error('❌ Error durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
