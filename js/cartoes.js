import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let cartaoEditandoId = null;

document.addEventListener('DOMContentLoaded', function() {
  carregarCartoes();
  carregarUsuarios();
  carregarBancos();
  carregarBandeiras();
  
  document.getElementById('form-cartao').addEventListener('submit', async function(e) {
    e.preventDefault();
    await salvarCartao();
  });
  
  // Mostrar/ocultar campo de utilizador quando checkbox é alterado
  document.getElementById('emprestado').addEventListener('change', function() {
    const grupoUtilizador = document.getElementById('grupo_utilizador');
    if (this.checked) {
      grupoUtilizador.style.display = 'block';
      document.getElementById('utilizador').required = true;
    } else {
      grupoUtilizador.style.display = 'none';
      document.getElementById('utilizador').required = false;
      document.getElementById('utilizador').value = '';
    }
  });
});

async function carregarUsuarios() {
  try {
    const usuariosRef = collection(db, 'usuarios');
    const querySnapshot = await getDocs(usuariosRef);
    
    const select = document.getElementById('utilizador');
    select.innerHTML = '<option value="">Selecione um utilizador</option>';
    
    querySnapshot.forEach(doc => {
      const usuario = doc.data();
      if (usuario.ativo) {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = usuario.nome;
        select.appendChild(option);
      }
    });
  } catch (error) {
    console.error("Erro ao carregar usuários: ", error);
  }
}

async function carregarBancos() {
  try {
    const bancosRef = collection(db, 'bancos');
    const querySnapshot = await getDocs(bancosRef);
    
    const select = document.getElementById('banco');
    select.innerHTML = '<option value="">Selecione um banco</option>';
    
    querySnapshot.forEach(doc => {
      const banco = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = banco.nome;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar bancos: ", error);
  }
}

async function carregarBandeiras() {
  try {
    const bandeirasRef = collection(db, 'bandeiras');
    const querySnapshot = await getDocs(bandeirasRef);
    
    const select = document.getElementById('bandeira');
    select.innerHTML = '<option value="">Selecione uma bandeira</option>';
    
    querySnapshot.forEach(doc => {
      const bandeira = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = bandeira.nome;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar bandeiras: ", error);
  }
}

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
      
      // Obter nome do utilizador se o cartão estiver emprestado
      let utilizadorNome = 'Nenhum';
      if (cartao.emprestado && cartao.utilizador) {
        utilizadorNome = cartao.utilizadorNome || 'Utilizador não encontrado';
      }
      
      cardDiv.innerHTML = `
        <div class="card-header">
          <h3 class="card-title">${cartao.nome}</h3>
        </div>
        <div class="cartao-info">
          <p><strong>Últimos 4 Dígitos:</strong> **** ${cartao.ultimos_digitos}</p>
          <p><strong>Banco:</strong> ${cartao.bancoNome || 'Banco não encontrado'}</p>
          <p><strong>Bandeira:</strong> ${cartao.bandeiraNome || 'Bandeira não encontrada'}</p>
          <p><strong>Limite:</strong> ${formatarMoeda(cartao.limite)}</p>
          <p><strong>Utilizado:</strong> ${formatarMoeda(cartao.utilizado)}</p>
          <p><strong>Disponível:</strong> ${formatarMoeda(cartao.limite - cartao.utilizado)}</p>
          <p><strong>Vencimento:</strong> Dia ${cartao.vencimento}</p>
          <p><strong>Melhor Dia para Compra:</strong> Dia ${cartao.melhor_compra}</p>
          <p><strong>Emprestado:</strong> ${cartao.emprestado ? 'Sim' : 'Não'}</p>
          ${cartao.emprestado ? `<p><strong>Utilizador Padrão:</strong> ${utilizadorNome}</p>` : ''}
        </div>
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
  const ultimos_digitos = document.getElementById('ultimos_digitos').value;
  const banco = document.getElementById('banco').value;
  const bandeira = document.getElementById('bandeira').value;
  const limite = parseFloat(document.getElementById('limite').value);
  const utilizado = parseFloat(document.getElementById('utilizado').value) || 0;
  const vencimento = document.getElementById('vencimento').value;
  const melhor_compra = document.getElementById('melhor_compra').value;
  const emprestado = document.getElementById('emprestado').checked;
  const utilizador = document.getElementById('utilizador').value;
  
  if (!nome || !ultimos_digitos || !banco || !bandeira || !limite || !vencimento || !melhor_compra) {
    alert('Preencha todos os campos obrigatórios!');
    return;
  }
  
  if (emprestado && !utilizador) {
    alert('Selecione um utilizador para o cartão emprestado!');
    return;
  }
  
  // Obter nome do banco
  let bancoNome = '';
  if (banco) {
    try {
      const docRef = doc(db, 'bancos', banco);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        bancoNome = docSnap.data().nome;
      }
    } catch (error) {
      console.error("Erro ao obter nome do banco: ", error);
    }
  }
  
  // Obter nome da bandeira
  let bandeiraNome = '';
  if (bandeira) {
    try {
      const docRef = doc(db, 'bandeiras', bandeira);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        bandeiraNome = docSnap.data().nome;
      }
    } catch (error) {
      console.error("Erro ao obter nome da bandeira: ", error);
    }
  }
  
  // Obter nome do utilizador selecionado
  let utilizadorNome = '';
  if (utilizador) {
    try {
      const docRef = doc(db, 'usuarios', utilizador);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        utilizadorNome = docSnap.data().nome;
      }
    } catch (error) {
      console.error("Erro ao obter nome do utilizador: ", error);
    }
  }
  
  const cartao = {
    nome,
    ultimos_digitos,
    banco,
    bancoNome,
    bandeira,
    bandeiraNome,
    limite,
    utilizado,
    vencimento,
    melhor_compra,
    emprestado,
    utilizador: emprestado ? utilizador : null,
    utilizadorNome: emprestado ? utilizadorNome : null
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
      document.getElementById('ultimos_digitos').value = cartao.ultimos_digitos;
      document.getElementById('banco').value = cartao.banco || '';
      document.getElementById('bandeira').value = cartao.bandeira || '';
      document.getElementById('limite').value = cartao.limite;
      document.getElementById('utilizado').value = cartao.utilizado;
      document.getElementById('vencimento').value = cartao.vencimento;
      document.getElementById('melhor_compra').value = cartao.melhor_compra;
      document.getElementById('emprestado').checked = cartao.emprestado;
      
      // Mostrar/ocultar campo de utilizador conforme estado do checkbox
      const grupoUtilizador = document.getElementById('grupo_utilizador');
      if (cartao.emprestado) {
        grupoUtilizador.style.display = 'block';
        document.getElementById('utilizador').required = true;
        document.getElementById('utilizador').value = cartao.utilizador || '';
      } else {
        grupoUtilizador.style.display = 'none';
        document.getElementById('utilizador').required = false;
        document.getElementById('utilizador').value = '';
      }
      
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
