import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://synhvvaolrjxdcbyozld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bmh2dmFvbHJqeGRjYnlvemxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njg4NzEsImV4cCI6MjA4NTU0NDg3MX0.GSEfz8HVd49uEWXd70taR6FUv243VrFJKn6KlsZW-aQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ADMIN_EMAIL = "admin@order-sparepart.com";
const USER_EDIT_EMAIL = "user@order-sparepart.com"; 
let currentEmail = "";
let localData = [];

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
        'PIC Order': document.getElementById('pic_order').value,
        'gambar': fotoUrl,
        'Status': 'Pending'
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
    
    const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const isUserEdit = currentEmail.toLowerCase() === USER_EDIT_EMAIL.toLowerCase();

    body.innerHTML = data.map((i, index) => {
        const fotoHtml = i.gambar 
            ? `<img src="${i.gambar}" class="w-10 h-10 object-cover rounded-lg shadow-sm cursor-pointer hover:scale-150 transition-transform" onclick="window.open('${i.gambar}')">`
            : `<div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-[7px] text-slate-300 italic">No Pic</div>`;

        let actionBtn = '<span class="text-[8px] text-slate-300 font-bold uppercase tracking-tighter">View Only</span>';
        if (isAdmin) {
            actionBtn = `<button onclick="window.openModal('${i.id}','${i.PR || ''}','${i.PO || ''}','${i.Status}')" class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-[9px] hover:bg-indigo-100">EDIT ADMIN</button>`;
        } else if (isUserEdit) {
            actionBtn = `<button onclick="window.openUserEditModal('${i.id}')" class="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 text-lg leading-none" title="Edit Detail">✏️</button>`;
        }

        return `
            <tr class="hover:bg-slate-50 transition-all border-b border-slate-50">
                <td class="px-4 py-5 text-center text-[10px] font-bold text-slate-400">${index + 1}</td>
                <td class="px-4 py-5 flex justify-center">${fotoHtml}</td>
                <td class="px-6 py-5 text-[10px] text-slate-400 font-mono text-center">${new Date(i.created_at).toLocaleDateString('id-ID')}</td>
                <td class="px-6 py-5">
                    <div class="text-slate-800 font-bold text-sm uppercase">${i['Nama Barang']}</div>
                    <div class="text-[10px] text-slate-400 italic">${i.Spesifikasi || '-'}</div>
                    <div class="text-[9px] text-indigo-500 font-bold mt-1 uppercase italic">PIC: ${i['PIC Order'] || '-'}</div>
                </td>
                <td class="px-6 py-5 text-center font-black text-indigo-600 text-sm">${i['Quantity Order']} ${i.Satuan}</td>
                <td class="px-6 py-5 text-[10px] uppercase text-slate-500 font-bold">${i['Nama Line']}<br><span class="text-slate-300 font-normal italic">${i['Nama Mesin']}</span></td>
                <td class="px-6 py-5 text-[10px] text-slate-500 font-mono">PR: ${i.PR || '-'}<br>PO: ${i.PO || '-'}</td>
                <td class="px-6 py-5 text-center">
                    <span class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest 
                    ${i.Status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : i.Status === 'On Process' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}">
                        ${i.Status || 'Pending'}
                    </span>
                </td>
                <td class="px-6 py-5 text-center">${actionBtn}</td>
            </tr>
        `;
    }).join('');
}

// --- MODAL ADMIN LOGIC ---
window.openModal = (id, pr, po, status) => {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-pr').value = pr;
    document.getElementById('edit-po').value = po;
    document.getElementById('edit-status').value = status;
    document.getElementById('modal-admin')?.classList.remove('hidden');
};
window.closeModal = () => document.getElementById('modal-admin')?.classList.add('hidden');

window.saveAdminUpdate = async () => {
    const id = document.getElementById('edit-id').value;
    const { error } = await supabase.from('Order-sparepart').update({
        'PR': document.getElementById('edit-pr').value,
        'PO': document.getElementById('edit-po').value,
        'Status': document.getElementById('edit-status').value
    }).eq('id', id);
    if (!error) { window.closeModal(); fetchOrders(); }
    else alert("Gagal update!");
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
        'Nama Line': document.getElementById('edit-user-line').value
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

// --- EVENTS ---
document.getElementById('search-input')?.addEventListener('input', applyFiltersAndSort);
document.getElementById('sort-select')?.addEventListener('change', applyFiltersAndSort);

window.logout = async () => { 
    await supabase.auth.signOut(); 
    window.location.href = 'login.html'; 
};

window.exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(localData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "Sparepart_Report.xlsx");
};

// Start
checkSession();
