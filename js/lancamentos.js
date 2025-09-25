// js/lancamentos.js
import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
  query, orderBy, where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let editId = null;

document.addEventListener('DOMContentLoaded', async () => {
  setup();
  await loadUsers();
  renderEntries();
});

function setup() {
  ['tipo','parcelas','valor'].forEach(id => {
    const e = document.getElementById(id);
    e.addEventListener(id==='valor'?'input':'change',
      id==='tipo'?loadCategories:
      id==='parcelas'?calculateTotal:
      calculateTotal
    );
  });
  document.getElementById('forma').addEventListener('change', showSubForms);
  document.getElementById('form-lancamento')
    .addEventListener('submit', async e => { e.preventDefault(); await save(); });
}

async function loadUsers() {
  const sel = document.getElementById('usuario');
  sel.innerHTML = '<option value="">Selecione quem comprou</option>';
  (await getDocs(collection(db,'usuarios'))).forEach(d=>{
    sel.add(new Option(d.data().nome, d.id));
  });
}

function showSubForms() {
  ['pag-cartao','pag-dinheiro','pag-outro'].forEach(id=>document.getElementById(id).style.display='none');
  const f = document.getElementById('forma').value;
  if(f==='cartao') document.getElementById('pag-cartao').style.display='block';
  if(f==='dinheiro') document.getElementById('pag-dinheiro').style.display='block';
  if(f==='outro') document.getElementById('pag-outro').style.display='block';
}

function loadCategories() {
  const t = document.getElementById('tipo').value;
  const sel = document.getElementById('categoria');
  sel.innerHTML = '<option value="">Selecione uma categoria</option>';
  const map = {
    receita:['Salário','Freelance','Vendas','Investimentos','Aluguel','Outras Receitas'],
    despesa:['Supermercado','Transporte','Saúde','Educação','Lazer','Diversos']
  };
  (map[t]||[]).forEach(c=>sel.add(new Option(c,c)));
}

function calculateTotal() {
  const v = parseFloat(document.getElementById('valor').value)||0;
  const p = parseInt(document.getElementById('parcelas').value)||1;
  document.getElementById('valor_total').value = (v*p).toFixed(2);
}

function formatDate(d){return new Date(d+'T00:00:00').toLocaleDateString('pt-BR');}
function formatMoney(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);}

async function renderEntries() {
  const tb = document.getElementById('tabela-lancamentos');
  tb.innerHTML = '';
  const snap = await getDocs(query(collection(db,'lancamentos'),orderBy('data','desc')));
  snap.forEach(d=>{
    const l = d.data();
    const sub = l.tipo_cartao||l.tipo_dinheiro||l.tipo_outro||'';
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
        <button onclick="edit('${d.id}')" class="btn btn-warning btn-editar">Editar</button>
        <button onclick="del('${d.id}')" class="btn btn-danger btn-excluir">Excluir</button>
      </td>`;
  });
}

async function save() {
  const tipo = document.getElementById('tipo').value;
  const desc = document.getElementById('descricao').value;
  const valor = parseFloat(document.getElementById('valor').value)||0;
  const parcelas = parseInt(document.getElementById('parcelas').value)||1;
  const categoria = document.getElementById('categoria').value;
  const data = document.getElementById('data').value;
  const forma = document.getElementById('forma').value;
  const tipo_cartao = document.getElementById('tipo_cartao').value||'';
  const tipo_dinheiro = document.getElementById('tipo_dinheiro').value||'';
  const tipo_outro = document.getElementById('tipo_outro').value||'';
  const userId = document.getElementById('usuario').value;
  let userName = '';
  if(userId) {
    const s = await getDocs(query(collection(db,'usuarios'),where('__name__','==',userId)));
    s.forEach(x=>userName = x.data().nome);
  }
  const compraId = `compra_${Date.now()}`;
  const tasks = [];
  for(let i=1;i<=parcelas;i++){
    const dt=new Date(data); dt.setMonth(dt.getMonth()+i-1);
    const d0=dt.toISOString().split('T')[0];
    const obj = {
      tipo, descricao:`${desc} - Parcela ${i}/${parcelas}`, valor,
      categoria, data:d0, parcela_atual:i, total_parcelas:parcelas,
      forma, tipo_cartao, tipo_dinheiro, tipo_outro,
      usuario_id:userId, usuario_nome:userName,
      id_compra:compraId
    };
    tasks.push(!editId
      ? addDoc(collection(db,'lancamentos'), obj)
      : i===1 && updateDoc(doc(db,'lancamentos',editId), obj)
    );
  }
  await Promise.all(tasks);
  document.getElementById('form-lancamento').reset();
  editId = null;
  renderEntries();
}

function edit(id) {
  editId = id;
  getDocs(query(collection(db,'lancamentos'),where('__name__','==',id)))
    .then(snap=>snap.forEach(d=>{
      const l = d.data();
      document.getElementById('tipo').value = l.tipo; loadCategories();
      document.getElementById('descricao').value = l.descricao.replace(/ - Parcela.*$/,'');
      document.getElementById('valor').value = l.valor;
      document.getElementById('parcelas').value = l.total_parcelas;
      document.getElementById('categoria').value = l.categoria;
      document.getElementById('data').value = l.data;
      document.getElementById('forma').value = l.forma; showSubForms();
      document.getElementById('tipo_cartao').value = l.tipo_cartao||'';
      document.getElementById('tipo_dinheiro').value = l.tipo_dinheiro||'';
      document.getElementById('tipo_outro').value = l.tipo_outro||'';
      document.getElementById('usuario').value = l.usuario_id||'';
      document.getElementById('btn-cancelar').style.display = 'inline-block';
      calculateTotal();
    }));
}

function del(id){
  if(confirm('Excluir?')) {
    deleteDoc(doc(db,'lancamentos',id)).then(()=>renderEntries());
  }
}

function cancelEdit(){
  editId = null;
  document.getElementById('form-lancamento').reset();
  document.getElementById('btn-cancelar').style.display = 'none';
}

window.edit = edit;
window.del = del;
window.cancelEdit = cancelEdit;
