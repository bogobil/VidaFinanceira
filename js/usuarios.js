import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let usuarioEditandoId = null;

document.addEventListener('DOMContentLoaded', function() {
  carregarUsuarios();
  
  document.getElementById('form-usuario').addEventListener('submit', async function(e) {
    e.preventDefault();
    await salvarUsuario();
  });
});

async function carregarUsuarios() {
  try {
    const usuariosRef = collection(db, 'usuarios');
    const querySnapshot = await getDocs(usuariosRef);
    
    const tabela = document.getElementById('tabela-usuarios');
    tabela.innerHTML = '';
    
    querySnapshot.forEach(doc => {
      const usuario = doc.data();
      const row = tabela.insertRow();
      row.innerHTML = `
        <td>${usuario.nome}</td>
        <td>${usuario.email}</td>
        <td>${usuario.tipo === 'admin' ? 'Administrador' : 'Usuário'}</td>
        <td>${usuario.ativo ? 'Sim' : 'Não'}</td>
        <td>
          <button class="btn btn-warning" onclick="editarUsuario('${doc.id}')">Editar</button>
          <button class="btn btn-danger" onclick="excluirUsuario('${doc.id}')">Excluir</button>
        </td>
      `;
    });
  } catch (error) {
    console.error("Erro ao carregar usuários: ", error);
  }
}

async function salvarUsuario() {
  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  const tipo = document.getElementById('tipo').value;
  const ativo = document.getElementById('ativo').checked;
  
  if (!nome || !email || !senha || !tipo) {
    alert('Preencha todos os campos!');
    return;
  }
  
  const usuario = {
    nome,
    email,
    senha, // Em produção, criptografe a senha!
    tipo,
    ativo
  };
  
  try {
    if (usuarioEditandoId) {
      await updateDoc(doc(db, 'usuarios', usuarioEditandoId), usuario);
      usuarioEditandoId = null;
      document.getElementById('form-usuario').reset();
    } else {
      await addDoc(collection(db, 'usuarios'), usuario);
      document.getElementById('form-usuario').reset();
    }
    
    carregarUsuarios();
  } catch (error) {
    console.error("Erro ao salvar usuário: ", error);
    alert('Erro ao salvar usuário. Tente novamente.');
  }
}

async function editarUsuario(id) {
  try {
    const docRef = doc(db, 'usuarios', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const usuario = docSnap.data();
      document.getElementById('nome').value = usuario.nome;
      document.getElementById('email').value = usuario.email;
      document.getElementById('senha').value = usuario.senha;
      document.getElementById('tipo').value = usuario.tipo;
      document.getElementById('ativo').checked = usuario.ativo;
      
      usuarioEditandoId = id;
    }
  } catch (error) {
    console.error("Erro ao carregar usuário para edição: ", error);
  }
}

async function excluirUsuario(id) {
  if (confirm('Tem certeza que deseja excluir este usuário?')) {
    try {
      await deleteDoc(doc(db, 'usuarios', id));
      carregarUsuarios();
    } catch (error) {
      console.error("Erro ao excluir usuário: ", error);
      alert('Erro ao excluir usuário. Tente novamente.');
    }
  }
}

// Tornar funções globais
window.editarUsuario = editarUsuario;
window.excluirUsuario = excluirUsuario;