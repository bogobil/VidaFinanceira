import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let cartaoEditandoId = null;

document.addEventListener('DOMContentLoaded', function() {
  carregarCartoes();
  
  document.getElementById('form-cartao').addEventListener('submit', async function(e) {
    e.preventDefault();
    await salvarCartao();
  });
});

async function carregarCartoes() {
  try {
    const cartoesRef = collection(db, 'cartoes');
    const querySnapshot = await getDocs(cartoesRef);
    
    const container = document.getElementById('cartoes-container');
    container.innerHTML = '';
    
    querySnapshot.forEach(doc => {
      const cartao = doc.data();
      const cardDiv = document.createElement('div');
      cardDiv.className = 'card';
      cardDiv.innerHTML = `
        <div class="card-header">
          <h3 class="card-title">${cartao.nome}</h3>
        </div>
        <p><strong>Bandeira:</strong> ${cartao.bandeira}</p>
        <p><strong>Limite:</strong> ${formatarMoeda(cartao.limite)}</p>
        <p><strong>Utilizado:</strong> ${formatarMoeda(cartao.utilizado)}</p>
        <p><strong>Disponível:</strong> ${formatarMoeda(cartao.limite - cartao.utilizado)}</p>
        <p><strong>Vencimento:</strong> Dia ${cartao.vencimento}</p>
        <div class="acoes">
          <button class="btn btn-warning" onclick="editarCartao('${doc.id}')">Editar</button>
          <button class="btn btn-danger" onclick="excluirCartao('${doc.id}')">Excluir</button>
        </div>
      `;
      container.appendChild(cardDiv);
    });
  } catch (error) {
    console.error("Erro ao carregar cartões: ", error);
  }
}

async function salvarCartao() {
  const nome = document.getElementById('nome').value;
  const bandeira = document.getElementById('bandeira').value;
  const limite = parseFloat(document.getElementById('limite').value);
  const utilizado = parseFloat(document.getElementById('utilizado').value) || 0;
  const vencimento = document.getElementById('vencimento').value;
  
  if (!nome || !bandeira || !limite || !vencimento) {
    alert('Preencha todos os campos obrigatórios!');
    return;
  }
  
  const cartao = {
    nome,
    bandeira,
    limite,
    utilizado,
    vencimento
  };
  
  try {
    if (cartaoEditandoId) {
      await updateDoc(doc(db, 'cartoes', cartaoEditandoId), cartao);
      cartaoEditandoId = null;
      document.getElementById('form-cartao').reset();
    } else {
      await addDoc(collection(db, 'cartoes'), cartao);
      document.getElementById('form-cartao').reset();
    }
    
    carregarCartoes();
  } catch (error) {
    console.error("Erro ao salvar cartão: ", error);
    alert('Erro ao salvar cartão. Tente novamente.');
  }
}

async function editarCartao(id) {
  try {
    const docRef = doc(db, 'cartoes', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const cartao = docSnap.data();
      document.getElementById('nome').value = cartao.nome;
      document.getElementById('bandeira').value = cartao.bandeira;
      document.getElementById('limite').value = cartao.limite;
      document.getElementById('utilizado').value = cartao.utilizado;
      document.getElementById('vencimento').value = cartao.vencimento;
      
      cartaoEditandoId = id;
    }
  } catch (error) {
    console.error("Erro ao carregar cartão para edição: ", error);
  }
}

async function excluirCartao(id) {
  if (confirm('Tem certeza que deseja excluir este cartão?')) {
    try {
      await deleteDoc(doc(db, 'cartoes', id));
      carregarCartoes();
    } catch (error) {
      console.error("Erro ao excluir cartão: ", error);
      alert('Erro ao excluir cartão. Tente novamente.');
    }
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Tornar funções globais
window.editarCartao = editarCartao;
window.excluirCartao = excluirCartao;