import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
  await carregarDadosDashboard();
  await carregarTransacoesRecentes();
});

async function carregarDadosDashboard() {
  try {
    // Calcular saldo total (receitas - despesas)
    const lancamentosSnapshot = await getDocs(collection(db, 'lancamentos'));
    let totalReceitas = 0;
    let totalDespesas = 0;
    let receitasMes = 0;
    let despesasMes = 0;
    
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    
    lancamentosSnapshot.forEach(doc => {
      const lancamento = doc.data();
      const valor = parseFloat(lancamento.valor) || 0;
      const dataLancamento = new Date(lancamento.data);
      
      if (lancamento.tipo === 'receita') {
        totalReceitas += valor;
        if (dataLancamento.getMonth() === mesAtual && dataLancamento.getFullYear() === anoAtual) {
          receitasMes += valor;
        }
      } else if (lancamento.tipo === 'despesa') {
        totalDespesas += valor;
        if (dataLancamento.getMonth() === mesAtual && dataLancamento.getFullYear() === anoAtual) {
          despesasMes += valor;
        }
      }
    });
    
    const saldoTotal = totalReceitas - totalDespesas;
    
    // Calcular limite disponível dos cartões
    const cartoesSnapshot = await getDocs(collection(db, 'cartoes'));
    let limiteTotal = 0;
    let limiteUsado = 0;
    
    for (const docCartao of cartoesSnapshot.docs) {
      const cartao = docCartao.data();
      const cartaoId = docCartao.id;
      
      // Somar limite do cartão
      limiteTotal += parseFloat(cartao.limite) || 0;
      
      // Calcular quanto foi usado neste cartão
      const lancamentosCartaoQuery = query(
        collection(db, 'lancamentos'),
        where('cartao_id', '==', cartaoId)
      );
      const lancamentosCartaoSnapshot = await getDocs(lancamentosCartaoQuery);
      
      lancamentosCartaoSnapshot.forEach(lancDoc => {
        limiteUsado += parseFloat(lancDoc.data().valor) || 0;
      });
    }
    
    const limiteDisponivel = limiteTotal - limiteUsado;
    
    // Atualizar valores na interface
    document.getElementById('saldo-total').textContent = formatarMoeda(saldoTotal);
    document.getElementById('receitas-mes').textContent = formatarMoeda(receitasMes);
    document.getElementById('despesas-mes').textContent = formatarMoeda(despesasMes);
    document.getElementById('limite-disponivel').textContent = formatarMoeda(limiteDisponivel);
    
    // Adicionar classes de cor baseado nos valores
    const saldoElement = document.getElementById('saldo-total');
    saldoElement.className = saldoTotal >= 0 ? 'card-value positive' : 'card-value negative';
    
  } catch (error) {
    console.error('Erro ao carregar dados do dashboard:', error);
  }
}

async function carregarTransacoesRecentes() {
  try {
    const transacoesContainer = document.getElementById('transacoes-recentes');
    
    // Buscar as 5 transações mais recentes
    const lancamentosQuery = query(
      collection(db, 'lancamentos'),
      orderBy('data', 'desc'),
      limit(5)
    );
    
    const lancamentosSnapshot = await getDocs(lancamentosQuery);
    
    if (lancamentosSnapshot.empty) {
      transacoesContainer.innerHTML = `
        <div class="empty-state">
          <p>📋 Nenhuma transação encontrada</p>
          <small>Adicione seu primeiro lançamento para começar!</small>
        </div>
      `;
      return;
    }
    
    let transacoesHtml = '';
    
    lancamentosSnapshot.forEach(doc => {
      const lancamento = doc.data();
      const valor = parseFloat(lancamento.valor) || 0;
      const tipoIcon = lancamento.tipo === 'receita' ? '📈' : '📉';
      const tipoClass = lancamento.tipo === 'receita' ? 'positive' : 'negative';
      const dataFormatada = formatarData(lancamento.data);
      
      transacoesHtml += `
        <div class="transaction-item">
          <div class="transaction-info">
            <div class="transaction-header">
              <span class="transaction-icon">${tipoIcon}</span>
              <span class="transaction-description">${lancamento.descricao}</span>
            </div>
            <div class="transaction-details">
              <small>${lancamento.categoria} • ${dataFormatada}</small>
            </div>
          </div>
          <div class="transaction-value ${tipoClass}">
            ${lancamento.tipo === 'receita' ? '+' : '-'}${formatarMoeda(Math.abs(valor))}
          </div>
        </div>
      `;
    });
    
    transacoesContainer.innerHTML = transacoesHtml;
    
  } catch (error) {
    console.error('Erro ao carregar transações recentes:', error);
    document.getElementById('transacoes-recentes').innerHTML = `
      <div class="empty-state">
        <p>❌ Erro ao carregar transações</p>
      </div>
    `;
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

function formatarData(data) {
  const dataObj = new Date(data + 'T00:00:00');
  return dataObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

// Adicionar estilos para as transações recentes
const transactionStyles = `
  .transaction-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border-light);
    transition: all 0.2s ease;
  }
  
  .transaction-item:hover {
    background-color: rgba(99, 102, 241, 0.05);
    border-radius: 0.5rem;
  }
  
  .transaction-item:last-child {
    border-bottom: none;
  }
  
  .transaction-info {
    flex: 1;
  }
  
  .transaction-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  
  .transaction-icon {
    font-size: 1.2rem;
  }
  
  .transaction-description {
    font-weight: 600;
    font-size: 0.95rem;
  }
  
  .transaction-details {
    color: var(--text-secondary-light);
    font-size: 0.8rem;
  }
  
  .transaction-value {
    font-weight: 700;
    font-size: 1rem;
  }
  
  .transaction-value.positive {
    color: var(--success-color);
  }
  
  .transaction-value.negative {
    color: var(--error-color);
  }
  
  .card-value.positive {
    color: var(--success-color);
  }
  
  .card-value.negative {
    color: var(--error-color);
  }
  
  body.dark-theme .transaction-details {
    color: var(--text-secondary-dark);
  }
  
  body.dark-theme .transaction-item:hover {
    background-color: rgba(99, 102, 241, 0.1);
  }
  
  body.dark-theme .transaction-item {
    border-bottom-color: var(--border-dark);
  }
`;

// Adicionar estilos ao head
const styleSheet = document.createElement('style');
styleSheet.textContent = transactionStyles;
document.head.appendChild(styleSheet);
