import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://synhvvaolrjxdcbyozld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bmh2dmFvbHJqeGRjYnlvemxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njg4NzEsImV4cCI6MjA4NTU0NDg3MX0.GSEfz8HVd49uEWXd70taR6FUv243VrFJKn6KlsZW-aQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ADMIN_EMAIL = "admin@order-sparepart.com";
const USER_EDIT_EMAIL = "user@order-sparepart.com"; 
let currentEmail = "";
let localData = [];

// --- PENGATURAN KOLOM TABEL ---
const DEFAULT_COLUMNS = [
    { id: 'no', label: 'No', thClass: 'px-4 py-5 text-center', tdClass: 'px-4 py-5 text-center text-[10px] font-bold text-slate-400' },
    { id: 'foto', label: 'Foto', thClass: 'px-4 py-5 text-center', tdClass: 'px-4 py-5 flex justify-center' },
    { id: 'tanggal_order', label: 'Tanggal Order', thClass: 'px-6 py-5 text-center', tdClass: 'px-6 py-5 text-[10px] text-slate-400 font-mono text-center' },
    { id: 'detail_barang', label: 'Detail Barang', thClass: 'px-6 py-5', tdClass: 'px-6 py-5' },
    { id: 'qty', label: 'Qty', thClass: 'px-6 py-5 text-center', tdClass: 'px-6 py-5 text-center font-black text-indigo-600 text-sm' },
    { id: 'mesin_line', label: 'Mesin / Line', thClass: 'px-6 py-5', tdClass: 'px-6 py-5 text-[10px] uppercase text-slate-500 font-bold' },
    { id: 'detail_pesanan', label: 'Detail Pesanan', thClass: 'px-6 py-5', tdClass: 'px-6 py-5 text-[10px] text-slate-600 max-w-[200px]' },
    { id: 'pr_po', label: 'No. PR/PO', thClass: 'px-6 py-5', tdClass: 'px-6 py-5 text-[10px] text-slate-500 font-mono' },
    { id: 'status', label: 'Status', thClass: 'px-6 py-5 text-center', tdClass: 'px-6 py-5 text-center' },
    { id: 'tgl_status', label: 'Tgl Ubah Status', thClass: 'px-6 py-5 text-center', tdClass: 'px-6 py-5 text-center text-[9px] text-slate-500 font-mono' },
    { id: 'tgl_pr', label: 'Tgl Input PR', thClass: 'px-6 py-5 text-center', tdClass: 'px-6 py-5 text-center text-[9px] text-slate-500 font-mono' },
    { id: 'tgl_po', label: 'Tgl Input PO', thClass: 'px-6 py-5 text-center', tdClass: 'px-6 py-5 text-center text-[9px] text-slate-500 font-mono' },
    { id: 'part_instal', label: 'Part Instal', thClass: 'px-6 py-5 text-center', tdClass: 'px-6 py-5 text-center' },
    { id: 'aksi', label: 'Aksi', thClass: 'px-6 py-5 text-center', tdClass: 'px-6 py-5 text-center' }
];

const COLUMN_KEY = 'order-sparepart-column-order-v1';

function getColumnOrder() {
    try {
        const stored = JSON.parse(localStorage.getItem(COLUMN_KEY) || '[]');
        const validIds = new Set(DEFAULT_COLUMNS.map(c => c.id));
        const filtered = stored.filter(id => validIds.has(id));
        // Tambah kolom baru yang belum ada di localStorage (jaga kompatibilitas)
        DEFAULT_COLUMNS.forEach(c => { if (!filtered.includes(c.id)) filtered.push(c.id); });
        return filtered.length ? filtered : DEFAULT_COLUMNS.map(c => c.id);
    } catch {
        return DEFAULT_COLUMNS.map(c => c.id);
    }
}

function setColumnOrder(order) {
    localStorage.setItem(COLUMN_KEY, JSON.stringify(order));
}

function getColumnDefsInOrder() {
    const order = getColumnOrder();
    const map = Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.id, c]));
    return order.map(id => map[id]).filter(Boolean);
}

// --- SESSION CHECK ---
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        currentEmail = session.user.email;
        document.getElementById('user-display').innerText = `User: ${currentEmail}`;
        const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        
        document.getElementById('admin-tools')?.classList.toggle('hidden', !isAdmin);
        document.getElementById('form-container')?.classList.toggle('hidden', isAdmin);
        fetchOrders();
    }
}

async function fetchOrders() {
    const { data, error } = await supabase.from('Order-sparepart').select('*').order('created_at', { ascending: false });
    if (!error) { 
        localData = data; 
        applyFiltersAndSort(); 
    }
}

// --- UPLOAD FOTO ---
async function uploadFile(file) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage
        .from('sparepart-images')
        .upload(filePath, file);

    if (error) {
        console.error("Gagal upload:", error);
        return null;
    }
    
    const { data: publicData } = supabase.storage.from('sparepart-images').getPublicUrl(filePath);
    return publicData.publicUrl;
}

// --- SUBMIT FORM ---
document.getElementById('order-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.innerText = "MENGIRIM..."; btn.disabled = true;

    const fileInput = document.getElementById('foto_barang');
    const fotoUrl = await uploadFile(fileInput.files[0]);

    const payload = {
        'Nama Barang': document.getElementById('nama_barang').value,
        'Spesifikasi': document.getElementById('spesifikasi').value,
        'Quantity Order': parseInt(document.getElementById('qty').value),
        'Satuan': document.getElementById('satuan').value,
        'Nama Mesin': document.getElementById('nama_mesin').value,
        'Nama Line': document.getElementById('nama_line').value,
        'Project': document.getElementById('detail_pesanan').value,
        'PIC Order': document.getElementById('pic_order').value,
        'gambar': fotoUrl,
        'Status': 'Belum Di Proses',
        'part_installed': false
    };

    const { error } = await supabase.from('Order-sparepart').insert([payload]);
    if (error) alert("Error: " + error.message); 
    else { 
        document.getElementById('order-form').reset(); 
        fetchOrders(); 
    }
    btn.innerText = "KIRIM PERMINTAAN"; btn.disabled = false;
});

// --- FILTER & SORT ---
function applyFiltersAndSort() {
    const term = document.getElementById('search-input')?.value.toLowerCase() || "";
    const sortCriteria = document.getElementById('sort-select')?.value || "newest";

    let filtered = localData.filter(i => 
        (i['Nama Barang']?.toLowerCase().includes(term)) || 
        (i['Nama Mesin']?.toLowerCase().includes(term)) ||
        (i['PIC Order']?.toLowerCase().includes(term)) ||
        (i['Project']?.toLowerCase().includes(term)) ||
        (i['Status']?.toLowerCase().includes(term))
    );

    switch (sortCriteria) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'status':
            filtered.sort((a, b) => (a.Status || "").localeCompare(b.Status || ""));
            break;
        case 'line':
            filtered.sort((a, b) => (a['Nama Line'] || "").localeCompare(b['Nama Line'] || ""));
            break;
        case 'pic':
            filtered.sort((a, b) => (a['PIC Order'] || "").localeCompare(b['PIC Order'] || ""));
            break;
        case 'urutan':
            filtered.sort((a, b) => (a['Nama Barang'] || "").localeCompare(b['Nama Barang'] || ""));
            break;
    }

    renderTable(filtered);
}

// --- RENDER TABEL ---
function renderTable(data) {
    const body = document.getElementById('data-body');
    if(!body) return;

    const columnDefs = getColumnDefsInOrder();

    // Render header dinamis
    const headerRow = document.getElementById('table-header-row');
    if (headerRow) {
        headerRow.innerHTML = columnDefs.map(col => 
            `<th class="${col.thClass}">${col.label}</th>`
        ).join('');
    }
    
    const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const isUserEdit = currentEmail.toLowerCase() === USER_EDIT_EMAIL.toLowerCase();

    body.innerHTML = data.map((i, index) => {
        const status = String(i.Status || i.status || '').trim();
        const isSelesai = status.toLowerCase() === 'selesai' || status.toLowerCase() === 'sudah datang';
        const partInstalled = !!(i.part_installed);
        const fotoHtml = i.gambar 
            ? `<img src="${i.gambar}" class="w-10 h-10 object-cover rounded-lg shadow-sm cursor-pointer hover:scale-150 transition-transform" onclick="window.open('${i.gambar}')">`
            : `<div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-[7px] text-slate-300 italic">No Pic</div>`;

        let actionBtn = '<span class="text-[8px] text-slate-300 font-bold uppercase tracking-tighter">View Only</span>';
        if (isAdmin) {
            actionBtn = `<button onclick="window.openModal('${i.id}')" class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-[9px] hover:bg-indigo-100">EDIT ADMIN</button>`;
        } else if (isUserEdit) {
            actionBtn = `<button onclick="window.openUserEditModal('${i.id}')" class="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 text-lg leading-none" title="Edit Detail">✏️</button>`;
        }

        const cells = {
            no: index + 1,
            foto: fotoHtml,
            tanggal_order: new Date(i.created_at).toLocaleDateString('id-ID'),
            detail_barang: `
                <div class="text-slate-800 font-bold text-sm uppercase">${i['Nama Barang']}</div>
                <div class="text-[10px] text-slate-400 italic">${i.Spesifikasi || '-'}</div>
                <div class="text-[9px] text-indigo-500 font-bold mt-1 uppercase italic">PIC: ${i['PIC Order'] || '-'}</div>
            `,
            qty: `${i['Quantity Order']} ${i.Satuan}`,
            mesin_line: `${i['Nama Line']}<br><span class="text-slate-300 font-normal italic">${i['Nama Mesin']}</span>`,
            detail_pesanan: i['Project'] ? i['Project'] : '-',
            pr_po: `PR: ${i.PR || '-'}<br>PO: ${i.PO || '-'}`,
            status: `
                <span class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest 
                ${isSelesai ? 'bg-emerald-100 text-emerald-700' : status.toLowerCase() === 'on process' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}">
                    ${(status === 'Selesai' || status === 'Sudah Datang') ? 'Sudah Datang' : (status === 'Pending' || status === 'Belum Di Proses' || status === 'Belum Di Input' || !status) ? 'Belum Di Proses' : status}
                </span>
            `,
            tgl_status: i.status_updated_at ? new Date(i.status_updated_at).toLocaleString('id-ID') : '—',
            tgl_pr: i.pr_updated_at || i.pr_po_updated_at ? new Date(i.pr_updated_at || i.pr_po_updated_at).toLocaleString('id-ID') : '—',
            tgl_po: i.po_updated_at || i.pr_po_updated_at ? new Date(i.po_updated_at || i.pr_po_updated_at).toLocaleString('id-ID') : '—',
            part_instal: isSelesai
                ? `<button onclick="window.togglePartInstalled('${i.id}')" class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${partInstalled ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">${partInstalled ? 'INSTALLED' : 'NOT INSTALLED'}</button>${partInstalled && i.part_installed_at ? `<div class="text-[8px] text-slate-500 mt-1" title="Tanggal perubahan dari NOT INSTALLED ke INSTALLED">${new Date(i.part_installed_at).toLocaleString('id-ID')}</div>` : ''}`
                : '<span class="text-[9px] text-slate-300 font-bold uppercase">—</span>',
            aksi: actionBtn
        };

        const columnDefs = getColumnDefsInOrder();

        return `
            <tr class="hover:bg-slate-50 transition-all border-b border-slate-50">
                ${columnDefs.map(col => `<td class="${col.tdClass}">${cells[col.id]}</td>`).join('')}
            </tr>
        `;
    }).join('');
}

// --- MODAL ADMIN LOGIC ---
window.openModal = (id) => {
    const row = localData.find(r => String(r.id) === String(id));
    if (!row) return;
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-pr').value = row.PR || '';
    document.getElementById('edit-po').value = row.PO || '';
    const status = String(row.Status || row.status || '').trim();
    const norm = (status === 'Selesai' ? 'Sudah Datang' : (status === 'Pending' || status === 'Belum Di Input' ? 'Belum Di Proses' : status));
    document.getElementById('edit-status').value = norm || 'Belum Di Proses';
    document.getElementById('modal-admin')?.classList.remove('hidden');
};
window.closeModal = () => document.getElementById('modal-admin')?.classList.add('hidden');

window.saveAdminUpdate = async () => {
    const id = document.getElementById('edit-id').value;
    const row = localData.find(r => String(r.id) === String(id));
    const newPr = (document.getElementById('edit-pr').value || '').trim();
    const newPo = (document.getElementById('edit-po').value || '').trim();
    const newStatus = document.getElementById('edit-status').value;
    const now = new Date().toISOString();

    const payload = {
        'PR': newPr,
        'PO': newPo,
        'Status': newStatus
    };
    if (row) {
        const statusChanged = (String(row.Status || '').trim() !== String(newStatus).trim());
        const prChanged = (String(row.PR || '').trim() !== newPr);
        const poChanged = (String(row.PO || '').trim() !== newPo);
        if (statusChanged) payload.status_updated_at = now;
        if (prChanged) payload.pr_updated_at = now;
        if (poChanged) payload.po_updated_at = now;
    }

    const { error } = await supabase.from('Order-sparepart').update(payload).eq('id', id);
    if (!error) { window.closeModal(); fetchOrders(); }
    else alert("Gagal update!");
};

// --- PART INSTALLED TOGGLE (only when Status = Sudah Datang; one click = INSTALLED ↔ NOT INSTALLED, saved to DB) ---
window.togglePartInstalled = async (id) => {
    const row = localData.find(i => String(i.id) === String(id));
    if (!row) return;
    const next = !row.part_installed;
    const payload = { part_installed: next, part_installed_at: next ? new Date().toISOString() : null };
    const { error } = await supabase.from('Order-sparepart').update(payload).eq('id', id);
    if (error) {
        alert("Gagal update part installed: " + (error.message || ""));
        return;
    }
    await fetchOrders();
};

// --- MODAL USER LOGIC (DIPERBAIKI) ---
window.openUserEditModal = (id) => {
    // Perbaikan: Gunakan == (double equal) agar string ID cocok dengan number ID
    const item = localData.find(d => d.id == id);
    
    if (!item) {
        console.error("Data tidak ditemukan untuk ID:", id);
        return;
    }

    const modal = document.getElementById('modal-user-edit');
    if(!modal) return;

    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-user-nama').value = item['Nama Barang'] || '';
    document.getElementById('edit-user-spek').value = item['Spesifikasi'] || '';
    document.getElementById('edit-user-qty').value = item['Quantity Order'] || 0;
    document.getElementById('edit-user-satuan').value = item['Satuan'] || 'PCS';
    document.getElementById('edit-user-line').value = item['Nama Line'] || '';
    document.getElementById('edit-user-detail-pesanan').value = item['Project'] || '';

    modal.classList.remove('hidden');
};

window.closeUserModal = () => {
    const modal = document.getElementById('modal-user-edit');
    if(modal) modal.classList.add('hidden');
}

window.saveUserUpdate = async () => {
    const id = document.getElementById('edit-user-id').value;
    const btn = document.getElementById('btn-save-user');
    if(!btn) return;
    
    btn.innerText = "SAVING..."; btn.disabled = true;

    const payload = {
        'Nama Barang': document.getElementById('edit-user-nama').value,
        'Spesifikasi': document.getElementById('edit-user-spek').value,
        'Quantity Order': parseInt(document.getElementById('edit-user-qty').value),
        'Satuan': document.getElementById('edit-user-satuan').value,
        'Nama Line': document.getElementById('edit-user-line').value,
        'Project': document.getElementById('edit-user-detail-pesanan').value
    };

    const { error } = await supabase.from('Order-sparepart').update(payload).eq('id', id);

    if (error) {
        alert("Gagal update user: " + error.message);
    } else { 
        window.closeUserModal(); 
        fetchOrders(); 
    }

    btn.innerText = "SIMPAN PERUBAHAN"; btn.disabled = false;
};

// --- MODAL PENGATURAN KOLOM ---
let tempColumnOrder = null;

window.openColumnSettings = () => {
    const modal = document.getElementById('modal-column-settings');
    const listEl = document.getElementById('column-list');
    if (!modal || !listEl) return;

    tempColumnOrder = getColumnOrder();

    const map = Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.id, c]));
    const renderList = () => {
        listEl.innerHTML = tempColumnOrder.map((id, idx) => {
            const col = map[id];
            if (!col) return '';
            return `
                <div class="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <div class="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                        <span class="text-slate-300">${idx + 1}.</span>
                        <span>${col.label}</span>
                    </div>
                    <div class="flex gap-1">
                        <button type="button" onclick="window.moveColumn('${id}', -1)" class="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 text-[10px] hover:bg-slate-100">▲</button>
                        <button type="button" onclick="window.moveColumn('${id}', 1)" class="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-200 text-[10px] hover:bg-slate-100">▼</button>
                    </div>
                </div>
            `;
        }).join('');
    };

    window.__renderColumnList = renderList;
    renderList();
    modal.classList.remove('hidden');
};

window.moveColumn = (id, direction) => {
    if (!Array.isArray(tempColumnOrder)) return;
    const idx = tempColumnOrder.indexOf(id);
    if (idx === -1) return;
    const newIndex = idx + direction;
    if (newIndex < 0 || newIndex >= tempColumnOrder.length) return;
    const copy = [...tempColumnOrder];
    const [moved] = copy.splice(idx, 1);
    copy.splice(newIndex, 0, moved);
    tempColumnOrder = copy;
    if (typeof window.__renderColumnList === 'function') {
        window.__renderColumnList();
    }
};

window.closeColumnSettings = () => {
    const modal = document.getElementById('modal-column-settings');
    if (modal) modal.classList.add('hidden');
    tempColumnOrder = null;
};

window.saveColumnSettings = () => {
    if (Array.isArray(tempColumnOrder)) {
        setColumnOrder(tempColumnOrder);
        applyFiltersAndSort(); // re-render tabel dengan urutan baru
    }
    window.closeColumnSettings();
};

// --- EVENTS ---
document.getElementById('search-input')?.addEventListener('input', applyFiltersAndSort);
document.getElementById('sort-select')?.addEventListener('change', applyFiltersAndSort);

window.logout = async () => { 
    await supabase.auth.signOut(); 
    window.location.href = 'login.html'; 
};

window.exportToExcel = () => {
    const dataForExport = localData.map(item => {
        const { Project, part_installed, part_installed_at, status_updated_at, pr_updated_at, po_updated_at, pr_po_updated_at, ...rest } = item;
        const fmt = (t) => t ? new Date(t).toLocaleString('id-ID') : '—';
        return { 
            ...rest,
            'Detail Pesanan': Project,
            'Status Part Instal': item.Status === 'Sudah Datang' || (item.Status || '').toLowerCase() === 'selesai'
                ? (part_installed ? 'Installed' : 'Not Installed')
                : '—',
            'Tgl Ubah Status': fmt(status_updated_at),
            'Tgl Input PR': fmt(pr_updated_at || pr_po_updated_at),
            'Tgl Input PO': fmt(po_updated_at || pr_po_updated_at),
            'Tgl jadi Installed': fmt(part_installed_at)
        };
    });

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "Sparepart_Report.xlsx");
};

// Start
checkSession();
