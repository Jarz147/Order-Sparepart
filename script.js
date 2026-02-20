import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// --- INITIALIZATION ---
const SUPABASE_URL = 'https://synhvvaolrjxdcbyozld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bmh2dmFvbHJqeGRjYnlvemxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njg4NzEsImV4cCI6MjA4NTU0NDg3MX0.GSEfz8HVd49uEWXd70taR6FUv243VrFJKn6KlsZW-aQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ADMIN_EMAIL = "admin@order-sparepart.com"; 
let currentEmail = "";
let localData = [];

// --- FITUR BARU: TAMBAH PIC DINAMIS ---
window.checkNewPIC = function(selectElement) {
    if (selectElement.value === "ADD_NEW") {
        const newName = prompt("Masukkan Nama PIC Request Baru:");
        if (newName && newName.trim() !== "") {
            const capitalizedName = newName.trim().split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');

            const newOption = document.createElement("option");
            newOption.value = capitalizedName;
            newOption.text = capitalizedName;
            newOption.selected = true;
            // Menambahkan opsi baru tepat di bawah opsi "Tambah Nama"
            selectElement.add(newOption, selectElement.options[2]);
        } else {
            selectElement.value = "";
        }
    }
};

// --- SESSION CHECK ---
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        currentEmail = session.user.email;
        document.getElementById('user-display').innerText = `User: ${currentEmail}`;
        const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        
        // Menampilkan tools admin jika email sesuai
        document.getElementById('admin-tools')?.classList.toggle('hidden', !isAdmin);
        // Form input disembunyikan jika admin (opsional, sesuaikan kebutuhan)
        // document.getElementById('form-container')?.classList.toggle('hidden', isAdmin);
        
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

// --- UPLOAD FOTO KE STORAGE ---
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

// --- SORT & FILTER ---
function applyFiltersAndSort() {
    const term = document.getElementById('search-input')?.value.toLowerCase() || "";
    const sortCriteria = document.getElementById('sort-select')?.value || "newest";

    let filtered = localData.filter(i => 
        (i['Nama Barang']?.toLowerCase().includes(term)) || 
        (i['Nama Mesin']?.toLowerCase().includes(term)) ||
        (i['PIC Order']?.toLowerCase().includes(term)) ||
        (i['Status']?.toLowerCase().includes(term))
    );

    const sortMap = {
        'newest': (a, b) => new Date(b.created_at) - new Date(a.created_at),
        'oldest': (a, b) => new Date(a.created_at) - new Date(b.created_at),
        'status': (a, b) => (a.Status || "").localeCompare(b.Status || ""),
        'line': (a, b) => (a['Nama Line'] || "").localeCompare(b['Nama Line'] || ""),
        'pic': (a, b) => (a['PIC Order'] || "").localeCompare(b['PIC Order'] || ""),
        'urutan': (a, b) => (a['Nama Barang'] || "").localeCompare(b['Nama Barang'] || "")
    };

    if (sortMap[sortCriteria]) filtered.sort(sortMap[sortCriteria]);
    renderTable(filtered);
}

// --- RENDER TABEL (URUTAN TERBARU) ---
function renderTable(data) {
    const body = document.getElementById('data-body');
    const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    body.innerHTML = data.map((i, index) => {
        const dateStr = new Date(i.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        
        const fotoHtml = i.gambar 
            ? `<img src="${i.gambar}" class="w-10 h-10 object-cover rounded-lg shadow-sm cursor-pointer hover:scale-150 transition-transform" onclick="window.open('${i.gambar}')">`
            : `<div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-[7px] text-slate-300 italic uppercase">No Pic</div>`;

        return `
            <tr class="hover:bg-slate-50 transition-all border-b border-slate-50">
                <td class="px-4 py-5 text-center">
                    <button onclick="window.openModal('${i.id}','${i.PR || ''}','${i.PO || ''}','${i.Status || 'Pending'}')" 
                        class="bg-white border border-indigo-100 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                        EDIT
                    </button>
                </td>

                <td class="px-4 py-5 text-center text-[10px] font-bold text-slate-400">${index + 1}</td>
                
                <td class="px-4 py-5 flex justify-center">${fotoHtml}</td>
                
                <td class="px-6 py-5">
                    <div class="text-slate-800 font-bold text-sm uppercase leading-tight">${i['Nama Barang']}</div>
                    <div class="text-[10px] text-slate-400 italic">${i.Spesifikasi || '-'}</div>
                    <div class="text-[9px] text-indigo-400 font-bold mt-1 uppercase flex items-center gap-1">
                         📅 ${dateStr}
                    </div>
                </td>
                
                <td class="px-6 py-5">
                    <div class="text-[10px] font-black text-indigo-600 uppercase">PIC: ${i['PIC Order'] || '-'}</div>
                    <div class="text-[10px] text-slate-400 italic leading-tight mt-0.5">${i['Detail Pesanan'] || '-'}</div>
                </td>

                <td class="px-6 py-5 text-center font-black text-slate-800 text-sm whitespace-nowrap">${i['Quantity Order']} ${i.Satuan}</td>
                
                <td class="px-6 py-5">
                    <div class="text-[10px] font-bold text-slate-600 uppercase tracking-tight">${i['Nama Line']}</div>
                    <div class="text-[9px] text-slate-300 italic font-medium uppercase">${i['Nama Mesin']}</div>
                </td>

                <td class="px-6 py-5 text-center">
                    <span class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest 
                        ${i.Status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : 
                          i.Status === 'On Process' ? 'bg-blue-100 text-blue-700' : 
                          'bg-rose-100 text-rose-700'}">
                        ${i.Status || 'Waiting'}
                    </span>
                    <div class="text-[8px] text-slate-300 mt-1 font-mono">${i.PR ? 'PR: '+i.PR : ''}</div>
                </td>
            </tr>
        `;
    }).join('');
}

// --- UTILITIES & MODAL ---
document.getElementById('search-input')?.addEventListener('input', applyFiltersAndSort);
document.getElementById('sort-select')?.addEventListener('change', applyFiltersAndSort);

window.openModal = (id, pr, po, status) => {
    // Tombol Edit sekarang terbuka untuk semua user (sesuai permintaan sebelumnya), 
    // namun Anda bisa menambahkan proteksi 'isAdmin' di sini jika ingin membatasi.
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

    if (!error) { 
        window.closeModal(); 
        fetchOrders(); 
    } else { 
        alert("Gagal update data!"); 
    }
};

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

checkSession();
