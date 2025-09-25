Tipo, categoria, Forma de Pagtº (Pix, Dinheiro, Transferência, Cartão e Boleto (se cartão ou Pix, segue para informar qual o tipo (à vista, débito, crédito e QrCode), sendo tipo crédito escolhido abre opção para escolher o Prazo, se for outra escolha diferente de Crédito deixar "à vista" como padrão), Data (Padrão a data de hoje, porém podendo ser alterado), Quem comprou, valor da compra, mudar o nome de "Tipo de Cartão" para "Pagamento no" (Débito, Crédito) e Valor Total (é resultado da divisão do "Valor da Compra"/"Prazo"


import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
  query, orderBy, where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Configurar data padrão para hoje
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('data').value = hoje;
  
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
  const grupoTipo = document.getElementById('grupo-tipo-pagamento');
  
  // Resetar campos
  document.getElementById('grupo-pagamento-no').style.display = 'none';
  document.getElementById('grupo-prazo').style.display = 'none';
  
  if (forma === 'pix' || forma === 'cartao') {
    grupoTipo.style.display = 'block';
  } else {
    grupoTipo.style.display = 'none';
    // Para outras formas, definir como "à vista" por padrão
    document.getElementById('prazo').value = '1';
    calcularValorTotal();
  }
}

function mostrarPagamentoNo() {
  const tipoPagamento = document.getElementById('tipo-pagamento').value;
  const grupoPagamentoNo = document.getElementById('grupo-pagamento-no');
  
  if (tipoPagamento === 'debito' || tipoPagamento === 'credito') {
    grupoPagamentoNo.style.display = 'block';
    document.getElementById('pagamento-no').value = tipoPagamento;
    
    if (tipoPagamento === 'credito') {
      mostrarPrazo();
    } else {
      document.getElementById('grupo-prazo').style.display = 'none';
      document.getElementById('prazo').value = '1';
      calcularValorTotal();
    }
  } else {
    grupoPagamentoNo.style.display = 'none';
    document.getElementById('grupo-prazo').style.display = 'none';
    document.getElementById('prazo').value = '1';
    calcularValorTotal();
  }
}

function mostrarPrazo() {
  const pagamentoNo = document.getElementById('pagamento-no').value;
  const grupoPrazo = document.getElementById('grupo-prazo');
  
  if (pagamentoNo === 'credito') {
    grupoPrazo.style.display = 'block';
  } else {
    grupoPrazo.style.display = 'none';
    document.getElementById('prazo').value = '1';
    calcularValorTotal();
  }
}

function calcularValorTotal() {
  const valorCompra = parseFloat(document.getElementById('valor-compra').value) || 0;
  const prazo = parseInt(document.getElementById('prazo').value) || 1;
  
  const valorTotal = valorCompra / prazo;
  document.getElementById('valor-total').value = valorTotal.toFixed(2);
}

function carregarCategorias() {
  const tipo = document.getElementById('tipo').value;
  const select = document.getElementById('categoria');
  select.innerHTML = '<option value="">Selecione uma categoria</option>';
  
  const categorias = {
    receita: ['Salário', 'Freelance', 'Vendas', 'Investimentos', 'Aluguel', 'Outras Receitas'],
    despesa: [
      'Aluguel/Financiamento', 'Condomínio', 'Energia Elétrica', 'Água', 'Internet', 'Telefone',
      'Supermercado', 'Restaurante', 'Lanche', 'Delivery',
      'Combustível', 'Transporte Público', 'Uber/Taxi', 'Manutenção Veículo',
      'Plano de Saúde', 'Medicamentos', 'Consultas', 'Exames',
      'Escola/Universidade', 'Cursos', 'Livros', 'Material Escolar',
      'Cinema', 'Streaming', 'Games', 'Viagens', 'Academia', 'Hobbies',
      'Roupas', 'Calçados', 'Acessórios', 'Cabeleireiro', 'Produtos de Higiene',
      'Eletrônicos', 'Software', 'Presentes', 'Impostos', 'Seguros', 'Diversos'
    ]
  };
  
  const lista = categorias[tipo] || [];
  lista.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

async function carregarUsuarios() {
  try {
    const select = document.getElementById('usuario');
    select.innerHTML = '<option value="">Selecione quem comprou</option>';
    
    const snapshot = await getDocs(collection(db, 'usuarios'));
    snapshot.forEach(doc => {
      const usuario = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = usuario.nome;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
  }
}

async function carregarLancamentos() {
  try {
    const tabela = document.getElementById('tabela-lancamentos');
    tabela.innerHTML = '';
    
    const q = query(collection(db, 'lancamentos'), orderBy('data', 'desc'));
    const snapshot = await getDocs(q);
    
    snapshot.forEach(doc => {
      const lancamento = doc.data();
      const row = tabela.insertRow();
      
      row.innerHTML = `
        <td>${formatarData(lancamento.data)}</td>
        <td><span class="badge ${lancamento.tipo}">${lancamento.tipo}</span></td>
        <td>${lancamento.descricao}</td>
        <td>${lancamento.categoria}</td>
        <td>${lancamento.forma || 'N/A'}</td>
        <td>${formatarMoeda(lancamento.valor_total || lancamento.valor)}</td>
        <td>${lancamento.parcela_atual || 1}/${lancamento.total_parcelas || 1}</td>
        <td>
          <button onclick="editarLancamento('${doc.id}')" class="btn btn-warning btn-sm">Editar</button>
          <button onclick="excluirLancamento('${doc.id}')" class="btn btn-danger btn-sm">Excluir</button>
        </td>
      `;
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
      valor_compra: parseFloat(document.getElementById('valor-compra').value),
      valor_total: parseFloat(document.getElementById('valor-total').value),
      descricao: document.getElementById('descricao').value
    };
    
    // Buscar nome do usuário
    if (dados.usuario_id) {
      const usuarioSnapshot = await getDocs(query(collection(db, 'usuarios'), where('__name__', '==', dados.usuario_id)));
      usuarioSnapshot.forEach(doc => {
        dados.usuario_nome = doc.data().nome;
      });
    }
    
    // Gerar ID da compra
    const idCompra = `compra_${Date.now()}`;
    
    // Criar lançamentos baseado no prazo
    const promises = [];
    for (let i = 1; i <= dados.prazo; i++) {
      const dataVencimento = new Date(dados.data);
      dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));
      
      const lancamento = {
        ...dados,
        data: dataVencimento.toISOString().split('T')[0],
        descricao: `${dados.descricao} - Parcela ${i}/${dados.prazo}`,
        valor: dados.valor_total,
        parcela_atual: i,
        total_parcelas: dados.prazo,
        id_compra: idCompra
      };
      
      if (editingId && i === 1) {
        promises.push(updateDoc(doc(db, 'lancamentos', editingId), lancamento));
      } else if (!editingId) {
        promises.push(addDoc(collection(db, 'lancamentos'), lancamento));
      }
    }
    
    await Promise.all(promises);
    
    // Limpar formulário
    document.getElementById('form-lancamento').reset();
    document.getElementById('data').value = new Date().toISOString().split('T')[0];
    document.getElementById('grupo-tipo-pagamento').style.display = 'none';
    document.getElementById('grupo-pagamento-no').style.display = 'none';
    document.getElementById('grupo-prazo').style.display = 'none';
    
    editingId = null;
    document.getElementById('btn-cancelar').style.display = 'none';
    
    carregarLancamentos();
    alert('Lançamento salvo com sucesso!');
    
  } catch (error) {
    console.error('Erro ao salvar lançamento:', error);
    alert('Erro ao salvar lançamento: ' + error.message);
  }
}

async function editarLancamento(id) {
  // Implementar lógica de edição
  editingId = id;
  document.getElementById('btn-cancelar').style.display = 'inline-block';
  // ... resto da lógica de edição
}

async function excluirLancamento(id) {
  if (confirm('Tem certeza que deseja excluir este lançamento?')) {
    try {
      await deleteDoc(doc(db, 'lancamentos', id));
      carregarLancamentos();
      alert('Lançamento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      alert('Erro ao excluir lançamento: ' + error.message);
    }
  }
}

function cancelarEdicao() {
  editingId = null;
  document.getElementById('form-lancamento').reset();
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
  document.getElementById('btn-cancelar').style.display = 'none';
  
  // Ocultar campos condicionais
  document.getElementById('grupo-tipo-pagamento').style.display = 'none';
  document.getElementById('grupo-pagamento-no').style.display = 'none';
  document.getElementById('grupo-prazo').style.display = 'none';
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor || 0);
}

function formatarData(data) {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}

// Tornar funções globais
window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;
window.cancelarEdicao = cancelarEdicao;
