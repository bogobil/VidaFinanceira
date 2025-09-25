import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let cartaoEditandoId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await carregarBancos();
  await carregarBandeiras();
  await carregarCartoes();
  document.getElementById('form-cartao').addEventListener('submit', salvarCartao);
});

async function carregarBancos() {
  const selectBanco = document.getElementById('banco');
  selectBanco.innerHTML = '<option value="">Selecione um banco</option>';
  const snapshot = await getDocs(collection(db, 'bancos'));
  snapshot.forEach(docSnap => {
    const { nome } = docSnap.data();
    const opt = document.createElement('option');
    opt.value = docSnap.id;
    opt.textContent = nome;
    selectBanco.appendChild(opt);
  });
}

async function carregarBandeiras() {
  const selectBandeira = document.getElementById('bandeira');
  selectBandeira.innerHTML = '<option value="">Selecione uma bandeira</option>';
  const snapshot = await getDocs(collection(db, 'bandeiras'));
  snapshot.forEach(docSnap => {
    const { nome } = docSnap.data();
    const opt = document.createElement('option');
    opt.value = docSnap.id;
    opt.textContent = nome;
    selectBandeira.appendChild(opt);
  });
}

async function carregarCartoes() {
  const tabela = document.getElementById('tabela-cartoes');
  tabela.innerHTML = '';
  const cartoesSnapshot = await getDocs(collection(db, 'cartoes'));

  for (const docCartao of cartoesSnapshot.docs) {
    const cartao = docCartao.data();
    const cartaoId = docCartao.id;

    const lancQuery = query(
      collection(db, 'lancamentos'),
      where('cartao_id', '==', cartaoId)
    );
    const lancSnapshot = await getDocs(lancQuery);
    let somaLanc = 0;
    lancSnapshot.forEach(l => somaLanc += l.data().valor);

    const restante = cartao.limite - somaLanc;

    const row = tabela.insertRow();
    row.innerHTML = `
      <td>${cartao.banco_nome || cartao.banco}</td>
      <td>${cartao.bandeira_nome || cartao.bandeira}</td>
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
  const bancoId = document.getElementById('banco').value;
  const bandeiraId = document.getElementById('bandeira').value;
  const limite = parseFloat(document.getElementById('limite').value);

  // Opcional: buscar nomes para armazenar no documento
  const bancoSnap = await getDocs(query(collection(db, 'bancos'), where('__name__','==',bancoId)));
  const bandeiraSnap = await getDocs(query(collection(db, 'bandeiras'), where('__name__','==',bandeiraId)));
  let bancoNome = '', bandeiraNome = '';
  bancoSnap.forEach(s => bancoNome = s.data().nome);
  bandeiraSnap.forEach(s => bandeiraNome = s.data().nome);

  const data = { nome, banco: bancoId, banco_nome: bancoNome, bandeira: bandeiraId, bandeira_nome: bandeiraNome, limite };

  if (cartaoEditandoId) {
    await updateDoc(doc(db, 'cartoes', cartaoEditandoId), data);
    cartaoEditandoId = null;
  } else {
    await addDoc(collection(db, 'cartoes'), data);
  }

  document.getElementById('form-cartao').reset();
  await carregarCartoes();
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

async function editarCartao(id) {
  cartaoEditandoId = id;
  const docSnap = await getDocs(query(collection(db, 'cartoes'), where('__name__','==',id)));
  docSnap.forEach(s => {
    const c = s.data();
    document.getElementById('nome').value = c.nome;
    document.getElementById('banco').value = c.banco;
    document.getElementById('bandeira').value = c.bandeira;
    document.getElementById('limite').value = c.limite;
  });
  document.getElementById('btn-cancelar').style.display = 'inline-block';
}

async function excluirCartao(id) {
  if (confirm('Deseja excluir este cartão?')) {
    await deleteDoc(doc(db, 'cartoes', id));
    await carregarCartoes();
  }
}

function cancelarEdicaoCartao() {
  cartaoEditandoId = null;
  document.getElementById('form-cartao').reset();
  document.getElementById('btn-cancelar').style.display = 'none';
}
