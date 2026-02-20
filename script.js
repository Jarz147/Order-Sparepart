import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://synhvvaolrjxdcbyozld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bmh2dmFvbHJqeGRjYnlvemxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njg4NzEsImV4cCI6MjA4NTU0NDg3MX0.GSEfz8HVd49uEWXd70taR6FUv243VrFJKn6KlsZW-aQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ADMIN_EMAIL = "admin@order-sparepart.com"; 
let currentEmail = "";
let localData = [];

// --- SESSION & INIT ---
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        currentEmail = session.user.email;
        document.getElementById('user-display').innerText = `User: ${currentEmail}`;
        const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        document.getElementById('admin-tools')?.classList.toggle('hidden', !isAdmin);
        fetchOrders();
    }
}

async function fetchOrders() {
    const { data, error } = await supabase.from('Order-sparepart').select('*');
    if (!error) { 
        localData = data; 
        applyFiltersAndSort(); 
    }
}

// --- CORE FUNCTIONS (Upload & Insert) ---
async function uploadFile(file) {
    if (!file) return null;
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('sparepart-images').upload(fileName, file);
    if (error) return null;
    const { data: publicUrl } = supabase.storage.from('sparepart-images').getPublicUrl(fileName);
    return publicUrl.publicUrl;
}

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
        'Status': 'Pending',
        'User Email': currentEmail // Simpan email pengirim
    };

    const { error } = await supabase.from('Order-sparepart').insert([payload]);
    if (error) alert(error.message); 
    else { 
        document.getElementById('order-form').reset(); 
        fetchOrders(); 
    }
    btn.innerText = "KIRIM PERMINTAAN"; btn.disabled = false;
});

// --- FILTER & SORT LOGIC ---
function applyFiltersAndSort() {
    const term = document.getElementById('search-input')?.value.toLowerCase() || "";
    const sort = document.getElementById('sort-select')?.value || "newest";

    let filtered = localData.filter(i => 
        (i['Nama Barang']?.toLowerCase().includes(term)) || 
        (i['PIC Order']?.toLowerCase().includes(term)) ||
        (i.Status?.toLowerCase().includes(term)) ||
        (i['Nama Line']?.toLowerCase().includes(term))
    );

    switch (sort) {
        case 'newest': filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); break;
        case 'oldest': filtered.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)); break;
        case 'status': filtered.sort((a,b) => a.Status.localeCompare(b.Status)); break;
        case 'line': filtered.sort((a,b) => a['Nama Line'].localeCompare(b['Nama Line'])); break;
        case 'pic': filtered.sort((a,b) => a['PIC Order'].localeCompare(b['PIC Order'])); break;
        case 'urutan': filtered.sort((a,b) => a['Nama Barang'].localeCompare(b['Nama Barang'])); break;
    }

    renderTable(filtered);
}

// --- RENDER TABLE ---
function renderTable(data) {
    const body = document.getElementById('data-body');
    const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    body.innerHTML = data.map((i, index) => {
        const fotoHtml = i.gambar 
            ? `<img src="${i.gambar}" class="w-10 h-10 object-cover rounded-lg shadow-sm cursor-pointer hover:scale-150 transition-transform" onclick="window.open('${i.gambar}')">`
            : `<div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-[7px] text-slate-300 italic">No Pic</div>`;

        // Validasi Edit: Milik sendiri & Masih Pending, ATAU Admin
        const canEdit = (i['User Email'] === currentEmail && i.Status === 'Pending') || isAdmin;

        return `
            <tr class="hover:bg-slate-50 transition-all border-b border-slate-50">
                <td class="px-4 py-5 text-center text-[10px] font-bold text-slate-400">${index + 1}</td>
                <td class="px-4 py-5 flex justify-center">${fotoHtml}</td>
                <td class="px-6 py-5">
                    <div class="text-slate-800 font-bold text-sm uppercase">${i['Nama Barang']}</div>
                    <div class="text-[10px] text-slate-400 italic">${i.Spesifikasi || '-'}</div>
                </td>
                <td class="px-6 py-5">
                    <div class="text-[10px] font-black text-indigo-500 uppercase">${new Date(i.created_at).toLocaleDateString()}</div>
                    <div class="text-[9px] text-slate-400 italic">Oleh: ${i['PIC Order']}</div>
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
                <td class="px-6 py-5 text-center">
                    ${canEdit ? 
                        `<button onclick="window.openModal('${i.id}')" class="p-2 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[10px] hover:bg-indigo-100 uppercase transition-all">Edit</button>` 
                        : `<span class="text-[8px] text-slate-300 font-bold uppercase italic">Locked</span>`}
                </td>
            </tr>
        `;
    }).join('');
}

// --- MODAL ACTIONS ---
window.openModal = (id) => {
    const item = localData.find(i => i.id == id);
    if (!item) return;

    const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-nama-barang').value = item['Nama Barang'];
    document.getElementById('edit-spesifikasi').value = item.Spesifikasi;
    document.getElementById('edit-qty').value = item['Quantity Order'];
    document.getElementById('edit-satuan').value = item.Satuan;
    
    // UI Admin
    document.getElementById('admin-edit-fields').classList.toggle('hidden', !isAdmin);
    if (isAdmin) {
        document.getElementById('edit-pr').value = item.PR || '';
        document.getElementById('edit-po').value = item.PO || '';
        document.getElementById('edit-status').value = item.Status || 'Pending';
    }

    document.getElementById('modal-title').innerText = isAdmin ? "Admin Control" : "Edit Pesanan";
    document.getElementById('modal-edit').classList.remove('hidden');
};

window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden');

window.saveUpdate = async () => {
    const id = document.getElementById('edit-id').value;
    const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const updateData = {
        'Nama Barang': document.getElementById('edit-nama-barang').value,
        'Spesifikasi': document.getElementById('edit-spesifikasi').value,
        'Quantity Order': parseInt(document.getElementById('edit-qty').value),
        'Satuan': document.getElementById('edit-satuan').value,
    };

    if (isAdmin) {
        updateData.PR = document.getElementById('edit-pr').value;
        updateData.PO = document.getElementById('edit-po').value;
        updateData.Status = document.getElementById('edit-status').value;
    }

    const { error } = await supabase.from('Order-sparepart').update(updateData).eq('id', id);
    if (!error) { 
        window.closeModal(); 
        fetchOrders(); 
    } else { 
        alert("Gagal update data!"); 
    }
};

// --- LOGOUT & UTILS ---
window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'login.html'; };
window.exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(localData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sparepart");
    XLSX.writeFile(wb, "Report_Sparepart.xlsx");
};

document.getElementById('search-input')?.addEventListener('input', applyFiltersAndSort);
document.getElementById('sort-select')?.addEventListener('change', applyFiltersAndSort);

checkSession();
