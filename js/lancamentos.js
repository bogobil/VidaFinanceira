// js/lancamentos-final-listas.js
import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let lancamentoEditandoId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await carregarCartoes();
  await carregarUsuarios();
  document.getElementById('form-lancamento').addEventListener('submit', salvarLancamento);
  document.getElementById('valor').addEventListener('input', calcularValorTotal);
  document.getElementById('parcelas').addEventListener('change', calcularValorTotal);
});

async function carregarCartoes() {
  const select = document.getElementById('cartao');
  select.innerHTML = '<option value="">Selecione um cartão</option>';
  const snap = await getDocs(collection(db, 'cartoes'));
  snap.forEach(d => {
    const { nome } = d.data();
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = nome;
    select.appendChild(opt);
  });
}
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

async function carregarLancamentos() {
  const tabela = document.getElementById('tabela-lancamentos');
  tabela.innerHTML = '';
  const snap = await getDocs(query(collection(db, 'lancamentos'), orderBy('data','desc')));
  snap.forEach(d => {
    const l = d.data();
    const row = tabela.insertRow();
    row.innerHTML = `
      <td>${formatarData(l.data)}</td><td><span class="badge ${l.tipo}">${l.tipo}</span></td>
      <td>${l.descricao}</td><td>${l.categoria}</td>
      <td>${l.cartao_nome}</td><td>${l.usuario_nome}</td>
      <td>${l.parcela_atual}/${l.total_parcelas}</td>
      <td>${formatarMoeda(l.valor)}</td><td>${l.id_compra}</td>
      <td>
        <button onclick="editarLancamento('${d.id}')" class="btn btn-warning btn-editar">Editar</button>
        <button onclick="excluirLancamento('${d.id}')" class="btn btn-danger btn-excluir">Excluir</button>
      </td>`;
  });
}

async function salvarLancamento(e) {
  e.preventDefault();
  const tipo = document.getElementById('tipo').value;
  const cartaoId = document.getElementById('cartao').value;
  const usuarioId = document.getElementById('usuario').value;
  const descricao = document.getElementById('descricao').value;
  const valor = parseFloat(document.getElementById('valor').value);
  const parcelas = parseInt(document.getElementById('parcelas').value);
  const categoria = document.getElementById('categoria').value;
  const data = document.getElementById('data').value;

  const cartaoSnap = await getDocs(query(collection(db,'cartoes'), where('__name__','==',cartaoId)));
  const usuarioSnap = await getDocs(query(collection(db,'usuarios'), where('__name__','==',usuarioId)));
  let cartaoNome='', usuarioNome='';
  cartaoSnap.forEach(s=>cartaoNome=s.data().nome);
  usuarioSnap.forEach(s=>usuarioNome=s.data().nome);

  const idCompra = `compra_${Date.now()}`;
  const promises=[];

  for(let i=1;i<=parcelas;i++){
    const d = new Date(data); d.setMonth(d.getMonth()+i-1);
    const obj = {
      tipo, cartao_id:cartaoId, cartao_nome:cartaoNome,
      usuario_id:usuarioId, usuario_nome:usuarioNome,
      descricao: `${descricao} - Parcela ${i}/${parcelas}`,
      valor, categoria, data: d.toISOString().split('T')[0],
      parcela_atual:i, total_parcelas:parcelas, id_compra:idCompra
    };
    promises.push(!lancamentoEditandoId 
      ? addDoc(collection(db,'lancamentos'),obj)
      : i===1 && updateDoc(doc(db,'lancamentos',lancamentoEditandoId),obj)
    );
  }

  await Promise.all(promises);
  document.getElementById('form-lancamento').reset();
  lancamentoEditandoId=null;
  carregarLancamentos();
}

function calcularValorTotal(){
  const v=parseFloat(document.getElementById('valor').value)||0;
  const p=parseInt(document.getElementById('parcelas').value)||1;
  document.getElementById('valor_total').value = (v*p).toFixed(2);
}

async function editarLancamento(id){
  lancamentoEditandoId=id;
  const snap = await getDocs(query(collection(db,'lancamentos'), where('__name__','==',id)));
  snap.forEach(s=>{
    const l=s.data();
    document.getElementById('tipo').value=l.tipo;
    document.getElementById('cartao').value=l.cartao_id;
    document.getElementById('usuario').value=l.usuario_id;
    document.getElementById('descricao').value=l.descricao.replace(/ - Parcela.*$/,'');
    document.getElementById('valor').value=l.valor;
    document.getElementById('parcelas').value=l.total_parcelas;
    document.getElementById('categoria').value=l.categoria;
    document.getElementById('data').value=l.data;
    calcularValorTotal();
    document.getElementById('btn-cancelar').style.display='inline-block';
  });
}

async function excluirLancamento(id){
  if(confirm('Excluir?')){ await deleteDoc(doc(db,'lancamentos',id)); carregarLancamentos(); }
}

function cancelarEdicao(){
  lancamentoEditandoId=null;
  document.getElementById('form-lancamento').reset();
  document.getElementById('btn-cancelar').style.display='none';
}

function formatarMoeda(v){
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
}

function formatarData(d){
  return new Date(d+'T00:00:00').toLocaleDateString('pt-BR');
}
// Filtrar categorias quando tipo mudar
document.getElementById('tipo').addEventListener('change', function() {
    const tipo = this.value;
    carregarCategorias(tipo);
});

function carregarCategorias(tipo) {
    const selectCategoria = document.getElementById('categoria');
    selectCategoria.innerHTML = '<option value="">Selecione uma categoria</option>';
    
    const categorias = {
        receita: [
            'Salário', 'Freelance', 'Vendas', 'Investimentos', 'Aluguel', 'Outras Receitas'
        ],
        despesa: [
            'Aluguel/Financiamento', 'Condomínio', 'Energia Elétrica', 'Água', 'Internet', 'Telefone',
            'Supermercado', 'Restaurante', 'Lanche', 'Delivery',
            'Combustível', 'Transporte Público', 'Uber/Taxi', 'Manutenção Veículo', 'Seguro Veículo', 'IPVA',
            'Plano de Saúde', 'Medicamentos', 'Consultas', 'Exames',
            'Escola/Universidade', 'Cursos', 'Livros', 'Material Escolar',
            'Cinema', 'Streaming', 'Games', 'Viagens', 'Academia', 'Hobbies',
            'Roupas', 'Calçados', 'Acessórios',
            'Cabeleireiro', 'Produtos de Higiene', 'Cosméticos',
            'Eletrônicos', 'Software', 'Aplicativos',
            'Presentes', 'Doações', 'Impostos', 'Seguros', 'Taxas Bancárias', 'Diversos'
        ]
    };
    
    if (tipo && categorias[tipo]) {
        categorias[tipo].forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            selectCategoria.appendChild(option);
        });
    }
}

window.editarLancamento=editarLancamento;
window.excluirLancamento=excluirLancamento;
