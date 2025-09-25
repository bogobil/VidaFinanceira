// js/lancamentos.js
import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
  query, orderBy, where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let idEdit = null;

document.addEventListener('DOMContentLoaded', async () => {
  carregarCategorias(); // inicial
  await carregarCartoes();
  await carregarUsuarios();
  carregarLancamentos();

  document.getElementById('form-lancamento').addEventListener('submit', async e=>{
    e.preventDefault();
    await salvarLancamento();
  });

  document.getElementById('valor').addEventListener('input', calcularValorTotal);
  document.getElementById('parcelas').addEventListener('change', calcularValorTotal);

  document.getElementById('tipo').addEventListener('change', ()=>carregarCategorias());
  document.getElementById('forma').addEventListener('change', mostrarSubFormas);
});

function mostrarSubFormas(){
  ['pag-cartao','pag-dinheiro','pag-outro'].forEach(id=>
    document.getElementById(id).style.display='none');
  const f=document.getElementById('forma').value;
  if(f==='cartao') document.getElementById('pag-cartao').style.display='block';
  if(f==='dinheiro') document.getElementById('pag-dinheiro').style.display='block';
  if(f==='outro') document.getElementById('pag-outro').style.display='block';
}

function calcularValorTotal(){
  const v=parseFloat(document.getElementById('valor').value)||0;
  const p=parseInt(document.getElementById('parcelas').value)||1;
  document.getElementById('valor_total').value=(v*p).toFixed(2);
}

function formatarData(d){
  return new Date(d+'T00:00:00').toLocaleDateString('pt-BR');
}
function formatarMoeda(v){
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
}

function carregarCategorias(){
  const tipo=document.getElementById('tipo').value;
  const sel=document.getElementById('categoria');
  sel.innerHTML='<option value="">Selecione uma categoria</option>';
  const cats={ 
    receita:['Salário','Freelance','Vendas','Investimentos','Aluguel','Outras Receitas'],
    despesa:['Aluguel','Condomínio','Supermercado','Saúde','Educação','Lazer','Transporte','Diversos']
  }[tipo]||[];
  cats.forEach(c=>sel.add(new Option(c,c)));
}

async function carregarCartoes(){
  const sel=document.getElementById('cartao');
  sel.innerHTML='<option value="">Selecione um cartão</option>';
  (await getDocs(collection(db,'cartoes'))).forEach(d=>{
    sel.add(new Option(d.data().nome, d.id));
  });
}

async function carregarUsuarios(){
  const sel=document.getElementById('usuario');
  sel.innerHTML='<option value="">Selecione quem comprou</option>';
  (await getDocs(collection(db,'usuarios'))).forEach(d=>{
    sel.add(new Option(d.data().nome,d.id));
  });
}

async function carregarLancamentos(){
  const tb=document.getElementById('tabela-lancamentos');
  tb.innerHTML='';
  const snap=await getDocs(query(collection(db,'lancamentos'),orderBy('data','desc')));
  snap.forEach(d=>{
    const l=d.data();
    const sub=l.tipo_cartao||l.tipo_dinheiro||l.tipo_outro||'';
    const row=tb.insertRow();
    row.innerHTML=`
      <td>${formatarData(l.data)}</td>
      <td>${l.tipo}</td>
      <td>${l.descricao}</td>
      <td>${l.categoria}</td>
      <td>${l.forma}</td>
      <td>${sub}</td>
      <td>${l.parcela_atual}/${l.total_parcelas}</td>
      <td>${formatarMoeda(l.valor)}</td>
      <td>
        <button onclick="editar('${d.id}')" class="btn btn-warning btn-editar">Editar</button>
        <button onclick="excluir('${d.id}')" class="btn btn-danger btn-excluir">Excluir</button>
      </td>`;
  });
}

async function salvarLancamento(){
  const l0=document.getElementById('tipo').value;
  const desc=document.getElementById('descricao').value;
  const v=parseFloat(document.getElementById('valor').value)||0;
  const p=parseInt(document.getElementById('parcelas').value)||1;
  const c=document.getElementById('categoria').value;
  const d=document.getElementById('data').value;
  const forma=document.getElementById('forma').value;
  const tct=document.getElementById('tipo_cartao').value||'';
  const tdin=document.getElementById('tipo_dinheiro').value||'';
  const tout=document.getElementById('tipo_outro').value||'';

  const idc0=`compra_${Date.now()}`;
  const prom=[];
  for(let i=1;i<=p;i++){
    const dt=new Date(d);dt.setMonth(dt.getMonth()+i-1);
    const dd=dt.toISOString().split('T')[0];
    const obj={tipo:l0,descricao:`${desc} - Parcela ${i}/${p}`,valor:v,
      categoria:c,data:dd,parcela_atual:i,total_parcelas:p,id_compra:idc0,
      forma,tipo_cartao:tct,tipo_dinheiro:tdin,tipo_outro:tout};
    prom.push(!idEdit?addDoc(collection(db,'lancamentos'),obj)
      :i===1&&updateDoc(doc(db,'lancamentos',idEdit),obj));
  }
  await Promise.all(prom);
  document.getElementById('form-lancamento').reset();
  idEdit=null;
  carregarLancamentos();
}

async function editar(id){
  idEdit=id;
  const snap=await getDocs(query(collection(db,'lancamentos'),where('__name__','==',id)));
  snap.forEach(s=>{
    const l=s.data();
    document.getElementById('tipo').value=l.tipo;
    carregarCategorias();
    document.getElementById('descricao').value=l.descricao.replace(/ - Parcela.*$/,'');
    document.getElementById('valor').value=l.valor;
    document.getElementById('parcelas').value=l.total_parcelas;
    document.getElementById('categoria').value=l.categoria;
    document.getElementById('data').value=l.data;
    document.getElementById('forma').value=l.forma; mostrarSubFormas();
    document.getElementById('tipo_cartao').value=l.tipo_cartao||'';
    document.getElementById('tipo_dinheiro').value=l.tipo_dinheiro||'';
    document.getElementById('tipo_outro').value=l.tipo_outro||'';
    document.getElementById('btn-cancelar').style.display='inline-block';
    calcularValorTotal();
  });
}

async function excluir(id){
  if(confirm('Excluir?')){ await deleteDoc(doc(db,'lancamentos',id)); carregarLancamentos();}
}

function cancelarEdicao(){
  idEdit=null;
  document.getElementById('form-lancamento').reset();
  document.getElementById('btn-cancelar').style.display='none';
}

window.editar=editar;
window.excluir=excluir;
window.cancelarEdicao=cancelarEdicao;
