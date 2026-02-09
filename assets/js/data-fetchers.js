// URLs
const WEBHOOKS = {
    sdrPerformance: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_performance_sdr',
    bantAnalysis: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/analise-bant',
    channelPerformance: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_performance_canais',
    funnelData: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_funil_vendas',
    lossAnalysis: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_perdas_por_canal',
    metas: './api/metas.json',
    executiveBurnup: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_executiva_burnup',
    lastUpdate: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/last_update'
};

const DATA_CACHE = { metas: [], burnup: [], sdr: [], bant: [], channels: [], funnel: [], loss: [], lastUpdate: null };

async function loadAllData() {
    try {
        const responses = await Promise.all([
            fetch(WEBHOOKS.metas).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(WEBHOOKS.executiveBurnup).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(WEBHOOKS.sdrPerformance).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(WEBHOOKS.bantAnalysis).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(WEBHOOKS.channelPerformance).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(WEBHOOKS.funnelData).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(WEBHOOKS.lossAnalysis).then(r=>r.json()).catch(()=>({data:[]})),
            fetch(WEBHOOKS.lastUpdate).then(r=>r.json()).catch(()=>({data:[]}))
        ]);
        DATA_CACHE.metas = getArr(responses[0]);
        DATA_CACHE.burnup = getArr(responses[1]);
        DATA_CACHE.sdr = getArr(responses[2]);
        DATA_CACHE.bant = getArr(responses[3]);
        DATA_CACHE.channels = getArr(responses[4]);
        DATA_CACHE.funnel = getArr(responses[5]);
        DATA_CACHE.loss = getArr(responses[6]);
        const upd = getArr(responses[7]);
        if(upd.length) DATA_CACHE.lastUpdate = upd[0].data_hora_ultimo_update;
        populateDropdowns();
        renderAll();
    } catch (error) { console.error("Erro LoadData:", error); }
}

function getArr(json) { return Array.isArray(json) ? json : (json.data || []); }
function renderAll() { renderLastUpdate(); renderExecutiveView(); renderSdrPerformance(); renderBantAnalysis(); renderChannelPerformance(); renderFunnelData(); renderLossAnalysis(); }

function applyFilters(data) {
    if (!data || data.length === 0) return [];
    const start = new Date(GlobalFilter.startDate + 'T00:00:00');
    const end = new Date(GlobalFilter.endDate + 'T23:59:59');
    
    return data.filter(item => {
        // Filtro de Data
        if (item.data_referencia) {
            const d = new Date(item.data_referencia + 'T12:00:00');
            if (d < start || d > end) return false;
        }
        
        // Filtro de SDR
        if (GlobalFilter.sdrId !== 'all') {
            // Tenta pegar qualquer campo que pareça um ID de usuário
            const id = item.responsible_user_id || item.sdr_id || item.id;
            
            // Se o item tem ID, compara como string para evitar erro de tipo (123 vs "123")
            if (id) {
                if (String(id) !== String(GlobalFilter.sdrId)) return false;
            } else {
                // Se o item NÃO tem ID, mas estamos filtrando por SDR,
                // verificamos se é um dado "agregado" que deve ser ocultado ou não.
                // Por segurança, se não tem ID, geralmente removemos no filtro específico.
                // Mas para datasets globais (ex: funil geral), mantemos.
                // Para Sinaleiro/Bant/Meta que dependem de SDR, removemos.
                if (item.sdr_name || item.responsible_user_id !== undefined) return false;
            }
        }
        
        // Filtro de Canal
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
        // Mantém apenas a primeira opção "Todos"
        while(sdrSelect.options.length > 1) sdrSelect.remove(1);
        
        const unique = new Map();
        
        // ORDEM DE PRIORIDADE PARA CAPTURAR O ID CORRETO:
        // 1. Dados de Metas (Geralmente tem o ID correto e o Nome oficial)
        // 2. Dados de Performance (Sinaleiro)
        // 3. Outros
        
        // Passo 1: Popula com Metas
        DATA_CACHE.metas.forEach(i => {
            if(i.nome && i.id) {
                const cleanName = i.nome.trim();
                unique.set(cleanName, i.id);
            }
        });

        // Passo 2: Complementa com SDR Performance (se não existir ainda)
        DATA_CACHE.sdr.forEach(i => {
            if(i.sdr_name && i.responsible_user_id) {
                const cleanName = i.sdr_name.trim();
                if(!unique.has(cleanName)) {
                    unique.set(cleanName, i.responsible_user_id);
                }
            }
        });

        // Passo 3: Complementa com BANT (se ainda faltar alguém)
        DATA_CACHE.bant.forEach(i => {
            const name = i.sdr_name;
            const id = i.responsible_user_id || i.sdr_id;
            if(name && id) {
                const cleanName = name.trim();
                if(!unique.has(cleanName)) {
                    unique.set(cleanName, id);
                }
            }
        });

        // Ordena alfabeticamente e cria as opções
        const sortedNames = Array.from(unique.keys()).sort();
        sortedNames.forEach(name => {
            const id = unique.get(name);
            const opt = document.createElement('option'); 
            opt.value = id; 
            opt.textContent = name; 
            sdrSelect.appendChild(opt);
        });
    }

    const chSelect = document.getElementById('channelFilter');
    if (chSelect) {
        while(chSelect.options.length > 1) chSelect.remove(1);
        const unique = new Set();
        [...DATA_CACHE.burnup, ...DATA_CACHE.channels].forEach(i => { if(i.canal_origem || i.canal_nome) unique.add(i.canal_origem || i.canal_nome); });
        unique.forEach(ch => { const opt = document.createElement('option'); opt.value = ch; opt.textContent = ch; chSelect.appendChild(opt); });
    }
}

function renderLastUpdate() {
    const el = document.getElementById('currentDate');
    if(el) el.textContent = DATA_CACHE.lastUpdate ? `Atualizado em: ${new Date(DATA_CACHE.lastUpdate).toLocaleString('pt-BR')}` : 'Carregando...';
}

function renderExecutiveView() {
    let aggData = [];
    let filtered = applyFilters(DATA_CACHE.burnup);
    
    // FALLBACK INTELIGENTE (Se burnup vazio e tem filtro de SDR, usa dados de Canais)
    if (GlobalFilter.sdrId !== 'all' && filtered.length === 0) {
        const channelData = applyFilters(DATA_CACHE.channels);
        const dailyAgg = {};
        channelData.forEach(item => {
            const k = item.data_referencia;
            if (k) { if(!dailyAgg[k]) dailyAgg[k] = 0; dailyAgg[k] += (parseInt(item.vendas) || 0); }
        });
        aggData = Object.keys(dailyAgg).map(k => ({ data_referencia: k, qtd_realizada: dailyAgg[k] })).sort((a,b) => new Date(a.data_referencia) - new Date(b.data_referencia));
    } else {
        const dailyAgg = {};
        filtered.forEach(item => {
            const k = item.data_referencia;
            if(!dailyAgg[k]) dailyAgg[k] = 0; dailyAgg[k] += (parseInt(item.qtd_realizada) || 0);
        });
        aggData = Object.keys(dailyAgg).map(k => ({ data_referencia: k, qtd_realizada: dailyAgg[k] })).sort((a,b) => new Date(a.data_referencia) - new Date(b.data_referencia));
    }

    const realizado = aggData.reduce((sum, i) => sum + i.qtd_realizada, 0);
    const start = new Date(GlobalFilter.startDate + 'T00:00:00');
    const end = new Date(GlobalFilter.endDate + 'T23:59:59');
    
    // Filtro de Metas ROBUSTO
    let targetMetas = DATA_CACHE.metas;
    if (GlobalFilter.sdrId !== 'all') {
        targetMetas = targetMetas.filter(m => String(m.id) === String(GlobalFilter.sdrId));
    }
    
    const targetYear = end.getFullYear();
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const nomeMes = meses[end.getMonth()];
    
    // Soma meta mensal (trata se houver duplicidade ou múltiplos registros)
    const metaMensal = targetMetas
        .filter(m => m.ano === targetYear && m.mes === nomeMes)
        .reduce((sum, m) => sum + (parseInt(m.valor)||0), 0);
    
    const daysInMonth = new Date(targetYear, end.getMonth() + 1, 0).getDate();
    const daysSelected = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // Cálculo Proporcional (Regra de Três)
    let metaProp = 0;
    // Se selecionou o mês inteiro (ou mais de 28 dias), usa a meta cheia
    if (daysSelected >= 28) {
        metaProp = metaMensal;
    } else if (daysInMonth > 0) {
        // Se selecionou menos dias, proporcionaliza
        metaProp = Math.round((metaMensal / daysInMonth) * daysSelected);
    }

    const elMeta = document.getElementById('metaMes'); if(elMeta) elMeta.textContent = metaProp;
    const elReal = document.getElementById('realizadoMes'); if(elReal) elReal.textContent = realizado;
    const elPerc = document.getElementById('atingimentoPerc'); if(elPerc) elPerc.textContent = (metaProp > 0 ? (realizado/metaProp)*100 : 0).toFixed(1) + '%';
    const elPace = document.getElementById('paceEsperado'); if(elPace) elPace.textContent = metaProp;
    const elFaltam = document.getElementById('faltamReuniaoes'); if(elFaltam) elFaltam.textContent = `faltam ${Math.max(0, metaProp - realizado)} reuniões`;

    const elPaceBadge = document.getElementById('paceBadge');
    const elPaceDias = document.getElementById('paceDias');
    if (elPaceBadge && elPaceDias) {
        const diff = realizado - metaProp;
        elPaceBadge.className = diff >= 0 ? 'pace-badge ahead' : 'pace-badge behind';
        elPaceBadge.textContent = diff >= 0 ? `+${diff} adiantado` : `${diff} atrasado`;
        const diasRestantes = Math.max(0, Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24)));
        elPaceDias.textContent = `restam ${diasRestantes} dias no período`;
    }

    const granularity = document.getElementById('burnupGranularity')?.value || 'day';
    createBurnupChart(aggData, targetMetas, GlobalFilter.startDate, GlobalFilter.endDate, granularity);
}

function renderFunnelData() {
    const filtered = applyFilters(DATA_CACHE.funnel);
    const c = { prospect: 0, tentativa: 0, conectado: 0, reuniao: 0, venda: 0, sum_days: 0, count_days: 0 };
    filtered.forEach(i => {
        c.prospect += parseInt(i.count_prospect)||0; c.tentativa += parseInt(i.count_tentativa)||0;
        c.conectado += parseInt(i.count_conectado)||0; c.reuniao += parseInt(i.count_reuniao)||0;
        c.venda += parseInt(i.count_venda)||0; c.sum_days += parseFloat(i.sum_days_to_close)||0;
        c.count_days += parseInt(i.count_closed_with_days)||0;
    });
    const max = c.prospect || 1;
    updateFunnelBar('prospect', c.prospect, max); updateFunnelBar('tentativa', c.tentativa, max);
    updateFunnelBar('conectado', c.conectado, max); updateFunnelBar('reuniao', c.reuniao, max);
    updateFunnelBar('venda', c.venda, max);
    updateConversion('tentativa', c.prospect, c.tentativa); updateConversion('conectado', c.tentativa, c.conectado);
    updateConversion('reuniao', c.conectado, c.reuniao); updateConversion('venda', c.reuniao, c.venda);
    
    document.querySelector('[data-global-conversion]').textContent = (c.prospect > 0 ? (c.venda/c.prospect)*100 : 0).toFixed(1) + '%';
    const elCiclo = document.querySelector('[data-cycle-days]');
    if(elCiclo) {
        const ciclo = c.count_days > 0 ? (c.sum_days/c.count_days) : 0;
        elCiclo.textContent = ciclo.toFixed(1) + ' dias';
        elCiclo.style.color = ciclo > 5 ? '#ef4444' : '#22c55e';
    }
}

function updateFunnelBar(s, v, m) {
    document.querySelector(`[data-value="${s}"]`).textContent = v;
    document.querySelector(`[data-stage="${s}"]`).style.width = `${(v/m)*100}%`;
}
function updateConversion(s, b, v) {
    document.querySelector(`[data-conversion="${s}"]`).textContent = (b > 0 ? (v/b)*100 : 0).toFixed(1) + '%';
}

function renderChannelPerformance() {
    const eff = document.getElementById('channel-effectiveness-container');
    const tbody = document.getElementById('channel-matrix-body');
    const thead = document.getElementById('channel-matrix-head');
    if(!eff) return;

    const filtered = applyFilters(DATA_CACHE.channels);
    const chStats = {}; const sdrMatrix = {}; const allCh = new Set();
    
    filtered.forEach(i => {
        const ch = i.canal_nome || 'Desc'; const sdr = i.sdr_name || 'Desc';
        const tl = parseInt(i.total_leads)||0; const v = parseInt(i.vendas)||0;
        allCh.add(ch);
        if(!chStats[ch]) chStats[ch] = {l:0, r:parseInt(i.reunioes)||0, v:0};
        chStats[ch].l += tl; chStats[ch].r += parseInt(i.reunioes)||0; chStats[ch].v += v;
        if(!sdrMatrix[sdr]) sdrMatrix[sdr]={};
        if(!sdrMatrix[sdr][ch]) sdrMatrix[sdr][ch]={v:0, l:0};
        sdrMatrix[sdr][ch].v += v; sdrMatrix[sdr][ch].l += tl;
    });

    eff.innerHTML = '';
    if(!Object.keys(chStats).length) eff.innerHTML = '<div style="text-align:center;color:#666">Sem dados</div>';
    
    Object.keys(chStats).sort((a,b) => (chStats[b].v/chStats[b].l||0) - (chStats[a].v/chStats[a].l||0)).forEach(ch => {
        const s = chStats[ch]; const cv = s.l > 0 ? (s.v/s.l)*100 : 0;
        let color = cv >= 15 ? 'high' : (cv >= 8 ? 'medium' : 'very-low');
        const w = Math.min((cv/30)*100, 100);
        eff.innerHTML += `<div class="channel-row"><span class="channel-name">${ch}</span><div class="channel-bar-container"><div class="channel-bar-track"><div class="channel-bar-fill ${color}" style="width:${w}%"><span class="channel-bar-text">${cv.toFixed(1)}% conv.</span></div></div><div class="channel-stats"><span>Prospects: <span class="value">${s.l}</span></span><span>Agendadas: <span class="value">${s.r}</span></span><span>Realizadas: <span class="value">${s.v}</span></span></div></div></div>`;
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
                html += `<td><div class="matrix-cell-content"><span class="mini-bar ${cl}" style="width:${Math.max(Math.min((cv/20)*30, 40),4)}px"></span><span class="matrix-value">${d.v}</span><span class="matrix-perc">(${cv.toFixed(0)}%)</span></div></td>`;
            } else { html += `<td><div class="matrix-cell-content"><span class="status-dot red" style="width:6px;height:6px;box-shadow:none"></span><span class="matrix-value" style="color:#666">0</span><span class="matrix-perc">(0%)</span></div></td>`; }
        });
        tbody.innerHTML += html + '</tr>';
    });
}

function renderSdrPerformance() {
    const tbody = document.getElementById('sinaleiro-body');
    if(!tbody) return;
    const filtered = applyFilters(DATA_CACHE.sdr);
    const sdrMap = {};
    
    filtered.forEach(i => {
        // Tenta usar ID, se não tiver, usa o nome como chave para agrupar
        const id = i.responsible_user_id || i.sdr_name;
        if(!sdrMap[id]) sdrMap[id] = { name: i.sdr_name, p:0, r:0, v:0 };
        sdrMap[id].p += parseInt(i.prospects||0); 
        sdrMap[id].r += parseInt(i.reunioes||0); 
        sdrMap[id].v += parseInt(i.vendas||0);
    });
    
    tbody.innerHTML = '';
    let c = {crit:0, warn:0, succ:0};
    
    if(Object.keys(sdrMap).length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888">Sem dados para o filtro selecionado</td></tr>';
    } else {
        Object.values(sdrMap).forEach(s => {
            const pa = s.p > 0 ? (s.r/s.p)*100 : 0; 
            const ar = s.r > 0 ? (s.v/s.r)*100 : 0;
            let st='green'; 
            if(pa<20 || ar<70) { st='red'; c.crit++; } 
            else if(pa<40 || ar<90) { st='yellow'; c.warn++; } 
            else c.succ++;
            
            tbody.innerHTML += `<tr><td><span class="status-dot ${st}"></span></td><td class="sinaleiro-name">${s.name}</td><td>${s.p}</td><td>${s.r}</td><td><span class="badge ${getBadgeClassPA(pa)}">${pa.toFixed(1)}%</span></td><td>${s.v}</td><td><span class="badge ${getBadgeClassAR(ar)}">${ar.toFixed(1)}%</span></td></tr>`;
        });
    }
    
    // Atualiza contadores apenas se estiver vendo "Todos" ou se quiser ver o status do selecionado
    const elC = document.getElementById('alert-critical'); if(elC) elC.textContent = c.crit;
    const elW = document.getElementById('alert-warning'); if(elW) elW.textContent = c.warn;
    const elS = document.getElementById('alert-success'); if(elS) elS.textContent = c.succ;
}

function renderBantAnalysis() {
    const filtered = applyFilters(DATA_CACHE.bant);
    const distBody = document.getElementById('bant-distribution-body');
    const convBody = document.getElementById('bant-conversion-body');
    const bantMap = { 4:{l:0,v:0}, 3:{l:0,v:0}, 2:{l:0,v:0}, 1:{l:0,v:0} };
    const sdrAgg = {};
    filtered.forEach(i => {
        const sc = parseInt(i.bant_score)||1; const l = parseInt(i.total_leads)||0; const v = parseInt(i.vendas)||0;
        if(bantMap[sc]) { bantMap[sc].l += l; bantMap[sc].v += v; }
        const sdr = i.sdr_name || 'Desc';
        if(!sdrAgg[sdr]) sdrAgg[sdr]={t:0, b4:0, b3:0, b2:0, b1:0};
        sdrAgg[sdr].t += l; if(sc===4) sdrAgg[sdr].b4 += l; if(sc===3) sdrAgg[sdr].b3 += l; if(sc===2) sdrAgg[sdr].b2 += l; if(sc===1) sdrAgg[sdr].b1 += l;
    });
    [4,3,2,1].forEach(i => {
        const d = bantMap[i]; const cv = d.l > 0 ? (d.v/d.l)*100 : 0;
        document.getElementById(`bant-val-${i}`).textContent = d.l; document.getElementById(`bant-conv-${i}`).textContent = cv.toFixed(1)+'%';
    });
    distBody.innerHTML = '';
    if(!Object.keys(sdrAgg).length) distBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Sem dados</td></tr>';
    else {
        Object.keys(sdrAgg).forEach(s => {
            const d = sdrAgg[s];
            const p4 = (d.b4/d.t)*100, p3 = (d.b3/d.t)*100, p2 = (d.b2/d.t)*100, p1 = (d.b1/d.t)*100;
            distBody.innerHTML += `<tr><td>${s}</td><td><span class="badge green">${d.b4}</span></td><td><span class="badge blue">${d.b3}</span></td><td><span class="badge yellow">${d.b2}</span></td><td><span class="badge red">${d.b1}</span></td><td>${d.t}</td><td><div class="bant-bar"><div class="bant-bar-segment b4" style="width:${p4}%"></div><div class="bant-bar-segment b3" style="width:${p3}%"></div><div class="bant-bar-segment b2" style="width:${p2}%"></div><div class="bant-bar-segment b1" style="width:${p1}%"></div></div></td></tr>`;
        });
    }
    convBody.innerHTML = '';
    const badges = {4:'green', 3:'blue', 2:'yellow', 1:'red'};
    const insights = {4:'Alta', 3:'Média', 2:'Baixa', 1:'Crítica'};
    [4,3,2,1].forEach(sc => {
        const d = bantMap[sc]; const cv = d.l > 0 ? (d.v/d.l)*100 : 0;
        convBody.innerHTML += `<tr><td><span class="badge ${badges[sc]}">BANT ${sc}</span></td><td class="text-center">${d.l}</td><td class="text-center">${d.v}</td><td class="text-center value-green">${cv.toFixed(1)}%</td><td style="font-size:10px;color:#888">${insights[sc]}</td></tr>`;
    });
}

function renderLossAnalysis() {
    const pContainer = document.getElementById('perdas-canal-container');
    const nContainer = document.getElementById('noshow-canal-container');
    if(!pContainer) return;
    const filtered = applyFilters(DATA_CACHE.loss);
    const lossMap = {};
    filtered.forEach(i => {
        const ch = i.canal_nome || 'Desc';
        if(!lossMap[ch]) lossMap[ch] = {total:0, real:0, perd:0};
        lossMap[ch].total += parseInt(i.total_agendados)||0; lossMap[ch].real += parseInt(i.qtd_realizadas)||0; lossMap[ch].perd += parseInt(i.qtd_perdidas_143)||0;
    });
    const dataArr = Object.keys(lossMap).map(ch => {
        const s = lossMap[ch]; const noshowCount = s.total - s.real - s.perd;
        const txPerda = s.total > 0 ? (s.perd/s.total)*100 : 0; const txNoshow = s.total > 0 ? (noshowCount/s.total)*100 : 0;
        return { ch, txPerda, txNoshow };
    });
    pContainer.innerHTML = ''; nContainer.innerHTML = '';
    if(dataArr.length===0) { pContainer.innerHTML = nContainer.innerHTML = '<div style="text-align:center;color:#666">Sem dados</div>'; return; }
    dataArr.sort((a,b)=>b.txPerda - a.txPerda).forEach(i => {
        const w = Math.min(i.txPerda*2, 100); const c = i.txPerda > 15 ? 'high' : 'low';
        pContainer.innerHTML += `<div class="loss-bar-item"><span class="loss-bar-name">${i.ch}</span><div class="loss-bar-track"><div class="loss-bar-fill ${c}" style="width:${w}%"></div></div><span>${i.txPerda.toFixed(1)}%</span></div>`;
    });
    dataArr.sort((a,b)=>b.txNoshow - a.txNoshow).forEach(i => {
        const w = Math.min(i.txNoshow*2, 100); const c = i.txNoshow > 15 ? 'high' : 'low';
        nContainer.innerHTML += `<div class="loss-bar-item"><span class="loss-bar-name">${i.ch}</span><div class="loss-bar-track"><div class="loss-bar-fill ${c}" style="width:${w}%"></div></div><span>${i.txNoshow.toFixed(1)}%</span></div>`;
    });
}