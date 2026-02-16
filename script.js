import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://synhvvaolrjxdcbyozld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bmh2dmFvbHJqeGRjYnlvemxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njg4NzEsImV4cCI6MjA4NTU0NDg3MX0.GSEfz8HVd49uEWXd70taR6FUv243VrFJKn6KlsZW-aQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ADMIN_EMAIL = "admin@order-sparepart.com"; 
let currentEmail = "";
let localData = [];

// --- SESSION CHECK ---
async function checkSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
        } else {
            currentEmail = session.user.email;
            const userDisplay = document.getElementById('user-display');
            if (userDisplay) userDisplay.innerText = `User: ${currentEmail}`;
            
            const formContainer = document.getElementById('form-container');
            const adminTools = document.getElementById('admin-tools');

            if (currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                adminTools?.classList.remove('hidden');
                formContainer?.classList.add('hidden');
            } else {
                adminTools?.classList.add('hidden');
                formContainer?.classList.remove('hidden');
            }
            fetchOrders();
        }
    } catch (err) {
        console.error("Session error:", err);
    }
}

// --- FETCH DATA ---
async function fetchOrders() {
    const { data, error } = await supabase.from('Order-sparepart').select('*').order('created_at', { ascending: false });
    if (!error) { 
        localData = data; 
        applyFiltersAndSort(); 
    }
}

// --- FORM SUBMIT ---
const orderForm = document.getElementById('order-form');
if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit');
        btn.innerText = "MENGIRIM..."; btn.disabled = true;

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
        if (error) alert(error.message); else { orderForm.reset(); fetchOrders(); }
        btn.innerText = "KIRIM PERMINTAAN"; btn.disabled = false;
    });
}

// --- LOGIC: FILTER & SORT ---
function applyFiltersAndSort() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || "";
    const sortCriteria = document.getElementById('sort-select')?.value || "newest";

    // 1. Filter data berdasarkan pencarian
    let filtered = localData.filter(i => 
        (i['Nama Barang']?.toLowerCase().includes(searchTerm)) || 
        (i['Nama Mesin']?.toLowerCase().includes(searchTerm)) || 
        (i['PIC Order']?.toLowerCase().includes(searchTerm)) ||
        (i.Status?.toLowerCase().includes(searchTerm))
    );

    // 2. Sort data berdasarkan kriteria
    switch (sortCriteria) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'name-asc':
            filtered.sort((a, b) => (a['Nama Barang'] || "").localeCompare(b['Nama Barang'] || ""));
            break;
        case 'qty-desc':
            filtered.sort((a, b) => (b['Quantity Order'] || 0) - (a['Quantity Order'] || 0));
            break;
        case 'status':
            filtered.sort((a, b) => (a.Status || "").localeCompare(b.Status || ""));
            break;
    }

    renderTable(filtered);
}

// --- RENDERING TABLE ---
function renderTable(data) {
    const body = document.getElementById('data-body');
    if (!body) return;
    const isAdmin = currentEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    body.innerHTML = data.map(i => {
        const isDone = i.Status === 'Selesai';
        const isProcess = i.Status === 'On Process';
        
        return `
            <tr class="hover:bg-slate-50 transition-all border-b border-slate-50">
                <td class="px-6 py-5 text-[10px] text-slate-400 font-mono text-center">${new Date(i.created_at).toLocaleDateString('id-ID')}</td>
                <td class="px-6 py-5">
                    <div class="text-slate-800 font-bold text-sm uppercase">${i['Nama Barang']}</div>
                    <div class="text-[10px] text-slate-400 italic">${i.Spesifikasi || '-'}</div>
                    <div class="text-[9px] text-indigo-500 font-bold mt-1 uppercase italic">PIC: ${i['PIC Order'] || '-'}</div>
                </td>
                <td class="px-6 py-5 text-center font-black text-indigo-600 text-sm">${i['Quantity Order']}</td>
                <td class="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase">${i.Satuan || 'PCS'}</td>
                <td class="px-6 py-5">
                    <div class="text-[10px] text-slate-500 font-bold uppercase">${i['Nama Line']}</div>
                    <div class="text-[9px] text-slate-400 italic uppercase">${i['Nama Mesin']}</div>
                </td>
                <td class="px-6 py-5 text-[10px] text-slate-500 font-mono">PR: ${i.PR || '-'}<br>PO: ${i.PO || '-'}</td>
                <td class="px-6 py-5 text-center">
                    <span class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest 
                    ${isDone ? 'bg-emerald-100 text-emerald-700' : isProcess ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}">
                        ${i.Status || 'Pending'}
                    </span>
                </td>
                <td class="px-6 py-5 text-center">
                    ${isAdmin ? `
                        <button onclick="window.openModal('${i.id}','${i.PR || ''}','${i.PO || ''}','${i.Status}')" 
                        class="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                                <path d="M5.433 13.917l1.758-4.293a1 1 0 01.593-.593l4.293-1.758a1 1 0 011.09.217l3.654 3.654a1 1 0 01.217 1.09l-1.758 4.293a1 1 0 01-.593.593l-4.293 1.758a1 1 0 01-1.09-.217l-3.654-3.654a1 1 0 01-.217-1.09zM12 15a1 1 0 00.33-.06l1.246-.509a1 1 0 00.706-.893c.092-.596-.341-1.09-.94-1.09-.588 0-1.077.494-1.157 1.09-.08.596.353 1.09.94 1.09z" />
                                <path fill-rule="evenodd" d="M12.293 2.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-8.586 8.586-4.293 1.758 1.758-4.293 8.586-8.586zM6.917 13.433a2.001 2.001 0 00-2.434 2.434l-.509 1.246a.5.5 0 00.627.627l1.246-.509a2.001 2.001 0 002.434-2.434l-3.654-3.654z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    ` : '<span class="text-[8px] text-slate-300 font-bold">VIEW ONLY</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

// --- EVENT LISTENERS ---
document.getElementById('search-input')?.addEventListener('input', applyFiltersAndSort);
document.getElementById('sort-select')?.addEventListener('change', applyFiltersAndSort);

// --- UTILITIES ---
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
    if (!error) { window.closeModal(); fetchOrders(); } else { alert("Gagal update data!"); }
};

window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'login.html'; };

window.exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(localData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "Sparepart_Report.xlsx");
};

checkSession();
