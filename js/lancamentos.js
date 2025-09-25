// js/lancamentos.js
import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
  query, orderBy, where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadPaymentMethods();
  await loadUsers();
  reloadEntries();
});

function setupEventListeners() {
  document.getElementById('tipo').addEventListener('change', () => {
    loadCategories();
  });
  document.getElementById('forma').addEventListener('change', showPaymentSubtypes);
  ['valor','parcelas'].forEach(id =>
    document.getElementById(id).addEventListener('input', calculateTotal)
  );
  document.getElementById('parcelas')
    .addEventListener('change', calculateTotal);

  document.getElementById('form-lancamento')
    .addEventListener('submit', async e => {
      e.preventDefault();
      await saveEntry();
    });
}

async function loadPaymentMethods() {
  // No initial load, nothing to do besides showing options already in HTML
}

async function loadUsers() {
  const sel = document.getElementById('usuario');
  sel.innerHTML = '<option value="">Selecione quem comprou</option>';
  const snap = await getDocs(collection(db,'usuarios'));
  snap.forEach(d => {
    const opt = new Option(d.data().nome, d.id);
    sel.add(opt);
  });
}

function showPaymentSubtypes() {
  ['pag-cartao','pag-dinheiro','pag-outro']
    .forEach(div => document.getElementById(div).style.display = 'none');
  const f = document.getElementById('forma').value;
  if (f === 'cartao') document.getElementById('pag-cartao').style.display = 'block';
  if (f === 'dinheiro') document.getElementById('pag-dinheiro').style.display = 'block';
  if (f === 'outro') document.getElementById('pag-outro').style.display = 'block';
}

function loadCategories() {
  const tipo = document.getElementById('tipo').value;
  const sel = document.getElementById('categoria');
  sel.innerHTML = '<option value="">Selecione uma categoria</option>';
  const map = {
    receita: ['Salário','Freelance','Investimentos','Aluguel','Outras Receitas'],
    despesa: ['Supermercado','Transporte','Saúde','Educação','Lazer','Diversos']
  };
  (map[tipo]||[]).forEach(cat => sel.add(new Option(cat,cat)));
}

function calculateTotal() {
  const v = parseFloat(document.getElementById('valor').value)||0;
  const p = parseInt(document.getElementById('parcelas').value)||1;
  document.getElementById('valor_total').value = (v*p).toFixed(2);
}

async function reloadEntries() {
  const tb = document.getElementById('tabela-lancamentos');
  tb.innerHTML = '';
  const snap = await getDocs(query(collection(db,'lancamentos'),orderBy('data','desc')));
  snap.forEach(docSnap => {
    const l = docSnap.data();
    const sub = l.tipo_cartao || l.tipo_dinheiro || l.tipo_outro || '';
    const row = tb.insertRow();
    row.innerHTML = `
      <td>${formatDate(l.data)}</td>
      <td>${l.tipo}</td>
      <td>${l.descricao}</td>
      <td>${l.categoria}</td>
      <td>${l.forma}</td>
      <td>${sub}</td>
      <td>${l.parcela_atual}/${l.total_parcelas}</td>
      <td>${formatMoney(l.valor)}</td>
      <td>
        <button onclick="editEntry('${docSnap.id}')" class="btn btn-warning btn-editar">Editar</button>
        <button onclick="deleteEntry('${docSnap.id}')" class="btn btn-danger btn-excluir">Excluir</button>
      </td>`;
  });
}

async function saveEntry() {
  const tipo = document.getElementById('tipo').value;
  const descricao = document.getElementById('descricao').value;
  const valor = parseFloat(document.getElementById('valor').value)||0;
  const parcelas = parseInt(document.getElementById('parcelas').value)||1;
  const categoria = document.getElementById('categoria').value;
  const data = document.getElementById('data').value;
  const forma = document.getElementById('forma').value;
  const tipo_cartao = document.getElementById('tipo_cartao').value||'';
  const tipo_dinheiro = document.getElementById('tipo_dinheiro').value||'';
  const tipo_outro = document.getElementById('tipo_outro').value||'';
  const usuarioId = document.getElementById('usuario').value;
  let usuarioNome = '';
  if(usuarioId) {
    const snap = await getDocs(query(collection(db,'usuarios'),where('__name__','==',usuarioId)));
    snap.forEach(s=>usuarioNome=s.data().nome);
  }
  const compraId = `compra_${Date.now()}`;
  const prom = [];
  for(let i=1;i<=parcelas;i++){
    const dt = new Date(data);
    dt.setMonth(dt.getMonth()+i-1);
    const d = dt.toISOString().split('T')[0];
    const obj = {
      tipo, descricao:`${descricao} - Parcela ${i}/${parcelas}`, valor,
      categoria, data:d, parcela_atual:i, total_parcelas:parcelas,
      forma, tipo_cartao, tipo_dinheiro, tipo_outro,
      usuario_id:usuarioId, usuario_nome:usuarioNome,
      id_compra:compraId
    };
    prom.push(
      editingId
        ? (i===1 && updateDoc(doc(db,'lancamentos',editingId),obj))
        : addDoc(collection(db,'lancamentos'),obj)
    );
  }
  await Promise.all(prom);
  document.getElementById('form-lancamento').reset();
  editingId = null;
  reloadEntries();
}

function editEntry(id) {
  editingId = id;
  getDocs(query(collection(db,'lancamentos'),where('__name__','==',id)))
    .then(snap=>snap.forEach(s=>{
      const l=s.data();
      document.getElementById('tipo').value = l.tipo;
      loadCategories();
      document.getElementById('descricao').value = l.descricao.replace(/ - Parcela.*$/,'');
      document.getElementById('valor').value = l.valor;
      document.getElementById('parcelas').value = l.total_parcelas;
      document.getElementById('categoria').value = l.categoria;
      document.getElementById('data').value = l.data;
      document.getElementById('forma').value = l.forma; showPaymentSubtypes();
      document.getElementById('tipo_cartao').value = l.tipo_cartao||'';
      document.getElementById('tipo_dinheiro').value = l.tipo_dinheiro||'';
      document.getElementById('tipo_outro').value = l.tipo_outro||'';
      document.getElementById('btn-cancelar').style.display = 'inline-block';
      calculateTotal();
    }));
}

function deleteEntry(id){
  if(confirm('Excluir?')){
    deleteDoc(doc(db,'lancamentos',id)).then(()=>reloadEntries());
  }
}

function cancelEdit() {
  editingId = null;
  document.getElementById('form-lancamento').reset();
  document.getElementById('btn-cancelar').style.display = 'none';
}

window.editEntry = editEntry;
window.deleteEntry = deleteEntry;
window.cancelEdit = cancelEdit;
