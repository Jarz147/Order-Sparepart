import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// INITIALIZATION
const SUPABASE_URL = 'https://synhvvaolrjxdcbyozld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bmh2dmFvbHJqeGRjYnlvemxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njg4NzEsImV4cCI6MjA4NTU0NDg3MX0.GSEfz8HVd49uEWXd70taR6FUv243VrFJKn6KlsZW-aQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ADMIN_EMAIL = "admin@order-sparepart.com"; 
let currentEmail = "";
let localData = [];

// SESSION CHECK
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

// DATA FETCHING
async function fetchOrders() {
    const { data, error } = await supabase.from('Order-sparepart').select('*').order('created_at', { ascending: false });
    if (!error) { 
        localData = data; 
        renderTable(data); 
    }
}

// RENDERING
function renderTable(data) {
    const body = document.getElementById('data-body');
    const isAdmin = currentEmail === ADMIN_EMAIL;

    body.innerHTML = data.map(i => `
        <tr class="${i.Status === 'Pending' ? 'bg-rose-50/30' : ''} hover:bg-slate-50 transition-all font-semibold border-b border-slate-50">
            <td class="px-6 py-5 text-[10px] text-slate-400 uppercase">${new Date(i.created_at).toLocaleDateString()}</td>
            <td class="px-6 py-5">
                <div class="text-slate-800">${i['Nama Barang']}</div>
                <div class="text-[10px] text-slate-400 italic">${i.Spesifikasi || ''}</div>
            </td>
            <td class="px-6 py-5">
                <div class="text-[10px] text-slate-600">${i['Nama Line']} / ${i['Nama Mesin']}</div>
                <div class="text-indigo-600 font-black uppercase">QTY: ${i['Quantity Order']}</div>
            </td>
            <td class="px-6 py-5 text-[10px] text-slate-500 font-mono">
                PR: ${i.PR || '-'}<br>PO: ${i.PO || '-'}
            </td>
            <td class="px-6 py-5 text-center">
                <span class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${i.Status === 'Selesai' ? 'bg-green-100 text-green-700' : i.Status === 'On Process' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}">${i.Status || 'Pending'}</span>
            </td>
            <td class="px-6 py-5 text-center">
                ${isAdmin ? `
                    <button onclick="window.openModal('${i.id}','${i.PR || ''}','${i.PO || ''}','${i.Status || 'Pending'}')" class="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                ` : `<span class="text-[10px] text-slate-300 italic uppercase">User Only</span>`}
            </td>
        </tr>
    `).join('');
}

// GLOBAL WINDOW FUNCTIONS (Dibutuhkan agar bisa dipanggil dari HTML onclick)
window.logout = async () => { 
    await supabase.auth.signOut(); 
    window.location.href = 'login.html'; 
};

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
    await supabase.from('Order-sparepart').update({
        'PR': document.getElementById('edit-pr').value,
        'PO': document.getElementById('edit-po').value,
        'Status': document.getElementById('edit-status').value
    }).eq('id', id);
    window.closeModal(); 
    fetchOrders();
};

// EVENT LISTENERS
document.getElementById('import-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        if(confirm(`Import ${jsonData.length} data dari Excel?`)) {
            const formatted = jsonData.map(row => ({
                'Nama Barang': row['Nama Barang'],
                'Spesifikasi': row['Spesifikasi'],
                'Quantity Order': row['Quantity Order'],
                'Nama Mesin': row['Nama Mesin'],
                'Nama Line': row['Nama Line'],
                'PIC Order': row['PIC Order'],
                'Status': row['Status'] || 'Pending',
                'PR': row['PR'] || '',
                'PO': row['PO'] || ''
            }));
            
            const { error } = await supabase.from('Order-sparepart').insert(formatted);
            if(!error) { alert("Berhasil Import!"); fetchOrders(); }
            else { alert("Error: " + error.message); }
        }
    };
    reader.readAsArrayBuffer(file);
});

document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        'Nama Barang': document.getElementById('nama_barang').value,
        'Spesifikasi': document.getElementById('spesifikasi').value,
        'Quantity Order': parseInt(document.getElementById('qty').value),
        'Nama Mesin': document.getElementById('nama_mesin').value,
        'Nama Line': document.getElementById('nama_line').value,
        'PIC Order': document.getElementById('pic_order').value,
        'Status': 'Pending'
    };
    await supabase.from('Order-sparepart').insert([payload]);
    document.getElementById('order-form').reset(); 
    fetchOrders();
});

document.getElementById('search-input').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = localData.filter(i => 
        i['Nama Barang']?.toLowerCase().includes(val) || 
        i['Status']?.toLowerCase().includes(val) || 
        i['Nama Mesin']?.toLowerCase().includes(val)
    );
    renderTable(filtered);
});

// START
checkSession();
