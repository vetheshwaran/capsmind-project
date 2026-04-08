/* ============================================================
   CapMinds Appointment Scheduler – app.js 
   ============================================================ */

'use strict';

let appointments = JSON.parse(localStorage.getItem('capminds_appts') || '[]');
let editId = null;
let currentDate = new Date();
let calView = 'month';
let sidebarCollapsed = false;
let currentView = 'calendar';

const $ = id => document.getElementById(id);

function saveToStorage() {
  localStorage.setItem('capminds_appts', JSON.stringify(appointments));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, mi] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${mi.toString().padStart(2, '0')} ${ampm}`;
}

function formatTimeRange(timeStr) {
  if (!timeStr) return '';
  const [h, mi] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  const endMin = mi + 15;
  const endHr = endMin >= 60 ? (hr === 12 ? 1 : hr + 1) : hr;
  const endAmPm = (endMin >= 60 && h + 1 >= 12) ? 'PM' : ampm;
  return `${hr}:${mi.toString().padStart(2, '0')} ${ampm} - ${endHr}:${(endMin % 60).toString().padStart(2, '0')} ${endAmPm}`;
}

function showToast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2800);
}

function confirmDelete(id) {
  if (window.confirm('Delete this appointment?')) {
    appointments = appointments.filter(a => a.id !== id);
    saveToStorage();
    renderAll();
    showToast('Appointment deleted.', 'error');
  }
}

/* ---- Sidebar (desktop collapse + mobile overlay) ---- */
const sidebar = $('sidebar');

// Inject backdrop element for mobile overlay
const backdrop = document.createElement('div');
backdrop.className = 'sidebar-backdrop';
backdrop.id = 'sidebarBackdrop';
document.querySelector('.layout').prepend(backdrop);

function isMobile() {
  return window.innerWidth <= 600;
}

function closeSidebar() {
  if (isMobile()) {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('visible');
  } else {
    sidebarCollapsed = true;
    sidebar.classList.add('collapsed');
    $('sidebarChevron').textContent = '»';
  }
}

function openSidebar() {
  if (isMobile()) {
    sidebar.classList.add('mobile-open');
    backdrop.classList.add('visible');
  } else {
    sidebarCollapsed = false;
    sidebar.classList.remove('collapsed');
    $('sidebarChevron').textContent = '«';
  }
}

$('sidebarToggle').addEventListener('click', () => {
  if (isMobile()) {
    if (sidebar.classList.contains('mobile-open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  } else {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    $('sidebarChevron').textContent = sidebarCollapsed ? '»' : '«';
  }
});

backdrop.addEventListener('click', () => closeSidebar());

// Close sidebar on nav item click (mobile)
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    switchView(el.dataset.view);
    if (isMobile()) closeSidebar();
  });
});

/* ---- View switching ---- */
function switchView(view) {
  currentView = view;
  $('viewCalendar').classList.toggle('hidden', view !== 'calendar');
  $('viewDashboard').classList.toggle('hidden', view !== 'dashboard');
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  if (view === 'dashboard') renderDashboard();
  if (view === 'calendar') renderCalendar();
}

/* ---- Calendar ---- */
const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getDayLabels() {
  return window.innerWidth <= 600 ? DAYS_SHORT : DAYS;
}

function renderCalendar() {
  const grid = $('calendarGrid');
  grid.innerHTML = '';

  const today = new Date();
  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();

  $('calMonthLabel').textContent = `${MONTHS[m]} ${y}`;

  $('calDoctorLabel').textContent = 'All Appointments';

  if (calView === 'month') {
    grid.className = 'calendar-grid';
    renderMonthGrid(grid, y, m, today);
  } else {
    grid.className = 'calendar-grid week-view';
    renderWeekGrid(grid, y, m, today);
  }
}

function renderMonthGrid(grid, y, m, today) {
  const dayLabels = getDayLabels();
  dayLabels.forEach((d, i) => {
    const h = document.createElement('div');
    h.className = 'cal-day-header' + (i === 5 ? ' friday' : '');
    h.textContent = d;
    grid.appendChild(h);
  });

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev = new Date(y, m, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';

    let day, date, outside = false;
    if (i < firstDay) {
      day = daysInPrev - firstDay + i + 1;
      date = new Date(y, m - 1, day);
      outside = true;
    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      date = new Date(y, m + 1, day);
      outside = true;
    } else {
      day = i - firstDay + 1;
      date = new Date(y, m, day);
    }

    if (outside) cell.classList.add('cal-cell--outside');
    if (!outside && date.toDateString() === today.toDateString()) cell.classList.add('cal-cell--today');

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const dateEl = document.createElement('div');
    dateEl.className = 'cal-date';
    dateEl.textContent = day;
    cell.appendChild(dateEl);

    const dayAppts = appointments.filter(a => a.date === dateStr);
    if (dayAppts.length) {
      const eventsEl = document.createElement('div');
      eventsEl.className = 'cal-events';
      dayAppts.forEach(appt => {
        const ev = document.createElement('div');
        ev.className = 'cal-event';
        ev.innerHTML = `<div class="cal-event-patient">${appt.patient}</div><div class="cal-event-detail">${appt.doctor} · ${formatTime(appt.time)}</div>`;
        ev.addEventListener('click', e => {
          e.stopPropagation();
          openEditModal(appt.id);
        });
        eventsEl.appendChild(ev);
      });
      cell.appendChild(eventsEl);
    }

    cell.addEventListener('click', () => openModalForDate(dateStr));
    grid.appendChild(cell);
  }
}

function renderWeekGrid(grid, y, m, today) {
  const dayLabels = getDayLabels();
  const base = new Date(currentDate);
  const dow = base.getDay();
  base.setDate(base.getDate() - dow);

  dayLabels.forEach((d, i) => {
    const h = document.createElement('div');
    h.className = 'cal-day-header' + (i === 5 ? ' friday' : '');
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    h.textContent = window.innerWidth <= 600 ? `${d} ${dt.getDate()}` : `${d} ${dt.getDate()}`;
    grid.appendChild(h);
  });

  for (let i = 0; i < 7; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (dt.toDateString() === today.toDateString()) cell.classList.add('cal-cell--today');

    const dateEl = document.createElement('div');
    dateEl.className = 'cal-date';
    dateEl.textContent = dt.getDate();
    cell.appendChild(dateEl);

    const dayAppts = appointments.filter(a => a.date === dateStr);
    if (dayAppts.length) {
      const eventsEl = document.createElement('div');
      eventsEl.className = 'cal-events';
      dayAppts.forEach(appt => {
        const ev = document.createElement('div');
        ev.className = 'cal-event';
        ev.innerHTML = `<div class="cal-event-patient">${appt.patient}</div><div class="cal-event-detail">${appt.doctor} · ${formatTime(appt.time)}</div>`;
        ev.addEventListener('click', e => { e.stopPropagation(); openEditModal(appt.id); });
        eventsEl.appendChild(ev);
      });
      cell.appendChild(eventsEl);
    }

    cell.addEventListener('click', () => openModalForDate(dateStr));
    grid.appendChild(cell);
  }
}

$('calPrev').addEventListener('click', () => {
  if (calView === 'month') currentDate.setMonth(currentDate.getMonth() - 1);
  else currentDate.setDate(currentDate.getDate() - 7);
  renderCalendar();
});
$('calNext').addEventListener('click', () => {
  if (calView === 'month') currentDate.setMonth(currentDate.getMonth() + 1);
  else currentDate.setDate(currentDate.getDate() + 7);
  renderCalendar();
});
$('calToday').addEventListener('click', () => {
  currentDate = new Date();
  renderCalendar();
});
$('calViewSelect').addEventListener('change', e => {
  calView = e.target.value;
  renderCalendar();
});

// Re-render calendar on resize so day labels update (mobile ↔ desktop)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderCalendar, 200);
});

/* ---- Dashboard ---- */
function getFilteredAppointments() {
  let list = [...appointments];
  const pat = $('filterPatient').value.trim().toLowerCase();
  const doc = $('filterDoctor').value.trim().toLowerCase();
  const from = $('filterDateFrom').value;
  const to = $('filterDateTo').value;

  if (pat) list = list.filter(a => a.patient.toLowerCase().includes(pat));
  if (doc) list = list.filter(a => a.doctor.toLowerCase().includes(doc));
  if (from) list = list.filter(a => a.date >= from);
  if (to) list = list.filter(a => a.date <= to);
  return list;
}

function renderDashboard() {
  const tbody = $('dashTableBody');
  tbody.innerHTML = '';
  const list = getFilteredAppointments();
  const MIN_ROWS = 8;

  list.forEach(appt => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="td-link">${appt.patient}</span></td>
      <td><span class="td-link">${appt.doctor}</span></td>
      <td>${appt.hospital}</td>
      <td>${appt.specialty}</td>
      <td>${formatDateDisplay(appt.date)}</td>
      <td><span class="td-time">${formatTimeRange(appt.time)}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" title="Edit" data-id="${appt.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-delete" title="Delete" data-id="${appt.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  const emptyCount = Math.max(0, MIN_ROWS - list.length);
  for (let i = 0; i < emptyCount; i++) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    tr.innerHTML = '<td colspan="7"></td>';
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('.btn-edit').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
  tbody.querySelectorAll('.btn-delete').forEach(btn =>
    btn.addEventListener('click', () => confirmDelete(btn.dataset.id)));
}

$('btnUpdate').addEventListener('click', renderDashboard);
$('filterPatient').addEventListener('input', renderDashboard);
$('filterDoctor').addEventListener('input', renderDashboard);

/* ---- Modal ---- */
function clearForm() {
  ['fPatient', 'fDoctor', 'fHospital', 'fSpecialty'].forEach(id => $(id).value = '');
  $('fDate').value = '';
  $('fTime').value = '';
  $('fReason').value = '';
  ['fPatient', 'fDoctor', 'fHospital', 'fSpecialty', 'fDate', 'fTime'].forEach(id => $(id).classList.remove('error'));
  ['errPatient', 'errDoctor', 'errHospital', 'errSpecialty', 'errDate', 'errTime'].forEach(id => $(id).textContent = '');
}

function openModal() {
  editId = null;
  clearForm();
  $('modalTitle').textContent = 'Schedule Appointment';
  $('modalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function openModalForDate(dateStr) {
  openModal();
  $('fDate').value = dateStr;
}

function openEditModal(id) {
  const appt = appointments.find(a => a.id === id);
  if (!appt) return;
  editId = id;
  clearForm();
  $('fPatient').value = appt.patient;
  $('fDoctor').value = appt.doctor;
  $('fHospital').value = appt.hospital;
  $('fSpecialty').value = appt.specialty;
  $('fDate').value = appt.date;
  $('fTime').value = appt.time;
  $('fReason').value = appt.reason || '';
  $('modalTitle').textContent = 'Edit Appointment';
  $('modalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('modalOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  editId = null;
}

$('btnBookAppointment').addEventListener('click', openModal);
$('modalClose').addEventListener('click', closeModal);
$('btnCancel').addEventListener('click', closeModal);
$('modalOverlay').addEventListener('click', e => { if (e.target === $('modalOverlay')) closeModal(); });

/* ---- Validation ---- */
function validate() {
  let ok = true;
  const rules = [
    { field: 'fPatient', err: 'errPatient', msg: 'Patient name is required.' },
    { field: 'fDoctor', err: 'errDoctor', msg: 'Doctor name is required.' },
    { field: 'fHospital', err: 'errHospital', msg: 'Hospital name is required.' },
    { field: 'fSpecialty', err: 'errSpecialty', msg: 'Specialty is required.' },
    { field: 'fDate', err: 'errDate', msg: 'Date is required.' },
    { field: 'fTime', err: 'errTime', msg: 'Time is required.' },
  ];
  rules.forEach(({ field, err, msg }) => {
    const el = $(field);
    const errEl = $(err);
    if (!el.value || el.value.trim() === '') {
      el.classList.add('error');
      errEl.textContent = msg;
      ok = false;
    } else {
      el.classList.remove('error');
      errEl.textContent = '';
    }
  });
  return ok;
}

['fPatient', 'fDoctor', 'fHospital', 'fSpecialty', 'fDate', 'fTime'].forEach((id, i) => {
  const errIds = ['errPatient', 'errDoctor', 'errHospital', 'errSpecialty', 'errDate', 'errTime'];
  $(id).addEventListener('change', () => {
    $(id).classList.remove('error');
    $(errIds[i]).textContent = '';
  });
});

$('btnSave').addEventListener('click', () => {
  if (!validate()) return;

  const appt = {
    id: editId || genId(),
    patient: $('fPatient').value,
    doctor: $('fDoctor').value,
    hospital: $('fHospital').value,
    specialty: $('fSpecialty').value,
    date: $('fDate').value,
    time: $('fTime').value,
    reason: $('fReason').value,
  };

  if (editId) {
    const idx = appointments.findIndex(a => a.id === editId);
    appointments[idx] = appt;
    showToast('Appointment updated!', 'success');
  } else {
    appointments.push(appt);
    showToast('Appointment saved!', 'success');
  }

  saveToStorage();
  closeModal();
  renderAll();

  const [y, m] = appt.date.split('-').map(Number);
  currentDate = new Date(y, m - 1, 1);
});

/* ---- Render all ---- */
function renderAll() {
  renderCalendar();
  if (currentView === 'dashboard') renderDashboard();
}

renderCalendar();
