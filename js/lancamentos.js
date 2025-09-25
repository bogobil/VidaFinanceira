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
  carregarLancamentos();
  
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

  // Esconder todos os blocos condicionais
  document.getElementById('grupo-tipo-pagamento').style.display = 'none';
  document.getElementById('grupo-prazo').style.display = 'none';
  document.getElementById('pagamento-no').parentElement.style.display = 'none';

  if (forma === 'cartao') {
    // Exibe bloco de Tipo de Pagamento e Cartão
    document.getElementById('grupo-tipo-pagamento').style.display = 'block';
    document.getElementById('pagamento-no').parentElement.style.display = 'block';

    // Carregar lista de cartões cadastrados
    const sel = document.getElementById('pagamento-no');
    sel.innerHTML = '<option value="">Selecione seu cartão</option>';
    getDocs(collection(db, 'cartoes')).then(snapshot => {
      snapshot.forEach(doc => {
        const c = doc.data();
        sel.append(new Option(`${c.nome} (${c.bandeira_nome||c.bandeira})`, doc.id));
      });
    });
  } 
  else if (forma === 'pix' || forma === 'transferencia' || forma === 'boleto') {
    document.getElementById('grupo-tipo-pagamento').style.display = 'block';
  } 
  else {
    document.getElementById('grupo-tipo-pagamento').style.display = 'none';
    document.getElementById('prazo').value = '1';
    calcularValorTotal();
  }
}

function mostrarPagamentoNo() {
  const tipoPagamento = document.getElementById('tipo-pagamento').value;
  const groupPrazo = document.getElementById('grupo-prazo');

  if (tipoPagamento === 'credito') {
    groupPrazo.style.display = 'block';
  } else {
    groupPrazo.style.display = 'none';
    document.getElementById('prazo').value = '1';
    calcularValorTotal();
  }
}

function mostrarPrazo() {
  // o controle de prazo já é feito em mostrarPagamentoNo
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

  cats.forEach(c => sel.add(new Option(c, c)));
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
  snap.forEach(docSnap => {
    const l = docSnap.data();
    const row = tabela.insertRow();
    row.innerHTML = `
      <td>${formatarData(l.data)}</td>
      <td>${l.tipo}</td>
      <td>${l.descricao}</td>
      <td>${l.categoria}</td>
      <td>${l.forma}</td>
      <td>${formatarMoeda(l.valor_total||l.valor_compra)}</td>
      <td>${l.parcela_atual||1}/${l.total_parcelas||1}</td>
      <td>
        <button onclick="editarLancamento('${docSnap.id}')" class="btn btn-warning btn-sm">Editar</button>
        <button onclick="excluirLancamento('${docSnap.id}')" class="btn btn-danger btn-sm">Excluir</button>
      </td>`;
  });
}

async function salvarLancamento() {
  const dados = {
    tipo: document.getElementById('tipo').value,
    categoria: document.getElementById('categoria').value,
    forma: document.getElementById('forma').value,
    tipo_pagamento: document.getElementById('tipo-pagamento').value,
    pagamento_no: document.getElementById('pagamento-no').value,
    prazo: parseInt(document.getElementById('prazo').value) || 1,
    data: document.getElementById('data').value,
    usuario_id: document.getElementById('usuario').value,
    valor_compra: parseFloat(document.getElementById('valor-compra').value),
    valor_total: parseFloat(document.getElementById('valor-total').value),
    descricao: document.getElementById('descricao').value
  };

  let nomeUsr = '';
  if (dados.usuario_id) {
    const us = await getDocs(query(collection(db, 'usuarios'), where('__name__','==',dados.usuario_id)));
    us.forEach(u => nomeUsr = u.data().nome);
  }

  const compraId = `compra_${Date.now()}`;
  const proms = [];
  for (let i = 1; i <= dados.prazo; i++) {
    const dt = new Date(dados.data);
    dt.setMonth(dt.getMonth() + i - 1);
    const obj = {
      ...dados,
      data: dt.toISOString().split('T')[0],
      descricao: `${dados.descricao} - Parcela ${i}/${dados.prazo}`,
      parcela_atual: i,
      total_parcelas: dados.prazo,
      id_compra: compraId,
      usuario_nome: nomeUsr
    };
    proms.push(
      editingId && i===1
        ? updateDoc(doc(db,'lancamentos',editingId), obj)
        : (!editingId && addDoc(collection(db,'lancamentos'), obj))
    );
  }

  await Promise.all(proms);
  document.getElementById('form-lancamento').reset();
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
  document.getElementById('grupo-tipo-pagamento').style.display = 'none';
  document.getElementById('grupo-prazo').style.display = 'none';
  document.getElementById('pagamento-no').parentElement.style.display = 'none';
  
  editingId = null;
  carregarLancamentos();
}

async function editarLancamento(id) {
  editingId = id;
  document.getElementById('btn-cancelar').style.display = 'inline-block';
  const snap = await getDocs(query(collection(db,'lancamentos'), where('__name__','==', id)));
  snap.forEach(s => {
    const l = s.data();
    document.getElementById('tipo').value = l.tipo; carregarCategorias();
    document.getElementById('categoria').value = l.categoria;
    document.getElementById('forma').value = l.forma; mostrarCamposCondicionais();
    document.getElementById('tipo-pagamento').value = l.tipo_pagamento||'';
    mostrarPagamentoNo();
    document.getElementById('pagamento-no').value = l.pagamento_no||'';
    document.getElementById('prazo').value = l.prazo||1;
    document.getElementById('data').value = l.data;
    document.getElementById('usuario').value = l.usuario_id||'';
    document.getElementById('valor-compra').value = l.valor_compra;
    document.getElementById('valor-total').value = l.valor_total;
    document.getElementById('descricao').value = l.descricao;
  });
}

async function excluirLancamento(id) {
  if (confirm('Excluir este lançamento?')) {
    await deleteDoc(doc(db,'lancamentos',id));
    carregarLancamentos();
  }
}

function cancelarEdicao() {
  editingId = null;
  document.getElementById('form-lancamento').reset();
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
  document.getElementById('grupo-tipo-pagamento').style.display = 'none';
  document.getElementById('grupo-prazo').style.display = 'none';
  document.getElementById('pagamento-no').parentElement.style.display = 'none';
}

function formatarMoeda(v) {
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
}

function formatarData(d) {
  return new Date(d+'T00:00:00').toLocaleDateString('pt-BR');
}

window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;
window.cancelarEdicao = cancelarEdicao;
