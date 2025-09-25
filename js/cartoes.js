import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let cartaoEditandoId = null;

document.addEventListener('DOMContentLoaded', function() {
    carregarCartoes();
    carregarBancos();
    carregarBandeiras();
    document.getElementById('form-cartao').addEventListener('submit', async function(e) {
        e.preventDefault();
        await salvarCartao();
    });
});

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
        const tabela = document.getElementById('tabela-cartoes');
        tabela.innerHTML = '';
        
        for (const docCartao of querySnapshot.docs) {
            const cartao = docCartao.data();
            const cartaoId = docCartao.id;
            
            // Calcular soma dos lançamentos relacionados ao cartão
            const lancamentosRef = collection(db, 'lancamentos');
            const lancQuery = query(lancamentosRef, where('cartao_id', '==', cartaoId));
            const lancSnapshot = await getDocs(lancQuery);
            
            let somaLancamentos = 0;
            lancSnapshot.forEach(lancDoc => {
                somaLancamentos += lancDoc.data().valor || 0;
            });
            
            const limiteRestante = (cartao.limite || 0) - somaLancamentos;
            
            const row = tabela.insertRow();
            row.innerHTML = `
                <td><span class="badge ${cartao.tipo}">${cartao.tipo === 'debito' ? 'Débito' : 'Crédito'}</span></td>
                <td>${cartao.banco_nome || cartao.banco || 'N/A'}</td>
                <td>${cartao.bandeira_nome || cartao.bandeira || 'N/A'}</td>
                <td>${cartao.nome || 'N/A'}</td>
                <td>${formatarMoeda(cartao.limite || 0)}</td>
                <td>${formatarMoeda(somaLancamentos)}</td>
                <td class="${limiteRestante < 0 ? 'negativo' : ''}">${formatarMoeda(limiteRestante)}</td>
                <td>Dia ${cartao.dia_vencimento || 'N/A'}</td>
                <td>Dia ${cartao.dia_fechamento || 'N/A'}</td>
                <td class="acoes">
                    <button onclick="editarCartao('${cartaoId}')" class="btn btn-warning btn-editar">Editar</button>
                    <button onclick="excluirCartao('${cartaoId}')" class="btn btn-danger btn-excluir">Excluir</button>
                </td>
            `;
        }
    } catch (error) {
        console.error("Erro ao carregar cartões: ", error);
    }
}

async function salvarCartao() {
    try {
        const nome = document.getElementById('nome').value;
        const tipo = document.getElementById('tipo').value;
        const bancoId = document.getElementById('banco').value;
        const bandeiraId = document.getElementById('bandeira').value;
        const limite = parseFloat(document.getElementById('limite').value) || 0;
        const diaVencimento = parseInt(document.getElementById('dia_vencimento').value);
        const diaFechamento = parseInt(document.getElementById('dia_fechamento').value);
        
        // Buscar nomes para salvar junto
        const bancosSnapshot = await getDocs(collection(db, 'bancos'));
        const bandeirasSnapshot = await getDocs(collection(db, 'bandeiras'));
        
        let bancoNome = '';
        let bandeiraNome = '';
        
        bancosSnapshot.forEach(doc => {
            if (doc.id === bancoId) {
                bancoNome = doc.data().nome;
            }
        });
        
        bandeirasSnapshot.forEach(doc => {
            if (doc.id === bandeiraId) {
                bandeiraNome = doc.data().nome;
            }
        });
        
        const cartaoData = {
            nome: nome,
            tipo: tipo,
            banco: bancoId,
            banco_nome: bancoNome,
            bandeira: bandeiraId,
            bandeira_nome: bandeiraNome,
            limite: limite,
            dia_vencimento: diaVencimento,
            dia_fechamento: diaFechamento
        };
        
        if (cartaoEditandoId) {
            await updateDoc(doc(db, 'cartoes', cartaoEditandoId), cartaoData);
            cartaoEditandoId = null;
            document.getElementById('btn-cancelar').style.display = 'none';
        } else {
            await addDoc(collection(db, 'cartoes'), cartaoData);
        }
        
        document.getElementById('form-cartao').reset();
        await carregarCartoes();
        alert('Cartão salvo com sucesso!');
        
    } catch (error) {
        console.error("Erro ao salvar cartão: ", error);
        alert("Erro ao salvar cartão: " + error.message);
    }
}

async function editarCartao(id) {
    try {
        cartaoEditandoId = id;
        const cartoesSnapshot = await getDocs(collection(db, 'cartoes'));
        
        cartoesSnapshot.forEach(docCartao => {
            if (docCartao.id === id) {
                const cartao = docCartao.data();
                document.getElementById('nome').value = cartao.nome || '';
                document.getElementById('tipo').value = cartao.tipo || '';
                document.getElementById('banco').value = cartao.banco || '';
                document.getElementById('bandeira').value = cartao.bandeira || '';
                document.getElementById('limite').value = cartao.limite || '';
                document.getElementById('dia_vencimento').value = cartao.dia_vencimento || '';
                document.getElementById('dia_fechamento').value = cartao.dia_fechamento || '';
                
                document.getElementById('btn-cancelar').style.display = 'inline-block';
            }
        });
    } catch (error) {
        console.error("Erro ao carregar cartão para edição: ", error);
    }
}

async function excluirCartao(id) {
    if (confirm('Tem certeza que deseja excluir este cartão?')) {
        try {
            await deleteDoc(doc(db, 'cartoes', id));
            await carregarCartoes();
            alert("Cartão excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir cartão: ", error);
            alert("Erro ao excluir cartão: " + error.message);
        }
    }
}

function cancelarEdicaoCartao() {
    cartaoEditandoId = null;
    document.getElementById('form-cartao').reset();
    document.getElementById('btn-cancelar').style.display = 'none';
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

// Tornar funções globais para uso nos botões HTML
window.editarCartao = editarCartao;
window.excluirCartao = excluirCartao;
window.cancelarEdicaoCartao = cancelarEdicaoCartao;
