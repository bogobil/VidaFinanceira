import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let lancamentoEditandoId = null;

document.addEventListener('DOMContentLoaded', function() {
    carregarLancamentos();
    carregarCartoes();
    carregarUsuarios();
    
    document.getElementById('form-lancamento').addEventListener('submit', async function(e) {
        e.preventDefault();
        await salvarLancamento();
    });

    // Calcular valor total quando valor ou parcelas mudarem
    document.getElementById('valor').addEventListener('input', calcularValorTotal);
    document.getElementById('parcelas').addEventListener('input', calcularValorTotal);
});

function calcularValorTotal() {
    const valor = parseFloat(document.getElementById('valor').value) || 0;
    const parcelas = parseInt(document.getElementById('parcelas').value) || 1;
    const valorTotal = valor * parcelas;
    document.getElementById('valor_total').value = valorTotal.toFixed(2);
}

async function carregarCartoes() {
    try {
        const cartoesRef = collection(db, 'cartoes');
        const querySnapshot = await getDocs(cartoesRef);
        const selectCartao = document.getElementById('cartao');
        
        // Limpar opções existentes (exceto a primeira)
        selectCartao.innerHTML = '<option value="">Selecione um cartão</option>';
        
        querySnapshot.forEach(doc => {
            const cartao = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${cartao.nome} - ${cartao.banco}`;
            selectCartao.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar cartões:", error);
    }
}

async function carregarUsuarios() {
    try {
        const usuariosRef = collection(db, 'usuarios');
        const querySnapshot = await getDocs(usuariosRef);
        const selectUsuario = document.getElementById('usuario');
        
        // Limpar opções existentes (exceto a primeira)
        selectUsuario.innerHTML = '<option value="">Selecione quem comprou</option>';
        
        querySnapshot.forEach(doc => {
            const usuario = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = usuario.nome;
            selectUsuario.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar usuários:", error);
    }
}

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
                <td>${formatarData(lancamento.data)}</td>
                <td><span class="badge ${lancamento.tipo}">${lancamento.tipo}</span></td>
                <td>${lancamento.descricao}</td>
                <td>${lancamento.categoria}</td>
                <td>${lancamento.cartao_nome || 'N/A'}</td>
                <td>${lancamento.usuario_nome || 'N/A'}</td>
                <td>${lancamento.parcela_atual || 'N/A'}/${lancamento.total_parcelas || 'N/A'}</td>
                <td>${formatarMoeda(lancamento.valor)}</td>
                <td><small>${lancamento.id_compra || 'N/A'}</small></td>
                <td class="acoes">
                    <button onclick="editarLancamento('${doc.id}')" class="btn-editar">Editar</button>
                    <button onclick="excluirLancamento('${doc.id}')" class="btn-excluir">Excluir</button>
                </td>
            `;
        });
    } catch (error) {
        console.error("Erro ao carregar lançamentos:", error);
    }
}

async function salvarLancamento() {
    try {
        const tipo = document.getElementById('tipo').value;
        const cartaoId = document.getElementById('cartao').value;
        const usuarioId = document.getElementById('usuario').value;
        const descricao = document.getElementById('descricao').value;
        const valor = parseFloat(document.getElementById('valor').value);
        const parcelas = parseInt(document.getElementById('parcelas').value);
        const categoria = document.getElementById('categoria').value;
        const data = document.getElementById('data').value;

        // Buscar nome do cartão selecionado
        const cartoesSnapshot = await getDocs(collection(db, 'cartoes'));
        let cartaoNome = '';
        
        cartoesSnapshot.forEach(docCartao => {
            if (docCartao.id === cartaoId) {
                cartaoNome = docCartao.data().nome;
            }
        });

        // Buscar nome do usuário selecionado
        const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
        let usuarioNome = '';
        
        usuariosSnapshot.forEach(docUsuario => {
            if (docUsuario.id === usuarioId) {
                usuarioNome = docUsuario.data().nome;
            }
        });

        // Gerar ID único para a compra
        const idCompra = `compra_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Criar uma entrada para cada parcela
        const promises = [];
        
        for (let i = 1; i <= parcelas; i++) {
            // Calcular data de cada parcela (assumindo mensalidade)
            const dataAtual = new Date(data);
            dataAtual.setMonth(dataAtual.getMonth() + (i - 1));
            const dataParcela = dataAtual.toISOString().split('T')[0];

            const lancamentoParcela = {
                tipo: tipo,
                cartao_id: cartaoId,
                cartao_nome: cartaoNome,
                usuario_id: usuarioId,
                usuario_nome: usuarioNome,
                descricao: `${descricao} - Parcela ${i}/${parcelas}`,
                valor: valor,
                categoria: categoria,
                data: dataParcela,
                parcela_atual: i,
                total_parcelas: parcelas,
                id_compra: idCompra,
                data_criacao: new Date().toISOString()
            };

            if (lancamentoEditandoId && i === 1) {
                // Se estiver editando, atualizar apenas a primeira parcela
                promises.push(updateDoc(doc(db, 'lancamentos', lancamentoEditandoId), lancamentoParcela));
            } else if (!lancamentoEditandoId) {
                // Se for novo lançamento, adicionar todas as parcelas
                promises.push(addDoc(collection(db, 'lancamentos'), lancamentoParcela));
            }
        }

        await Promise.all(promises);

        // Limpar formulário e recarregar tabela
        document.getElementById('form-lancamento').reset();
        document.getElementById('valor_total').value = '';
        lancamentoEditandoId = null;
        document.getElementById('btn-salvar').textContent = 'Salvar Lançamento';
        document.getElementById('btn-cancelar').style.display = 'none';

        await carregarLancamentos();
        
        alert(`Lançamento salvo com sucesso! ${parcelas} parcela(s) criada(s) para ${usuarioNome}.`);
    } catch (error) {
        console.error("Erro ao salvar lançamento:", error);
        alert("Erro ao salvar lançamento: " + error.message);
    }
}

async function editarLancamento(id) {
    try {
        const lancamentoRef = doc(db, 'lancamentos', id);
        const querySnapshot = await getDocs(collection(db, 'lancamentos'));
        
        querySnapshot.forEach(docLancamento => {
            if (docLancamento.id === id) {
                const lancamento = docLancamento.data();
                
                document.getElementById('tipo').value = lancamento.tipo;
                document.getElementById('cartao').value = lancamento.cartao_id;
                document.getElementById('usuario').value = lancamento.usuario_id;
                document.getElementById('descricao').value = lancamento.descricao.replace(/ - Parcela \d+\/\d+$/, '');
                document.getElementById('valor').value = lancamento.valor;
                document.getElementById('parcelas').value = lancamento.total_parcelas || 1;
                document.getElementById('categoria').value = lancamento.categoria;
                document.getElementById('data').value = lancamento.data;
                
                calcularValorTotal();
                
                lancamentoEditandoId = id;
                document.getElementById('btn-salvar').textContent = 'Atualizar Lançamento';
                document.getElementById('btn-cancelar').style.display = 'inline-block';
            }
        });
    } catch (error) {
        console.error("Erro ao carregar lançamento para edição:", error);
    }
}

async function excluirLancamento(id) {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
        try {
            await deleteDoc(doc(db, 'lancamentos', id));
            await carregarLancamentos();
            alert("Lançamento excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir lançamento:", error);
            alert("Erro ao excluir lançamento: " + error.message);
        }
    }
}

function cancelarEdicao() {
    document.getElementById('form-lancamento').reset();
    document.getElementById('valor_total').value = '';
    lancamentoEditandoId = null;
    document.getElementById('btn-salvar').textContent = 'Salvar Lançamento';
    document.getElementById('btn-cancelar').style.display = 'none';
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarData(data) {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
}

// Tornar funções globais para uso nos botões HTML
window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;
window.cancelarEdicao = cancelarEdicao;
