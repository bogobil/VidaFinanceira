import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async function() {
  await carregarResumoFinanceiro();
  await carregarLancamentosRecentes();
});

async function carregarResumoFinanceiro() {
  try {
    const lancamentosRef = collection(db, 'lancamentos');
    const querySnapshot = await getDocs(lancamentosRef);
    
    let totalReceitas = 0;
    let totalDespesas = 0;
    
    querySnapshot.forEach(doc => {
      const lancamento = doc.data();
      if (lancamento.tipo === 'receita') {
        totalReceitas += lancamento.valor;
      } else {
        totalDespesas += lancamento.valor;
      }
    });
    
    document.getElementById('total-receitas').textContent = formatarMoeda(totalReceitas);
    document.getElementById('total-despesas').textContent = formatarMoeda(totalDespesas);
    document.getElementById('saldo').textContent = formatarMoeda(totalReceitas - totalDespesas);
  } catch (error) {
    console.error("Erro ao carregar resumo financeiro: ", error);
  }
}

async function carregarLancamentosRecentes() {
  try {
    const lancamentosRef = collection(db, 'lancamentos');
    const q = query(lancamentosRef, orderBy("data", "desc"), limit(5));
    const querySnapshot = await getDocs(q);
    
    const tabela = document.getElementById('tabela-lancamentos-recentes');
    tabela.innerHTML = '';
    
    querySnapshot.forEach(doc => {
      const lancamento = doc.data();
      const row = tabela.insertRow();
      row.innerHTML = `
        <td>${lancamento.descricao}</td>
        <td>${formatarMoeda(lancamento.valor)}</td>
        <td>${lancamento.tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
        <td>${formatarData(lancamento.data)}</td>
      `;
    });
  } catch (error) {
    console.error("Erro ao carregar lançamentos recentes: ", error);
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(dataString) {
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR');
}