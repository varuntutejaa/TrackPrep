import { auth, db } from "./firebase.js";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc,
  updateDoc,
  doc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
let applications = JSON.parse(localStorage.getItem('applications') || '[]');
let dsaQuestions = JSON.parse(localStorage.getItem('dsaQuestions') || '[]');
let editAppId = null;
let editDsaId = null
let currentTags = [];  
let dsaList = [];
let unsubscribeDSA = null;
let appSort = { key: 'date', dir: 'desc' };
let dsaSort = { key: 'name', dir: 'asc'  };


function save() {
  localStorage.setItem('applications', JSON.stringify(applications));
  localStorage.setItem('dsaQuestions', JSON.stringify(dsaQuestions));
}

/* Generate a short unique ID for new entries */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* Escape HTML special characters (prevents XSS) */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Format a YYYY-MM-DD date string to "15 Jan 2025" */
function fmtDate(s) {
  if (!s) return '—';
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch (e) { return s; }
}

/* Toast notification */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}


/* ══════════════════════════════════════════════════════════
   3. PAGE NAVIGATION
   ══════════════════════════════════════════════════════════ */

/*
 * showPage(name) — switches the visible page
 * name: 'landing' | 'applications' | 'dsa'
 */
function showPage(name) {
  // Hide all pages and deactivate all nav links
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  // Show the requested page
  document.getElementById('page-' + name).classList.add('active');

  // Highlight the matching nav link (by data-page attribute)
  const link = document.querySelector(`.nav-link[data-page="${name}"]`);
  if (link) link.classList.add('active');

  // Scroll to top on page switch
  window.scrollTo(0, 0);

  // Render data for tracker pages
  if (name === 'applications') renderApps();
  if (name === 'dsa')          renderDSA();
}


/* ══════════════════════════════════════════════════════════
   4. STATS
   ══════════════════════════════════════════════════════════ */

function appStats() {
  return {
    total:      applications.length,
    accepted:   applications.filter(a => a.status === 'Accepted').length,
    rejected:   applications.filter(a => a.status === 'Rejected').length,
    inProgress: applications.filter(a => ['Applied','OA','Interview'].includes(a.status)).length,
    oa:         applications.filter(a => a.status === 'OA').length,
    interview:  applications.filter(a => a.status === 'Interview').length,
  };
}

function dsaStats() {
  return {
    total:    dsaQuestions.length,
    solved:   dsaQuestions.filter(q => q.status === 'Solved').length,
    revision: dsaQuestions.filter(q => q.status === 'Revision').length,
    easy:     dsaQuestions.filter(q => q.difficulty === 'Easy').length,
    medium:   dsaQuestions.filter(q => q.difficulty === 'Medium').length,
    hard:     dsaQuestions.filter(q => q.difficulty === 'Hard').length,
  };
}

/*
 * renderStatCards(containerId, cards) — injects stat card HTML
 * cards: [{ label, value, color? }]
 */
function renderStatCards(containerId, cards) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = cards.map(c =>
    `<div class="stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value ${c.color || ''}">${c.value}</div>
    </div>`
  ).join('');
}

/* Update the live stats shown on the landing page hero */
function updateLandingStats() {
  const as = appStats();
  const ds = dsaStats();
  const el = document.getElementById('landing-stats');
  if (!el) return;
  el.innerHTML = `
    <div>
      <div class="hero-stat-num">${as.total}<span class="unit">+</span></div>
      <div class="hero-stat-label">Applications tracked</div>
    </div>
    <div>
      <div class="hero-stat-num">${ds.solved}<span class="unit">+</span></div>
      <div class="hero-stat-label">Problems solved</div>
    </div>
    <div>
      <div class="hero-stat-num">${as.accepted}<span class="unit"></span></div>
      <div class="hero-stat-label">Offers received</div>
    </div>`;
}


/* ══════════════════════════════════════════════════════════
   5. APPLICATIONS TRACKER
   ══════════════════════════════════════════════════════════ */

/* Rebuild the applications table with current filters + sort */
function renderApps() {
  // Update stat cards
  const as = appStats();
  renderStatCards('app-stats', [
    { label: 'Total',       value: as.total,      color: ''       },
    { label: 'Accepted',    value: as.accepted,   color: 'green'  },
    { label: 'Rejected',    value: as.rejected,   color: 'red'    },
    { label: 'In Progress', value: as.inProgress, color: 'blue'   },
    { label: 'Interview',   value: as.interview,  color: 'purple' },
  ]);

  // Read toolbar inputs
  const query  = document.getElementById('app-search').value.toLowerCase();
  const filter = document.getElementById('app-filter').value;

  // Filter
  let rows = applications.filter(a => {
    const matchQ = !query  || a.company.toLowerCase().includes(query) || a.role.toLowerCase().includes(query);
    const matchF = !filter || a.status === filter;
    return matchQ && matchF;
  });

  // Sort
  rows.sort((a, b) => {
    const va = (a[appSort.key] || '').toLowerCase();
    const vb = (b[appSort.key] || '').toLowerCase();
    return appSort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  // Update count badge
  document.getElementById('app-count-label').textContent =
    `${applications.length} ${applications.length === 1 ? 'entry' : 'entries'}`;

  // Render rows
  const tbody = document.getElementById('app-table-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr class="no-results"><td colspan="5">No applications found.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(a => {
    const opts = ['Applied','OA','Interview','Rejected','Accepted']
      .map(s => `<option${s === a.status ? ' selected' : ''}>${s}</option>`).join('');

    return `<tr>
      <td><span style="font-weight:600">${esc(a.company)}</span></td>
      <td style="color:var(--text2)">${esc(a.role)}</td>
      <td>
        <select class="status-select badge badge-${a.status.toLowerCase()}"
          onchange="quickUpdateStatus('${a.id}', this.value)">${opts}</select>
      </td>
      <td style="color:var(--text2)">${fmtDate(a.date)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-action" onclick="openAppModal('${a.id}')">Edit</button>
          <button class="btn-action del" onclick="deleteApp('${a.id}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* Toggle sort column / direction */
function sortApps(key) {
  appSort.dir = appSort.key === key ? (appSort.dir === 'asc' ? 'desc' : 'asc') : 'asc';
  appSort.key = key;
  document.querySelectorAll('#page-applications th[data-sort]').forEach(th => {
    th.classList.remove('asc', 'desc');
    if (th.dataset.sort === key) th.classList.add(appSort.dir);
  });
  renderApps();
}

/* Open the application add/edit modal */
function openAppModal(id) {
  if (id) {
    const app = applications.find(a => a.id === id);
    if (!app) return;

    editAppId = id;

    document.getElementById("app-company").value = app.company;
    document.getElementById("app-role").value = app.role;
    document.getElementById("app-status").value = app.status;
    document.getElementById("app-date").value = app.date;
  } else {
    editAppId = null;
  }

  document.getElementById("app-modal").classList.add("open");
}


// APPLICATION MODAL
// CREATE OR UPDATE APPLICATION IN FIRESTORE
async function saveApp() {
  const company = document.getElementById("app-company").value.trim();
  const role = document.getElementById("app-role").value.trim();
  const status = document.getElementById("app-status").value;
  const date = document.getElementById("app-date").value;
  const user = auth.currentUser;
  if (!user) return;
  if (!company || !role) {
    showToast("Fill required fields");
    return;
  }
  if (editAppId) {
    await updateDoc(
      doc(db, "users", user.uid, "applications", editAppId),
      { company, role, status, date }
    );
    showToast("Application updated");
  } else {
    await addDoc(
      collection(db, "users", user.uid, "applications"),
      { company, role, status, date, createdAt: Date.now() }
    );

    showToast("Application added");
  }

  editAppId = null;
  closeModal("app-modal");
}

// DELETE AN APPLICATION FROM FIRESTORE
async function deleteApp(id) {
  if (!confirm("Delete this application?")) return;

  const user = auth.currentUser;
  if (!user) return;

  // 🔥 DELETE FROM FIRESTORE
  await deleteDoc(
    doc(db, "users", user.uid, "applications", id)
  );

  showToast("Deleted");
}
async function quickUpdateStatus(id, status) {
  const user = auth.currentUser;
  if (!user) return;
  await updateDoc(
    doc(db, "users", user.uid, "applications", id),
    { status }
  );
  showToast("Status updated");
}


// render the dsa questions table with current filters + sort
function renderDSA() {
  const ds = dsaStats();
  renderStatCards('dsa-stats', [
    { label: 'Total',    value: ds.total,    color: ''       },
    { label: 'Solved',   value: ds.solved,   color: 'green'  },
    { label: 'Revision', value: ds.revision, color: 'amber'  },
    { label: 'Easy',     value: ds.easy,     color: 'green'  },
    { label: 'Medium',   value: ds.medium,   color: 'amber'  },
    { label: 'Hard',     value: ds.hard,     color: 'red'    },
  ]);

  const query    = document.getElementById('dsa-search').value.toLowerCase();
  const platform = document.getElementById('dsa-filter-platform').value;
  const status   = document.getElementById('dsa-filter-status').value;
  const diff     = document.getElementById('dsa-filter-diff').value;

  let rows = dsaQuestions.filter(d => {
    const matchQ = !query ||
      d.name.toLowerCase().includes(query) ||
      (d.topic || '').toLowerCase().includes(query) ||
      (d.tags || []).some(t => t.toLowerCase().includes(query));
    return matchQ && (!platform || d.platform === platform)
                  && (!status   || d.status   === status)
                  && (!diff     || d.difficulty === diff);
  });

  rows.sort((a, b) => {
    const va = (a[dsaSort.key] || '').toLowerCase();
    const vb = (b[dsaSort.key] || '').toLowerCase();
    return dsaSort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  document.getElementById('dsa-count-label').textContent =
    `${dsaQuestions.length} ${dsaQuestions.length === 1 ? 'problem' : 'problems'}`;

  const tbody = document.getElementById('dsa-table-body');
  if (!rows.length) {
    tbody.innerHTML = '<tr class="no-results"><td colspan="7">No problems found.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(d => {
    const platformClass = d.platform.toLowerCase().replace(/\s/g, '');
    const tagsHtml = (d.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
    return `<tr>
      <td><span style="font-weight:600">${esc(d.name)}</span></td>
      <td><span class="badge badge-${platformClass}">${esc(d.platform)}</span></td>
      <td style="color:var(--text2)">${esc(d.topic || '—')}</td>
      <td><span class="badge badge-${d.difficulty.toLowerCase()}">${d.difficulty}</span></td>
      <td><span class="badge badge-${d.status.toLowerCase()}">${d.status}</span></td>
      <td>${tagsHtml}</td>
      <td>
        <div class="action-btns">
          <button class="btn-action" onclick="openDsaModal('${d.id}')">Edit</button>
          <button class="btn-action del" onclick="deleteDSA('${d.id}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function sortDSA(key) {
  dsaSort.dir = dsaSort.key === key ? (dsaSort.dir === 'asc' ? 'desc' : 'asc') : 'asc';
  dsaSort.key = key;
  renderDSA();
}

function openDsaModal(id) {
  editDsaId   = id || null;
  currentTags = [];
  document.getElementById('dsa-modal-title').textContent = id ? 'Edit Problem'  : 'New Problem';
  document.getElementById('dsa-save-btn').textContent    = id ? 'Update Problem' : 'Save Problem';

  if (id) {
    const d = dsaQuestions.find(x => x.id === id);
    document.getElementById('dsa-name').value       = d.name;
    document.getElementById('dsa-platform').value   = d.platform;
    document.getElementById('dsa-topic').value      = d.topic || '';
    document.getElementById('dsa-difficulty').value = d.difficulty;
    document.getElementById('dsa-status').value     = d.status;
    currentTags = [...(d.tags || [])];
  } else {
    document.getElementById('dsa-name').value       = '';
    document.getElementById('dsa-platform').value   = 'LeetCode';
    document.getElementById('dsa-topic').value      = '';
    document.getElementById('dsa-difficulty').value = 'Medium';
    document.getElementById('dsa-status').value     = 'Solved';
  }
  document.getElementById('tag-input-field').value = '';
  renderTagsInput();
  document.getElementById('dsa-modal').classList.add('open');
}

async function saveDSA() {
  const name = document.getElementById("dsa-name").value.trim();
  const platform = document.getElementById("dsa-platform").value;
  const topic = document.getElementById("dsa-topic").value.trim();
  const difficulty = document.getElementById("dsa-difficulty").value;
  const status = document.getElementById("dsa-status").value;

  if (!name) {
    showToast("Enter problem name");
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  if (editDsaId) {
    // 🔥 UPDATE EXISTING
    await updateDoc(
      doc(db, "users", user.uid, "dsa", editDsaId),
      {
        name,
        platform,
        topic,
        difficulty,
        status
      }
    );

    showToast("Problem updated");

  } else {
    // 🔥 CREATE NEW
    await addDoc(
      collection(db, "users", user.uid, "dsa"),
      {
        name,
        platform,
        topic,
        difficulty,
        status,
        createdAt: Date.now()
      }
    );

    showToast("Problem added");
  }

  editDsaId = null;
  closeModal("dsa-modal");
}

function loadDSAFromFirestore() {
  const user = auth.currentUser;
  if (!user) return;

  //  remove old listener first
  if (unsubscribeDSA) unsubscribeDSA();

  unsubscribeDSA = onSnapshot(
    collection(db, "users", user.uid, "dsa"),
    (snapshot) => {
      dsaQuestions = [];

      snapshot.forEach(docSnap => {
        dsaQuestions.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      console.log("DSA updated:", dsaQuestions); // debug
      renderDSA();
    }
  );
}
async function deleteDSA(id) {
  if (!confirm("Delete this problem?")) return;

  const user = auth.currentUser;
  if (!user) return;

  try {
    await deleteDoc(
      doc(db, "users", user.uid, "dsa", id)
    );

    showToast("Deleted");

  } catch (err) {
    console.error(err);
    showToast("Error deleting");
  }
}

/* ══════════════════════════════════════════════════════════
   7. TAGS INPUT
   ══════════════════════════════════════════════════════════ */
function handleTagInput(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.replace(',', '').trim();
    if (val && !currentTags.includes(val)) { currentTags.push(val); renderTagsInput(); }
    e.target.value = '';
  } else if (e.key === 'Backspace' && !e.target.value && currentTags.length) {
    currentTags.pop(); renderTagsInput();
  }
}

function removeTag(i) { currentTags.splice(i, 1); renderTagsInput(); }

function renderTagsInput() {
  const wrap  = document.getElementById('tags-wrap');
  const input = document.getElementById('tag-input-field');
  wrap.innerHTML = '';
  currentTags.forEach((tag, i) => {
    const chip = document.createElement('span');
    chip.className = 'tag-removable';
    chip.innerHTML = `${esc(tag)}<button class="tag-remove" onclick="removeTag(${i})">×</button>`;
    wrap.appendChild(chip);
  });
  wrap.appendChild(input);
  input.placeholder = currentTags.length ? '' : 'type and press Enter…';
}


/* ══════════════════════════════════════════════════════════
   8. MODAL
   ══════════════════════════════════════════════════════════ */
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Click the dark overlay → close the modal
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

function loadApplicationsFromFirestore() {
  const user = auth.currentUser;
  if (!user) return;
  onSnapshot(
    collection(db, "users", user.uid, "applications"),
    (snapshot) => {
      applications = [];

      snapshot.forEach((doc) => {
        applications.push({
          id: doc.id,
          ...doc.data()
        });
      });

      renderApps();
    }
  );
}
import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // 🔒 not logged in → go to login page
    window.location.href = "/login.html";
  } else {
    console.log("User logged in:", user.uid);

    // 🔥 LOAD YOUR DATA
    loadApplicationsFromFirestore();
    loadDSAFromFirestore();
  }
});
updateLandingStats();





// Expose functions to global scope for inline event handlers
window.showPage = showPage;
window.openAppModal = openAppModal;
window.closeModal = closeModal;
window.saveApp = saveApp;
window.deleteApp = deleteApp;
window.quickUpdateStatus = quickUpdateStatus;
window.loadApplicationsFromFirestore = loadApplicationsFromFirestore;
window.loadDSAFromFirestore = loadDSAFromFirestore;
window.openDsaModal = openDsaModal;
window.saveDSA = saveDSA;
window.deleteDSA = deleteDSA;
window.handleTagInput = handleTagInput;
window.removeTag = removeTag;
window.sortApps = sortApps;
window.sortDSA = sortDSA;
window.renderDSA = renderDSA;
