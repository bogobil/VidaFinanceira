import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
  carregarQuitacoes();
  
  document.getElementById('form-quitacao').addEventListener('submit', async function(e) {
    e.preventDefault();
    await salvarQuitacao();
  });
});

async function carregarQuitacoes() {
  try {
    const quitacoesRef = collection(db, 'quitacoes');
    const q = query(quitacoesRef, orderBy("data_vencimento", "asc"));
    const querySnapshot = await getDocs(q);
    
    const tabela = document.getElementById('tabela-quitacoes');
    tabela.innerHTML = '';
    
    querySnapshot.forEach(doc => {
      const quitacao = doc.data();
      const row = tabela.insertRow();
      row.innerHTML = `
        <td>${quitacao.descricao}</td>
        <td>${formatarMoeda(quitacao.valor)}</td>
        <td>${formatarData(quitacao.data_vencimento)}</td>
        <td>${quitacao.quitada ? 'Sim' : 'Não'}</td>
        <td>${quitacao.quitada ? formatarData(quitacao.data_quitacao) : '-'}</td>
        <td>
          ${!quitacao.quitada ? `<button class="btn btn-success" onclick="quitarDivida('${doc.id}')">Quitar</button>` : ''}
          <button class="btn btn-danger" onclick="excluirQuitacao('${doc.id}')">Excluir</button>
        </td>
      `;
    });
  } catch (error) {
    console.error("Erro ao carregar quitações: ", error);
  }
}

async function salvarQuitacao() {
  const descricao = document.getElementById('descricao').value;
  const valor = parseFloat(document.getElementById('valor').value);
  const dataVencimento = document.getElementById('data_vencimento').value;
  
  if (!descricao || !valor || !dataVencimento) {
    alert('Preencha todos os campos!');
    return;
  }
  
  const quitacao = {
    descricao,
    valor,
    data_vencimento: dataVencimento,
    quitada: false
  };
  
  try {
    await addDoc(collection(db, 'quitacoes'), quitacao);
    document.getElementById('form-quitacao').reset();
    carregarQuitacoes();
  } catch (error) {
    console.error("Erro ao salvar quitação: ", error);
    alert('Erro ao salvar quitação. Tente novamente.');
  }
}

async function quitarDivida(id) {
  try {
    await updateDoc(doc(db, 'quitacoes', id), {
      quitada: true,
      data_quitacao: new Date().toISOString()
    });
    carregarQuitacoes();
  } catch (error) {
    console.error("Erro ao quitar dívida: ", error);
    alert('Erro ao quitar dívida. Tente novamente.');
  }
}

async function excluirQuitacao(id) {
  if (confirm('Tem certeza que deseja excluir esta quitação?')) {
    try {
      await deleteDoc(doc(db, 'quitacoes', id));
      carregarQuitacoes();
    } catch (error) {
      console.error("Erro ao excluir quitação: ", error);
      alert('Erro ao excluir quitação. Tente novamente.');
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
window.quitarDivida = quitarDivida;
window.excluirQuitacao = excluirQuitacao;