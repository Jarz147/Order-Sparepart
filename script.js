import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://synhvvaolrjxdcbyozld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bmh2dmFvbHJqeGRjYnlvemxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njg4NzEsImV4cCI6MjA4NTU0NDg3MX0.GSEfz8HVd49uEWXd70taR6FUv243VrFJKn6KlsZW-aQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ADMIN_EMAIL = "admin@order-sparepart.com"; 
let currentEmail = "";
let localData = [];

// --- GLOBAL FUNCTIONS (Didaftarkan ke window agar bisa dipanggil onclick HTML) ---
window.checkNewLine = (el) => {
    if(el.value === "ADD_NEW_LINE") {
        const val = prompt("Nama Line Baru:");
        if(val) {
            const opt = new Option(val.toUpperCase(), val.toUpperCase());
            el.add(opt, 2); el.value = val.toUpperCase();
        }
    }
};

window.checkNewPIC = (el) => {
    if(el.value === "ADD_NEW") {
        const val = prompt("Nama PIC Baru:");
        if(val) {
            const opt = new Option(val, val);
            el.add(opt, 2); el.value = val;
        }
    }
};

// --- MODAL LOGIC (Kunci Tombol Edit Ada Di Sini) ---
window.openModal = (id) => {
    const item = localData.find(i => i.id == id); // Gunakan == agar ID string/number cocok
    if (!item) return;

    // Masukkan data ke input modal
    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-nama').value = item['Nama Barang'] || '';
    document.getElementById('edit-spek').value = item['Detail Pesanan'] || item.Spesifikasi || '';
    document.getElementById('edit-qty').value = item['Quantity Order'] || 0;
    document.getElementById('edit-satuan').value = item.Satuan || 'PCS';
    
    document.getElementById('edit-pr').value = item.PR || '';
    document.getElementById('edit-po').value = item.PO || '';
    document.getElementById('edit-status').value = item.Status || 'Pending';

    // Cek Role
    const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const adminArea = document.getElementById('admin-fields-container');
    
    if (!isAdmin) {
        // LOCK FIELD UNTUK USER
        document.getElementById('edit-pr').readOnly = true;
        document.getElementById('edit-po').readOnly = true;
        document.getElementById('edit-status').disabled = true;
        adminArea.style.opacity = "0.4";
        adminArea.style.pointerEvents = "none";
    } else {
        // OPEN FIELD UNTUK ADMIN
        document.getElementById('edit-pr').readOnly = false;
        document.getElementById('edit-po').readOnly = false;
        document.getElementById('edit-status').disabled = false;
        adminArea.style.opacity = "1";
        adminArea.style.pointerEvents = "auto";
    }

    document.getElementById('modal-edit').classList.remove('hidden');
};

window.closeModal = () => {
    document.getElementById('modal-edit').classList.add('hidden');
};

window.saveUpdate = async () => {
    const id = document.getElementById('edit-id').value;
    const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Data Item (User & Admin bisa ubah ini)
    const updateData = {
        'Nama Barang': document.getElementById('edit-nama').value,
        'Detail Pesanan': document.getElementById('edit-spek').value,
        'Quantity Order': parseInt(document.getElementById('edit-qty').value),
        'Satuan': document.getElementById('edit-satuan').value,
    };

    // Jika Admin, tambahkan Status/PR/PO ke database
    if (isAdmin) {
        updateData['PR'] = document.getElementById('edit-pr').value;
        updateData['PO'] = document.getElementById('edit-po').value;
        updateData['Status'] = document.getElementById('edit-status').value;
    }

    const { error } = await supabase.from('Order-sparepart').update(updateData).eq('id', id);
    if (!error) {
        window.closeModal();
        fetchOrders();
    } else {
        alert("Error: " + error.message);
    }
};

// --- DATA FETCHING ---
async function fetchOrders() {
    const { data, error } = await supabase.from('Order-sparepart').select('*').order('created_at', { ascending: false });
    if (!error) {
        localData = data;
        renderTable(data);
    }
}

function renderTable(data) {
    const body = document.getElementById('data-body');
    body.innerHTML = data.map((i, idx) => `
        <tr class="border-b hover:bg-slate-50 transition-all">
            <td class="px-6 py-4 text-center">
                <button onclick="window.openModal('${i.id}')" class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white">EDIT</button>
            </td>
            <td class="px-6 py-4">
                <div class="font-bold text-slate-800 uppercase text-xs">${i['Nama Barang']}</div>
                <div class="text-[9px] text-slate-400">${new Date(i.created_at).toLocaleDateString()}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-[10px] font-black text-indigo-600 uppercase">PIC: ${i['PIC Order']}</div>
                <div class="text-[10px] text-slate-400 italic">${i['Detail Pesanan'] || '-'}</div>
            </td>
            <td class="px-6 py-4 text-center font-bold">${i['Quantity Order']} ${i.Satuan}</td>
            <td class="px-6 py-4 text-center">
                <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase ${i.Status === 'Selesai' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}">
                    ${i.Status}
                </span>
            </td>
        </tr>
    `).join('');
}

// --- INITIALIZE ---
async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        currentEmail = session.user.email;
        document.getElementById('user-display').innerText = `USER: ${currentEmail}`;
        fetchOrders();
    }
}

document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.innerText = "MENGIRIM..."; btn.disabled = true;

    const payload = {
        'Nama Barang': document.getElementById('nama_barang').value,
        'Spesifikasi': document.getElementById('spesifikasi').value,
        'Detail Pesanan': document.getElementById('detail_pesanan').value,
        'Quantity Order': parseInt(document.getElementById('qty').value),
        'Satuan': document.getElementById('satuan').value,
        'Nama Mesin': document.getElementById('nama_mesin').value,
        'Nama Line': document.getElementById('nama_line').value,
        'PIC Order': document.getElementById('pic_order').value,
        'Status': 'Pending'
    };

    const { error } = await supabase.from('Order-sparepart').insert([payload]);
    if (!error) {
        document.getElementById('order-form').reset();
        fetchOrders();
    }
    btn.innerText = "KIRIM PERMINTAAN"; btn.disabled = false;
});

init();
