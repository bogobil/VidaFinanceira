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
  await loadCards();
  reloadEntries();
});

function setup(){
  document.getElementById('tipo').addEventListener('change', loadCategories);
  document.getElementById('forma').addEventListener('change', showPaymentOptions);
  ['valor','parcelas'].forEach(id=>{
    document.getElementById(id)
      .addEventListener('input',calculateTotal);
  });
  document.getElementById('parcelas')
      .addEventListener('change',calculateTotal);
  document.getElementById('form-lancamento')
      .addEventListener('submit',async e=>{
        e.preventDefault();
        await saveEntry();
      });
}

async function loadUsers(){
  const sel = document.getElementById('usuario');
  sel.innerHTML = '<option value="">Selecione</option>';
  const snap = await getDocs(collection(db,'usuarios'));
  snap.forEach(d => sel.add(new Option(d.data().nome,d.id)));
}

async function loadCards(){
  const sel = document.getElementById('cartao');
  sel.innerHTML = '<option value="">Selecione</option>';
  const snap = await getDocs(collection(db,'cartoes'));
  snap.forEach(d=>sel.add(new Option(d.data().nome,d.id)));
}

function loadCategories(){
  const t = document.getElementById('tipo').value;
  const map = {
    receita:['Salário','Freelance','Investimentos','Aluguel','Outras'],
    despesa:['Supermercado','Transporte','Saúde','Educação','Lazer','Diversos']
  };
  const sel = document.getElementById('categoria');
  sel.innerHTML = '<option value="">Selecione</option>';
  (map[t]||[]).forEach(c=>sel.add(new Option(c,c)));
}

function showPaymentOptions(){
  ['pag-cartao','pag-tipo-cartao','pag-dinheiro','pag-outro']
    .forEach(id=>document.getElementById(id).style.display='none');
  const f = document.getElementById('forma').value;
  if(f==='cartao'){
    document.getElementById('pag-cartao').style.display='block';
    document.getElementById('pag-tipo-cartao').style.display='block';
  }
  if(f==='dinheiro'){
    document.getElementById('pag-dinheiro').style.display='block';
  }
  if(f==='outro'){
    document.getElementById('pag-outro').style.display='block';
  }
}

function calculateTotal(){
  const v= parseFloat(document.getElementById('valor').value)||0;
  const p= parseInt(document.getElementById('parcelas').value)||1;
  document.getElementById('valor_total').value = (v*p).toFixed(2);
}

function formatDate(d){
  return new Date(d+'T00:00:00').toLocaleDateString('pt-BR');
}
function formatMoney(v){
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
}

async function reloadEntries(){
  const tb = document.getElementById('tabela-lancamentos');
  tb.innerHTML = '';
  const snap = await getDocs(query(collection(db,'lancamentos'),orderBy('data','desc')));
  snap.forEach(docSnap=>{
    const l=docSnap.data(), sub = l.tipo_cartao||l.tipo_dinheiro||l.tipo_outro||'';
    const row=tb.insertRow();
    row.innerHTML=`
      <td>${formatDate(l.data)}</td>
      <td>${l.tipo}</td>
      <td>${l.descricao}</td>
      <td>${l.categoria}</td>
      <td>${l.forma}</td>
      <td>${sub}</td>
      <td>${l.parcela_atual}/${l.total_parcelas}</td>
      <td>${formatMoney(l.valor)}</td>
      <td>
        <button onclick="edit('${docSnap.id}')" class="btn btn-warning btn-editar">Editar</button>
        <button onclick="del('${docSnap.id}')" class="btn btn-danger btn-excluir">Excluir</button>
      </td>`;
  });
}

async function saveEntry(){
  const tipo = document.getElementById('tipo').value;
  const desc = document.getElementById('descricao').value;
  const valor = parseFloat(document.getElementById('valor').value)||0;
  const parcelas = parseInt(document.getElementById('parcelas').value)||1;
  const cat = document.getElementById('categoria').value;
  const data = document.getElementById('data').value;
  const forma = document.getElementById('forma').value;
  const tc = document.getElementById('tipo_cartao').value||'';
  const td = document.getElementById('tipo_dinheiro').value||'';
  const to = document.getElementById('tipo_outro').value||'';
  const uid = document.getElementById('usuario').value;
  let uName = '';
  if(uid){
    const us = await getDocs(query(collection(db,'usuarios'),where('__name__','==',uid)));
    us.forEach(s=>uName=s.data().nome);
  }
  const buyId = `compra_${Date.now()}`;
  const tasks=[];
  for(let i=1;i<=parcelas;i++){
    const dt=new Date(data); dt.setMonth(dt.getMonth()+i-1);
    const d0=dt.toISOString().split('T')[0];
    const obj={ tipo, descricao:`${desc} - Parcela ${i}/${parcelas}`, valor,
      categoria:cat, data:d0, parcela_atual:i, total_parcelas:parcelas,
      forma, tipo_cartao:tc, tipo_dinheiro:td, tipo_outro:to,
      usuario_id:uid, usuario_nome:uName, id_compra:buyId };
    tasks.push(
      editId
        ? (i===1 && updateDoc(doc(db,'lancamentos',editId),obj))
        : addDoc(collection(db,'lancamentos'),obj)
    );
  }
  await Promise.all(tasks);
  document.getElementById('form-lancamento').reset();
  editId=null;
  reloadEntries();
}

function edit(id){
  editId=id;
  getDocs(query(collection(db,'lancamentos'),where('__name__','==',id)))
    .then(snap=>snap.forEach(s=>{
      const l=s.data();
      document.getElementById('tipo').value=l.tipo; loadCategories();
      document.getElementById('descricao').value=l.descricao.replace(/ - Parcela.*$/,'');
      document.getElementById('valor').value=l.valor;
      document.getElementById('parcelas').value=l.total_parcelas;
      document.getElementById('categoria').value=l.categoria;
      document.getElementById('data').value=l.data;
      document.getElementById('forma').value=l.forma; showPaymentSubtypes();
      document.getElementById('cartao').value=l.cartao_id||'';
      document.getElementById('tipo_cartao').value=l.tipo_cartao||'';
      document.getElementById('tipo_dinheiro').value=l.tipo_dinheiro||'';
      document.getElementById('tipo_outro').value=l.tipo_outro||'';
      document.getElementById('usuario').value=l.usuario_id||'';
      document.getElementById('btn-cancelar').style.display='inline-block';
      calculateTotal();
    }));
}

function del(id){
  if(confirm('Excluir?')){
    deleteDoc(doc(db,'lancamentos',id)).then(()=>reloadEntries());
  }
}

function cancelEdit(){
  editId=null;
  document.getElementById('form-lancamento').reset();
  document.getElementById('btn-cancelar').style.display='none';
}

window.edit=edit;
window.del=del;
window.cancelEdit=cancelEdit;
