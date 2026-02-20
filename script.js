import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://synhvvaolrjxdcbyozld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bmh2dmFvbHJqeGRjYnlvemxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njg4NzEsImV4cCI6MjA4NTU0NDg3MX0.GSEfz8HVd49uEWXd70taR6FUv243VrFJKn6KlsZW-aQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ADMIN_EMAIL = "admin@order-sparepart.com"; 
let currentEmail = "";
let localData = [];

// --- FITUR TAMBAH LINE & PIC ---
window.checkNewLine = function(selectElement) {
    if (selectElement.value === "ADD_NEW_LINE") {
        const val = prompt("Masukkan Nama Line Baru:");
        if (val) {
            const opt = document.createElement("option");
            opt.value = val.toUpperCase(); opt.text = val.toUpperCase();
            opt.selected = true;
            selectElement.add(opt, selectElement.options[2]);
        } else { selectElement.value = ""; }
    }
};

window.checkNewPIC = function(selectElement) {
    if (selectElement.value === "ADD_NEW") {
        const val = prompt("Masukkan Nama PIC Baru:");
        if (val) {
            const opt = document.createElement("option");
            opt.value = val; opt.text = val;
            opt.selected = true;
            selectElement.add(opt, selectElement.options[2]);
        } else { selectElement.value = ""; }
    }
};

// --- AUTH & DATA ---
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        currentEmail = session.user.email;
        document.getElementById('user-display').innerText = `USER: ${currentEmail}`;
        const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        document.getElementById('admin-tools')?.classList.toggle('hidden', !isAdmin);
        fetchOrders();
    }
}

async function fetchOrders() {
    const { data, error } = await supabase.from('Order-sparepart').select('*').order('created_at', { ascending: false });
    if (!error) { localData = data; applyFiltersAndSort(); }
}

// --- SUBMIT ---
document.getElementById('order-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.innerText = "MENGIRIM..."; btn.disabled = true;

    const file = document.getElementById('foto_barang').files[0];
    let fotoUrl = null;
    if (file) {
        const path = `uploads/${Date.now()}_${file.name}`;
        await supabase.storage.from('sparepart-images').upload(path, file);
        fotoUrl = supabase.storage.from('sparepart-images').getPublicUrl(path).data.publicUrl;
    }

    const payload = {
        'Nama Barang': document.getElementById('nama_barang').value,
        'Spesifikasi': document.getElementById('spesifikasi').value,
        'Detail Pesanan': document.getElementById('detail_pesanan').value,
        'Quantity Order': parseInt(document.getElementById('qty').value),
        'Satuan': document.getElementById('satuan').value,
        'Nama Mesin': document.getElementById('nama_mesin').value,
        'Nama Line': document.getElementById('nama_line').value,
        'PIC Order': document.getElementById('pic_order').value,
        'gambar': fotoUrl,
        'Status': 'Pending'
    };

    const { error } = await supabase.from('Order-sparepart').insert([payload]);
    if (!error) { document.getElementById('order-form').reset(); fetchOrders(); }
    btn.innerText = "KIRIM PERMINTAAN"; btn.disabled = false;
});

// --- RENDER ---
function renderTable(data) {
    const body = document.getElementById('data-body');
    body.innerHTML = data.map((i, index) => {
        const foto = i.gambar ? `<img src="${i.gambar}" class="w-10 h-10 object-cover rounded-lg cursor-pointer" onclick="window.open('${i.gambar}')">` : '-';
        return `
            <tr class="hover:bg-slate-50 border-b border-slate-50">
                <td class="px-4 py-5 text-center">
                    <button onclick="window.openModal('${i.id}')" class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">EDIT</button>
                </td>
                <td class="px-4 py-5 text-center text-[10px] font-bold text-slate-400">${index + 1}</td>
                <td class="px-4 py-5 flex justify-center">${foto}</td>
                <td class="px-6 py-5">
                    <div class="font-bold text-slate-800 uppercase text-xs">${i['Nama Barang']}</div>
                    <div class="text-[9px] text-slate-400 italic">${new Date(i.created_at).toLocaleDateString()}</div>
                </td>
                <td class="px-6 py-5">
                    <div class="text-[10px] font-black text-indigo-600 uppercase">PIC: ${i['PIC Order']}</div>
                    <div class="text-[10px] text-slate-400 italic">${i['Detail Pesanan'] || i.Spesifikasi || '-'}</div>
                </td>
                <td class="px-6 py-5 text-center font-black">${i['Quantity Order']} ${i.Satuan}</td>
                <td class="px-6 py-5">
                    <div class="text-[10px] font-bold text-slate-600 uppercase">${i['Nama Line']}</div>
                    <div class="text-[9px] text-slate-300 uppercase">${i['Nama Mesin']}</div>
                </td>
                <td class="px-6 py-5 text-center">
                    <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase ${i.Status === 'Selesai' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}">${i.Status}</span>
                    <div class="text-[8px] text-slate-300 mt-1">${i.PR ? 'PR: '+i.PR : ''}</div>
                </td>
            </tr>
        `;
    }).join('');
}

// --- LOGIKA EDIT (CORE) ---
window.openModal = (id) => {
    const item = localData.find(i => i.id === id);
    if (!item) return;

    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-nama').value = item['Nama Barang'] || '';
    document.getElementById('edit-spek').value = item['Detail Pesanan'] || item.Spesifikasi || '';
    document.getElementById('edit-qty').value = item['Quantity Order'] || 0;
    document.getElementById('edit-satuan').value = item.Satuan || 'PCS';
    
    document.getElementById('edit-pr').value = item.PR || '';
    document.getElementById('edit-po').value = item.PO || '';
    document.getElementById('edit-status').value = item.Status || 'Pending';

    const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const adminArea = document.getElementById('admin-fields-container');
    
    if (!isAdmin) {
        // Kunci field Admin jika yang login bukan Admin
        document.getElementById('edit-pr').readOnly = true;
        document.getElementById('edit-po').readOnly = true;
        document.getElementById('edit-status').disabled = true;
        adminArea.classList.add('opacity-40', 'pointer-events-none');
    } else {
        document.getElementById('edit-pr').readOnly = false;
        document.getElementById('edit-po').readOnly = false;
        document.getElementById('edit-status').disabled = false;
        adminArea.classList.remove('opacity-40', 'pointer-events-none');
    }
    document.getElementById('modal-edit').classList.remove('hidden');
};

window.saveUpdate = async () => {
    const id = document.getElementById('edit-id').value;
    const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const updateData = {
        'Nama Barang': document.getElementById('edit-nama').value,
        'Detail Pesanan': document.getElementById('edit-spek').value,
        'Quantity Order': parseInt(document.getElementById('edit-qty').value),
        'Satuan': document.getElementById('edit-satuan').value,
    };

    if (isAdmin) {
        updateData['PR'] = document.getElementById('edit-pr').value;
        updateData['PO'] = document.getElementById('edit-po').value;
        updateData['Status'] = document.getElementById('edit-status').value;
    }

    const { error } = await supabase.from('Order-sparepart').update(updateData).eq('id', id);
    if (!error) { window.closeModal(); fetchOrders(); }
    else { alert("Gagal Simpan: " + error.message); }
};

window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden');

// --- UTILS ---
function applyFiltersAndSort() {
    const term = document.getElementById('search-input').value.toLowerCase();
    let filtered = localData.filter(i => i['Nama Barang']?.toLowerCase().includes(term) || i['PIC Order']?.toLowerCase().includes(term));
    renderTable(filtered);
}
document.getElementById('search-input').addEventListener('input', applyFiltersAndSort);
window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'login.html'; };
window.exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(localData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, "Report.xlsx");
};

checkSession();
