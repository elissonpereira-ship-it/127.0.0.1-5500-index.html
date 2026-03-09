// Dados
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
let vendedores = JSON.parse(localStorage.getItem('vendedores')) || [];
let rotasHoje = JSON.parse(localStorage.getItem('rotasHoje')) || [];
let map = null;
let directionsService, directionsRenderer;
let clientesNaRota = [];
let vendedorSelecionado = null;
let autocompleteInstances = {};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema...');
    initSistema();
    initNavegacao();
    initEventListeners();
    atualizarDashboard();
});

function initSistema() {
    renderClientes();
    renderVendedores();
    atualizarListaClientesRota();
}

function initNavegacao() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
}

function showPage(pageId) {
    // Esconder todas as páginas
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // Mostrar página selecionada
    document.getElementById(pageId).classList.add('active');
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
    
    // Inicializar página específica
    if (pageId === 'rotas') {
        initMapa();
        initAutocompleteRotas();
    }
}

function initEventListeners() {
    // Fechar modais clicando fora
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
        if (e.target.classList.contains('close')) {
            e.target.closest('.modal').style.display = 'none';
        }
        if (e.target.classList.contains('veiculo-btn')) {
            document.querySelectorAll('.veiculo-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
        }
    });
}

function initMapa() {
    if (map) return;
    
    const mapContainer = document.getElementById('mapa');
    if (!mapContainer) return;
    
    map = new google.maps.Map(mapContainer, {
        zoom: 12,
        center: { lat: -20.2976, lng: -40.2928 }, // Vila Velha, ES
        mapTypeControl: false,
        streetViewControl: false
    });
    
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        map: map
    });
}

function initAutocompleteRotas() {
    // ✅ AUTOCOMPLETE VENDEDOR (lista cadastrada)
    const vendedorInput = document.getElementById('vendedorRota');
    if (vendedorInput) {
        vendedorInput.addEventListener('input', function() {
            filtrarVendedores(this.value);
        });
        
        // Criar dropdown
        const dropdown = document.createElement('div');
        dropdown.id = 'vendedorDropdown';
        dropdown.className = 'dropdown-sugestoes';
        vendedorInput.parentNode.appendChild(dropdown);
    }
    
    // Autocomplete endereços (só modais)
    ['enderecoCliente', 'enderecoVendedor'].forEach(id => {
        const input = document.getElementById(id);
        if (input && !autocompleteInstances[id]) {
            autocompleteInstances[id] = new google.maps.places.Autocomplete(input, {
                fields: ['place_id', 'geometry', 'name', 'formatted_address']
            });
        }
    });
}

function filtrarVendedores(termo) {
    const termoLower = termo.toLowerCase();
    const vendedoresFiltrados = vendedores.filter(v => 
        v.nome.toLowerCase().includes(termoLower) || 
        v.idVendedor.toLowerCase().includes(termoLower)
    );
    
    const dropdown = document.getElementById('vendedorDropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    
    if (termo.length > 0 && vendedoresFiltrados.length > 0) {
        vendedoresFiltrados.slice(0, 5).forEach(vendedor => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerHTML = `<strong>${vendedor.nome}</strong> <small>ID: ${vendedor.idVendedor}</small>`;
            item.addEventListener('click', function() {
                vendedorSelecionado = vendedor;
                document.getElementById('vendedorRota').value = vendedor.nome;
                document.getElementById('vendedorRota').style.borderColor = '#48bb78';
                dropdown.style.display = 'none';
            });
            dropdown.appendChild(item);
        });
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
    }
}


function atualizarListaClientesRota() {
    const select = document.getElementById('clientesRota');
    if (!select) return;
    
    select.innerHTML = '';
    clientes.forEach(cliente => {
        const option = new Option(`${cliente.nome} - ${cliente.cnpj}`, cliente.id);
        select.appendChild(option);
    });
}

function adicionarClienteRota() {
    const select = document.getElementById('clientesRota');
    const selectedOptions = Array.from(select.selectedOptions);
    
    selectedOptions.forEach(option => {
        const clienteId = parseInt(option.value);
        const cliente = clientes.find(c => c.id === clienteId);
        
        if (cliente && !clientesNaRota.find(c => c.id === cliente.id)) {
            // ✅ USA AS COORDENADAS REAIS SALVAS!
            if (!cliente.lat || !cliente.lng) {
                alert(`Cliente "${cliente.nome}" precisa de endereço com autocomplete!`);
                return;
            }
            clientesNaRota.push({...cliente}); // Cópia para não modificar original
        }
    });
    
    renderClientesNaRota();
    select.selectedIndex = -1;
}


function renderClientesNaRota() {
    const container = document.querySelector('.clientes-na-rota');
    if (!container) {
        document.querySelector('.form-section').innerHTML += `
            <div class="clientes-na-rota">
                <label>Clientes na Rota (<span id="countClientesRota">${clientesNaRota.length}</span>)</label>
                <div id="listaClientesRota" class="lista-tags"></div>
            </div>
        `;
    }
    
    const lista = document.getElementById('listaClientesRota');
    lista.innerHTML = '';
    
    clientesNaRota.forEach((cliente, index) => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `
            ${cliente.nome}
            <button type="button" onclick="removerClienteRota(${index})" class="tag-remove">&times;</button>
        `;
        lista.appendChild(tag);
    });
    
    document.getElementById('countClientesRota').textContent = clientesNaRota.length;
}

function removerClienteRota(index) {
    clientesNaRota.splice(index, 1);
    renderClientesNaRota();
}

function calcularRota() {
    if (!vendedorSelecionado || !vendedorSelecionado.lat || !vendedorSelecionado.lng) {
        alert('❌ Selecione vendedor com endereço!');
        return;
    }
    
    if (clientesNaRota.length === 0) {
        alert('❌ Adicione clientes à rota!');
        return;
    }
    
    const waypoints = clientesNaRota.map(cliente => ({
        location: new google.maps.LatLng(cliente.lat, cliente.lng),
        stopover: true
    }));
    
    const request = {
        origin: new google.maps.LatLng(vendedorSelecionado.lat, vendedorSelecionado.lng),
        destination: new google.maps.LatLng(vendedorSelecionado.lat, vendedorSelecionado.lng),
        waypoints: waypoints.slice(0, 20),
        optimizeWaypoints: true,
        travelMode: 'DRIVING'
    };
    
    directionsService.route(request, function(result, status) {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            let distanciaTotal = 0, tempoTotal = 0;
            result.routes[0].legs.forEach(leg => {
                distanciaTotal += leg.distance.value;
                tempoTotal += leg.duration.value;
            });
            
            distanciaTotal /= 1000;
            tempoTotal /= 60;
            const veiculo = document.querySelector('.veiculo-btn.active').dataset.veiculo;
            const valorKm = veiculo === 'carro' ? 0.90 : 0.40;
            const custoTotal = (distanciaTotal * valorKm).toFixed(2);
            
            document.getElementById('resultadoRota').innerHTML = `
                <h3>✅ Rota Calculada!</h3>
                <div>📏 ${distanciaTotal.toFixed(1)} km | ⏰ ${tempoTotal.toFixed(0)} min | 💰 R$ ${custoTotal}</div>
                <div><strong>${vendedorSelecionado.nome} → ${clientesNaRota.map(c=>c.nome).join(' → ')} → Volta</strong></div>
            `;
            document.getElementById('resultadoRota').style.display = 'block';
            map.fitBounds(result.routes[0].bounds);
        }
    });
}


// CRUD Clientes
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    setTimeout(initAutocompleteModais, 200);
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function salvarCliente(e) {
    e.preventDefault();
    const enderecoInput = document.getElementById('enderecoCliente');
    
    const cliente = {
        id: Date.now(),
        cnpj: document.getElementById('cnpjCliente').value,
        nome: document.getElementById('nomeCliente').value,
        endereco: enderecoInput.value,
        lat: enderecoInput.dataset.lat || null,  // ← SALVA COORDENADAS
        lng: enderecoInput.dataset.lng || null   // ← SALVA COORDENADAS
    };
    
    clientes.push(cliente);
    localStorage.setItem('clientes', JSON.stringify(clientes));
    renderClientes();
    atualizarListaClientesRota();
    closeModal('clienteModal');
    atualizarDashboard();
    e.target.reset();
    // Limpar coordenadas do input
    delete enderecoInput.dataset.lat;
    delete enderecoInput.dataset.lng;
}



function renderClientes() {
    const tbody = document.querySelector('#tabelaClientes tbody');
    tbody.innerHTML = clientes.length ? '' : '<tr><td colspan="4" style="text-align:center;color:#666;">Nenhum cliente cadastrado</td></tr>';
    
    clientes.forEach(cliente => {
        tbody.innerHTML += `
            <tr>
                <td>${cliente.cnpj || 'N/A'}</td>
                <td>${cliente.nome}</td>
                <td>${cliente.endereco || 'N/A'}</td>
                <td>
                    <button class="btn-danger btn-sm" onclick="excluirCliente(${cliente.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function excluirCliente(id) {
    if(confirm('Excluir este cliente?')) {
        clientes = clientes.filter(c => c.id !== id);
        localStorage.setItem('clientes', JSON.stringify(clientes));
        renderClientes();
        atualizarListaClientesRota();
        atualizarDashboard();
    }
}

// CRUD Vendedores (igual clientes)
function salvarVendedor(e) {
    e.preventDefault();
    const enderecoInput = document.getElementById('enderecoVendedor');
    
    const vendedor = {
        id: Date.now(),
        idVendedor: document.getElementById('idVendedor').value,
        nome: document.getElementById('nomeVendedor').value,
        endereco: enderecoInput.value,
        lat: enderecoInput.dataset.lat || null,
        lng: enderecoInput.dataset.lng || null
    };
    
    vendedores.push(vendedor);
    localStorage.setItem('vendedores', JSON.stringify(vendedores));
    renderVendedores();
    closeModal('vendedorModal');
    atualizarDashboard();
    e.target.reset();
    delete enderecoInput.dataset.lat;
    delete enderecoInput.dataset.lng;
}


function renderVendedores() {
    const tbody = document.querySelector('#tabelaVendedores tbody');
    tbody.innerHTML = vendedores.length ? '' : '<tr><td colspan="4" style="text-align:center;color:#666;">Nenhum vendedor cadastrado</td></tr>';
    
    vendedores.forEach(vendedor => {
        tbody.innerHTML += `
            <tr>
                <td>${vendedor.idVendedor}</td>
                <td>${vendedor.nome}</td>
                <td>${vendedor.endereco || 'N/A'}</td>
                <td>
                    <button class="btn-danger btn-sm" onclick="excluirVendedor(${vendedor.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function excluirVendedor(id) {
    if(confirm('Excluir este vendedor?')) {
        vendedores = vendedores.filter(v => v.id !== id);
        localStorage.setItem('vendedores', JSON.stringify(vendedores));
        renderVendedores();
        atualizarDashboard();
    }
}

function atualizarDashboard() {
    document.getElementById('totalClientes').textContent = clientes.length;
    document.getElementById('totalVendedores').textContent = vendedores.length;
    document.getElementById('totalRotas').textContent = rotasHoje.length;
}

// ✅ AUTOCOMPLETE ENDEREÇOS NOS MODAIS
function initAutocompleteModais() {
    if (typeof google === 'undefined' || !google.maps?.places) {
        setTimeout(initAutocompleteModais, 500);
        return;
    }
    
    const enderecoFields = ['enderecoCliente', 'enderecoVendedor'];
    enderecoFields.forEach(id => {
        const input = document.getElementById(id);
        if (input && !window[`autocomplete_${id}`]) {
            window[`autocomplete_${id}`] = new google.maps.places.Autocomplete(input, {
                fields: ['place_id', 'geometry', 'name', 'formatted_address'],
                componentRestrictions: { country: 'br' }
            });
            
            // ✅ SALVAR COORDENADAS QUANDO SELECIONAR ENDEREÇO
            window[`autocomplete_${id}`].addListener('place_changed', function() {
                const place = window[`autocomplete_${id}`].getPlace();
                if (place.geometry) {
                    input.dataset.lat = place.geometry.location.lat();
                    input.dataset.lng = place.geometry.location.lng();
                    console.log(`✅ ${id}: ${input.dataset.lat}, ${input.dataset.lng}`);
                }
            });
        }
    });
}


// Quando modal abrir, ativar autocomplete
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    
    // Ativar autocomplete 200ms depois
    setTimeout(initAutocompleteModais, 200);
}

