import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
  query, orderBy, where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Data padrão para hoje
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
  
  await carregarUsuarios();
  await carregarLancamentos();
  
  // Event listeners
  document.getElementById('tipo').addEventListener('change', carregarCategorias);
  document.getElementById('forma').addEventListener('change', mostrarCamposCondicionais);
  document.getElementById('tipo-pagamento').addEventListener('change', mostrarPagamentoNo);
  document.getElementById('pagamento-no').addEventListener('change', mostrarPrazo);
  document.getElementById('valor-compra').addEventListener('input', calcularValorTotal);
  document.getElementById('prazo').addEventListener('change', calcularValorTotal);
  
  document.getElementById('form-lancamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarLancamento();
  });
});

function mostrarCamposCondicionais() {
  const forma = document.getElementById('forma').value;
  document.getElementById('grupo-tipo-pagamento').style.display = 'none';
  document.getElementById('grupo-pagamento-no').style.display = 'none';
  document.getElementById('grupo-prazo').style.display = 'none';
  
  if (forma === 'cartao') {
    document.getElementById('grupo-tipo-pagamento').style.display = 'block';
    document.getElementById('grupo-pagamento-no').style.display = 'block';
    carregarCartoesSelect();
  } else if (forma === 'pix' || forma === 'transferencia' || forma === 'boleto') {
    document.getElementById('grupo-tipo-pagamento').style.display = 'block';
  }
}

async function carregarCartoesSelect() {
  const sel = document.getElementById('cartao');
  sel.innerHTML = '<option value="">Selecione seu cartão</option>';
  const snap = await getDocs(collection(db, 'cartoes'));
  snap.forEach(d => {
    const c = d.data();
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${c.nome} (${c.bandeira_nome || c.bandeira})`;
    sel.appendChild(opt);
  });
}

function mostrarPagamentoNo() {
  const tipoPag = document.getElementById('tipo-pagamento').value;
  document.getElementById('grupo-prazo').style.display = tipoPag === 'credito' ? 'block' : 'none';
  if (tipoPag !== 'credito') {
    document.getElementById('prazo').value = '1';
    calcularValorTotal();
  }
}

function mostrarPrazo() {
  // já controlado por mostrarPagamentoNo
}

function calcularValorTotal() {
  const valor = parseFloat(document.getElementById('valor-compra').value) || 0;
  const prazo = parseInt(document.getElementById('prazo').value) || 1;
  document.getElementById('valor-total').value = (valor / prazo).toFixed(2);
}

function carregarCategorias() {
  const tipo = document.getElementById('tipo').value;
  const sel = document.getElementById('categoria');
  sel.innerHTML = '<option value="">Selecione uma categoria</option>';
  const cats = {
    receita: ['Salário','Freelance','Vendas','Investimentos','Aluguel','Outras Receitas'],
    despesa: ['Supermercado','Transporte','Saúde','Educação','Lazer','Diversos']
  }[tipo] || [];
  cats.forEach(c => sel.add(new Option(c,c)));
}

async function carregarUsuarios() {
  const sel = document.getElementById('usuario');
  sel.innerHTML = '<option value="">Selecione quem comprou</option>';
  const snap = await getDocs(collection(db, 'usuarios'));
  snap.forEach(d => sel.add(new Option(d.data().nome, d.id)));
}

async function carregarLancamentos() {
  const tabela = document.getElementById('tabela-lancamentos');
  tabela.innerHTML = '';
  const snap = await getDocs(query(collection(db, 'lancamentos'), orderBy('data','desc')));
  snap.forEach(doc => {
    const l = doc.data();
    const row = tabela.insertRow();
    row.innerHTML = `
      <td>${formatarData(l.data)}</td>
      <td>${l.tipo}</td>
      <td>${l.descricao}</td>
      <td>${l.categoria}</td>
      <td>${l.forma}</td>
      <td>${formatarMoeda(l.valor_total || l.valor_compra)}</td>
      <td>${l.parcela_atual || 1}/${l.total_parcelas || 1}</td>
      <td>
        <button onclick="editarLancamento('${doc.id}')" class="btn btn-warning btn-sm">Editar</button>
        <button onclick="excluirLancamento('${doc.id}')" class="btn btn-danger btn-sm">Excluir</button>
      </td>`;
  });
}

async function salvarLancamento() {
  const d = {
    tipo: document.getElementById('tipo').value,
    categoria: document.getElementById('categoria').value,
    forma: document.getElementById('forma').value,
    cartao_id: document.getElementById('cartao')?.value || '',
    tipo_pagamento: document.getElementById('tipo-pagamento').value,
    pagamento_no: document.getElementById('pagamento-no').value,
    prazo: parseInt(document.getElementById('prazo').value) || 1,
    data: document.getElementById('data').value,
    usuario_id: document.getElementById('usuario').value,
    valor_compra: parseFloat(document.getElementById('valor-compra').value),
    valor_total: parseFloat(document.getElementById('valor-total').value),
    descricao: document.getElementById('descricao').value
  };
  let userName = '';
  if (d.usuario_id) {
    const us = await getDocs(query(collection(db,'usuarios'),where('__name__','==',d.usuario_id)));
    us.forEach(u => userName = u.data().nome);
  }
  const compraId = `compra_${Date.now()}`;
  const proms = [];
  for (let i=1; i<=d.prazo; i++) {
    const dt = new Date(d.data);
    dt.setMonth(dt.getMonth() + (i-1));
    const ld = {
      ...d,
      data: dt.toISOString().split('T')[0],
      descricao: `${d.descricao} - Parcela ${i}/${d.prazo}`,
      parcela_atual: i,
      total_parcelas: d.prazo,
      id_compra: compraId,
      usuario_nome: userName
    };
    proms.push(
      editingId && i===1
        ? updateDoc(doc(db,'lancamentos',editingId), ld)
        : (!editingId && addDoc(collection(db,'lancamentos'), ld))
    );
  }
  await Promise.all(proms);
  document.getElementById('form-lancamento').reset();
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
  document.getElementById('grupo-tipo-pagamento').style.display = 'none';
  document.getElementById('grupo-pagamento-no').style.display = 'none';
  document.getElementById('grupo-prazo').style.display = 'none';
  editingId = null;
  carregarLancamentos();
}

async function editarLancamento(id) {
  editingId = id;
  document.getElementById('btn-cancelar').style.display = 'inline-block';
  const snap = await getDocs(query(collection(db,'lancamentos'),where('__name__','==',id)));
  snap.forEach(s => {
    const l = s.data();
    document.getElementById('tipo').value = l.tipo;
    carregarCategorias();
    document.getElementById('categoria').value = l.categoria;
    document.getElementById('forma').value = l.forma;
    mostrarCamposCondicionais();
    document.getElementById('cartao').value = l.cartao_id || '';
    document.getElementById('tipo-pagamento').value = l.tipo_pagamento || '';
    mostrarPagamentoNo();
    document.getElementById('pagamento-no').value = l.pagamento_no || '';
    document.getElementById('prazo').value = l.prazo || 1;
    document.getElementById('data').value = l.data;
    document.getElementById('usuario').value = l.usuario_id || '';
    document.getElementById('valor-compra').value = l.valor_compra;
    document.getElementById('valor-total').value = l.valor_total;
    document.getElementById('descricao').value = l.descricao.replace(/ - Parcela.*$/,'');
  });
}

async function excluirLancamento(id) {
  if (confirm('Excluir?')) {
    await deleteDoc(doc(db,'lancamentos',id));
    carregarLancamentos();
  }
}

function cancelarEdicao() {
  editingId = null;
  document.getElementById('form-lancamento').reset();
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
  document.getElementById('btn-cancelar').style.display = 'none';
  document.getElementById('grupo-tipo-pagamento').style.display = 'none';
  document.getElementById('grupo-pagamento-no').style.display = 'none';
  document.getElementById('grupo-prazo').style.display = 'none';
}

function formatarMoeda(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(v || 0);
}

function formatarData(d) {
  return new Date(d + 'T00:00:00')
    .toLocaleDateString('pt-BR');
}

// Globais
window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;
window.cancelarEdicao = cancelarEdicao;
