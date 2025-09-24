import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let lancamentoEditandoId = null;

document.addEventListener('DOMContentLoaded', function() {
  carregarLancamentos();
  
  document.getElementById('form-lancamento').addEventListener('submit', async function(e) {
    e.preventDefault();
    await salvarLancamento();
  });
});

async function carregarLancamentos() {
  try {
    const lancamentosRef = collection(db, 'lancamentos');
    const q = query(lancamentosRef, orderBy("data", "desc"));
    const querySnapshot = await getDocs(q);
    
    const tabela = document.getElementById('tabela-lancamentos');
    tabela.innerHTML = '';
    
    querySnapshot.forEach(doc => {
      const lancamento = doc.data();
      const row = tabela.insertRow();
      row.innerHTML = `
        <td>${lancamento.descricao}</td>
        <td>${formatarMoeda(lancamento.valor)}</td>
        <td>${lancamento.tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
        <td>${formatarData(lancamento.data)}</td>
        <td>${lancamento.categoria}</td>
        <td>
          <button class="btn btn-warning" onclick="editarLancamento('${doc.id}')">Editar</button>
          <button class="btn btn-danger" onclick="excluirLancamento('${doc.id}')">Excluir</button>
        </td>
      `;
    });
  } catch (error) {
    console.error("Erro ao carregar lançamentos: ", error);
  }
}

async function salvarLancamento() {
  const descricao = document.getElementById('descricao').value;
  const valor = parseFloat(document.getElementById('valor').value);
  const tipo = document.getElementById('tipo').value;
  const data = document.getElementById('data').value;
  const categoria = document.getElementById('categoria').value;
  
  if (!descricao || !valor || !data || !categoria) {
    alert('Preencha todos os campos obrigatórios!');
    return;
  }
  
  const lancamento = {
    descricao,
    valor,
    tipo,
    data,
    categoria
  };
  
  try {
    if (lancamentoEditandoId) {
      await updateDoc(doc(db, 'lancamentos', lancamentoEditandoId), lancamento);
      lancamentoEditandoId = null;
      document.getElementById('btn-salvar').textContent = 'Salvar';
    } else {
      await addDoc(collection(db, 'lancamentos'), lancamento);
    }
    
    document.getElementById('form-lancamento').reset();
    carregarLancamentos();
  } catch (error) {
    console.error("Erro ao salvar lançamento: ", error);
    alert('Erro ao salvar lançamento. Tente novamente.');
  }
}

async function editarLancamento(id) {
  try {
    const docRef = doc(db, 'lancamentos', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const lancamento = docSnap.data();
      document.getElementById('descricao').value = lancamento.descricao;
      document.getElementById('valor').value = lancamento.valor;
      document.getElementById('tipo').value = lancamento.tipo;
      document.getElementById('data').value = lancamento.data;
      document.getElementById('categoria').value = lancamento.categoria;
      
      lancamentoEditandoId = id;
      document.getElementById('btn-salvar').textContent = 'Atualizar';
    }
  } catch (error) {
    console.error("Erro ao carregar lançamento para edição: ", error);
  }
}

async function excluirLancamento(id) {
  if (confirm('Tem certeza que deseja excluir este lançamento?')) {
    try {
      await deleteDoc(doc(db, 'lancamentos', id));
      carregarLancamentos();
    } catch (error) {
      console.error("Erro ao excluir lançamento: ", error);
      alert('Erro ao excluir lançamento. Tente novamente.');
    }
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(dataString) {
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR');
}

// Tornar funções globais
window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;