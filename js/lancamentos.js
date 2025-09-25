// js/lancamentos.js
import { db } from './firebase-config.js';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let lancamentoEditandoId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await carregarCartoes();
  await carregarUsuarios();
  carregarLancamentos();

  document.getElementById('form-lancamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarLancamento();
  });

  document.getElementById('valor').addEventListener('input', calcularValorTotal);
  document.getElementById('parcelas').addEventListener('change', calcularValorTotal);
  document.getElementById('tipo').addEventListener('change', () => {
    carregarCategorias(document.getElementById('tipo').value);
  });
});

// Carrega cartões no select
async function carregarCartoes() {
  const select = document.getElementById('cartao');
  select.innerHTML = '<option value="">Selecione um cartão</option>';
  const snap = await getDocs(collection(db, 'cartoes'));
  snap.forEach(d => {
    const { nome, banco_nome } = d.data();
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${nome} — ${banco_nome}`;
    select.appendChild(opt);
  });
}

// Carrega usuários no select
async function carregarUsuarios() {
  const select = document.getElementById('usuario');
  select.innerHTML = '<option value="">Selecione quem comprou</option>';
  const snap = await getDocs(collection(db, 'usuarios'));
  snap.forEach(d => {
    const { nome } = d.data();
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = nome;
    select.appendChild(opt);
  });
}

// Carrega lançamentos na tabela
async function carregarLancamentos() {
  const tabela = document.getElementById('tabela-lancamentos');
  tabela.innerHTML = '';
  const q = query(collection(db, 'lancamentos'), orderBy('data', 'desc'));
  const snap = await getDocs(q);
  snap.forEach(d => {
    const l = d.data();
    const row = tabela.insertRow();
    row.innerHTML = `
      <td>${formatarData(l.data)}</td>
      <td><span class="badge ${l.tipo}">${l.tipo}</span></td>
      <td>${l.descricao}</td>
      <td>${l.categoria}</td>
      <td>${l.cartao_nome}</td>
      <td>${l.usuario_nome}</td>
      <td>${l.parcela_atual}/${l.total_parcelas}</td>
      <td>${formatarMoeda(l.valor)}</td>
      <td>${l.id_compra}</td>
      <td class="acoes">
        <button onclick="editarLancamento('${d.id}')" class="btn btn-warning btn-editar">Editar</button>
        <button onclick="excluirLancamento('${d.id}')" class="btn btn-danger btn-excluir">Excluir</button>
      </td>`;
  });
}

// Salva novo lançamento em parcelas
async function salvarLancamento() {
  const tipo = document.getElementById('tipo').value;
  const cartaoId = document.getElementById('cartao').value;
  const usuarioId = document.getElementById('usuario').value;
  const descricao = document.getElementById('descricao').value;
  const valor = parseFloat(document.getElementById('valor').value) || 0;
  const parcelas = parseInt(document.getElementById('parcelas').value) || 1;
  const categoria = document.getElementById('categoria').value;
  const data0 = document.getElementById('data').value;

  // Busca nomes de cartão e usuário
  const cartaoSnap = await getDocs(query(collection(db,'cartoes'), where('__name__','==',cartaoId)));
  const usuarioSnap = await getDocs(query(collection(db,'usuarios'), where('__name__','==',usuarioId)));
  let cartaoNome='', usuarioNome='';
  cartaoSnap.forEach(s=>cartaoNome=s.data().nome);
  usuarioSnap.forEach(s=>usuarioNome=s.data().nome);

  const idCompra = `compra_${Date.now()}`;
  const prom = [];
  for (let i=1;i<=parcelas;i++) {
    const d = new Date(data0);
    d.setMonth(d.getMonth()+i-1);
    const data = d.toISOString().split('T')[0];
    const obj = {
      tipo, cartao_id:cartaoId, cartao_nome:cartaoNome,
      usuario_id:usuarioId, usuario_nome:usuarioNome,
      descricao:`${descricao} - Parcela ${i}/${parcelas}`,
      valor, categoria, data,
      parcela_atual:i, total_parcelas:parcelas, id_compra:idCompra
    };
    prom.push(!lancamentoEditandoId ? addDoc(collection(db,'lancamentos'),obj)
      : i===1 && updateDoc(doc(db,'lancamentos',lancamentoEditandoId),obj));
  }
  await Promise.all(prom);
  document.getElementById('form-lancamento').reset();
  lancamentoEditandoId=null;
  carregarLancamentos();
}

// Filtra categorias por tipo
function carregarCategorias(tipo) {
  const select = document.getElementById('categoria');
  select.innerHTML = '<option value="">Selecione uma categoria</option>';
  const cat = {
    receita:['Salário','Freelance','Vendas','Investimentos','Aluguel','Outras Receitas'],
    despesa:[
      'Aluguel/Financiamento','Condomínio','Energia Elétrica','Água','Internet','Telefone',
      'Supermercado','Restaurante','Lanche','Delivery','Combustível','Transporte Público','Uber/Taxi',
      'Manutenção Veículo','Seguro Veículo','IPVA','Plano de Saúde','Medicamentos','Consultas','Exames',
      'Escola/Universidade','Cursos','Livros','Material Escolar','Cinema','Streaming','Games','Viagens',
      'Academia','Hobbies','Roupas','Calçados','Acessórios','Cabeleireiro','Produtos de Higiene',
      'Cosméticos','Eletrônicos','Software','Aplicativos','Presentes','Doações','Impostos','Seguros',
      'Taxas Bancárias','Diversos'
    ]
  }[tipo]||[];
  cat.forEach(c=>{
    const o=document.createElement('option');
    o.value=c; o.textContent=c;
    select.appendChild(o);
  });
}

// Editar lançamento
async function editarLancamento(id) {
  lancamentoEditandoId=id;
  const snap = await getDocs(query(collection(db,'lancamentos'), where('__name__','==',id)));
  snap.forEach(s=>{
    const l=s.data();
    document.getElementById('tipo').value=l.tipo;
    carregarCategorias(l.tipo);
    document.getElementById('cartao').value=l.cartao_id;
    document.getElementById('usuario').value=l.usuario_id;
    document.getElementById('descricao').value=l.descricao.replace(/ - Parcela.*$/,'');
    document.getElementById('valor').value=l.valor;
    document.getElementById('parcelas').value=l.total_parcelas;
    document.getElementById('categoria').value=l.categoria;
    document.getElementById('data').value=l.data;
    document.getElementById('btn-cancelar').style.display='inline-block';
    calcularValorTotal();
  });
}

// Excluir lançamento
async function excluirLancamento(id) {
  if (confirm('Excluir este lançamento?')) {
    await deleteDoc(doc(db,'lancamentos',id));
    carregarLancamentos();
  }
}

// Cancelar edição
function cancelarEdicao() {
  lancamentoEditandoId=null;
  document.getElementById('form-lancamento').reset();
  document.getElementById('btn-cancelar').style.display='none';
}

function calcularValorTotal(){
  const v=parseFloat(document.getElementById('valor').value)||0;
  const p=parseInt(document.getElementById('parcelas').value)||1;
  document.getElementById('valor_total').value=(v*p).toFixed(2);
}

function formatarMoeda(v){
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
}
function formatarData(d){
  return new Date(d+'T00:00:00').toLocaleDateString('pt-BR');
}

// Tornar globais
window.editarLancamento=editarLancamento;
window.excluirLancamento=excluirLancamento;
window.cancelarEdicao=cancelarEdicao;
