import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://synhvvaolrjxdcbyozld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bmh2dmFvbHJqeGRjYnlvemxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njg4NzEsImV4cCI6MjA4NTU0NDg3MX0.GSEfz8HVd49uEWXd70taR6FUv243VrFJKn6KlsZW-aQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ADMIN_EMAIL = "admin@order-sparepart.com";
const SPECIAL_USER = "user@order-sparepart.com";
let currentEmail = "";
let localData = [];

// FUNGSI TAMBAH PIC BARU (DIPANGGIL DARI HTML)
window.checkNewPIC = function(selectElement) {
    if (selectElement.value === "ADD_NEW") {
        const newName = prompt("Masukkan Nama PIC Baru:");
        if (newName && newName.trim() !== "") {
            const capitalizedName = newName.trim().split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');

            const newOption = document.createElement("option");
            newOption.value = capitalizedName;
            newOption.text = capitalizedName;
            newOption.selected = true;
            selectElement.add(newOption, selectElement.options[2]);
        } else {
            selectElement.value = "";
        }
    }
};

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = 'login.html'; } 
    else {
        currentEmail = session.user.email.toLowerCase();
        document.getElementById('user-display').innerText = `Login as: ${currentEmail}`;
        const isAdmin = currentEmail === ADMIN_EMAIL.toLowerCase();
        document.getElementById('admin-tools')?.classList.toggle('hidden', !isAdmin);
        fetchOrders();
    }
}

async function fetchOrders() {
    const { data, error } = await supabase.from('Order-sparepart').select('*');
    if (!error) { localData = data; renderTable(data); }
}

document.getElementById('order-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.innerText = "PROSES..."; btn.disabled = true;

    const payload = {
        'Nama Barang': document.getElementById('nama_barang').value,
        'Spesifikasi': document.getElementById('spesifikasi').value,
        'Quantity Order': parseInt(document.getElementById('qty').value),
        'Satuan': document.getElementById('satuan').value,
        'Nama Mesin': document.getElementById('nama_mesin').value,
        'Nama Line': document.getElementById('nama_line').value,
        'PIC Order': document.getElementById('pic_order').value,
        'Detail Pesanan': document.getElementById('detail_pesanan').value,
        'Status': 'Pending',
        'User Email': currentEmail
    };

    const { error } = await supabase.from('Order-sparepart').insert([payload]);
    if (!error) { 
        document.getElementById('order-form').reset(); 
        fetchOrders(); 
    } else { alert("Gagal Simpan: " + error.message); }
    btn.innerText = "KIRIM PERMINTAAN"; btn.disabled = false;
});

function renderTable(data) {
    const body = document.getElementById('data-body');
    const isAdmin = currentEmail === ADMIN_EMAIL.toLowerCase();
    const isSpecialUser = currentEmail === SPECIAL_USER.toLowerCase();

    body.innerHTML = data.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map((i, index) => {
        const canEdit = (isSpecialUser || isAdmin) && i.Status === 'Pending';
        
        // Format Tanggal
        const dateObj = new Date(i.created_at);
        const formattedDate = dateObj.toLocaleDateString('id-ID', { 
            day: '2-digit', month: 'short', year: 'numeric' 
        });

        const fotoCell = i.gambar 
            ? `<a href="${i.gambar}" target="_blank" class="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-[9px] font-black hover:bg-indigo-600 hover:text-white transition">LIHAT</a>` 
            : `<span class="text-slate-300 text-[9px]">-</span>`;

        return `
            <tr class="border-b hover:bg-slate-50 transition">
                <td class="px-4 py-5 text-center">
                    ${canEdit ? `<button onclick="window.openModal('${i.id}')" class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">Edit</button>` : '<span class="text-[8px] text-slate-300 font-bold uppercase">Locked</span>'}
                </td>
                <td class="px-4 py-5 text-center">
                    ${fotoCell}
                </td>
                <td class="px-4 py-5 text-center text-slate-400 text-xs font-bold">${index + 1}</td>
                <td class="px-4 py-5">
                    <div class="font-black uppercase text-slate-800 text-xs">${i['Nama Barang']}</div>
                    <div class="text-[10px] text-slate-500 italic font-medium mt-0.5">${i.Spesifikasi || '-'}</div>
                    <div class="text-[9px] text-indigo-400 font-bold mt-1 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        ${formattedDate}
                    </div>
                </td>
                <td class="px-4 py-5">
                    <div class="text-[10px] font-black text-indigo-600 uppercase">PIC: ${i['PIC Order'] || '-'}</div>
                    <div class="text-[10px] text-slate-500 leading-tight mt-1 max-w-xs">${i['Detail Pesanan'] || '-'}</div>
                </td>
                <td class="px-4 py-5 text-center font-black text-slate-800">${i['Quantity Order']} ${i.Satuan}</td>
                <td class="px-4 py-5 text-[10px] uppercase font-bold text-slate-500">
                    ${i['Nama Line']}<br><span class="text-slate-300 font-normal italic text-[9px]">${i['Nama Mesin']}</span>
                </td>
                <td class="px-4 py-5">
                    <span class="text-[9px] font-black px-2 py-1 rounded-lg ${i.Status === 'Selesai' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} uppercase">
                        ${i.Status || 'Pending'}
                    </span>
                    <div class="text-[8px] text-slate-400 mt-1 font-mono">${i.PR ? 'PR:'+i.PR : ''}</div>
                </td>
            </tr>
        `;
    }).join('');
}

window.openModal = (id) => {
    const item = localData.find(i => i.id == id);
    const isAdmin = currentEmail === ADMIN_EMAIL.toLowerCase();
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-nama-barang').value = item['Nama Barang'];
    document.getElementById('edit-spesifikasi').value = item.Spesifikasi;
    document.getElementById('edit-qty').value = item['Quantity Order'];
    document.getElementById('edit-satuan').value = item.Satuan;
    document.getElementById('edit-line').value = item['Nama Line'];
    document.getElementById('edit-detail-pesanan').value = item['Detail Pesanan'] || '';
    const adminFields = document.getElementById('admin-fields');
    adminFields.classList.toggle('hidden', !isAdmin);
    if(isAdmin) {
        document.getElementById('edit-pr').value = item.PR || '';
        document.getElementById('edit-po').value = item.PO || '';
        document.getElementById('edit-status').value = item.Status || 'Pending';
    }
    document.getElementById('modal-edit').classList.remove('hidden');
};

window.closeModal = () => document.getElementById('modal-edit').classList.add('hidden');

window.saveUpdate = async () => {
    const id = document.getElementById('edit-id').value;
    const isAdmin = currentEmail === ADMIN_EMAIL.toLowerCase();
    const updateData = {
        'Spesifikasi': document.getElementById('edit-spesifikasi').value,
        'Quantity Order': parseInt(document.getElementById('edit-qty').value),
        'Satuan': document.getElementById('edit-satuan').value,
        'Nama Line': document.getElementById('edit-line').value,
        'Detail Pesanan': document.getElementById('edit-detail-pesanan').value
    };
    if (isAdmin) {
        updateData.PR = document.getElementById('edit-pr').value;
        updateData.PO = document.getElementById('edit-po').value;
        updateData.Status = document.getElementById('edit-status').value;
    }
    const { error } = await supabase.from('Order-sparepart').update(updateData).eq('id', id);
    if (!error) { window.closeModal(); fetchOrders(); } 
    else { alert("Gagal Update: " + error.message); }
};

window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'login.html'; };
window.exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(localData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database");
    XLSX.writeFile(wb, "Report_Sparepart.xlsx");
};

checkSession();
