// URLs
const WEBHOOKS = {
    unifiedData: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_funil_vendas_acumulado', 
    bantAnalysis: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/analise-bant',
    metas: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/metas_prevendas',
    lastUpdate: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/last_update',
    
    // Novos Webhooks
    lostReasonMap: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/lost-reason-map',
    viewMotivosPerdas: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view-motivos-perdas',
    viewProspectAtual: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_prospect_atual'
};

const DATA_CACHE = {
    unified: [], 
    bant: [], 
    metas: [], 
    lastUpdate: null,
    lossReasons: [],
    lossData: [],
    prospectsBucket: []
};

async function loadAllData() {
    try {
        const responses = await Promise.all([
            fetch(WEBHOOKS.metas).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.unifiedData).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.bantAnalysis).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.lastUpdate).then(r => r.json()).catch(() => ({ data: [] })),
            
            // Novos Fetches
            fetch(WEBHOOKS.lostReasonMap).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.viewMotivosPerdas).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.viewProspectAtual).then(r => r.json()).catch(() => ({ data: [] }))
        ]);

        DATA_CACHE.metas = getArr(responses[0]);
        DATA_CACHE.unified = getArr(responses[1]);
        DATA_CACHE.bant = getArr(responses[2]);
        
        const upd = getArr(responses[3]);
        if(upd.length) DATA_CACHE.lastUpdate = upd[0].data_hora_ultimo_update;

        DATA_CACHE.lossReasons = getArr(responses[4]);
        DATA_CACHE.lossData = getArr(responses[5]);
        DATA_CACHE.prospectsBucket = getArr(responses[6]);

        normalizeDataCache();
        populateDropdowns();
        renderAll();

    } catch (error) { console.error("Erro LoadData:", error); }
}

function getArr(json) { 
    if (Array.isArray(json)) {
        if (json.length > 0 && json[0].data && Array.isArray(json[0].data)) {
            return json[0].data;
        }
        return json;
    }
    return json.data || []; 
}

function normalizeDataCache() {
    const nameToId = new Map();
    const idToFullName = new Map();

    const learnIdentity = (id, name) => {
        if (!name) return;
        const cleanName = String(name).trim();
        const cleanId = id && String(id) !== '0' && String(id) !== 'null' ? String(id).trim() : null;
        
        if (cleanName && cleanId) {
            nameToId.set(cleanName.toLowerCase(), cleanId);
            if (!idToFullName.has(cleanId) || cleanName.length > idToFullName.get(cleanId).length) {
                idToFullName.set(cleanId, cleanName);
            }
        }
    };

    DATA_CACHE.metas.forEach(i => learnIdentity(i['user id'] || i.id, i.user || i.nome));
    DATA_CACHE.unified.forEach(i => learnIdentity(i.sdr_id, i.sdr_name));
    DATA_CACHE.prospectsBucket.forEach(i => learnIdentity(i.sdr_id, i.sdr_name));
    
    const patchItem = (item) => {
        let currentId = item.sdr_id || item.responsible_user_id || item.id || item['user id'];
        let cleanId = currentId && String(currentId) !== '0' && String(currentId) !== 'null' ? String(currentId).trim() : null;
        
        const name = item.sdr_name || item.nome || item.user;
        
        if (!cleanId && name) {
            const foundId = nameToId.get(String(name).trim().toLowerCase());
            if (foundId) {
                cleanId = foundId;
                if (item.sdr_id !== undefined || !item.hasOwnProperty('sdr_id')) item.sdr_id = foundId;
            }
        }

        if (cleanId && idToFullName.has(cleanId)) {
            const officialName = idToFullName.get(cleanId);
            if (item.sdr_name !== undefined) item.sdr_name = officialName;
            if (item.nome !== undefined) item.nome = officialName;
            if (item.user !== undefined) item.user = officialName;
        }
    };

    DATA_CACHE.metas.forEach(patchItem);
    DATA_CACHE.unified.forEach(patchItem);
    DATA_CACHE.prospectsBucket.forEach(patchItem);
}

function renderAll() {
    renderLastUpdate();
    renderExecutiveView();
    renderSdrPerformance();
    renderBantAnalysis();
    renderChannelPerformance();
    renderFunnelData();
    renderLossAnalysis();
    renderProspectsBucket(); // Novo renderizador
}

function applyFilters(data) {
    if (!data || data.length === 0) return [];
    
    const start = new Date(GlobalFilter.startDate + 'T00:00:00');
    const end = new Date(GlobalFilter.endDate + 'T23:59:59');

    return data.filter(item => {
        if (item.data_referencia) {
            const d = new Date(item.data_referencia + 'T12:00:00');
            if (d < start || d > end) return false;
        }
        
        if (GlobalFilter.sdrId !== 'all') {
            const id = item.sdr_id || item.responsible_user_id || item.id || item['user id'];
            if ((!id || String(id) === '0') && GlobalFilter.sdrId !== 'all') return false;
            if (id && String(id) !== String(GlobalFilter.sdrId)) return false;
        }
        
        if (GlobalFilter.channelId !== 'all') {
            const ch = item.canal_origem || item.canal_nome || 'Não identificado';
            if (ch !== GlobalFilter.channelId) return false;
        }
        return true;
    });
}

function populateDropdowns() {
    const sdrSelect = document.getElementById('sdrFilter');
    if (sdrSelect) {
        while (sdrSelect.options.length > 1) sdrSelect.remove(1);
        
        const uniqueSDRs = new Map();
        
        [...DATA_CACHE.metas, ...DATA_CACHE.unified, ...DATA_CACHE.prospectsBucket].forEach(i => {
            const id = i.sdr_id || i['user id'] || i.id;
            const name = i.sdr_name || i.user || i.nome;
            
            if (id && name && String(id) !== '0') {
                uniqueSDRs.set(String(id), name);
            }
        });

        Array.from(uniqueSDRs.entries())
            .sort((a, b) => a[1].localeCompare(b[1]))
            .forEach(([id, name]) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = name;
                sdrSelect.appendChild(opt);
            });
    }

    const chSelect = document.getElementById('channelFilter');
    if (chSelect) {
        while (chSelect.options.length > 1) chSelect.remove(1);
        
        const unique = new Set();
        DATA_CACHE.unified.forEach(i => {
            const ch = i.canal_origem;
            if(ch) unique.add(ch);
        });
        
        unique.forEach(ch => {
            const opt = document.createElement('option');
            opt.value = ch; opt.textContent = ch;
            chSelect.appendChild(opt);
        });
    }
}

function renderLastUpdate() {
    const el = document.getElementById('currentDate');
    if(el) el.textContent = DATA_CACHE.lastUpdate ? `Atualizado em: ${new Date(DATA_CACHE.lastUpdate).toLocaleString('pt-BR')}` : 'Carregando...';
}

// ======================== VISÃO EXECUTIVA (MODIFICADA) ========================
function renderExecutiveView() {
    const filtered = applyFilters(DATA_CACHE.unified);
    const dailyAgg = {};
    
    filtered.forEach(item => {
        const k = item.data_referencia;
        const qtd = parseInt(item.count_venda_ganha) || 0;
        if (k) {
            if(!dailyAgg[k]) dailyAgg[k] = 0;
            dailyAgg[k] += qtd;
        }
    });
    
    const aggData = Object.keys(dailyAgg).map(k => ({ data_referencia: k, qtd_realizada: dailyAgg[k] })).sort((a,b) => new Date(a.data_referencia) - new Date(b.data_referencia));
    const realizado = aggData.reduce((sum, i) => sum + i.qtd_realizada, 0);

    const start = new Date(GlobalFilter.startDate + 'T00:00:00');
    const end = new Date(GlobalFilter.endDate + 'T23:59:59');
    
    // Filtragem de Metas
    let targetMetas = DATA_CACHE.metas;
    
    // Filtro 1: Pessoa (Afeta a meta)
    if (GlobalFilter.sdrId !== 'all') {
        targetMetas = targetMetas.filter(m => String(m['user id'] || m.id) === String(GlobalFilter.sdrId));
    }
    
    // Lógica Meta do Mês: Deve ser a meta inteira do mês selecionado, não afetada pelos dias específicos
    // Identifica o mês/ano baseando-se na data final do filtro
    const mesAlvo = end.getMonth(); // 0-11
    const anoAlvo = end.getFullYear();
    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const nomeMesAlvo = nomesMeses[mesAlvo];

    let metaMesInteiro = 0;
    
    targetMetas.forEach(m => {
        // Verifica se a meta pertence ao mês/ano selecionado
        // A meta pode vir com campo "mes" (string) ou "data" (string)
        let isSameMonth = false;
        
        if (m.mes && m.ano) {
            if (m.mes === nomeMesAlvo && parseInt(m.ano) === anoAlvo) isSameMonth = true;
        } else if (m.data) {
            // Fallback se não tiver campo mês explícito, tenta parsear data
            const parts = m.data.split('/');
            if(parts.length === 3) {
                const mDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
                if (mDate.getMonth() === mesAlvo && mDate.getFullYear() === anoAlvo) isSameMonth = true;
            }
        }

        // Se for do mês, soma o Valor Total (Meta Cheia)
        if (isSameMonth) {
            // Se tiver 'valor' (json de metas), usa ele. Se não, tenta somar pace (fallback)
            if (m.valor) {
                // Evita somar duplicado se a estrutura for por dia mas tiver valor total repetido.
                // Assumindo que o metas.json é granularidade MENSAL por SDR.
                metaMesInteiro += parseInt(m.valor) || 0;
            } else {
                metaMesInteiro += parseInt(m['pace esperado']) || 0;
            }
        }
    });

    // Se a iteração acima somou duplicado (caso o JSON seja diário), precisamos ajustar.
    // O JSON de exemplo `metas.json` é único por mês/SDR. 
    // O JSON `lost-reason-map` (que parecia pace) era diário.
    // Vou assumir que DATA_CACHE.metas vem do `metas_prevendas` que retorna estrutura parecida com `metas.json` (Mensal).
    // Caso contrário, se for diário, a soma dos paces diários = meta mensal.
    // Se `m.valor` existe e é a meta mensal, e temos várias entradas por dia, somar `valor` daria erro.
    // Verificando example `metas.json`: É uma lista com 2 objetos (um por SDR). Então a soma simples funciona.

    // Cálculo do Pace (mantém lógica proporcional aos dias passados)
    const parseDateBR = (dateStr) => {
        if(!dateStr) return null;
        const parts = dateStr.split('/');
        if(parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        return null;
    };
    
    let paceIdealPeriodo = 0;
    const today = new Date();
    const paceDateLimit = end < today ? end : today;

    // Para o Pace, precisamos dos dados diários. Se o metas for mensal, calculamos proporcional.
    // Se tivermos os dados diários (do webhook de pace/mapa se for o caso), usamos.
    // Fallback: MetaMensal / DiasUteis * DiasPassados.
    // Como não tenho certeza da fonte de Pace Diário (o exemplo do user estava confuso),
    // vou usar a lógica de proporcionalidade simples se não encontrar dados diários.
    
    // Tenta encontrar dados diários em metas (se for estrutura de pace)
    let hasDailyData = targetMetas.some(m => m.data && m['pace esperado']);
    
    if (hasDailyData) {
        targetMetas.forEach(m => {
            const d = parseDateBR(m.data);
            if(d && d >= start && d <= paceDateLimit) {
                paceIdealPeriodo += parseInt(m['pace esperado']) || 0;
            }
        });
    } else {
        // Proporcional simples
        const totalDays = getBusinessDays(new Date(anoAlvo, mesAlvo, 1), new Date(anoAlvo, mesAlvo + 1, 0));
        const passedDays = getBusinessDays(new Date(anoAlvo, mesAlvo, 1), paceDateLimit);
        if (totalDays > 0) paceIdealPeriodo = Math.round((metaMesInteiro / totalDays) * passedDays);
    }

    const elMeta = document.getElementById('metaMes'); if(elMeta) elMeta.textContent = metaMesInteiro;
    const elReal = document.getElementById('realizadoMes'); if(elReal) elReal.textContent = realizado;
    
    const ating = metaMesInteiro > 0 ? (realizado/metaMesInteiro)*100 : 0;
    const elPerc = document.getElementById('atingimentoPerc'); 
    if(elPerc) elPerc.textContent = ating.toFixed(1) + '%';
    
    const elPace = document.getElementById('paceEsperado'); if(elPace) elPace.textContent = paceIdealPeriodo;
    const elFaltam = document.getElementById('faltamReuniaoes'); if(elFaltam) elFaltam.textContent = `faltam ${Math.max(0, metaMesInteiro - realizado)} reuniões`;

    const elPaceBadge = document.getElementById('paceBadge');
    const elPaceDias = document.getElementById('paceDias');
    
    if (elPaceBadge && elPaceDias) {
        const diff = realizado - paceIdealPeriodo;
        elPaceBadge.className = diff >= 0 ? 'pace-badge ahead' : 'pace-badge behind';
        elPaceBadge.textContent = diff >= 0 ? `+${diff} adiantado` : `${Math.abs(diff)} atrasado`; 
        
        // Dias restantes no mês
        const endOfMonth = new Date(anoAlvo, mesAlvo + 1, 0);
        const diasUteisRestantes = getBusinessDays(today, endOfMonth) - (today.getDay()!==0&&today.getDay()!==6 ? 1 : 0); // Ajuste fino
        elPaceDias.textContent = `restam ~${Math.max(0, diasUteisRestantes)} dias úteis no mês`;
    }
    
    const barAting = document.getElementById('atingimentoBar');
    if(barAting) barAting.style.width = Math.min(ating, 100) + '%';
    
    const barPace = document.getElementById('paceBar');
    if(barPace) {
        const pctMes = metaMesInteiro > 0 ? (paceIdealPeriodo / metaMesInteiro) * 100 : 0;
        barPace.style.width = Math.min(pctMes, 100) + '%';
    }

    const granularity = document.getElementById('burnupGranularity')?.value || 'day';
    if (typeof createBurnupChart === 'function') {
        createBurnupChart(aggData, targetMetas, GlobalFilter.startDate, GlobalFilter.endDate, granularity);
    }
}

// ======================== PERFORMANCE SDR (MODIFICADA) ========================
function renderSdrPerformance() {
    const tbody = document.getElementById('sinaleiro-body');
    if(!tbody) return;
    
    const start = new Date(GlobalFilter.startDate + 'T00:00:00');
    const end = new Date(GlobalFilter.endDate + 'T23:59:59');
    
    const sdrMap = {};
    
    DATA_CACHE.unified.forEach(i => {
        if (GlobalFilter.sdrId !== 'all') {
            const id = i.sdr_id || i.responsible_user_id || i.id || i['user id'];
            if ((!id || String(id) === '0') && GlobalFilter.sdrId !== 'all') return;
            if (id && String(id) !== String(GlobalFilter.sdrId)) return;
        }
        
        if (GlobalFilter.channelId !== 'all') {
            const ch = i.canal_origem || i.canal_nome || 'Não identificado';
            if (ch !== GlobalFilter.channelId) return;
        }

        const key = i.sdr_id && String(i.sdr_id) !== '0' ? i.sdr_id : i.sdr_name;
        if(!key) return;

        if(!sdrMap[key]) sdrMap[key] = { name: i.sdr_name, pTotal:0, r:0, v:0, ag_perd:0 };
        
        // Dados filtrados por data
        let isDateInPeriod = false;
        if(i.data_referencia) {
            const dataRef = new Date(i.data_referencia + 'T12:00:00');
            if(dataRef >= start && dataRef <= end) isDateInPeriod = true;
        }
        
        if (isDateInPeriod) {
            sdrMap[key].pTotal += parseInt(i.count_prospect)||0;
            sdrMap[key].r += parseInt(i.count_reuniao)||0;
            sdrMap[key].v += parseInt(i.count_venda_ganha)||0;
            sdrMap[key].ag_perd += parseInt(i.count_reuniao_perdida)||0;
        }
        
        if (i.sdr_name && (!sdrMap[key].name || i.sdr_name.length > sdrMap[key].name.length)) {
            sdrMap[key].name = i.sdr_name;
        }
    });

    tbody.innerHTML = '';
    
    if(Object.keys(sdrMap).length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888">Sem dados</td></tr>';
    } else {
        Object.values(sdrMap).forEach(s => {
            const pa = s.pTotal > 0 ? (s.r/s.pTotal)*100 : 0; 
            const ar = s.r > 0 ? (s.v/s.r)*100 : 0;
            const noshow = s.ag_perd;
            
            let st='green'; 
            if(pa<20 || ar<70) st='red';
            else if(pa<40 || ar<90) st='yellow';
            
            tbody.innerHTML += `<tr>
                <td><span class="status-dot ${st}"></span></td>
                <td class="sinaleiro-name">${s.name}</td>
                <td>${s.pTotal}</td>
                <td>${s.r}</td>
                <td><span class="badge ${getBadgeClassPA(pa)}">${pa.toFixed(1)}%</span></td>
                <td>${s.v}</td>
                <td><span class="badge ${getBadgeClassAR(ar)}">${ar.toFixed(1)}%</span></td>
                <td><span class="badge ${noshow >= 3 ? 'red' : (noshow >= 1 ? 'yellow' : 'green')}">${Math.max(0, noshow)}</span></td>
            </tr>`;
        });
    }
}

// ======================== BALDE PROSPECTS (NOVO) ========================
function renderProspectsBucket() {
    const container = document.getElementById('balde-prospects-list');
    const totalEl = document.getElementById('balde-total-value');
    if (!container || !totalEl) return;

    // Dados puros (não afetados por data), mas afetados por Filtro SDR? 
    // "este gráfico não é afetado por data"
    // Normalmente gráficos de estoque respeitam filtro de pessoa se selecionado.
    
    let data = DATA_CACHE.prospectsBucket || [];
    
    if (GlobalFilter.sdrId !== 'all') {
        data = data.filter(d => String(d.sdr_id) === String(GlobalFilter.sdrId));
    }
    // "Balde" geralmente ignora canais pois é snapshot atual, mas se quiser filtrar:
    if (GlobalFilter.channelId !== 'all') {
        data = data.filter(d => d.canal_origem === GlobalFilter.channelId);
    }

    // Agrupar por SDR (somando prospects)
    const sdrAgg = {};
    let totalBucket = 0;

    data.forEach(item => {
        const name = item.sdr_name || 'Desconhecido';
        const val = parseInt(item.count_prospect) || 0;
        
        if (!sdrAgg[name]) sdrAgg[name] = 0;
        sdrAgg[name] += val;
        totalBucket += val;
    });

    totalEl.textContent = totalBucket;
    container.innerHTML = '';

    if (totalBucket === 0) {
        container.innerHTML = '<tr><td style="text-align:center; color:#666;">Vazio</td></tr>';
        return;
    }

    Object.entries(sdrAgg)
        .sort((a,b) => b[1] - a[1]) // Ordenar maior para menor
        .forEach(([name, count]) => {
            container.innerHTML += `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #1f1f1f;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color: #ccc; font-weight: 500;">${name}</span>
                        <span style="color: #fff; font-weight: 700; font-size: 14px;">${count}</span>
                    </div>
                </td>
            </tr>`;
        });
}

function renderBantAnalysis() {
    const filtered = applyFilters(DATA_CACHE.bant);
    const distBody = document.getElementById('bant-distribution-body');
    const convBody = document.getElementById('bant-conversion-body');
    const bantMap = { 4:{l:0,v:0}, 3:{l:0,v:0}, 2:{l:0,v:0}, 1:{l:0,v:0} };
    const sdrAgg = {};
    
    filtered.forEach(i => {
        const sc = parseInt(i.bant_score)||1; 
        const l = parseInt(i.total_leads)||0; 
        const v = parseInt(i.vendas)||0;
        if(bantMap[sc]) { bantMap[sc].l += l; bantMap[sc].v += v; }
        const sdr = i.sdr_name || 'Desc';
        if(!sdrAgg[sdr]) sdrAgg[sdr]={t:0, b4:0, b3:0, b2:0, b1:0};
        sdrAgg[sdr].t += l; 
        if(sc===4) sdrAgg[sdr].b4 += l; 
        if(sc===3) sdrAgg[sdr].b3 += l; 
        if(sc===2) sdrAgg[sdr].b2 += l; 
        if(sc===1) sdrAgg[sdr].b1 += l;
    });
    
    [4,3,2,1].forEach(i => {
        const d = bantMap[i]; 
        const cv = d.l > 0 ? (d.v/d.l)*100 : 0;
        const elVal = document.getElementById(`bant-val-${i}`);
        if (elVal) elVal.textContent = d.l; 
        
        const convEl = document.getElementById(`bant-conv-${i}`);
        if(convEl) {
            convEl.textContent = cv.toFixed(1)+'%';
            if(!convEl.nextElementSibling?.classList.contains('metric-explanation')) {
                const expEl = document.createElement('span');
                expEl.className = 'metric-explanation';
                convEl.parentElement.appendChild(expEl);
            }
        }
    });
    
    distBody.innerHTML = '';
    if(!Object.keys(sdrAgg).length) {
        distBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Sem dados</td></tr>';
    } else {
        Object.keys(sdrAgg).forEach(s => {
            const d = sdrAgg[s];
            const p4 = d.t > 0 ? (d.b4/d.t)*100 : 0;
            const p3 = d.t > 0 ? (d.b3/d.t)*100 : 0;
            const p2 = d.t > 0 ? (d.b2/d.t)*100 : 0;
            const p1 = d.t > 0 ? (d.b1/d.t)*100 : 0;
            
            distBody.innerHTML += `<tr>
                <td>${s}</td>
                <td><span class="badge green">${d.b4}</span></td>
                <td><span class="badge blue">${d.b3}</span></td>
                <td><span class="badge yellow">${d.b2}</span></td>
                <td><span class="badge red">${d.b1}</span></td>
                <td>${d.t}</td>
                <td>
                    <div class="bant-bar">
                        <div class="bant-bar-segment b4" style="width:${p4}%" data-tooltip="${d.b4} leads (${p4.toFixed(1)}%)"></div>
                        <div class="bant-bar-segment b3" style="width:${p3}%" data-tooltip="${d.b3} leads (${p3.toFixed(1)}%)"></div>
                        <div class="bant-bar-segment b2" style="width:${p2}%" data-tooltip="${d.b2} leads (${p2.toFixed(1)}%)"></div>
                        <div class="bant-bar-segment b1" style="width:${p1}%" data-tooltip="${d.b1} leads (${p1.toFixed(1)}%)"></div>
                    </div>
                </td>
            </tr>`;
        });
    }
    
    convBody.innerHTML = '';
    const badges = {4:'green', 3:'blue', 2:'yellow', 1:'red'};
    const insights = {
        4:'Alta qualificação - priorizar',
        3:'Boa qualificação - trabalhar', 
        2:'Qualificação média - nutrir',
        1:'Baixa qualificação - reavaliar'
    };
    
    [4,3,2,1].forEach(sc => {
        const d = bantMap[sc]; 
        const cv = d.l > 0 ? (d.v/d.l)*100 : 0;
        convBody.innerHTML += `<tr>
            <td><span class="badge ${badges[sc]}">BANT ${sc}</span></td>
            <td class="text-center">${d.l}</td>
            <td class="text-center">${d.v}</td>
            <td class="text-center value-green">${cv.toFixed(1)}%</td>
            <td style="font-size:10px;color:#888">${insights[sc]}</td>
        </tr>`;
    });
}

function renderChannelPerformance() {
    const eff = document.getElementById('channel-effectiveness-container');
    const tbody = document.getElementById('channel-matrix-body');
    const thead = document.getElementById('channel-matrix-head');
    if(!eff) return;

    const filtered = applyFilters(DATA_CACHE.unified);
    const chStats = {}; const sdrMatrix = {}; const allCh = new Set();
    
    filtered.forEach(i => {
        const ch = i.canal_origem || 'Não identificado'; 
        const sdr = i.sdr_name || 'Desc';
        const tl = parseInt(i.count_prospect)||0; 
        const r = parseInt(i.count_reuniao)||0; 
        const v = parseInt(i.count_venda_ganha)||0;
        
        allCh.add(ch);
        if(!chStats[ch]) chStats[ch] = {l:0, r:0, v:0};
        chStats[ch].l += tl; 
        chStats[ch].r += r; 
        chStats[ch].v += v;
        
        if(!sdrMatrix[sdr]) sdrMatrix[sdr]={};
        if(!sdrMatrix[sdr][ch]) sdrMatrix[sdr][ch]={v:0, l:0};
        sdrMatrix[sdr][ch].v += v; 
        sdrMatrix[sdr][ch].l += tl;
    });

    eff.innerHTML = '';
    if(!Object.keys(chStats).length) eff.innerHTML = '<div style="text-align:center;color:#666">Sem dados</div>';
    
    Object.keys(chStats).sort((a,b) => (chStats[b].v/chStats[b].l||0) - (chStats[a].v/chStats[a].l||0)).forEach(ch => {
        const s = chStats[ch]; const cv = s.l > 0 ? (s.v/s.l)*100 : 0;
        let color = cv >= 15 ? 'high' : (cv >= 8 ? 'medium' : 'very-low');
        const w = Math.min(cv, 100);
        
        eff.innerHTML += `
        <div class="channel-row">
            <span class="channel-name">${ch}</span>
            <div class="channel-bar-container">
                <div class="channel-bar-wrapper">
                    <div class="channel-bar-track">
                        <div class="channel-bar-fill ${color}" style="width:${w}%"></div>
                    </div>
                    <span class="channel-bar-conversion">${cv.toFixed(1)}%</span>
                </div>
                <div class="channel-stats">
                    <span>Prospects: <span class="value">${s.l}</span></span>
                    <span>Agendadas: <span class="value">${s.r}</span></span>
                    <span>Realizadas: <span class="value">${s.v}</span></span>
                </div>
            </div>
        </div>`;
    });

    const sortedCh = Array.from(allCh).sort();
    thead.innerHTML = `<tr><th>SDR</th>${sortedCh.map(c=>`<th>${c.toUpperCase()}</th>`).join('')}</tr>`;
    tbody.innerHTML = '';
    Object.keys(sdrMatrix).forEach(sdr => {
        let html = `<tr><td>${sdr}</td>`;
        sortedCh.forEach(ch => {
            const d = sdrMatrix[sdr][ch];
            if(d && d.v > 0) {
                const cv = d.l > 0 ? (d.v/d.l)*100 : 0;
                const cl = cv >= 15 ? 'green' : (cv >= 8 ? 'yellow' : 'red');
                const barWidth = Math.min(cv, 100);
                html += `<td><div class="matrix-cell-content"><span class="mini-bar ${cl}" style="width:${barWidth}%"></span><span class="matrix-value">${d.v}</span><span class="matrix-perc">(${cv.toFixed(0)}%)</span></div></td>`;
            } else { 
                html += `<td><div class="matrix-cell-content"><span class="status-dot red" style="width:6px;height:6px;box-shadow:none"></span><span class="matrix-value" style="color:#666">0</span><span class="matrix-perc">(0%)</span></div></td>`; 
            }
        });
        tbody.innerHTML += html + '</tr>';
    });
}

function renderFunnelData() {
    const filtered = applyFilters(DATA_CACHE.unified);
    const c = { prospect: 0, tentativa: 0, conectado: 0, reuniao: 0, venda: 0, sum_days: 0, count_days: 0 };
    
    filtered.forEach(i => {
        c.prospect += parseInt(i.count_prospect)||0; 
        c.tentativa += parseInt(i.count_tentativa)||0;
        c.conectado += parseInt(i.count_conectado)||0; 
        c.reuniao += parseInt(i.count_reuniao)||0;
        c.venda += parseInt(i.count_venda_ganha)||0; 
        c.sum_days += parseFloat(i.sum_days_to_close)||0;
        c.count_days += parseInt(i.count_closed_with_days)||0;
    });
    
    const maxVal = Math.max(c.prospect, c.tentativa, c.conectado, c.reuniao, c.venda) || 1;
    
    updateFunnelBar('prospect', c.prospect, maxVal); 
    updateFunnelBar('tentativa', c.tentativa, maxVal);
    updateFunnelBar('conectado', c.conectado, maxVal); 
    updateFunnelBar('reuniao', c.reuniao, maxVal);
    updateFunnelBar('venda', c.venda, maxVal);
    
    updateConversion('tentativa', c.prospect, c.tentativa); 
    updateConversion('conectado', c.tentativa, c.conectado);
    updateConversion('reuniao', c.conectado, c.reuniao);
    updateConversion('venda', c.reuniao, c.venda);
    
    const globalConv = c.prospect > 0 ? (c.venda/c.prospect)*100 : 0;
    const gEl = document.querySelector('[data-global-conversion]');
    if (gEl) gEl.textContent = globalConv.toFixed(1) + '%';
    
    const elCiclo = document.querySelector('[data-cycle-days]');
    if(elCiclo) {
        const ciclo = c.count_days > 0 ? (c.sum_days/c.count_days) : 0;
        elCiclo.textContent = ciclo.toFixed(1) + ' dias';
        elCiclo.style.color = ciclo > 5 ? '#ef4444' : '#22c55e';
    }
}

function updateFunnelBar(s, v, m) {
    const elVal = document.querySelector(`[data-value="${s}"]`);
    if(elVal) elVal.textContent = v;
    
    const percentage = (v/m)*100;
    const elStage = document.querySelector(`[data-stage="${s}"]`);
    if (elStage) elStage.style.width = `${percentage}%`;
}

function updateConversion(s, b, v, label) {
    const convPerc = b > 0 ? (v/b)*100 : 0;
    const convEl = document.querySelector(`[data-conversion="${s}"]`);
    if(convEl) {
        convEl.textContent = convPerc.toFixed(1) + '%';
        if(label && !convEl.nextElementSibling?.classList.contains('conversion-label')) {
            const labelEl = document.createElement('span');
            labelEl.className = 'conversion-label';
            labelEl.textContent = label;
            convEl.parentElement.appendChild(labelEl);
        }
    }
}

// ======================== ANÁLISE DE PERDAS (MODIFICADA) ========================
function renderLossAnalysis() {
    // 1. Renderizar Gráficos de Canal (Esquerda)
    const pContainer = document.getElementById('perdas-canal-container');
    const nContainer = document.getElementById('noshow-canal-container');
    
    if(pContainer && nContainer) {
        const filtered = applyFilters(DATA_CACHE.unified);
        const lossMap = {};
        
        filtered.forEach(i => {
            const ch = i.canal_origem || 'Não identificado';
            if(!lossMap[ch]) lossMap[ch] = {
                total_prospect: 0, 
                total_reuniao: 0, 
                perdida_venda: 0, 
                perdida_reuniao: 0
            };
            
            lossMap[ch].total_prospect += parseInt(i.count_prospect) || 0;
            lossMap[ch].total_reuniao += parseInt(i.count_reuniao) || 0;
            lossMap[ch].perdida_venda += parseInt(i.count_venda_perdida) || 0;
            lossMap[ch].perdida_reuniao += parseInt(i.count_reuniao_perdida) || 0;
        });
        
        const dataArr = Object.keys(lossMap).map(ch => {
            const s = lossMap[ch]; 
            const txPerda = s.total_prospect > 0 ? (s.perdida_venda / s.total_prospect) * 100 : 0;
            const txNoshow = s.total_reuniao > 0 ? (s.perdida_reuniao / s.total_reuniao) * 100 : 0;

            return { ch, txPerda, txNoshow, perdAbs: s.perdida_venda, noshowAbs: s.perdida_reuniao, prospects: s.total_prospect, reunioes: s.total_reuniao };
        });
        
        pContainer.innerHTML = ''; 
        nContainer.innerHTML = '';
        
        if(dataArr.length===0) { 
            pContainer.innerHTML = nContainer.innerHTML = '<div style="text-align:center;color:#666">Sem dados</div>'; 
        } else {
            dataArr.sort((a,b)=>b.txPerda - a.txPerda).forEach(i => {
                const w = Math.min(i.txPerda, 100); 
                const c = i.txPerda >= 20 ? 'high' : (i.txPerda >= 10 ? 'medium' : 'low');
                pContainer.innerHTML += `<div class="loss-bar-item">
                    <span class="loss-bar-name">${i.ch}</span>
                    <div class="loss-bar-track">
                        <div class="loss-bar-fill ${c}" style="width:${w}%" data-tooltip="${i.perdAbs} perdas de ${i.prospects} prospects (${i.txPerda.toFixed(1)}%)"></div>
                    </div>
                    <span class="loss-bar-value">${i.txPerda.toFixed(1)}%</span>
                </div>`;
            });
            
            dataArr.sort((a,b)=>b.txNoshow - a.txNoshow).forEach(i => {
                const w = Math.min(i.txNoshow, 100); 
                const c = i.txNoshow >= 20 ? 'high' : (i.txNoshow >= 10 ? 'medium' : 'low');
                nContainer.innerHTML += `<div class="loss-bar-item">
                    <span class="loss-bar-name">${i.ch}</span>
                    <div class="loss-bar-track">
                        <div class="loss-bar-fill ${c}" style="width:${w}%" data-tooltip="${i.noshowAbs} perdidas de ${i.reunioes} agendadas (${i.txNoshow.toFixed(1)}%)"></div>
                    </div>
                    <span class="loss-bar-value">${i.txNoshow.toFixed(1)}%</span>
                </div>`;
            });
        }
    }

    // 2. Renderizar Motivos de Perda (Direita) - Novo
    const mContainer = document.getElementById('motivos-perda-container');
    if(mContainer) {
        // Mapear ID -> Nome
        const idToReason = {};
        if (DATA_CACHE.lossReasons) {
            DATA_CACHE.lossReasons.forEach(r => {
                // Tenta adaptar campos comuns de retorno
                const id = r.id || r.loss_reason_id || r['id motivo'];
                const name = r.name || r.nome || r.title || 'Motivo Desconhecido';
                if(id) idToReason[id] = name;
            });
        }

        // Agregar contagens
        const reasonsAgg = {};
        let totalLosses = 0;

        // Filtra dados de perda (assumindo que lossData tem estrutura compatível)
        const lossDataFiltered = applyFilters(DATA_CACHE.lossData || []);

        lossDataFiltered.forEach(item => {
            const id = item.loss_reason_id || item.id_motivo || item.id;
            const qtd = parseInt(item.count || item.qtd || item.count_venda_perdida || 0); // Ajuste conforme campo real

            if (qtd > 0) {
                const name = idToReason[id] || `Motivo #${id}` || item.loss_reason_name || 'Não especificado';
                if (!reasonsAgg[name]) reasonsAgg[name] = 0;
                reasonsAgg[name] += qtd;
                totalLosses += qtd;
            }
        });

        mContainer.innerHTML = '';
        const entries = Object.entries(reasonsAgg).sort((a,b) => b[1] - a[1]);

        if (entries.length === 0) {
            mContainer.innerHTML = '<div style="text-align:center;color:#666;margin:auto;">Sem dados de motivos</div>';
        } else {
            entries.forEach(([name, count]) => {
                // Cálculo de percentual relativo ao total de perdas
                const perc = totalLosses > 0 ? (count / totalLosses) * 100 : 0;
                const w = Math.min(perc, 100);
                
                mContainer.innerHTML += `
                <div class="loss-bar-item">
                    <span class="loss-bar-name" style="width: 140px;">${name}</span>
                    <div class="loss-bar-track">
                        <div class="loss-bar-fill medium" style="width:${w}%" data-tooltip="${count} ocorrências (${perc.toFixed(1)}%)"></div>
                    </div>
                    <span class="loss-bar-value">${count}</span>
                </div>`;
            });
        }
    }
}