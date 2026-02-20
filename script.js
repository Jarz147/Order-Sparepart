import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://synhvvaolrjxdcbyozld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bmh2dmFvbHJqeGRjYnlvemxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njg4NzEsImV4cCI6MjA4NTU0NDg3MX0.GSEfz8HVd49uEWXd70taR6FUv243VrFJKn6KlsZW-aQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ADMIN_EMAIL = "admin@order-sparepart.com"; 
let currentEmail = "";
let localData = [];

// FUNGSI TAMBAH PIC BARU
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
    if (!session) {
        window.location.href = 'login.html';
    } else {
        currentEmail = session.user.email;
        document.getElementById('user-display').innerText = `Active User: ${currentEmail}`;
        if(currentEmail === ADMIN_EMAIL) {
            document.getElementById('admin-tools').classList.remove('hidden');
        }
        fetchOrders();
    }
}

async function fetchOrders() {
    const { data, error } = await supabase.from('Order-sparepart').select('*').order('created_at', { ascending: false });
    if (!error) { 
        localData = data; 
        renderTable(data); 
    }
}

function renderTable(data) {
    const body = document.getElementById('data-body');
    const isAdmin = currentEmail === ADMIN_EMAIL;

    body.innerHTML = data.map((i, index) => {
        const dateObj = new Date(i.created_at);
        const formattedDate = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        
        const fotoBtn = i.gambar 
            ? `<a href="${i.gambar}" target="_blank" class="text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-[9px] font-black hover:bg-indigo-600 hover:text-white transition">LIHAT</a>` 
            : `<span class="text-slate-300 text-[9px]">-</span>`;

        return `
            <tr class="hover:bg-slate-50 transition-all border-b border-slate-50">
                <td class="px-4 py-5 text-center">
                    ${isAdmin ? `
                        <button onclick="window.openModal('${i.id}','${i.PR || ''}','${i.PO || ''}','${i.Status || 'Pending'}')" class="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">Edit</button>
                    ` : `<span class="text-[8px] text-slate-300 font-bold uppercase italic">Locked</span>`}
                </td>
                
                <td class="px-4 py-5 text-center">${fotoBtn}</td>
                
                <td class="px-4 py-5 text-center text-slate-400 text-xs font-bold">${index + 1}</td>
                
                <td class="px-4 py-5">
                    <div class="font-black uppercase text-slate-800 text-xs">${i['Nama Barang']}</div>
                    <div class="text-[10px] text-slate-400 italic">${i.Spesifikasi || '-'}</div>
                    <div class="text-[9px] text-indigo-400 font-bold mt-1 flex items-center gap-1">
                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        ${formattedDate}
                    </div>
                </td>
                
                <td class="px-4 py-5">
                    <div class="text-[10px] font-black text-indigo-600 uppercase">PIC: ${i['PIC Order'] || '-'}</div>
                    <div class="text-[10px] text-slate-500 leading-tight mt-1 max-w-xs">${i['Detail Pesanan'] || '-'}</div>
                </td>
                
                <td class="px-4 py-5 text-center font-black text-slate-800 uppercase text-xs">${i['Quantity Order']} ${i.Satuan || 'PCS'}</td>
                
                <td class="px-4 py-5 text-[10px] uppercase font-bold text-slate-500">
                    ${i['Nama Line']}<br><span class="text-slate-300 font-normal italic text-[9px]">${i['Nama Mesin']}</span>
                </td>
                
                <td class="px-4 py-5 text-center">
                    <span class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${i.Status === 'Selesai' ? 'bg-green-100 text-green-700' : i.Status === 'On Process' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}">${i.Status || 'Pending'}</span>
                    <div class="text-[8px] text-slate-400 mt-1 font-mono">${i.PR ? 'PR:'+i.PR : ''}</div>
                </td>
            </tr>
        `;
    }).join('');
}

window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'login.html'; };

window.exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(localData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "Report_Sparepart.xlsx");
};

window.openModal = (id, pr, po, status) => {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-pr').value = pr;
    document.getElementById('edit-po').value = po;
    document.getElementById('edit-status').value = status;
    document.getElementById('modal-admin').classList.remove('hidden');
};

window.closeModal = () => document.getElementById('modal-admin').classList.add('hidden');

window.saveAdminUpdate = async () => {
    const id = document.getElementById('edit-id').value;
    const { error } = await supabase.from('Order-sparepart').update({
        'PR': document.getElementById('edit-pr').value,
        'PO': document.getElementById('edit-po').value,
        'Status': document.getElementById('edit-status').value
    }).eq('id', id);
    
    if(!error) { window.closeModal(); fetchOrders(); }
    else { alert("Gagal Update: " + error.message); }
};

document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.innerText = "KIRIM..."; btn.disabled = true;

    const payload = {
        'Nama Barang': document.getElementById('nama_barang').value,
        'Spesifikasi': document.getElementById('spesifikasi').value,
        'Quantity Order': parseInt(document.getElementById('qty').value),
        'Satuan': document.getElementById('satuan').value,
        'Nama Mesin': document.getElementById('nama_mesin').value,
        'Nama Line': document.getElementById('nama_line').value,
        'PIC Order': document.getElementById('pic_order').value,
        'Status': 'Pending'
    };
    
    const { error } = await supabase.from('Order-sparepart').insert([payload]);
    if(!error) { document.getElementById('order-form').reset(); fetchOrders(); }
    
    btn.innerText = "KIRIM PERMINTAAN"; btn.disabled = false;
});

checkSession();
