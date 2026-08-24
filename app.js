/* ===================================================
   SIMULACIÓN - JavaScript Compartido
   =================================================== */

document.addEventListener('DOMContentLoaded', function() {
  loadUserSession();
  initCollapsibleSections();
  initDropdownMenus();
  initMobileNav();
  initAutocomplete();
  initFileUpload();
  initLoginForm();
  setCurrentDate();
  initDynamicDropdowns();
  initDocumentLookup();

  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage === 'mis-causas.html') {
    buscar('formMisCausas');
  }
});

/* ==================== COLLAPSIBLE SECTIONS ==================== */
function initCollapsibleSections() {
  const headers = document.querySelectorAll('.section-header[data-toggle], .section-header-light[data-toggle]');
  headers.forEach(function(header) {
    header.addEventListener('click', function() {
      const targetId = this.getAttribute('data-toggle');
      const body = document.getElementById(targetId);
      if (body) {
        body.classList.toggle('collapsed');
        this.classList.toggle('collapsed');
      }
    });
  });
}

/* ==================== MOBILE NAVIGATION ==================== */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('navMenu');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      navMenu.classList.toggle('mobile-open');
      const isExpanded = navMenu.classList.contains('mobile-open');
      toggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      toggleBtn.classList.toggle('active', isExpanded);
    });
  }
}

/* ==================== DROPDOWN MENUS ==================== */
function initDropdownMenus() {
  const toggles = document.querySelectorAll('.dropdown-toggle');
  toggles.forEach(function(toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const parent = this.parentElement;
      const dropdown = parent.querySelector('.nav-dropdown');
      
      // Close other dropdowns
      document.querySelectorAll('.nav-menu > li').forEach(function(li) {
        if (li !== parent) {
          const dd = li.querySelector('.nav-dropdown');
          if (dd) dd.style.display = '';
        }
      });

      if (dropdown) {
        const isVisible = window.getComputedStyle(dropdown).display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.nav-menu > li')) {
      document.querySelectorAll('.nav-dropdown').forEach(function(dd) {
        dd.style.display = '';
      });
    }
  });
}

/* ==================== FILE UPLOAD ==================== */
function initFileUpload() {
  const fileButtons = document.querySelectorAll('.file-upload-btn');
  fileButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      const input = this.parentElement.querySelector('input[type="file"]');
      if (input) input.click();
    });
  });

  const fileInputs = document.querySelectorAll('.file-upload-area input[type="file"]');
  fileInputs.forEach(function(input) {
    input.addEventListener('change', function() {
      const label = this.parentElement.querySelector('.file-upload-label');
      if (label) {
        if (this.files.length > 0) {
          label.textContent = this.files[0].name;
          label.style.color = '#2c5aa0';
        } else {
          label.textContent = 'Sin archivos seleccionados';
          label.style.color = '#333';
        }
      }
    });
  });
}

/* ==================== LOGIN FORM ==================== */
function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const errorDiv = document.getElementById('studentLoginError');

  function showError(msg) {
    if (errorDiv) {
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
    }
  }

  function clearError() {
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.style.display = 'none';
    }
  }

  function processLogin(email, password, isCert = false) {
    clearError();

    if (!email && !password) {
      showError('Debe ingresar el domicilio electrónico y la contraseña.');
      return;
    }
    if (!email) {
      showError('Debe ingresar el domicilio electrónico.');
      return;
    }
    if (!password) {
      showError('Debe ingresar la contraseña.');
      return;
    }

    // Intentar autenticación mediante el servidor API Express
    fetch('/api/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const studentName = isCert ? `${data.name} (Certificado)` : data.name;
        sessionStorage.setItem('studentName', studentName);
        sessionStorage.setItem('studentLoginTime', data.loginTime);
        window.location.href = 'novedades.html';
      } else {
        showError(data.error || 'Domicilio electrónico o contraseña incorrectos.');
      }
    })
    .catch(err => {
      // Fallback local si el servidor no responde
      console.warn('API de login no disponible, ejecutando validación fallback.', err);
      const cleanEmail = email.toLowerCase().trim().split('@')[0];
      const match = cleanEmail.match(/^alumno(\d+)$/i);
      const num = match ? parseInt(match[1], 10) : null;
      
      const isClaveMatch = (num && num <= 10 && password === `clave${num}`) || (password.length >= 6);

      if (!isClaveMatch) {
        showError('Domicilio electrónico o contraseña incorrectos.');
        return;
      }

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const loginTime = `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;

      const studentName = isCert ? `ALUMNO ${num || cleanEmail.toUpperCase()} (Certificado)` : `ALUMNO ${num || cleanEmail.toUpperCase()}`;
      sessionStorage.setItem('studentName', studentName);
      sessionStorage.setItem('studentLoginTime', loginTime);
      window.location.href = 'novedades.html';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const emailInput = document.getElementById('domicilioElectronico');
      const passwordInput = document.getElementById('contrasena');
      const rawEmail = emailInput ? emailInput.value.trim() : '';
      const rawPassword = passwordInput ? passwordInput.value.trim() : '';
      processLogin(rawEmail, rawPassword, false);
    });
  }

  const loginBtnCert = document.getElementById('loginBtnCert');
  if (loginBtnCert) {
    loginBtnCert.addEventListener('click', function(e) {
      e.preventDefault();
      const emailInput = document.getElementById('domicilioElectronico');
      const passwordInput = document.getElementById('contrasena');
      const rawEmail = emailInput ? emailInput.value.trim() : '';
      const rawPassword = passwordInput ? passwordInput.value.trim() : '';
      
      if (!rawEmail || !rawPassword) {
        showError('Ingrese domicilio electrónico y contraseña antes de ingresar con certificado.');
        return;
      }
      processLogin(rawEmail, rawPassword, true);
    });
  }
}

/* ==================== CURRENT DATE INITIALIZER ==================== */
function setCurrentDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  
  const todayIso = `${yyyy}-${mm}-${dd}`;
  const todayFormatted = `${dd}/${mm}/${yyyy}`;

  // Cargar la fecha actual de forma dinámica en todos los inputs tipo date y .date-today
  const dateInputs = document.querySelectorAll('input[type="date"], input.date-today');
  dateInputs.forEach(function(input) {
    if (!input.value) {
      if (input.type === 'date') {
        input.value = todayIso;
      } else {
        input.value = todayFormatted;
      }
    }
  });
}

/* ==================== AUTOCOMPLETE ==================== */
const ORGANISMOS = [
  // MAR DEL PLATA
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 1 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 2 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 3 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 4 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 5 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 6 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 7 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 8 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 9 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 10 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 11 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 12 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 13 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 14 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 15 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 16 - MAR DEL PLATA',
  'JUZGADO DE EJECUCION PENAL N° 1 - MAR DEL PLATA',
  'JUZGADO DE EJECUCION PENAL N° 2 - MAR DEL PLATA',
  'JUZGADO DE FAMILIA N° 1 - MAR DEL PLATA',
  'JUZGADO DE FAMILIA N° 2 - MAR DEL PLATA',
  'JUZGADO DE FAMILIA N° 3 - MAR DEL PLATA',
  'JUZGADO DE FAMILIA N° 4 - MAR DEL PLATA',
  'JUZGADO DE FAMILIA N° 5 - MAR DEL PLATA',
  'JUZGADO DE FAMILIA N° 6 - MAR DEL PLATA',
  'JUZGADO DE FAMILIA N° 7 - MAR DEL PLATA',
  'JUZGADO DE GARANTIAS DEL JOVEN N° 1 - MAR DEL PLATA',
  'JUZGADO DE GARANTIAS DEL JOVEN N° 2 - MAR DEL PLATA',
  'JUZGADO DE GARANTIAS DEL JOVEN N° 3 - MAR DEL PLATA',
  'JUZGADO DE GARANTIAS N° 1 - MAR DEL PLATA',
  'JUZGADO DE GARANTIAS N° 2 - MAR DEL PLATA',
  'JUZGADO DE GARANTIAS N° 3 - MAR DEL PLATA',
  'JUZGADO DE GARANTIAS N° 4 - MAR DEL PLATA',
  'JUZGADO DE GARANTIAS N° 5 - MAR DEL PLATA',
  'JUZGADO DE GARANTIAS N° 6 - MAR DEL PLATA',
  'JUZGADO DE PAZ - BALCARCE',
  'JUZGADO DE PAZ - GENERAL ALVARADO',
  'JUZGADO DE PAZ - MAR CHIQUITA',
  'JUZGADO DE RESPONSABILIDAD PENAL JUVENIL N° 1 - MAR DEL PLATA',
  'RECEPTORIA GENERAL DE EXPEDIENTES - MAR DEL PLATA',

  // LA PLATA
  'RECEPTORIA GENERAL DE EXPEDIENTES - LA PLATA',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - LA PLATA',
  'JUZGADO CIVIL Y COMERCIAL Nº 2 - LA PLATA',
  'JUZGADO CIVIL Y COMERCIAL Nº 3 - LA PLATA',
  'JUZGADO DE FAMILIA Nº 1 - LA PLATA',
  'JUZGADO DE PAZ LETRADO - LA PLATA',
  'TRIBUNAL DE TRABAJO Nº 1 - LA PLATA',
  'TRIBUNAL DE TRABAJO Nº 2 - LA PLATA',
  'CAMARA DE APELACION CIVIL Y COMERCIAL - LA PLATA',

  // SAN ISIDRO
  'RECEPTORIA GENERAL DE EXPEDIENTES - SAN ISIDRO',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - SAN ISIDRO',
  'JUZGADO CIVIL Y COMERCIAL Nº 2 - SAN ISIDRO',
  'JUZGADO DE FAMILIA Nº 1 - SAN ISIDRO',

  // MERCEDES
  'RECEPTORIA GENERAL DE EXPEDIENTES - MERCEDES',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - MERCEDES',
  'JUZGADO CIVIL Y COMERCIAL Nº 2 - MERCEDES',
  'TRIBUNAL DE TRABAJO Nº 1 - MERCEDES',

  // MORON
  'RECEPTORIA GENERAL DE EXPEDIENTES - MORON',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - MORON',
  'JUZGADO CIVIL Y COMERCIAL Nº 2 - MORON',
  'JUZGADO DE FAMILIA Nº 1 - MORON',

  // OTROS DEPARTAMENTOS
  'RECEPTORIA GENERAL DE EXPEDIENTES - BAHIA BLANCA',
  'RECEPTORIA GENERAL DE EXPEDIENTES - LA MATANZA',
  'RECEPTORIA GENERAL DE EXPEDIENTES - SAN NICOLAS',
  'RECEPTORIA GENERAL DE EXPEDIENTES - LOMAS DE ZAMORA',
  'RECEPTORIA GENERAL DE EXPEDIENTES - SAN MARTIN',
  'RECEPTORIA GENERAL DE EXPEDIENTES - CAMPANA',
  'RECEPTORIA GENERAL DE EXPEDIENTES - TRENQUE LAUQUEN',
  'RECEPTORIA GENERAL DE EXPEDIENTES - NECOCHEA',
  'RECEPTORIA GENERAL DE EXPEDIENTES - JUNIN',
  'RECEPTORIA GENERAL DE EXPEDIENTES - PERGAMINO',
  'RECEPTORIA GENERAL DE EXPEDIENTES - DOLORES',
  'RECEPTORIA GENERAL DE EXPEDIENTES - AZUL',
  'RECEPTORIA GENERAL DE EXPEDIENTES - QUILMES',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - LOMAS DE ZAMORA',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - BAHIA BLANCA',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - QUILMES',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - LA MATANZA',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - AZUL',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - DOLORES',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - SAN NICOLAS',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - TRENQUE LAUQUEN',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - ZARATE - CAMPANA'
];

const MIS_ORGANISMOS = [
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 1 - MAR DEL PLATA',
  'JUZGADO EN LO CIVIL Y COMERCIAL N° 2 - MAR DEL PLATA',
  'JUZGADO DE FAMILIA N° 1 - MAR DEL PLATA',
  'JUZGADO CIVIL Y COMERCIAL Nº 1 - LA PLATA',
  'RECEPTORIA GENERAL DE EXPEDIENTES - MAR DEL PLATA'
];

function initAutocomplete() {
  const acInputs = document.querySelectorAll('.autocomplete-input');
  acInputs.forEach(function(input) {
    const wrapper = input.closest('.autocomplete-wrapper');
    const list = wrapper ? wrapper.querySelector('.autocomplete-list') : null;
    if (!list) return;

    function renderOptions() {
      const val = input.value.toLowerCase().trim();
      const deptoSelect = document.getElementById('deptoSelect');
      const selectedDepto = deptoSelect ? deptoSelect.value.toLowerCase().trim() : 'todos';
      const soloMisOrgCheck = document.getElementById('soloMisOrg');
      const isSoloMis = soloMisOrgCheck ? soloMisOrgCheck.checked : false;

      let sourceList = isSoloMis ? MIS_ORGANISMOS : ORGANISMOS;

      const currentPage = window.location.pathname.split('/').pop();

      // En Inicio de Causa solo deben aparecer Receptorías
      if (currentPage === 'inicio-causa.html') {
        sourceList = sourceList.filter(function(org) {
          return org.toLowerCase().includes('receptoria');
        });
      } 
      // En Nueva Presentación solo deben aparecer Juzgados (sin Receptorías)
      else if (currentPage === 'gestion-presentacion.html') {
        sourceList = sourceList.filter(function(org) {
          return !org.toLowerCase().includes('receptoria');
        });
      }

      // Filtrar por Departamento Judicial si hay uno seleccionado
      if (selectedDepto && selectedDepto !== 'todos') {
        sourceList = sourceList.filter(function(org) {
          return org.toLowerCase().includes(selectedDepto);
        });
      }

      // Filtrar por texto escrito
      const matches = sourceList.filter(function(org) {
        return val === '' || org.toLowerCase().includes(val);
      });

      if (matches.length === 0) {
        list.classList.remove('active');
        list.innerHTML = '';
        return;
      }

      list.innerHTML = '';
      matches.forEach(function(org) {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = org;
        item.addEventListener('click', function() {
          input.value = org;
          list.classList.remove('active');
          list.innerHTML = '';
          
          const selectedMsg = wrapper.closest('.section-body')?.querySelector('.no-org-msg');
          if (selectedMsg) {
            selectedMsg.textContent = 'Organismo seleccionado: ' + org;
            selectedMsg.style.color = '#2c5aa0';
            selectedMsg.style.fontWeight = 'bold';
          }
        });
        list.appendChild(item);
      });
      list.classList.add('active');
    }

    input.addEventListener('input', renderOptions);
    input.addEventListener('focus', renderOptions);

    // Escuchar cambios en selector de Departamento y Checkbox sólo mis organismos
    const deptoSelect = document.getElementById('deptoSelect');
    if (deptoSelect) {
      deptoSelect.addEventListener('change', function() {
        if (document.activeElement === input || input.value.length > 0) {
          renderOptions();
        }
      });
    }

    const soloMisOrgCheck = document.getElementById('soloMisOrg');
    if (soloMisOrgCheck) {
      soloMisOrgCheck.addEventListener('change', function() {
        renderOptions();
      });
    }

    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        list.classList.remove('active');
      }
    });
  });
}

/* ==================== DESTINATARIOS Y CAUSAS DATABASES ==================== */
let DESTINATARIOS_DATA = [
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
];

let CAUSAS_DATA = [
  {
    id: 'causa-1',
    title: '60969 BANCO DEL SUR S.A. C/ GÓMEZ MARTÍN ALEJANDRO S/ EJECUCION HIPOTECARIA',
    caratula: 'BANCO DEL SUR S.A. C/ GÓMEZ MARTÍN ALEJANDRO S/ EJECUCION HIPOTECARIA',
    letra: 'B',
    numero: '60969',
    ext: '2023',
    prefijo: '60',
    recNum: '969',
    recAno: '2023'
  },
  {
    id: 'causa-2',
    title: 'MP-27253-2023 ROJAS CARLOS ALBERTO Y OTRO/A C/ SUCESORES DE LÓPEZ LUIS EDUARDO S/ EJECUCION DE SENTENCIA',
    caratula: 'ROJAS CARLOS ALBERTO Y OTRO/A C/ SUCESORES DE LÓPEZ LUIS EDUARDO S/ EJECUCION DE SENTENCIA',
    letra: 'MP',
    numero: '27253',
    ext: '2023',
    prefijo: 'MP',
    recNum: '27253',
    recAno: '2023'
  },
  {
    id: 'causa-3',
    title: '78520591 ROJAS CARLOS ALBERTO Y OTRO C/ SUCESORES DE LÓPEZ LUIS EDUARDO S/ QUEJA POR APELACION DENEGADA',
    caratula: 'ROJAS CARLOS ALBERTO Y OTRO C/ SUCESORES DE LÓPEZ LUIS EDUARDO S/ QUEJA POR APELACION DENEGADA',
    letra: 'R',
    numero: '78520591',
    ext: '2022',
    prefijo: '78',
    recNum: '520591',
    recAno: '2022'
  }
];

function refreshCausasAndDestinatarios() {
  fetch('/api/causas')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        CAUSAS_DATA = data;
      }
    })
    .catch(() => {});

  fetch('/api/destinatarios')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        DESTINATARIOS_DATA = data;
      }
    })
    .catch(() => {});
}

// Cargar dinámicamente al inicio
refreshCausasAndDestinatarios();

/* ==================== BUSQUEDA DE DESTINATARIOS MODAL ==================== */
function buscarDestinatarios() {
  const oldModal = document.getElementById('modalDestinatarios');
  if (oldModal) oldModal.remove();

  // Obtener texto pre-escrito en Domicilio Electrónico si existe
  let initialSearchText = '';
  const titularLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Domicilio Electrónico'));
  if (titularLabel) {
    const input = titularLabel.parentElement.querySelector('input');
    if (input && input.value) initialSearchText = input.value.trim();
  }

  const overlay = document.createElement('div');
  overlay.className = 'scba-modal-overlay';
  overlay.id = 'modalDestinatarios';

  overlay.innerHTML = `
    <div class="scba-modal">
      <div class="scba-modal-header">
        <h3>Búsqueda de Destinatarios</h3>
        <button class="scba-modal-close" onclick="cerrarModal('modalDestinatarios')">✕</button>
      </div>
      <div class="scba-modal-toolbar">
        <div>
          Mostrar 
          <select id="destLimit">
            <option value="10" selected>10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select> 
          trámites por página
        </div>
        <div class="scba-modal-search">
          <label>Buscar</label>
          <input type="text" id="destSearchInput" value="${initialSearchText}">
        </div>
      </div>
      <div class="scba-modal-body">
        <table class="scba-modal-table">
          <thead>
            <tr>
              <th>Destinatarios ⇅</th>
              <th style="width: 130px; text-align: right;">Acción</th>
            </tr>
          </thead>
          <tbody id="destTableBody">
          </tbody>
        </table>
        <div class="scba-pagination-bar">
          <span id="destPageInfo">Página 1 de 1</span>
          <div class="scba-pagination-controls">
            <button disabled style="color: #999;">Anterior</button>
            <button class="page-num active">1</button>
            <button disabled style="color: #999;">Siguiente</button>
          </div>
        </div>
      </div>
      <div class="scba-modal-footer">
        <a class="link-cerrar" onclick="cerrarModal('modalDestinatarios')">Cerrar</a>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const tableBody = document.getElementById('destTableBody');
  const searchInput = document.getElementById('destSearchInput');
  const pageInfo = document.getElementById('destPageInfo');

  function renderDestinatarios(filterText) {
    tableBody.innerHTML = '';
    const query = (filterText || '').toLowerCase();
    
    const filtered = DESTINATARIOS_DATA.filter(function(d) {
      return !query || d.title.toLowerCase().includes(query) || d.sub.toLowerCase().includes(query) || d.cuit.includes(query);
    });

    if (pageInfo) {
      pageInfo.textContent = `Página 1 de ${Math.max(1, Math.ceil(filtered.length / 10))}`;
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #888; padding: 20px;">No se encontraron destinatarios</td></tr>`;
      return;
    }

    filtered.forEach(function(item) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="destinatario-item-info">
            <div class="destinatario-icon">${item.icon}</div>
            <div class="destinatario-text">
              <div class="destinatario-title">${item.title}</div>
              <div class="destinatario-sub">${item.sub}</div>
            </div>
          </div>
        </td>
        <td style="text-align: right;">
          <button class="btn-seleccionar">Seleccionar</button>
        </td>
      `;

      tr.querySelector('.btn-seleccionar').addEventListener('click', function() {
        seleccionarDestinatario(item);
      });

      tableBody.appendChild(tr);
    });
  }

  searchInput.addEventListener('input', function() {
    renderDestinatarios(this.value);
  });

  renderDestinatarios(initialSearchText);
}

function seleccionarDestinatario(dest) {
  const inputs = document.querySelectorAll('input');
  
  // Rellenar Domicilio Electrónico / Titular / Denominación
  const titularLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Domicilio Electrónico'));
  if (titularLabel) {
    const input = titularLabel.parentElement.querySelector('input');
    if (input) input.value = `${dest.rawName} - ${dest.rawEmail}`;
  }

  // Rellenar Cuif / Cuil
  const cuilLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Cuif / Cuil'));
  if (cuilLabel) {
    const input = cuilLabel.parentElement.querySelector('input');
    if (input) input.value = dest.cuit;
  }

  // Rellenar Localidad
  const locLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent.trim() === 'Localidad');
  if (locLabel) {
    const input = locLabel.parentElement.querySelector('input') || locLabel.parentElement.querySelector('select');
    if (input) input.value = dest.localidad;
  }

  // Rellenar Partido
  const partLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent.trim() === 'Partido');
  if (partLabel) {
    const input = partLabel.parentElement.querySelector('input');
    if (input) input.value = dest.partido;
  }

  cerrarModal('modalDestinatarios');
}

/* ==================== BUSQUEDA DE CAUSAS MODAL ==================== */
function buscarEnOrganismo() {
  const oldModal = document.getElementById('modalCausas');
  if (oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.className = 'scba-modal-overlay';
  overlay.id = 'modalCausas';

  overlay.innerHTML = `
    <div class="scba-modal" style="max-width: 700px;">
      <div class="scba-modal-header">
        <h3>Búsqueda de causas</h3>
        <button class="scba-modal-close" onclick="cerrarModal('modalCausas')">✕</button>
      </div>
      <div class="scba-modal-body">
        <table class="scba-modal-table">
          <thead>
            <tr>
              <th>Causa</th>
              <th style="width: 130px; text-align: right;">Acción</th>
            </tr>
          </thead>
          <tbody id="causasTableBody">
          </tbody>
        </table>
      </div>
      <div class="scba-modal-footer">
        <button class="btn-volver" onclick="cerrarModal('modalCausas')">Volver</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const tableBody = document.getElementById('causasTableBody');
  tableBody.innerHTML = '';

  CAUSAS_DATA.forEach(function(causa) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-size: 13px; font-weight: 500; color: #333; line-height: 1.4;">
        ${causa.title}
      </td>
      <td style="text-align: right;">
        <button class="btn-seleccionar">Seleccionar</button>
      </td>
    `;

    tr.querySelector('.btn-seleccionar').addEventListener('click', function() {
      seleccionarCausa(causa);
    });

    tableBody.appendChild(tr);
  });
}

function seleccionarCausa(causa) {
  // Actualizar Carátula
  const caratulaLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Texto en la Carátula'));
  if (caratulaLabel) {
    const input = caratulaLabel.parentElement.querySelector('input');
    if (input) input.value = causa.caratula;
  }

  // Actualizar Número de Causa (Letra, Número, Extensión)
  const causaRow = document.querySelector('.causa-number-row');
  if (causaRow) {
    const inputs = causaRow.querySelectorAll('input');
    if (inputs.length >= 3) {
      inputs[0].value = causa.letra;
      inputs[1].value = causa.numero;
      inputs[2].value = causa.ext;
    }
  }

  // Actualizar Nota de Causa Seleccionada
  const selectedNote = document.querySelector('#bodyCausa .field-note');
  if (selectedNote) {
    selectedNote.textContent = 'Causa seleccionada: ' + causa.title;
    selectedNote.style.color = '#2c5aa0';
    selectedNote.style.fontWeight = 'bold';
    selectedNote.style.fontStyle = 'normal';
  }

  cerrarModal('modalCausas');
}

function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.remove();
}

/* ==================== CARGAR MODELOS OFICIALES SCBA ==================== */
const MODELOS_ESCRITOS = {
  'Apertura de cuenta': `<p style="text-align: center;"><strong>SOLICITA APERTURA DE CUENTA JUDICIAL</strong></p>
    <br>
    <p>Señor Juez:</p>
    <br>
    <p>Por la representación acreditada en los autos caratulados sobre el rubro, a V.S. digo:</p>
    <br>
    <p>1. Que vengo por el presente a solicitar se ordene la apertura de una Cuenta Judicial de Depósitos en Pesos a nombre de autos y a la orden de este Juzgado en el Banco de la Provincia de Buenos Aires, Sucursal correspondiente.</p>
    <br>
    <p>2. A tal fin, solicito se libre el correspondiente oficio y/o comunicación electrónica conforme el régimen de la Acordada de la SCBA.</p>
    <br>
    <p>Proveer de conformidad,</p>
    <p style="text-align: center;"><strong>SERÁ JUSTICIA.</strong></p>`,
  'Cédula Acordada 3845': `
<p style="text-align:center;"><strong>PODER JUDICIAL</strong><br>
<strong>PROVINCIA DE BUENOS AIRES</strong><br>
<strong>CÉDULA DE NOTIFICACIÓN ELECTRÓNICA</strong></p>

<p>&nbsp;</p>

<p><strong>REMITENTE</strong></p>
<p>NOMBRE DEL ÓRGANO:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<p>SECRETARÍA:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<p>DOMICILIO FÍSICO DEL ÓRGANO:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<hr>

<p><strong>DESTINATARIO</strong></p>
<p>NOMBRE / DESIGNACIÓN DEL REQUERIDO:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<p>DOMICILIO ELECTRÓNICO:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<hr>

<p><strong>CARÁCTER DEL TRÁMITE</strong> <em>(Tildar la opción que corresponda)</em></p>
<p>NORMAL &nbsp;&nbsp;(...)</p>
<p>URGENTE &nbsp;(...)</p>
<hr>

<p><strong>EXPEDIENTE</strong></p>
<p>CARÁTULA:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<p>NÚMERO RECEPTORÍA:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<p>NÚMERO INTERNO DEL ÓRGANO:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<hr>

<p><strong>COPIAS</strong> <em>(Tildar la opción que corresponda)</em></p>
<p>&nbsp;&nbsp;&nbsp;&nbsp;SÍ &nbsp;&nbsp;(...)</p>
<p>&nbsp;&nbsp;&nbsp;&nbsp;NO &nbsp;(...)</p>
<p>INDIVIDUALIZACIÓN DE LOS ESCRITOS O DOCUMENTOS CUYA COPIA SE ACOMPAÑA:</p>
<p>&nbsp;</p>
<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>
<hr>

<p><strong>EXIMICIÓN DE COPIAS</strong> <em>(Tildar la opción que corresponda)</em>:</p>
<p>&nbsp;&nbsp;&nbsp;&nbsp;SÍ &nbsp;&nbsp;(...)</p>
<p>&nbsp;&nbsp;&nbsp;&nbsp;NO &nbsp;(...)</p>
<hr>

<p>NOTIFICO a Ud. que en el expediente arriba indicado que tramita por ante este Órgano con <em>(fecha variable)</em>, se ha resuelto: <em>(texto a notificar)</em></p>

<p>&nbsp;</p>

<p><strong>QUEDA UD. DEBIDAMENTE NOTIFICADO.</strong></p>

<p>&nbsp;</p>

<p>(Localidad), (dd/mm/aa)</p>
`,
  'Cédula Civil y Comercial': `
<p><strong>CC</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<em>Fecha de recepción en Ofic./Deleg. o Juzgado de Paz</em></p>

<p style="text-align:center;"><strong>PODER JUDICIAL PROVINCIA DE BUENOS AIRES</strong><br>
<strong>CEDULA DE NOTIFICACION</strong></p>

<p>&nbsp;</p>

<table style="width:100%; border-collapse:collapse; font-size:13px;">
  <tr>
    <td style="width:60%;"><strong>NOMBRE DEL ORGANO</strong><br>&nbsp;</td>
    <td style="width:40%; text-align:right;"><em>Sello del Órgano</em></td>
  </tr>
  <tr>
    <td colspan="2"><strong>DOMICILIO DEL ORGANO</strong><br>&nbsp;</td>
  </tr>
  <tr>
    <td colspan="2"><strong>NOMBRE DEL REQUERIDO</strong><br>&nbsp;</td>
  </tr>
  <tr>
    <td><strong>DOMICILIO</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
    <td><strong>NRO</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
  </tr>
  <tr>
    <td><strong>PISO</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; D/T/O.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; UNIDAD&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
    <td><strong>LOCALIDAD/PARTIDO</strong></td>
  </tr>
</table>

<p>&nbsp;</p>
<p><strong>TIPO DE DOMICILIO</strong> <em>(Indicar por SI – NO según corresponda)</em></p>
<p><strong>DENUNCIADO</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>CONSTITUIDO</strong></p>
<p><strong>CARÁCTER</strong> <em>(Indicar por SI – NO según corresponda)</em></p>
<p><strong>URGENTE</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>Y/O HABILITACION DE DIA Y HORA</strong></p>

<p><strong>OBSERVACIONES ESPECIALES</strong></p>
<p><em>(Traslado de demanda - Art.94 CPCC - Art. 524 CPCC - Bajo responsabilidad de la parte)</em></p>

<p>&nbsp;</p>
<table style="width:100%; font-size:12px; border-collapse:collapse;">
  <tr>
    <td style="text-align:right;"><em>(testar lo que no corresponda)</em></td>
  </tr>
  <tr>
    <td style="text-align:right;">SI/NO &nbsp; copias &nbsp;&nbsp;&nbsp;&nbsp; SI/NO</td>
  </tr>
</table>

<hr>

<table style="width:100%; font-size:12px; text-align:center; border-collapse:collapse;">
  <tr>
    <td>Nº de orden</td>
    <td>Expte. Nº</td>
    <td>ZONA</td>
    <td>FUERO</td>
    <td>Nº Org.</td>
    <td>Dep. Jud.</td>
    <td>En fs.</td>
    <td>Personal</td>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
</table>

<hr>

<p>NOTIFICO a Ud. que en el expediente caratulado:</p>
<p>&nbsp;</p>
<p>Que tramita por ante este órgano, se ha resuelto:</p>
<p>&nbsp;</p>
<p>&nbsp;</p>
<p>Copias (SI o NO)</p>

<p>&nbsp;</p>

<p><strong>QUEDA UD. DEBIDAMENTE NOTIFICADO.</strong></p>

<p>Pase para su diligenciamiento a la Oficina o Delegación de Mandamientos y Notificaciones o Juzgado de Paz de:</p>

<p>&nbsp;</p>

<p>En la ciudad de &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;, a los &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; días del mes de &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; del año &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p>

<p>&nbsp;</p>
<p style="text-align:center;">______________________________<br>Firma y sello</p>
`,
  'Cédula Ley 22.172': `
    <p style="text-align: center;"><strong>CÉDULA DE NOTIFICACIÓN EXTRAJURISDICCIONAL - LEY 22.172</strong></p>
    <br>
    <p>Se hace saber al requerido con domicilio en la jurisdicción extraña que por ante el Juzgado oficiante se ha dictado la siguiente medida...</p>
  `,
  'Contesta a otro Juez': `
    <p style="text-align: center;"><strong>CONTESTA OFICIO / REQUERIMIENTO JUDICIAL</strong></p>
    <br>
    <p>Señor Juez:</p>
    <br>
    <p>Tengo el agrado de dirigirme a V.S. en respuesta al oficio librado en autos caratulados de referencia, a fin de informar que se ha dado cumplimiento a la medida ordenada por su Juzgado.</p>
  `,
  'Informe de Pericia': `
    <p style="text-align: center;"><strong>PRESENTA INFORME PERICIAL JUDICIAL</strong></p>
    <br>
    <p>Señor Juez:</p>
    <br>
    <p>El Perito designado en autos se presenta ante V.S. y expone las conclusiones de la pericia realizada conforme los puntos periciales obrantes en el expediente...</p>
  `
};

function cargarModelo() {

  const select = document.getElementById('modeloSelect');
  if (select && select.value) {
    const editor = document.querySelector('.editor-area');
    if (editor) {
      const templateHtml = MODELOS_ESCRITOS[select.value] || `<p><em>Modelo cargado: ${select.value}</em></p>`;
      editor.innerHTML = templateHtml;
    }
  } else {
    alert('Seleccione un modelo primero.');
  }
}

function cargarModelo() {
  const select = document.getElementById('modeloSelect');
  if (select && select.value) {
    const editor = document.querySelector('.editor-area');
    if (editor) {
      const templateHtml = MODELOS_ESCRITOS[select.value] || `<p><em>Modelo cargado: ${select.value}</em></p>`;
      editor.innerHTML = templateHtml;
    }
  } else {
    alert('Seleccione un modelo primero.');
  }
}

function cerrarSesion() {
  sessionStorage.removeItem('studentName');
  sessionStorage.removeItem('studentLoginTime');
  window.location.href = 'index.html';
}


/* ==================== SESION DE USUARIO Y LISTAS DINAMICAS ==================== */
function loadUserSession() {
  const studentName = sessionStorage.getItem('studentName');
  const studentLoginTime = sessionStorage.getItem('studentLoginTime');
  const userDetailsSpan = document.querySelector('.user-details');
  
  const currentPage = window.location.pathname.split('/').pop();
  const isPublicPage = (currentPage === 'index.html' || currentPage === 'admin.html' || currentPage === '');

  if (!studentName || !studentLoginTime) {
    if (!isPublicPage) {
      window.location.href = 'index.html';
    }
  } else if (userDetailsSpan) {
    userDetailsSpan.textContent = 'Usuario Conectado: ' + studentName + ' - Acceso anterior: ' + studentLoginTime + ' - Accesos anterior sólo lectura: Sin registros';
  }
}

function populateDropdown(labelText, items) {
  const labels = Array.from(document.querySelectorAll('label'));
  const label = labels.find(el => el.textContent.trim().replace(/:/g, '') === labelText);
  if (label) {
    const select = label.parentElement.querySelector('select');
    if (select) {
      const currentVal = select.value;
      select.innerHTML = '<option value="">Seleccione...</option>';
      items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        select.appendChild(opt);
      });
      if (currentVal && items.includes(currentVal)) {
        select.value = currentVal;
      }
    }
  }
}

/* ==================== FUNCIONES DE BÚSQUEDA Y RESULTADOS ==================== */
function buscar(formId) {
  if (formId === 'formPresentaciones') {
    const panel = document.getElementById('resultadosPanel');
    const tbody = document.getElementById('tablaResultadosPresentaciones');
    if (!panel || !tbody) return;

    panel.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#666;">Cargando presentaciones...</td></tr>';

    fetch('/api/complaints')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (!data || data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#888;">No se encontraron presentaciones para los criterios ingresados.</td></tr>';
          return;
        }
        tbody.innerHTML = '';
        data.forEach(item => {
          const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-AR') : 'Hoy';
          const statusText = item.status || 'Enviada';
          const feedbackMsg = item.feedback ? `<br><small style="color:#27ae60; font-style:italic;">Profesor: ${escapeHTML(item.feedback)}</small>` : '';
          const tr = document.createElement('tr');
          tr.style.borderBottom = '1px solid #eee';
          tr.innerHTML = `
            <td style="padding:10px;">${dateStr}</td>
            <td style="padding:10px;"><strong>${escapeHTML(item.title)}</strong>${feedbackMsg}</td>
            <td style="padding:10px;">${escapeHTML(item.organism || 'JUZGADO CIVIL Y COMERCIAL')}</td>
            <td style="padding:10px;">${escapeHTML(item.sender || 'ALUMNO')}</td>
            <td style="padding:10px; text-align:center;"><span style="background:#e8f4fd; color:#2c5aa0; padding:3px 8px; border-radius:4px; font-weight:600; font-size:12px;">${escapeHTML(statusText)}</span></td>
          `;
          tbody.appendChild(tr);
        });
      })
      .catch(() => {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#888;">No se encontraron presentaciones.</td></tr>';
      });
  } else if (formId === 'formNotificaciones') {
    const panel = document.getElementById('resultadosPanelNotif');
    const tbody = document.getElementById('tablaResultadosNotificaciones');
    if (!panel || !tbody) return;

    panel.style.display = 'block';
    tbody.innerHTML = '';

    const notifs = [
      { fecha: new Date().toLocaleDateString('es-AR'), tramite: 'NOTIFICACIÓN DE PROVIDENCIA - Causa 60969', organo: 'JUZGADO CIVIL Y COMERCIAL N° 1 - MAR DEL PLATA', estado: 'No Procesada' },
      { fecha: '30/07/2026', tramite: 'NOTIFICACIÓN DE AUDIENCIA - Causa MP-27253', organo: 'JUZGADO CIVIL Y COMERCIAL N° 2 - MAR DEL PLATA', estado: 'Procesada' }
    ];

    notifs.forEach(item => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #eee';
      tr.innerHTML = `
        <td style="padding:10px;">${item.fecha}</td>
        <td style="padding:10px;"><strong>${item.tramite}</strong></td>
        <td style="padding:10px;">${item.organo}</td>
        <td style="padding:10px; text-align:center;"><span style="background:${item.estado === 'No Procesada' ? '#fdf2f2' : '#eefbf2'}; color:${item.estado === 'No Procesada' ? '#c0392b' : '#27ae60'}; padding:3px 8px; border-radius:4px; font-weight:600; font-size:12px;">${item.estado}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } else if (formId === 'formMisCausas') {
    const panel = document.getElementById('resultadosPanelCausas');
    const container = document.getElementById('tablaResultadosMisCausas');
    if (!panel || !container) return;

    panel.style.display = 'block';
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Buscando causas y presentaciones...</div>';

    const currentStudent = sessionStorage.getItem('studentName') || '';

    Promise.all([
      fetch('/api/causas').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/inicios-causa').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/complaints').then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([causasBase, iniciosCausa, complaints]) => {
      CACHE_MIS_CAUSAS = {};

      // Filtrar inicios de causa pertenecientes únicamente al alumno actual
      const misInicios = iniciosCausa.filter(ic => isItemForCurrentStudent(ic.sender, currentStudent));
      
      // Filtrar presentaciones y quejas pertenecientes únicamente al alumno actual
      const misComplaints = complaints.filter(cp => isItemForCurrentStudent(cp.sender, currentStudent));

      const combined = [
        ...misInicios.map((ic, idx) => ({
          id: ic.id || 'ic-' + idx,
          numero: ic.radicacion || ic.causaNumber || `MP-${8900 + idx}-2026`,
          caratula: ic.caratula || ic.titulo || `Inicio de Causa: ${ic.fuero || ''} ${ic.objeto || ''}`,
          organismo: ic.organismo || 'RECEPTORIA GENERAL DE EXPEDIENTES - MAR DEL PLATA',
          departamento: ic.localidad || 'Mar del Plata',
          estado: ic.status || 'Recibida por RECEPTORIA GENERAL DE EXPEDIENTES',
          estadoBadge: ic.status ? `${ic.status} - ${ic.createdAt ? new Date(ic.createdAt).toLocaleDateString('es-AR') : '21/08/2026'}` : `Recibida - 21/08/2026`,
          feedback: ic.feedback || '',
          grade: ic.grade || '',
          sender: ic.sender || currentStudent,
          createdAt: ic.createdAt,
          intervinientes: ic.intervinientes || [],
          objeto: ic.objeto || '',
          fuero: ic.fuero || '',
          textoPresentacion: ic.textoPresentacion,
          tipoRegistro: 'Inicio de Causa'
        })),
        ...misComplaints.map((cp, idx) => ({
          id: cp.id || 'cp-' + idx,
          numero: cp.causaNumber || `MP-${6000 + idx}-2026`,
          caratula: cp.title || `Presentación de ${cp.sender || 'Alumno'}`,
          organismo: cp.organism || 'JUZGADO EN LO CIVIL Y COMERCIAL',
          departamento: 'Mar del Plata',
          estado: cp.status || 'Pendiente',
          estadoBadge: `${cp.status || 'Pendiente'} - ${cp.createdAt ? new Date(cp.createdAt).toLocaleDateString('es-AR') : '20/08/2026'}`,
          feedback: cp.feedback || '',
          grade: cp.grade || '',
          sender: cp.sender || currentStudent,
          createdAt: cp.createdAt,
          content: cp.content,
          tipoRegistro: cp.type || 'Presentación Escrita'
        })),
        ...causasBase.map((c, idx) => ({
          id: c.id || 'c-' + idx,
          numero: (c.letra ? c.letra + '-' : '') + (c.numero || (26898 + idx)) + (c.ext ? '-' + c.ext : '-2026'),
          caratula: c.caratula || c.title,
          organismo: c.organismo || 'TRIBUNAL DEL TRABAJO Nº 4 - MAR DEL PLATA',
          departamento: c.departamento || 'Mar del Plata',
          estado: 'Autorizada',
          estadoBadge: `Autorizada - 19/08/2026`,
          feedback: '',
          grade: '',
          sender: 'Sistema SCBA',
          tipoRegistro: 'Causa Judicial en Trámite'
        }))
      ];

      if (combined.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">No se encontraron causas o presentaciones registradas para tu usuario.</div>';
        return;
      }

      container.innerHTML = '';
      combined.forEach(item => {
        CACHE_MIS_CAUSAS[item.id] = item;

        const causeCard = document.createElement('div');
        causeCard.className = 'scba-cause-card';

        const feedbackMsg = item.feedback ? `<div style="margin-top:8px; font-size:12px; color:#27ae60; font-style:italic;">Profesor: ${escapeHTML(item.feedback)}</div>` : '';

        causeCard.innerHTML = `
          <div class="scba-cause-header">
            <div class="scba-cause-num"><strong>Número:</strong> ${escapeHTML(item.numero)}</div>
            <div class="scba-cause-badge">${escapeHTML(item.estadoBadge)}</div>
          </div>
          <div class="scba-cause-caratula">
            <label>Carátula:</label> <span class="caratula-text">${escapeHTML(item.caratula)}</span>
          </div>
          <div class="scba-cause-juzgado">
            <label>Juzgado:</label> <span class="juzgado-text">${escapeHTML(item.organismo)}</span>
          </div>
          ${feedbackMsg}
          <div class="scba-cause-actions">
            <button class="btn-scba-green" onclick="verDetalleCausa('${item.id}')">Ver Causa Completa</button>
          </div>
        `;

        container.appendChild(causeCard);
      });
    }).catch(() => {
      container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">No se encontraron causas.</div>';
    });
  }
}

/* ==================== VER DETALLE CAUSA MODAL ==================== */
let CACHE_MIS_CAUSAS = {};

function isItemForCurrentStudent(sender, currentStudent) {
  if (!sender) return false;
  if (!currentStudent) return true;
  const sNorm = sender.toLowerCase().trim().replace(/\s*\(certificado\)/i, '');
  const cNorm = currentStudent.toLowerCase().trim().replace(/\s*\(certificado\)/i, '');
  const sUser = sNorm.split('@')[0];
  const cUser = cNorm.split('@')[0];
  return sUser === cUser || sNorm === cNorm || sNorm.includes(cNorm) || cNorm.includes(sNorm);
}

function verDetalleCausa(itemId) {
  const item = CACHE_MIS_CAUSAS[itemId];
  if (!item) return;

  const oldModal = document.getElementById('modalDetalleCausa');
  if (oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.className = 'scba-modal-overlay';
  overlay.id = 'modalDetalleCausa';

  const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('es-AR') : 'Fecha no especificada';

  const intervinientesBlock = (Array.isArray(item.intervinientes) && item.intervinientes.length > 0) ? `
    <div style="margin-top:16px;">
      <strong style="color:#2c5aa0; font-size:13px;">Intervinientes / Partes de la Causa:</strong>
      <table class="ic-intervinientes-table" style="margin-top:6px;">
        <thead>
          <tr>
            <th>Rol Procesal</th>
            <th>Nombre / Razón Social</th>
            <th>Documento</th>
            <th>Género</th>
          </tr>
        </thead>
        <tbody>
          ${item.intervinientes.map(p => `
            <tr>
              <td><span style="background:#e8f4fd; color:#2c5aa0; padding:2px 6px; border-radius:3px; font-weight:bold; font-size:11.5px;">${escapeHTML(p.rol || 'Parte')}</span></td>
              <td><strong>${escapeHTML((p.apellido ? p.apellido + (p.nombre ? ', ' + p.nombre : '') : p.nombre || '-').toUpperCase())}</strong></td>
              <td>${escapeHTML((p.tipoDoc ? p.tipoDoc + ': ' : '') + (p.nroDoc || '-'))}</td>
              <td>${escapeHTML(p.genero || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const feedbackBlock = (item.feedback || item.grade) ? `
    <div style="margin-top:20px; background:#eefbf2; border:1px solid #c3e6cb; padding:14px; border-radius:6px;">
      <strong style="color:#27ae60; font-size:14px; display:block; margin-bottom:6px;">📝 Devolución / Corrección del Docente:</strong>
      <p style="margin:0; font-size:13px; color:#2d572c; white-space:pre-wrap;">${escapeHTML(item.feedback || 'Sin comentarios adicionales.')}</p>
      ${item.grade ? `<div style="margin-top:10px; font-weight:bold; color:#155724; font-size:14px;">🏅 Calificación / Nota: ${escapeHTML(item.grade)}</div>` : ''}
    </div>
  ` : '';

  const contentBlock = (item.content || item.textoPresentacion) ? `
    <div style="margin-top:16px;">
      <strong style="color:#2c5aa0; font-size:13px;">Contenido del Escrito / Presentación:</strong>
      <div style="background:#f8f9fa; border:1px solid #ddd; padding:12px; border-radius:4px; margin-top:6px; font-family:monospace; font-size:12px; white-space:pre-wrap; max-height:260px; overflow-y:auto; color:#333;">${escapeHTML(item.content || item.textoPresentacion)}</div>
    </div>
  ` : '';

  overlay.innerHTML = `
    <div class="scba-modal" style="max-width: 700px;">
      <div class="scba-modal-header">
        <h3 style="margin:0; font-size:16px; color:#2c5aa0;">📋 Visualización de Causa Completa</h3>
        <button class="scba-modal-close" onclick="cerrarModal('modalDetalleCausa')">✕</button>
      </div>
      <div class="scba-modal-body" style="padding: 20px;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size:13px;">
          <div><strong>Número de Causa:</strong><br><span style="color:#333; font-weight:bold;">${escapeHTML(item.numero || 'Sin número')}</span></div>
          <div><strong>Carátula:</strong><br><span style="color:#0288d1; font-weight:bold; text-transform:uppercase;">${escapeHTML(item.caratula || item.title)}</span></div>
          <div><strong>Organismo:</strong><br>${escapeHTML(item.organismo)}</div>
          <div><strong>Departamento Judicial:</strong><br>${escapeHTML(item.departamento)}</div>
          <div><strong>Remitente:</strong><br>${escapeHTML(item.sender || 'Sistema SCBA')}</div>
          <div><strong>Fecha:</strong><br>${escapeHTML(dateStr)}</div>
          <div><strong>Estado:</strong><br><span style="background:#00a0d2; color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:12px;">${escapeHTML(item.estadoBadge || item.estado)}</span></div>
        </div>

        ${intervinientesBlock}
        ${contentBlock}
        ${feedbackBlock}
      </div>
      <div class="scba-modal-footer" style="justify-content: flex-end;">
        <button class="btn btn-outline" onclick="cerrarModal('modalDetalleCausa')">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function crearPresentacionParaCausa(itemId) {
  const item = CACHE_MIS_CAUSAS[itemId];
  if (item) {
    sessionStorage.setItem('selectedCausaForPresentacion', JSON.stringify(item));
  }
  window.location.href = 'gestion-presentacion.html';
}

function verCuentasBancarias(itemId) {
  const item = CACHE_MIS_CAUSAS[itemId];
  const oldModal = document.getElementById('modalCuentasBancarias');
  if (oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.className = 'scba-modal-overlay';
  overlay.id = 'modalCuentasBancarias';

  const nroCausa = item ? (item.numero || 'MP-26898-2026') : 'MP-26898-2026';
  const caratula = item ? (item.caratula || item.title || 'Causa Judicial') : 'Causa Judicial';

  overlay.innerHTML = `
    <div class="scba-modal" style="max-width: 550px;">
      <div class="scba-modal-header">
        <h3 style="margin:0; font-size:15px;">💳 Cuentas Bancarias de la Causa</h3>
        <button class="scba-modal-close" onclick="cerrarModal('modalCuentasBancarias')">✕</button>
      </div>
      <div class="scba-modal-body" style="padding: 20px; font-size: 13px;">
        <div style="background:#f0f7ff; border:1px solid #cce3f7; padding:12px; border-radius:4px; margin-bottom:15px; font-size:13px;">
          <strong>Causa N°:</strong> ${escapeHTML(nroCausa)}<br>
          <strong>Carátula:</strong> <span style="color:#0288d1; font-weight:bold;">${escapeHTML(caratula)}</span>
        </div>
        <table class="scba-modal-table">
          <thead>
            <tr>
              <th>Banco</th>
              <th>Sucursal</th>
              <th>CBU / N° Cuenta Judicial</th>
              <th>Moneda</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Banco Provincia</strong></td>
              <td>Mar del Plata (2000)</td>
              <td>0140999902200012345678</td>
              <td>ARS ($)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="scba-modal-footer" style="justify-content: flex-end;">
        <button class="btn btn-primary" onclick="cerrarModal('modalCuentasBancarias')">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

/* ==================== FUNCIONES DE ENVÍO / FIRMA ==================== */

function mostrarModalExito(titulo, mensaje, redirigir) {
  const oldModal = document.getElementById('modalExito');
  if (oldModal) oldModal.remove();

  const overlay = document.createElement('div');
  overlay.className = 'scba-modal-overlay';
  overlay.id = 'modalExito';

  overlay.innerHTML = `
    <div class="scba-modal" style="max-width: 480px; text-align: center;">
      <div class="scba-modal-header" style="justify-content: center;">
        <h3>${titulo}</h3>
      </div>
      <div class="scba-modal-body" style="padding: 30px 24px;">
        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
        <p style="font-size: 14px; color: #333; line-height: 1.6;">${mensaje}</p>
      </div>
      <div class="scba-modal-footer" style="justify-content: center;">
        <button class="btn btn-primary" onclick="document.getElementById('modalExito').remove(); ${redirigir ? "window.location.href='presentaciones.html';" : ''}">Aceptar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function recopilarDatosPresentacion(tipo) {
  const studentName = sessionStorage.getItem('studentName') || 'Alumno';

  // Organismo seleccionado
  const orgInput = document.querySelector('.autocomplete-input');
  const organismo = orgInput ? orgInput.value.trim() : 'No especificado';

  // Título / Sumario
  const tituloLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Título/Sumario'));
  const titulo = tituloLabel ? (tituloLabel.parentElement.querySelector('input')?.value.trim() || '') : '';

  // Número de causa (Letra - Número - Extensión)
  const causaRow = document.querySelector('.causa-number-row');
  let causaNumber = '';
  if (causaRow) {
    const inputs = causaRow.querySelectorAll('input');
    if (inputs.length >= 3) {
      causaNumber = [inputs[0].value, inputs[1].value, inputs[2].value].filter(Boolean).join('-');
    }
  }

  // Carátula
  const caratulaLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Texto en la Carátula') || l.textContent.includes('Carátula'));
  const caratula = caratulaLabel ? (caratulaLabel.parentElement.querySelector('input')?.value.trim() || '') : '';

  // Texto del editor
  const editor = document.querySelector('.editor-area');
  const content = editor ? (editor.innerText.trim() || editor.innerHTML.trim() || '(Sin texto)') : '(Sin texto)';

  const titleFinal = titulo || caratula || causaNumber || `Presentación de ${studentName} - ${tipo}`;

  return {
    title: titleFinal,
    content: content,
    type: tipo,
    sender: studentName,
    organism: organismo,
    causaNumber: causaNumber || 'No especificado'
  };
}

function guardarBorrador() {
  const datos = recopilarDatosPresentacion('Borrador');
  fetch('/api/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  })
  .catch(() => {}) // Si falla la red, igual mostramos el modal (es una simulación)
  .finally(() => {
    mostrarModalExito(
      'Borrador guardado',
      'El borrador de la presentación fue guardado exitosamente. Puede retomarlo desde "Mis Presentaciones".',
      false
    );
  });
}

function guardarBorradorYSalir() {
  const datos = recopilarDatosPresentacion('Borrador');
  fetch('/api/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  })
  .catch(() => {})
  .finally(() => {
    mostrarModalExito(
      'Borrador guardado',
      'El borrador fue guardado. Será redirigido a la lista de presentaciones.',
      true
    );
  });
}

function firmarYEnviar() {
  const datos = recopilarDatosPresentacion('Presentación');
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  const nroTransaccion = Math.floor(10000000 + Math.random() * 90000000);

  fetch('/api/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  })
  .catch(() => {})
  .finally(() => {
    mostrarModalExito(
      'Presentación enviada',
      `La presentación fue firmada y enviada correctamente.<br><br>
       <strong>Fecha y hora:</strong> ${timestamp}<br>
       <strong>N° de transacción:</strong> ${nroTransaccion}<br><br>
       Será redirigido a la lista de presentaciones.`,
      true
    );
  });
}

function firmar() {
  const datos = recopilarDatosPresentacion('Firmado - Pendiente de envío');
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;

  fetch('/api/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  })
  .catch(() => {})
  .finally(() => {
    mostrarModalExito(
      'Presentación firmada',
      `La presentación fue firmada digitalmente.<br><br>
       <strong>Fecha y hora de firma:</strong> ${timestamp}<br><br>
       El documento queda en estado "Firmado - Pendiente de envío".`,
      false
    );
  });
}

/* ==================== LISTAS DINAMICAS ==================== */

function initDynamicDropdowns() {
  const defaultFueros = ['Civil y Comercial', 'Contencioso Administrativo', 'Familia', 'Laboral', 'Paz', 'Penal'];
  const defaultObjetos = [
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
  const defaultRoles = [
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
  const defaultTiposPersona = ['Física', 'Jurídica', 'No Informado', 'Organismo Del Estado'];

  fetch('/api/lists')
    .then(res => {
      if (!res.ok) throw new Error('Servidor offline');
      return res.json();
    })
    .then(data => {
      populateDropdown('Departamentos', data.departamentos);
      populateDropdown('Fuero', data.fueros || defaultFueros);
      populateDropdown('Objeto', data.objetos || defaultObjetos);
      populateDropdown('Rol Procesal', data.rolesProcesales || defaultRoles);
      populateDropdown('Tipo de Persona', data.tiposPersona || defaultTiposPersona);
      populateDropdown('Localidad', data.departamentos);
    })
    .catch(err => {
      console.warn('No se pudieron cargar las listas dinámicas del servidor. Usando fallback estático local.', err);
      const fallbackDeptos = ['Mar del Plata', 'La Plata', 'San Isidro', 'Mercedes', 'Morón', 'Lomas de Zamora'];
      populateDropdown('Departamentos', fallbackDeptos);
      populateDropdown('Localidad', fallbackDeptos);
      populateDropdown('Fuero', defaultFueros);
      populateDropdown('Objeto', defaultObjetos);
      populateDropdown('Rol Procesal', defaultRoles);
      populateDropdown('Tipo de Persona', defaultTiposPersona);
    });
}

/* ==================== INICIO DE CAUSA: INTERVINIENTES Y CARÁTULA ==================== */

// Base de personas simuladas (por DNI/CUIL/CUIT)
const personasSimuladas = {
  '15913252':  { apellido: 'ONTIVEROS',    nombre: 'CARLOS ALBERTO',   genero: 'Masculino' },
  '25431876':  { apellido: 'GARCIA',       nombre: 'MARIA LAURA',      genero: 'Femenino'  },
  '30456789':  { apellido: 'RODRIGUEZ',    nombre: 'JUAN PABLO',       genero: 'Masculino' },
  '18765432':  { apellido: 'FERNANDEZ',    nombre: 'ANA BEATRIZ',      genero: 'Femenino'  },
  '20123456':  { apellido: 'MARTINEZ',     nombre: 'LUCAS MARTIN',     genero: 'Masculino' },
  '27654321':  { apellido: 'LOPEZ',        nombre: 'SOFIA VALENTINA',  genero: 'Femenino'  },
  '33221100':  { apellido: 'PEREZ',        nombre: 'DIEGO HERNAN',     genero: 'Masculino' },
  '20304050':  { apellido: 'GIMENEZ',      nombre: 'NATALIA SOLEDAD',  genero: 'Femenino'  },
  '11243904':  { apellido: 'GOMEZ',        nombre: 'CARLOS',           genero: 'Masculino' },
  '30500010083': { apellido: 'TRANSPORTES DEL SUR S.A.',  nombre: '',  genero: 'No Informado' },
  '30678901234': { apellido: 'CONSTRUCTORA PATAGONIA SRL', nombre: '', genero: 'No Informado' },
  '33445566778': { apellido: 'AGROPECUARIA BUENOS AIRES SA', nombre: '', genero: 'No Informado' },
};

function ic_onTipoDocChange() {
  // Manejo al cambiar tipo de documento
}

function ic_onNroDocInput() {
  const input = document.getElementById('ic_nro_doc');
  if (!input) return;
  const nro = input.value.replace(/[-\s\.]/g, '').trim();
  if (nro.length >= 7 && personasSimuladas[nro]) {
    const persona = personasSimuladas[nro];
    const apInput = document.getElementById('ic_apellido');
    const nomInput = document.getElementById('ic_nombre');
    const genSelect = document.getElementById('ic_genero');
    if (apInput) apInput.value = persona.apellido;
    if (nomInput) nomInput.value = persona.nombre;
    if (genSelect && persona.genero) {
      setSelectByText(genSelect, persona.genero);
    }
  }
}

// Array temporal de intervinientes del formulario actual
window._icIntervinientes = [];

function ic_confirmarInterviniente() {
  const rol     = (document.getElementById('ic_rol')         ?.value || 'ACTOR').trim();
  const tipo    = (document.getElementById('ic_tipo_persona') ?.value || 'Física').trim();
  const tipoDoc = (document.getElementById('ic_tipo_doc')    ?.value || '').trim();
  const nroDoc  = (document.getElementById('ic_nro_doc')     ?.value || '').trim();
  const genero  = (document.getElementById('ic_genero')      ?.value || '').trim();
  const apellido= (document.getElementById('ic_apellido')    ?.value || '').trim();
  const nombre  = (document.getElementById('ic_nombre')      ?.value || '').trim();

  if (!apellido && !nombre && !nroDoc) {
    alert('Ingrese al menos el Apellido / Razón Social o Documento del interviniente.');
    return;
  }

  const interviniente = { rol, tipo, tipoDoc, nroDoc, genero, apellido, nombre };
  window._icIntervinientes.push(interviniente);

  ic_renderIntervinientes();
  ic_actualizarCaratulaCalculada();

  // Limpiar campos del formulario para el siguiente interviniente
  ['ic_nro_doc','ic_apellido','ic_nombre'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['ic_tipo_doc','ic_genero'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  const rowNombre = document.getElementById('ic_row_nombre');
  if (rowNombre) rowNombre.style.display = 'none';
}

// Mantener compatibilidad con llamadas existentes
function confirmarInterviniente() {
  ic_confirmarInterviniente();
}

function ic_quitarInterviniente(idx) {
  if (window._icIntervinientes && window._icIntervinientes.length > idx) {
    window._icIntervinientes.splice(idx, 1);
    ic_renderIntervinientes();
    ic_actualizarCaratulaCalculada();
  }
}

function quitarInterviniente(idx) {
  ic_quitarInterviniente(idx);
}

function ic_renderIntervinientes() {
  const lista = document.getElementById('ic_intervinientes_lista');
  if (!lista) return;

  const intervinientes = window._icIntervinientes || [];

  if (intervinientes.length === 0) {
    lista.innerHTML = `<p style="color: #777; font-style: italic; font-size: 12.5px;" id="ic_no_intervinientes_msg">Aún no se han agregado intervinientes. Utilice el formulario superior para añadir dos o más intervinientes.</p>`;
    return;
  }

  let html = `
    <table class="ic-intervinientes-table">
      <thead>
        <tr>
          <th style="width:30px;">#</th>
          <th>Rol Procesal</th>
          <th>Nombre / Razón Social</th>
          <th>Tipo / N° Doc</th>
          <th>Género</th>
          <th style="text-align:center; width:90px;">Acción</th>
        </tr>
      </thead>
      <tbody>
  `;

  intervinientes.forEach((item, idx) => {
    const nombreComp = (item.apellido ? (item.apellido + (item.nombre ? ', ' + item.nombre : '')) : item.nombre || '-').toUpperCase();
    const docComp = item.tipoDoc && item.nroDoc ? `${item.tipoDoc}: ${item.nroDoc}` : (item.nroDoc || '-');

    html += `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td><span style="background:#e8f4fd; color:#2c5aa0; padding:2px 6px; border-radius:3px; font-weight:bold; font-size:11.5px;">${escapeHTML(item.rol)}</span></td>
        <td><strong>${escapeHTML(nombreComp)}</strong></td>
        <td>${escapeHTML(docComp)}</td>
        <td>${escapeHTML(item.genero || '-')}</td>
        <td style="text-align:center;">
          <button type="button" onclick="ic_quitarInterviniente(${idx})" style="background:#e74c3c; color:white; border:none; border-radius:3px; padding:3px 8px; cursor:pointer; font-size:12px;" title="Eliminar interviniente">✕ Quitar</button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  lista.innerHTML = html;
}

function ic_actualizarCaratulaCalculada() {
  const caratulaInput = document.getElementById('ic_caratula');
  if (!caratulaInput) return;

  const intervinientes = window._icIntervinientes || [];
  const objetoSelect = document.getElementById('ic_objeto');
  let objetoRaw = objetoSelect ? (objetoSelect.value || '') : '';

  // Limpiar código entre paréntesis del objeto (ej. "CONSIGNACION (Código: 123)")
  let objetoClean = objetoRaw.replace(/\s*\(Código:?\s*\d+\)/i, '').trim();

  if (intervinientes.length === 0 && !objetoClean) {
    return;
  }

  // Clasificar intervinientes según su Rol Procesal
  const actores = [];
  const demandados = [];
  const otros = [];

  intervinientes.forEach(p => {
    const rolUpper = (p.rol || '').toUpperCase();
    let nombreFormateado = (p.apellido ? (p.apellido + (p.nombre ? ' ' + p.nombre : '')) : p.nombre || '').trim().toUpperCase();

    if (!nombreFormateado) return;

    if (rolUpper.includes('ACTOR') || rolUpper.includes('DENUNCIANTE') || rolUpper.includes('QUERELLANTE') || rolUpper.includes('CAUSANTE') || rolUpper.includes('ADOPTADO')) {
      actores.push(nombreFormateado);
    } else if (rolUpper.includes('DEMANDADO') || rolUpper.includes('DENUNCIADO') || rolUpper.includes('CONCURSADO') || rolUpper.includes('QUEBRADO')) {
      demandados.push(nombreFormateado);
    } else {
      otros.push(nombreFormateado);
    }
  });

  // Clasificación de respaldo si no hay coincidencias explícitas de palabras clave
  if (actores.length === 0 && otros.length > 0) {
    actores.push(otros.shift());
  }
  if (demandados.length === 0 && otros.length > 0) {
    demandados.push(otros.shift());
  }

  let partesStr = '';

  if (actores.length === 1) {
    partesStr = actores[0];
  } else if (actores.length === 2) {
    partesStr = actores[0] + ' Y OTRO';
  } else if (actores.length > 2) {
    partesStr = actores[0] + ' Y OTROS';
  }

  if (demandados.length === 1) {
    partesStr += (partesStr ? ' C/ ' : '') + demandados[0];
  } else if (demandados.length === 2) {
    partesStr += (partesStr ? ' C/ ' : '') + demandados[0] + ' Y OTRO';
  } else if (demandados.length > 2) {
    partesStr += (partesStr ? ' C/ ' : '') + demandados[0] + ' Y OTROS';
  }

  let caratulaFinal = partesStr;
  if (objetoClean) {
    caratulaFinal += (caratulaFinal ? ' S/ ' : '') + objetoClean.toUpperCase();
  }

  caratulaInput.value = caratulaFinal;
}

/* ==================== INICIO DE CAUSA: RECOPILACIÓN Y ENVÍO ==================== */

function recopilarDatosInicioCausa(tipo) {
  const studentName = sessionStorage.getItem('studentName') || 'Alumno';

  const fuero    = document.getElementById('ic_fuero')    ?.value || '';
  const objetoSelect = document.getElementById('ic_objeto');
  let objeto   = objetoSelect ? (objetoSelect.value || '') : '';
  objeto = objeto.replace(/\s*\(Código:?\s*\d+\)/i, '').trim();

  const caratulaInput = document.getElementById('ic_caratula');
  const caratula = caratulaInput ? (caratulaInput.value.trim()) : '';

  const localidad= document.getElementById('ic_localidad') ?.value || '';
  const monto    = document.getElementById('ic_monto')    ?.value || '';
  const radLetra = document.getElementById('ic_rad_letra') ?.value || '';
  const radNum   = document.getElementById('ic_rad_numero')?.value || '';
  const radExt   = document.getElementById('ic_rad_ext')  ?.value || '';

  const radicacion = [radLetra, radNum, radExt].filter(Boolean).join(' - ');

  // Organismo seleccionado del autocomplete
  const orgInput = document.querySelector('.autocomplete-input');
  const organismo = orgInput ? orgInput.value.trim() : 'RECEPTORIA GENERAL DE EXPEDIENTES - MAR DEL PLATA';

  // Título del campo "Datos de la Presentación"
  const tituloLabel = Array.from(document.querySelectorAll('label')).find(l => l.textContent.includes('Título/Sumario'));
  const titulo = tituloLabel ? (tituloLabel.parentElement.querySelector('input')?.value.trim() || '') : '';

  // Texto del editor
  const editor = document.querySelector('.editor-area');
  const textoPresentacion = editor ? (editor.innerText.trim() || editor.innerHTML.trim() || '') : '';

  const tituloFinal = caratula || titulo || (fuero && objeto ? `${fuero} — ${objeto}` : '') || `Inicio de Causa de ${studentName}`;

  return {
    sender: studentName,
    tipo,
    fuero,
    objeto,
    caratula: caratula || tituloFinal,
    localidad,
    monto,
    radicacion,
    intervinientes: window._icIntervinientes || [],
    organismo,
    titulo: tituloFinal,
    textoPresentacion
  };
}

function _enviarInicioCausa(datos, onSuccess) {
  fetch('/api/inicios-causa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  })
  .catch(() => {})
  .finally(() => { if (onSuccess) onSuccess(); });
}

function guardarInicioCausaBorrador() {
  const datos = recopilarDatosInicioCausa('Borrador - Inicio de Causa');
  _enviarInicioCausa(datos, () => {
    mostrarModalExito(
      'Borrador guardado',
      'El borrador del Inicio de Causa fue guardado exitosamente. Puede retomarlo desde "Mis Causas".',
      false
    );
  });
}

function guardarInicioCausaBorradorYSalir() {
  const datos = recopilarDatosInicioCausa('Borrador - Inicio de Causa');
  _enviarInicioCausa(datos, () => {
    mostrarModalExito(
      'Borrador guardado',
      'El borrador del Inicio de Causa fue guardado. Será redirigido a "Mis Causas".',
      true
    );
  });
}

function firmarYEnviarInicioCausa() {
  const datos = recopilarDatosInicioCausa('Inicio de Causa - Enviado');
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  const nroTransaccion = Math.floor(10000000 + Math.random() * 90000000);

  _enviarInicioCausa(datos, () => {
    mostrarModalExito(
      'Inicio de Causa enviado',
      `El Inicio de Causa fue firmado y enviado correctamente.<br><br>
       <strong>Fecha y hora:</strong> ${timestamp}<br>
       <strong>N° de transacción:</strong> ${nroTransaccion}<br>
       <strong>Fuero:</strong> ${datos.fuero || 'No especificado'}<br>
       <strong>Objeto:</strong> ${datos.objeto || 'No especificado'}<br><br>
       Será redirigido a "Mis Causas".`,
      true
    );
  });
}

function firmarInicioCausa() {
  const datos = recopilarDatosInicioCausa('Inicio de Causa - Firmado - Pendiente de envío');
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;

  _enviarInicioCausa(datos, () => {
    mostrarModalExito(
      'Inicio de Causa firmado',
      `El Inicio de Causa fue firmado digitalmente.<br><br>
       <strong>Fecha y hora de firma:</strong> ${timestamp}<br><br>
       El documento queda en estado "Firmado - Pendiente de envío".`,
      false
    );
  });
}

/* ==================== BÚSQUEDA POR DNI / CUIL EN INTERVINIENTES ==================== */

function initDocumentLookup() {
  const nroDocInput = document.getElementById('ic_nro_doc');
  const autocompleteList = document.getElementById('ic_nro_doc_autocomplete');
  if (!nroDocInput || !autocompleteList) return;

  let debounceTimer = null;

  // Cerrar el autocompletado si se hace clic fuera
  document.addEventListener('click', function(e) {
    if (e.target !== nroDocInput && !autocompleteList.contains(e.target)) {
      autocompleteList.classList.remove('active');
    }
  });

  // Mostrar autocompletado al hacer focus si hay texto
  nroDocInput.addEventListener('focus', function() {
    triggerLookup(this.value);
  });

  nroDocInput.addEventListener('input', function () {
    triggerLookup(this.value);
  });

  function triggerLookup(rawVal) {
    const val = rawVal.replace(/[\s.-]/g, '').trim();
    clearTimeout(debounceTimer);

    if (val.length < 2) {
      autocompleteList.classList.remove('active');
      autocompleteList.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(() => buscarYMostrarAutocomplete(val), 200);
  }
}

async function buscarYMostrarAutocomplete(val) {
  const autocompleteList = document.getElementById('ic_nro_doc_autocomplete');
  if (!autocompleteList) return;

  try {
    const res = await fetch('/api/destinatarios');
    if (!res.ok) throw new Error('Error de red');
    const destinatarios = await res.json();

    const selTp = document.getElementById('ic_tipo_persona')?.value || 'Física';

    // Filtrar destinatarios según Tipo de Persona y coincidencia de DNI/CUIL
    const filtrados = destinatarios.filter(d => {
      const tp = d.tipoPersona || 'Física';
      
      // Filtro de tipo: Física no debe mostrar empresas/organismos, y viceversa
      if (selTp === 'Física') {
        if (tp !== 'Física') return false;
      } else if (selTp === 'Jurídica' || selTp === 'Organismo Del Estado') {
        if (tp !== 'Jurídica' && tp !== 'Organismo Del Estado') return false;
      }

      // Filtro de coincidencia de documento
      const cuit = (d.cuit || '').replace(/[\s.-]/g, '');
      const dni = cuit.length === 11 ? cuit.substring(2, 10) : '';
      
      return cuit.includes(val) || (dni && dni.includes(val));
    });

    if (filtrados.length === 0) {
      autocompleteList.classList.remove('active');
      autocompleteList.innerHTML = '';
      return;
    }

    autocompleteList.innerHTML = '';
    filtrados.forEach(d => {
      const cuit = (d.cuit || '').replace(/[\s.-]/g, '');
      const dni = cuit.length === 11 ? cuit.substring(2, 10) : '';
      const docDisplay = dni ? `DNI: ${dni} (CUIL: ${cuit})` : `CUIT: ${cuit}`;

      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.innerHTML = `
        <span style="font-size: 14px;">${d.icon || '👤'} <strong>${escapeHTML(d.rawName || d.title)}</strong></span><br>
        <span style="font-size: 11px; color: #666;">${docDisplay} | ${escapeHTML(d.rolProcesal || 'Parte')}</span>
      `;

      item.addEventListener('click', function() {
        // Al hacer clic, completamos el número que el usuario prefiera o el que coincida
        const nroDocInput = document.getElementById('ic_nro_doc');
        if (nroDocInput) {
          // Si es física y buscó por una longitud menor/igual a 8, ponemos el DNI directo
          if (selTp === 'Física' && dni) {
            nroDocInput.value = dni;
          } else {
            nroDocInput.value = cuit;
          }
        }
        
        autocompletarInterviniente(d);
        autocompleteList.classList.remove('active');
      });

      autocompleteList.appendChild(item);
    });

    autocompleteList.classList.add('active');

  } catch (err) {
    console.warn('Error al buscar para autocompletar:', err);
  }
}

function autocompletarInterviniente(persona) {
  const rawName = (persona.rawName || persona.title || '').trim().toUpperCase();
  const tipoPersona = persona.tipoPersona || 'Física';

  let apellido = '';
  let nombre = '';

  if (tipoPersona === 'Jurídica' || tipoPersona === 'Organismo Del Estado') {
    apellido = rawName;
    nombre = '';
  } else {
    const partes = rawName.split(' ').filter(Boolean);
    if (partes.length >= 2) {
      apellido = partes[0];
      nombre = partes.slice(1).join(' ');
    } else {
      apellido = rawName;
    }
  }

  const campoApellido    = document.getElementById('ic_apellido');
  const campoNombre      = document.getElementById('ic_nombre');
  const campoTipoPersona = document.getElementById('ic_tipo_persona');

  if (campoApellido) campoApellido.value = apellido;
  if (campoNombre)   campoNombre.value   = nombre;

  // Actualizar Tipo de Persona
  if (campoTipoPersona) {
    const opcionesTP = Array.from(campoTipoPersona.options);
    const match = opcionesTP.find(o => o.text.toLowerCase() === tipoPersona.toLowerCase());
    if (match) campoTipoPersona.value = match.value;
  }

  // Seleccionar Tipo de Documento
  const tipoDocSelect = document.getElementById('ic_tipo_doc');
  if (tipoDocSelect) {
    const docIngresado = (document.getElementById('ic_nro_doc')?.value || '').replace(/[\s.-]/g, '');
    if (docIngresado.length <= 8) {
      setSelectByText(tipoDocSelect, 'DNI');
    } else if (tipoPersona === 'Jurídica') {
      setSelectByText(tipoDocSelect, 'CUIT');
    } else {
      setSelectByText(tipoDocSelect, 'CUIL');
    }
  }

  // Efecto visual: resaltar campos completados
  ['ic_apellido', 'ic_nombre'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value) {
      el.style.transition = 'background 0.4s';
      el.style.background = '#e8f4fd';
      setTimeout(() => { if (el) el.style.background = ''; }, 1500);
    }
  });
}

function setSelectByText(selectEl, text) {
  const opts = Array.from(selectEl.options);
  const match = opts.find(o => o.text.trim().toUpperCase() === text.trim().toUpperCase());
  if (match) selectEl.value = match.value;
}

function unescapeEntities(str) {
  if (!str) return '';
  return String(str)
    .replace(/&#x2f;/gi, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'");
}

function escapeHTML(str) {
  if (!str) return '';
  const clean = unescapeEntities(str);
  return clean.replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Footer Auto-Injection
document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('.site-footer')) {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = '<div class="footer-content"><p>Simulador realizado por <strong>Gael Araujo</strong> - Estudiante en Programación 2026</p></div>';
    document.body.appendChild(footer);
  }
});

