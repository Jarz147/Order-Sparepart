import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://synhvvaolrjxdcbyozld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5bmh2dmFvbHJqeGRjYnlvemxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Njg4NzEsImV4cCI6MjA4NTU0NDg3MX0.GSEfz8HVd49uEWXd70taR6FUv243VrFJKn6KlsZW-aQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const ADMIN_EMAIL = "admin@order-sparepart.com";
const SPECIAL_USER = "user@order-sparepart.com";
let currentEmail = "";
let localData = [];

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
    btn.innerText = "MENGIRIM..."; btn.disabled = true;

    const payload = {
        'Nama Barang': document.getElementById('nama_barang').value,
        'Spesifikasi': document.getElementById('spesifikasi').value,
        'Quantity Order': parseInt(document.getElementById('qty').value),
        'Satuan': document.getElementById('satuan').value,
        'Nama Mesin': document.getElementById('nama_mesin').value,
        'Nama Line': document.getElementById('nama_line').value,
        'Detail Pesanan': document.getElementById('detail_pesanan').value,
        'Status': 'Pending',
        'User Email': currentEmail
    };

    const { error } = await supabase.from('Order-sparepart').insert([payload]);
    if (!error) { document.getElementById('order-form').reset(); fetchOrders(); }
    btn.innerText = "KIRIM PERMINTAAN"; btn.disabled = false;
});

function renderTable(data) {
    const body = document.getElementById('data-body');
    const isAdmin = currentEmail === ADMIN_EMAIL.toLowerCase();
    const isSpecialUser = currentEmail === SPECIAL_USER.toLowerCase();

    body.innerHTML = data.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map((i, index) => {
        const canEdit = (isSpecialUser || isAdmin) && i.Status === 'Pending';
        return `
            <tr class="border-b hover:bg-slate-50">
                <td class="px-4 py-4 text-center text-slate-400 text-xs">${index + 1}</td>
                <td class="px-4 py-4">
                    <div class="font-bold uppercase">${i['Nama Barang']}</div>
                    <div class="text-[10px] text-slate-400 italic">${i.Spesifikasi || '-'}</div>
                </td>
                <td class="px-4 py-4 text-xs text-slate-600">${i['Detail Pesanan'] || '-'}</td>
                <td class="px-4 py-4 text-center font-bold text-indigo-600">${i['Quantity Order']} ${i.Satuan}</td>
                <td class="px-4 py-4 text-[10px] uppercase">${i['Nama Line']}<br><span class="text-slate-400">${i['Nama Mesin']}</span></td>
                <td class="px-4 py-4">
                    <span class="text-[9px] font-black px-2 py-1 rounded-lg ${i.Status === 'Selesai' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} uppercase">
                        ${i.Status || 'Pending'}
                    </span>
                </td>
                <td class="px-4 py-4 text-center">
                    ${canEdit ? `<button onclick="window.openModal('${i.id}')" class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Edit</button>` : '-'}
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
    
    document.getElementById('admin-fields').classList.toggle('hidden', !isAdmin);
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
};

window.logout = async () => { await supabase.auth.signOut(); window.location.href = 'login.html'; };
checkSession();
