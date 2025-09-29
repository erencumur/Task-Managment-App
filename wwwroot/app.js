console.log('APP v11 - filters, search, modal, highlights');

const API = 'https://localhost:7095';

// DOM
const board = document.getElementById('board');
const projectSel = document.getElementById('projectSelect');
const btnLoad = document.getElementById('btnLoad');
const btnAdd = document.getElementById('btnAdd');
const taskTitle = document.getElementById('taskTitle');
const taskDesc = document.getElementById('taskDesc');
const taskDue = document.getElementById('taskDue');
const statusEl = document.getElementById('status');

const newProjectNameEl = document.getElementById('newProjectName');
const btnAddProject = document.getElementById('btnAddProject');
const btnDeleteProject = document.getElementById('btnDeleteProject');
const renameInput = document.getElementById('renameProjectInput');
const btnRenameProject = document.getElementById('btnRenameProject');

// Toolbar
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');
const btnClearSearch = document.getElementById('btnClearSearch');

// Modal
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalBody = document.getElementById('modalBody');
const modalTitle = document.getElementById('modalTitle');

// State
let listsCache = [];                 // API'den gelen board
let currentFilter = 'all';           // all | late | today | week
let searchTerm = '';                 // küçük harfli arama

// Events
btnLoad.addEventListener('click', () => loadBoard());
projectSel.addEventListener('change', () => loadBoard());
btnAdd.addEventListener('click', addTask);
btnAddProject.addEventListener('click', addProject);
btnDeleteProject.addEventListener('click', deleteCurrentProject);
btnRenameProject.addEventListener('click', renameCurrentProject);

filterBtns.forEach(b => b.addEventListener('click', () => {
    filterBtns.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    currentFilter = b.dataset.filter || 'all';
    renderBoard(listsCache, true);
}));

searchInput.addEventListener('input', () => {
    searchTerm = (searchInput.value || '').trim().toLowerCase();
    renderBoard(listsCache, false);
});
btnClearSearch.addEventListener('click', () => {
    searchTerm = ''; searchInput.value = '';
    renderBoard(listsCache, true);
});

// Kart aksiyonları + modal
document.addEventListener('click', async (e) => {
    // modal kapat
    if (e.target === modal || e.target === modalClose) hideModal();

    // Sil
    if (e.target.matches('.btn-delete')) {
        const card = e.target.closest('.card');
        const taskId = Number(card?.dataset.taskId);
        if (!taskId) return;
        if (!confirm('Görevi silmek istediğine emin misin?')) return;
        const prev = e.target.textContent;
        e.target.disabled = true; e.target.textContent = 'Siliniyor…';
        try {
            await deleteTask(taskId);
            await loadBoard();
            setStatus('Silindi ✔');
        } catch (err) {
            setStatus('Silme hatası: ' + String(err), true);
        } finally {
            e.target.disabled = false; e.target.textContent = prev;
        }
    }

    // Düzenle → inline
    if (e.target.matches('.btn-edit')) {
        const card = e.target.closest('.card');
        const taskId = Number(card?.dataset.taskId);
        const listId = Number(card?.dataset.listId);
        if (!taskId || !listId) return;

        const task = findTask(taskId);
        if (!task) return;

        card.innerHTML = renderTaskEditForm(task);
        card.classList.add('editing');
    }

    // İptal (inline)
    if (e.target.matches('.btn-cancel-edit')) {
        const card = e.target.closest('.card');
        const taskId = Number(card?.dataset.taskId);
        const listId = Number(card?.dataset.listId);
        const task = findTask(taskId);
        card.classList.remove('editing');
        card.innerHTML = renderTaskView(task, listId);
    }

    // Kaydet (inline)
    if (e.target.matches('.btn-save-edit')) {
        const card = e.target.closest('.card');
        const taskId = Number(card?.dataset.taskId);
        const listId = Number(card?.dataset.listId);

        const title = card.querySelector('.edit-title').value.trim();
        const desc = card.querySelector('.edit-desc').value.trim();
        const due = card.querySelector('.edit-due').value;

        if (!title) { setStatus('Başlık gerekli', true); return; }
        if (title.length > 100) { setStatus('Başlık en fazla 100 karakter', true); return; }
        if (!desc) { setStatus('Açıklama gerekli', true); return; }
        if (desc.length > 1000) { setStatus('Açıklama en fazla 1000 karakter', true); return; }
        if (!due) { setStatus('Son tarih gerekli', true); return; }

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const dueDate = new Date(due + 'T00:00:00');
        if (isNaN(dueDate.getTime())) { setStatus('Tarih formatı geçersiz (YYYY-MM-DD)', true); return; }
        if (dueDate < today) { setStatus('Son tarih bugünden eski olamaz', true); return; }

        const order = getCardIndex(card);

        e.target.disabled = true; e.target.textContent = 'Kaydediliyor…';
        try {
            const dueIsoUtc = `${due}T00:00:00Z`;
            await updateTask(taskId, {
                listEntityId: listId,
                order,
                title,
                description: desc,
                dueDate: dueIsoUtc
            });
            await loadBoard();
            setStatus('Güncellendi ✔');
        } catch (err) {
            setStatus('Güncelleme hatası: ' + String(err), true);
        } finally {
            e.target.disabled = false; e.target.textContent = 'Kaydet';
        }
    }

    // Kartın boşluğuna tıklayınca modal (btn tıklaması hariç)
    if (e.target.closest('.card') && !e.target.closest('.actions') && !e.target.closest('.edit-form')) {
        const card = e.target.closest('.card');
        const taskId = Number(card?.dataset.taskId);
        const task = findTask(taskId);
        if (task) showModalFor(task);
    }
});

// ======================== Proje Yönetimi ========================
async function loadProjects() {
    try {
        const res = await fetch(`${API}/api/Projects`);
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        const projects = await res.json();
        projectSel.innerHTML = projects.map(p =>
            `<option value="${p.id}">${escapeHtml(p.name || ('Proje ' + p.id))}</option>`
        ).join('');
        if (!projectSel.value && projects.length) {
            projectSel.value = String(projects[0].id);
        }
    } catch (err) { setStatus('Projeler yüklenemedi: ' + String(err), true); }
}

async function addProject() {
    const name = (newProjectNameEl.value || '').trim();
    if (!name) { setStatus('Proje adı gerekli', true); newProjectNameEl.focus(); return; }
    const res = await fetch(`${API}/api/Projects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    if (!res.ok) { setStatus(`Proje ekleme hatası: ${res.status} ${await res.text()}`, true); return; }
    newProjectNameEl.value = '';
    await loadProjects();
    const opt = Array.from(projectSel.options).find(o => o.textContent === name);
    if (opt) projectSel.value = opt.value;
    await loadBoard();
    setStatus('Proje eklendi ✔');
}

async function renameCurrentProject() {
    const pid = Number(projectSel?.value || 0);
    const newName = (renameInput.value || '').trim();
    if (!pid) { setStatus('Proje seçili değil', true); return; }
    if (!newName) { setStatus('Yeni proje adı gerekli', true); return; }

    const res = await fetch(`${API}/api/Projects/${pid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pid, name: newName })
    });
    if (!res.ok) { setStatus(`Proje adı güncelleme hatası: ${res.status} ${await res.text()}`, true); return; }

    renameInput.value = '';
    await loadProjects();
    projectSel.value = String(pid);
    setStatus('Proje adı güncellendi ✔');
}

async function deleteCurrentProject() {
    setStatus('');
    let pid = Number(projectSel?.value);
    if (!Number.isInteger(pid) || pid <= 0) {
        const selText = projectSel.options[projectSel.selectedIndex]?.textContent?.trim();
        const res = await fetch(`${API}/api/Projects`);
        if (!res.ok) { setStatus('Projeler alınamadı', true); return; }
        const projects = await res.json();
        const match = projects.find(p => (p.name || '').trim() === selText);
        pid = Number(match?.id || 0);
    }
    if (!pid) { setStatus('Silinecek proje bulunamadı', true); return; }
    if (!confirm('Bu projeyi silmek istediğine emin misin? (Listeler ve görevler de silinir)')) return;

    const res = await fetch(`${API}/api/Projects/${pid}`, { method: 'DELETE' });
    if (!res.ok) {
        const txt = await res.text();
        setStatus(`Proje silme hatası: ${res.status} ${txt || 'Hata'}`, true);
        alert(`Proje silme hatası:\n${res.status} ${txt || 'Hata'}`);
        return;
    }
    await loadProjects();
    await loadBoard();
    setStatus('Proje silindi ✔');
}

// ======================== Board & DnD ========================
async function loadBoard() {
    setStatus('');
    const pid = Number(projectSel?.value || 1);
    board.innerHTML = '<div class="column"><div class="col-title">Yükleniyor...</div></div>';

    try {
        const res = await fetch(`${API}/api/Lists?projectId=${pid}`);
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        const lists = await res.json();
        listsCache = lists;
        renderBoard(lists, true);
    } catch (err) {
        board.innerHTML = `
      <div class="column">
        <div class="col-title">Hata</div>
        <div class="card"><pre>${escapeHtml(String(err))}</pre></div>
      </div>`;
    }
}

function renderBoard(lists, reEnableDnD = true) {
    board.innerHTML = '';

    for (const list of lists) {
        const col = document.createElement('div');
        col.className = 'column';
        col.dataset.listId = list.id;

        const title = document.createElement('div');
        title.className = 'col-title';
        title.textContent = `${list.name}`;
        col.appendChild(title);

        let shownCount = 0;

        for (const t of list.tasks) {
            if (!passesSearch(t)) continue;
            if (!passesFilter(t)) continue;

            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.taskId = t.id;
            card.dataset.listId = list.id;

            // vurgular
            const badge = deadlineBadge(t);
            if (badge.kind === 'late') card.classList.add('overdue');
            if (badge.kind === 'soon') card.classList.add('due-soon');

            card.innerHTML = renderTaskView(t, list.id, badge);
            col.appendChild(card);
            shownCount++;
        }

        if (shownCount === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty';
            empty.textContent = 'Bu liste şu kriterlerle boş görünüyor.';
            col.appendChild(empty);
        }

        // sayaç
        const count = shownCount;
        title.textContent = `${list.name} (${count})`;

        board.appendChild(col);
    }

    // Filtre/arama aktifken DnD kapalı 
    const canDnD = currentFilter === 'all' && !searchTerm;
    if (reEnableDnD) enableDnD(canDnD);
}

function passesSearch(t) {
    if (!searchTerm) return true;
    const ttl = (t.title || '').toLowerCase();
    return ttl.includes(searchTerm);
}

function passesFilter(t) {
    if (!t.dueDate) return currentFilter === 'all';
    const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((d - today) / (1000 * 60 * 60 * 24));

    switch (currentFilter) {
        case 'late': return diffDays < 0;
        case 'today': return diffDays === 0;
        case 'week': return diffDays >= 0 && diffDays <= 7;
        default: return true;
    }
}

function deadlineBadge(t) {
    if (!t.dueDate) return { kind: 'none', html: '' };
    const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((d - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { kind: 'late', html: '<span class="badge overdue">⏰ Gecikmiş</span>' };
    if (diffDays === 0) return { kind: 'soon', html: '<span class="badge soon">📅 Bugün</span>' };
    if (diffDays <= 7) return { kind: 'soon', html: '<span class="badge soon">🗓️ Bu hafta</span>' };
    return { kind: 'none', html: '' };
}

// Render — normal görünüm
function renderTaskView(t, listId, badge = { html: '' }) {
    return `
    <div class="card-head" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <h4>${escapeHtml(t.title)}</h4>
      <div class="actions" style="display:flex;gap:6px">
        <button class="btn-edit"   title="Görevi düzenle">Düzenle</button>
        <button class="btn-delete" title="Görevi sil">Sil</button>
      </div>
    </div>
    <div class="meta">
     Son tarih: ${formatDisplayDate(t.dueDate)}
      ${badge.html}
    </div>
    ${t.description ? `<div class="meta">${escapeHtml(t.description)}</div>` : ''}
  `;
}

// Render — inline edit formu
function renderTaskEditForm(t) {
    const iso = toDateInputValue(t.dueDate);
    return `
    <div class="edit-form">
      <div class="edit-row">
        <input class="edit-title" type="text" value="${escapeAttr(t.title || '')}" placeholder="Başlık" />
        <input class="edit-due" type="date" value="${iso}" />
      </div>
      <div class="edit-row">
        <textarea class="edit-desc" rows="3" placeholder="Açıklama">${escapeHtml(t.description || '')}</textarea>
      </div>
      <div class="edit-row" style="justify-content:flex-end;gap:8px">
        <button class="btn-cancel-edit">İptal</button>
        <button class="btn-save-edit">Kaydet</button>
      </div>
    </div>
  `;
}

function enableDnD(enabled) {
    
    if (!enabled) return;
    document.querySelectorAll('.column').forEach(col => {
        new Sortable(col, {
            group: 'lists',
            animation: 150,
            ghostClass: 'drag-ghost',
            draggable: '.card',
            onEnd: async (evt) => {
                const el = evt.item;
                const taskId = Number(el.dataset.taskId);
                const toListId = Number(evt.to.dataset.listId);
                const newIndex = evt.newIndex;
                try {
                    await moveTask(taskId, toListId, newIndex);
                    el.dataset.listId = String(toListId);
                    updateCounters();
                    setStatus('Taşındı ✔');
                } catch (err) {
                    setStatus('Taşıma hatası: ' + String(err), true);
                    await loadBoard();
                }
            }
        });
    });
}

// ======================== API helpers ========================
async function moveTask(taskId, listEntityId, order) {
    const res = await fetch(`${API}/api/Tasks/${taskId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listEntityId, order })
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

async function updateTask(taskId, dto) {
    const res = await fetch(`${API}/api/Tasks/${taskId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto)
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

async function deleteTask(taskId) {
    const res = await fetch(`${API}/api/Tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

// ======================== Add Task ========================
async function addTask() {
    setStatus('');

    const title = taskTitle.value.trim();
    const desc = taskDesc.value.trim();
    const due = taskDue.value;

    if (!title) { setStatus('Başlık gerekli', true); taskTitle?.focus(); return; }
    if (title.length > 100) { setStatus('Başlık en fazla 100 karakter olabilir', true); taskTitle?.focus(); return; }
    if (!desc) { setStatus('Açıklama gerekli', true); taskDesc?.focus(); return; }
    if (desc.length > 1000) { setStatus('Açıklama en fazla 1000 karakter olabilir', true); taskDesc?.focus(); return; }
    if (!due) { setStatus('Son tarih gerekli', true); taskDue?.focus(); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDate = new Date(due + 'T00:00:00');
    if (isNaN(dueDate.getTime())) { setStatus('Tarih formatı geçersiz (YYYY-MM-DD)', true); taskDue?.focus(); return; }
    if (dueDate < today) { setStatus('Son tarih bugünden eski olamaz', true); taskDue?.focus(); return; }

    const todo = listsCache.find(x => x.order === 0) || listsCache.find(x => x.name === 'Yapılacak');
    if (!todo) { setStatus('Yapılacak sütunu bulunamadı', true); return; }

    const dueIsoUtc = `${due}T00:00:00Z`;
    const body = {
        listEntityId: todo.id,
        title,
        description: desc,
        dueDate: dueIsoUtc
    };

    const prevText = btnAdd.textContent;
    btnAdd.disabled = true; btnAdd.textContent = 'Ekleniyor…';
    try {
        const res = await fetch(`${API}/api/Tasks`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        taskTitle.value = ''; taskDesc.value = ''; taskDue.value = '';
        await loadBoard();
        setStatus('Görev eklendi ✔');
    } catch (err) {
        setStatus('Hata: ' + String(err), true);
    } finally {
        btnAdd.disabled = false; btnAdd.textContent = prevText || 'Ekle';
    }
}

// ======================== Helpers ========================
function getCardIndex(cardEl) {
    const column = cardEl.closest('.column');
    if (!column) return 0;
    const cards = Array.from(column.querySelectorAll('.card'));
    return Math.max(0, cards.indexOf(cardEl));
}

function updateCounters() {
    document.querySelectorAll('.column').forEach(col => {
        const id = Number(col.dataset.listId);
        const name = (listsCache.find(x => x.id === id)?.name) ?? 'Liste';
        const count = col.querySelectorAll('.card:not(.hidden)').length;
        const title = col.querySelector('.col-title');
        if (title) title.textContent = `${name} (${count})`;
    });
}

function setStatus(msg, isErr = false) {
    statusEl.textContent = msg;
    statusEl.style.color = isErr ? 'var(--err)' : 'var(--ok)';
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}
function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
}
function findTask(taskId) {
    for (const l of listsCache) {
        const t = l.tasks.find(x => x.id === taskId);
        if (t) return t;
    }
    return null;
}

// Modal helpers
function showModalFor(task) {
    modalTitle.textContent = task.title || 'Görev Detayı';

    const listName = (listsCache.find(l => l.id === task.listEntityId)?.name) || '';
    const displayDate = formatDisplayDate(task.dueDate); 

    modalBody.innerHTML = `
    <div><b>Liste:</b> ${escapeHtml(listName)}</div>
    <div><b>Son tarih:</b> ${escapeHtml(displayDate)}</div>
    <div><b>Açıklama:</b><br/> ${escapeHtml(task.description || '-')}</div>
  `;
    modal.classList.remove('hidden');
}

function hideModal() { modal.classList.add('hidden'); }

// Açılışta: önce projeler, sonra board
(async () => {
    await loadProjects();
    await loadBoard();
})();

// === TARİH YARDIMCILARI ===
function toDateInputValue(due) {
    if (!due) return '';
    if (typeof due === 'string') {
        const m = due.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m) return m[1]; 
    }
    const d = new Date(due);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDisplayDate(due) {
    const ymd = toDateInputValue(due);
    if (!ymd) return '-';
    return new Date(ymd + 'T00:00:00').toLocaleDateString();
}