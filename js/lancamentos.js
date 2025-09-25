import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
  query, orderBy, where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
  
  await carregarUsuarios();
  carregarLancamentos();
  
  document.getElementById('tipo').addEventListener('change', carregarCategorias);
  document.getElementById('forma').addEventListener('change', mostrarCamposCondicionais);
  document.getElementById('tipo-pagamento').addEventListener('change', mostrarPagamentoNo);
  document.getElementById('pagamento-no').addEventListener('change', mostrarPrazo);
  document.getElementById('valor-compra').addEventListener('input', calcularValorTotal);
  document.getElementById('prazo').addEventListener('change', calcularValorTotal);
  
  document.getElementById('form-lancamento').addEventListener('submit', async e => {
    e.preventDefault();
    await salvarLancamento();
  });
});

async function mostrarCamposCondicionais() {
  const forma = document.getElementById('forma').value;
  
  document.getElementById('grupo-tipo-pagamento').style.display = 'none';
  document.getElementById('grupo-pagamento-no').style.display = 'none';
  document.getElementById('grupo-prazo').style.display = 'none';

  if (forma === 'cartao') {
    document.getElementById('grupo-tipo-pagamento').style.display = 'block';
    document.getElementById('grupo-pagamento-no').style.display = 'block';
    
    // Carregar cartões no select pagamento-no
    const selCartao = document.getElementById('pagamento-no');
    selCartao.innerHTML = '<option value="">Selecione seu cartão</option>';
    
    try {
      const snapshot = await getDocs(collection(db, 'cartoes'));
      snapshot.forEach(doc => {
        const c = doc.data();
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = `${c.banco_nome} (${c.bandeira_nome || c.bandeira})`;
        selCartao.appendChild(opt);
      });
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    }
  } 
  else if (forma === 'pix' || forma === 'transferencia' || forma === 'boleto') {
    document.getElementById('grupo-tipo-pagamento').style.display = 'block';
  }
}

function mostrarPagamentoNo() {
  const tipoPagamento = document.getElementById('tipo-pagamento').value;
  
  if (tipoPagamento === 'credito') {
    document.getElementById('grupo-prazo').style.display = 'block';
  } else {
    document.getElementById('grupo-prazo').style.display = 'none';
    document.getElementById('prazo').value = '1';
    calcularValorTotal();
  }
}

function mostrarPrazo() {
  // Já controlado em mostrarPagamentoNo
}

function calcularValorTotal() {
  const valorCompra = parseFloat(document.getElementById('valor-compra').value) || 0;
  const prazo = parseInt(document.getElementById('prazo').value) || 1;
  document.getElementById('valor-total').value = (valorCompra / prazo).toFixed(2);
}

function carregarCategorias() {
  const tipo = document.getElementById('tipo').value;
  const select = document.getElementById('categoria');
  select.innerHTML = '<option value="">Selecione uma categoria</option>';
  
  const categorias = {
    receita: ['Salário','Freelance','Vendas','Investimentos','Aluguel','Outras Receitas'],
    despesa: ['Supermercado','Transporte','Saúde','Educação','Lazer','Diversos']
  }[tipo] || [];
  
  categorias.forEach(c => select.add(new Option(c, c)));
}

async function carregarUsuarios() {
  const select = document.getElementById('usuario');
  select.innerHTML = '<option value="">Selecione quem comprou</option>';
  
  try {
    const snapshot = await getDocs(collection(db, 'usuarios'));
    snapshot.forEach(doc => {
      select.add(new Option(doc.data().nome, doc.id));
    });
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
  }
}

async function carregarLancamentos() {
  const tabela = document.getElementById('tabela-lancamentos');
  tabela.innerHTML = '';
  
  try {
    const snapshot = await getDocs(query(collection(db, 'lancamentos'), orderBy('data','desc')));
    snapshot.forEach(docSnap => {
      const l = docSnap.data();
      const row = tabela.insertRow();
      row.innerHTML = `
        <td>${formatarData(l.data)}</td>
        <td>${l.tipo}</td>
        <td>${l.descricao}</td>
        <td>${l.categoria}</td>
        <td>${l.forma}</td>
        <td>${formatarMoeda(l.valor_total || l.valor)}</td>
        <td>${l.parcela_atual || 1}/${l.total_parcelas || 1}</td>
        <td>
          <button onclick="editarLancamento('${docSnap.id}')" class="btn btn-warning btn-sm">Editar</button>
          <button onclick="excluirLancamento('${docSnap.id}')" class="btn btn-danger btn-sm">Excluir</button>
        </td>`;
    });
  } catch (error) {
    console.error('Erro ao carregar lançamentos:', error);
  }
}

async function salvarLancamento() {
  try {
    const dados = {
      tipo: document.getElementById('tipo').value,
      categoria: document.getElementById('categoria').value,
      forma: document.getElementById('forma').value,
      tipo_pagamento: document.getElementById('tipo-pagamento').value,
      pagamento_no: document.getElementById('pagamento-no').value,
      prazo: parseInt(document.getElementById('prazo').value) || 1,
      data: document.getElementById('data').value,
      usuario_id: document.getElementById('usuario').value,
      valor: parseFloat(document.getElementById('valor-compra').value),
      valor_total: parseFloat(document.getElementById('valor-total').value),
      descricao: document.getElementById('descricao').value
    };

    let nomeUsr = '';
    if (dados.usuario_id) {
      const us = await getDocs(query(collection(db,'usuarios'),where('__name__','==',dados.usuario_id)));
      us.forEach(u => nomeUsr = u.data().nome);
    }

    const compraId = `compra_${Date.now()}`;
    const promises = [];
    
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
      
      promises.push(
        editingId && i === 1
          ? updateDoc(doc(db,'lancamentos', editingId), obj)
          : (!editingId && addDoc(collection(db,'lancamentos'), obj))
      );
    }

    await Promise.all(promises);
    
    document.getElementById('form-lancamento').reset();
    document.getElementById('data').value = new Date().toISOString().split('T')[0];
    document.getElementById('grupo-tipo-pagamento').style.display = 'none';
    document.getElementById('grupo-pagamento-no').style.display = 'none';
    document.getElementById('grupo-prazo').style.display = 'none';
    
    editingId = null;
    carregarLancamentos();
    alert('Lançamento salvo com sucesso!');
    
  } catch (error) {
    console.error('Erro ao salvar lançamento:', error);
    alert('Erro ao salvar: ' + error.message);
  }
}

async function editarLancamento(id) {
  editingId = id;
  document.getElementById('btn-cancelar').style.display = 'inline-block';
  
  try {
    const snap = await getDocs(query(collection(db,'lancamentos'),where('__name__','==',id)));
    snap.forEach(s => {
      const l = s.data();
      document.getElementById('tipo').value = l.tipo; 
      carregarCategorias();
      document.getElementById('categoria').value = l.categoria;
      document.getElementById('forma').value = l.forma; 
      mostrarCamposCondicionais();
      document.getElementById('tipo-pagamento').value = l.tipo_pagamento||'';
      mostrarPagamentoNo();
      document.getElementById('pagamento-no').value = l.pagamento_no||'';
      document.getElementById('prazo').value = l.prazo||1;
      document.getElementById('data').value = l.data;
      document.getElementById('usuario').value = l.usuario_id||'';
      document.getElementById('valor-compra').value = l.valor;
      document.getElementById('valor-total').value = l.valor_total;
      document.getElementById('descricao').value = l.descricao.replace(/ - Parcela.*$/,'');
    });
  } catch (error) {
    console.error('Erro ao editar:', error);
  }
}

async function excluirLancamento(id) {
  if (confirm('Excluir este lançamento?')) {
    try {
      await deleteDoc(doc(db,'lancamentos', id));
      carregarLancamentos();
      alert('Lançamento excluído!');
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
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
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
}

function formatarData(d) {
  return new Date(d+'T00:00:00').toLocaleDateString('pt-BR');
}

window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;
window.cancelarEdicao = cancelarEdicao;
