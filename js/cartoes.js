import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let cartaoEditandoId = null;

// Ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
  await carregarBancos();
  await carregarBandeiras();
  await carregarCartoes();
  document.getElementById('form-cartao').addEventListener('submit', salvarCartao);
});

// Carregar bancos e bandeiras (mesma lógica atual)
async function carregarBancos() {
  // ... código existente para popular #banco select
}
async function carregarBandeiras() {
  // ... código existente para popular #bandeira select
}

async function carregarCartoes() {
  const tabela = document.getElementById('tabela-cartoes');
  tabela.innerHTML = '';

  // Buscar todos cartões
  const cartoesSnapshot = await getDocs(collection(db, 'cartoes'));

  for (const docCartao of cartoesSnapshot.docs) {
    const cartao = docCartao.data();
    const cartaoId = docCartao.id;
    // Calcular soma dos lançamentos relacionados ao cartão
    const lancQuery = query(
      collection(db, 'lancamentos'),
      where('cartao_id', '==', cartaoId)
    );
    const lancSnapshot = await getDocs(lancQuery);
    let somaLanc = 0;
    lancSnapshot.forEach(l => somaLanc += l.data().valor);

    const restante = cartao.limite - somaLanc;

    // Criar linha na tabela
    const row = tabela.insertRow();
    row.innerHTML = `
      <td>${cartao.banco}</td>
      <td>${cartao.bandeira}</td>
      <td>${cartao.nome}</td>
      <td>${formatarMoeda(cartao.limite)}</td>
      <td>${formatarMoeda(somaLanc)}</td>
      <td>${formatarMoeda(restante)}</td>
      <td>
        <button onclick="editarCartao('${cartaoId}')" class="btn btn-warning btn-editar">Editar</button>
        <button onclick="excluirCartao('${cartaoId}')" class="btn btn-danger btn-excluir">Excluir</button>
      </td>
    `;
  }
}

async function salvarCartao(e) {
  e.preventDefault();
  const nome = document.getElementById('nome').value;
  const banco = document.getElementById('banco').value;
  const bandeira = document.getElementById('bandeira').value;
  const limite = parseFloat(document.getElementById('limite').value);

  if (cartaoEditandoId) {
    await updateDoc(doc(db, 'cartoes', cartaoEditandoId), { nome, banco, bandeira, limite });
    cartaoEditandoId = null;
  } else {
    await addDoc(collection(db, 'cartoes'), { nome, banco, bandeira, limite });
  }

  document.getElementById('form-cartao').reset();
  await carregarCartoes();
}

function editarCartao(id) {
  cartaoEditandoId = id;
  // carregar dados no formulário para edição
}

async function excluirCartao(id) {
  if (confirm('Deseja excluir este cartão?')) {
    await deleteDoc(doc(db, 'cartoes', id));
    await carregarCartoes();
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function cancelarEdicaoCartao() {
  cartaoEditandoId = null;
  document.getElementById('form-cartao').reset();
}
