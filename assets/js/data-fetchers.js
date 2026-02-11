// URLs
const WEBHOOKS = {
    sdrPerformance: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_performance_sdr',
    bantAnalysis: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/analise-bant',
    channelPerformance: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_performance_canais',
    funnelData: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_funil_vendas',
    lossAnalysis: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_perdas_por_canal',
    metas: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/metas_prevendas',
    executiveBurnup: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_executiva_burnup',
    lastUpdate: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/last_update'
};

const DATA_CACHE = {
    metas: [], burnup: [], sdr: [], bant: [], channels: [], funnel: [], loss: [], lastUpdate: null
};

async function loadAllData() {
    try {
        const responses = await Promise.all([
            fetch(WEBHOOKS.metas).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.executiveBurnup).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.sdrPerformance).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.bantAnalysis).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.channelPerformance).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.funnelData).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.lossAnalysis).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(WEBHOOKS.lastUpdate).then(r => r.json()).catch(() => ({ data: [] }))
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
        if (!id || !name) return;
        const cleanId = String(id).trim();
        const cleanName = String(name).trim();
        if (cleanId === '0' || cleanId === 'null') return;

        nameToId.set(cleanName.toLowerCase(), cleanId);
        if (!idToFullName.has(cleanId) || cleanName.length > idToFullName.get(cleanId).length) {
            idToFullName.set(cleanId, cleanName);
        }
    };

    DATA_CACHE.metas.forEach(i => learnIdentity(i['user id'] || i.id, i.user || i.nome));
    DATA_CACHE.sdr.forEach(i => learnIdentity(i.responsible_user_id, i.sdr_name));
    
    const patchItem = (item) => {
        let currentId = item.responsible_user_id || item.sdr_id || item.id || item['user id'];
        
        if (currentId && String(currentId) !== '0') {
            const strId = String(currentId).trim();
            if (idToFullName.has(strId)) {
                const officialName = idToFullName.get(strId);
                if (item.sdr_name !== undefined) item.sdr_name = officialName;
                if (item.nome !== undefined) item.nome = officialName;
                if (item.user !== undefined) item.user = officialName;
            }
        }
    };

    DATA_CACHE.metas.forEach(patchItem);
    DATA_CACHE.sdr.forEach(patchItem);
    DATA_CACHE.channels.forEach(patchItem);
}

function renderAll() {
    renderLastUpdate();
    renderExecutiveView();
    renderSdrPerformance();
    renderBantAnalysis();
    renderChannelPerformance();
    renderFunnelData();
    renderLossAnalysis();
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
            const id = item.responsible_user_id || item.sdr_id || item.id || item['user id'];
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
        
        [...DATA_CACHE.metas, ...DATA_CACHE.sdr].forEach(i => {
            const id = i.responsible_user_id || i.sdr_id || i.id || i['user id'];
            const name = i.sdr_name || i.nome || i.user;
            
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
        while (chSelect.options.length > 1) {
            chSelect.remove(1);
        }
        const unique = new Set();
        [...DATA_CACHE.burnup, ...DATA_CACHE.channels].forEach(i => {
            const ch = i.canal_origem || i.canal_nome;
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

function renderExecutiveView() {
    let aggData = [];
    
    let sourceData = DATA_CACHE.burnup;
    
    if (GlobalFilter.sdrId !== 'all') {
        const hasId = sourceData.some(i => i.responsible_user_id);
        if(!hasId) sourceData = DATA_CACHE.channels;
    }

    const filtered = applyFilters(sourceData);
    const dailyAgg = {};
    
    filtered.forEach(item => {
        const k = item.data_referencia;
        const qtd = parseInt(item.qtd_realizada || item.vendas) || 0;
        if (k) {
            if(!dailyAgg[k]) dailyAgg[k] = 0;
            dailyAgg[k] += qtd;
        }
    });
    
    aggData = Object.keys(dailyAgg).map(k => ({ data_referencia: k, qtd_realizada: dailyAgg[k] })).sort((a,b) => new Date(a.data_referencia) - new Date(b.data_referencia));
    const realizado = aggData.reduce((sum, i) => sum + i.qtd_realizada, 0);

    const start = new Date(GlobalFilter.startDate + 'T00:00:00');
    const end = new Date(GlobalFilter.endDate + 'T23:59:59');
    
    let targetMetas = DATA_CACHE.metas;
    if (GlobalFilter.sdrId !== 'all') {
        targetMetas = targetMetas.filter(m => String(m['user id'] || m.id) === String(GlobalFilter.sdrId));
    }
    
    const parseDateBR = (dateStr) => {
        if(!dateStr) return null;
        const parts = dateStr.split('/');
        if(parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        return null;
    };

    let metaPeriodo = 0;
    let paceIdealPeriodo = 0;
    
    const today = new Date();
    const paceDateLimit = end < today ? end : today;

    // SOMA A META SOMENTE DAS DATAS INCLUSAS NO FILTRO
    targetMetas.forEach(m => {
        const d = parseDateBR(m.data);
        if(d && d >= start && d <= end) {
            metaPeriodo += parseInt(m['pace esperado']) || 0;
        }
        if(d && d >= start && d <= paceDateLimit) {
            paceIdealPeriodo += parseInt(m['pace esperado']) || 0;
        }
    });

    const elMeta = document.getElementById('metaMes'); if(elMeta) elMeta.textContent = metaPeriodo;
    const elReal = document.getElementById('realizadoMes'); if(elReal) elReal.textContent = realizado;
    
    const ating = metaPeriodo > 0 ? (realizado/metaPeriodo)*100 : 0;
    const elPerc = document.getElementById('atingimentoPerc'); 
    if(elPerc) elPerc.textContent = ating.toFixed(1) + '%';
    
    const elPace = document.getElementById('paceEsperado'); if(elPace) elPace.textContent = paceIdealPeriodo;
    const elFaltam = document.getElementById('faltamReuniaoes'); if(elFaltam) elFaltam.textContent = `faltam ${Math.max(0, metaPeriodo - realizado)} reuniões`;

    const elPaceBadge = document.getElementById('paceBadge');
    const elPaceDias = document.getElementById('paceDias');
    if (elPaceBadge && elPaceDias) {
        const diff = realizado - paceIdealPeriodo;
        elPaceBadge.className = diff >= 0 ? 'pace-badge ahead' : 'pace-badge behind';
        // Utiliza Math.abs para não exibir "-4 atrasado" e sim "4 atrasado"
        elPaceBadge.textContent = diff >= 0 ? `+${diff} adiantado` : `${Math.abs(diff)} atrasado`; 
        const diasRestantes = Math.max(0, Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24)));
        elPaceDias.textContent = `restam ${diasRestantes} dias no período`;
    }
    
    const barAting = document.getElementById('atingimentoBar');
    if(barAting) barAting.style.width = Math.min(ating, 100) + '%';
    
    const barPace = document.getElementById('paceBar');
    if(barPace) {
        const pctMes = metaPeriodo > 0 ? (paceIdealPeriodo / metaPeriodo) * 100 : 0;
        barPace.style.width = Math.min(pctMes, 100) + '%';
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
    document.querySelector('[data-global-conversion]').textContent = globalConv.toFixed(1) + '%';
    
    const elCiclo = document.querySelector('[data-cycle-days]');
    if(elCiclo) {
        const ciclo = c.count_days > 0 ? (c.sum_days/c.count_days) : 0;
        elCiclo.textContent = ciclo.toFixed(1) + ' dias';
        elCiclo.style.color = ciclo > 5 ? '#ef4444' : '#22c55e';
    }
}

function updateFunnelBar(s, v, m) {
    document.querySelector(`[data-value="${s}"]`).textContent = v;
    const percentage = (v/m)*100;
    document.querySelector(`[data-stage="${s}"]`).style.width = `${percentage}%`;
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
        const w = Math.min(cv, 100);
        eff.innerHTML += `<div class="channel-row">
            <span class="channel-name">${ch}</span>
            <div class="channel-bar-container">
                <div class="channel-bar-track">
                    <div class="channel-bar-fill ${color}" style="width:${w}%">
                        <span class="channel-bar-text" style="color: black;">${cv.toFixed(1)}%</span>
                    </div>
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

function renderSdrPerformance() {
    const tbody = document.getElementById('sinaleiro-body');
    if(!tbody) return;
    const filtered = applyFilters(DATA_CACHE.sdr);
    const lossFiltered = applyFilters(DATA_CACHE.loss);
    
    const sdrMap = {};
    const sdrNoShow = {};
    
    lossFiltered.forEach(i => {
        const sdr = i.sdr_name || 'Desc';
        if(!sdrNoShow[sdr]) sdrNoShow[sdr] = {total: 0, real: 0, perd: 0};
        sdrNoShow[sdr].total += parseInt(i.total_agendados)||0;
        sdrNoShow[sdr].real += parseInt(i.qtd_realizadas)||0;
        sdrNoShow[sdr].perd += parseInt(i.qtd_perdidas_143)||0;
    });
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    filtered.forEach(i => {
        const key = i.responsible_user_id && String(i.responsible_user_id) !== '0' ? i.responsible_user_id : i.sdr_name;
        
        if(!sdrMap[key]) sdrMap[key] = { name: i.sdr_name, pTotal:0, pMes:0, r:0, v:0 };
        
        const prospects = parseInt(i.prospects||0);
        sdrMap[key].pTotal += prospects;
        
        if(i.data_referencia) {
            const dataRef = new Date(i.data_referencia);
            if(dataRef.getMonth() === currentMonth && dataRef.getFullYear() === currentYear) {
                sdrMap[key].pMes += prospects;
            }
        }
        
        sdrMap[key].r += parseInt(i.reunioes||0);
        sdrMap[key].v += parseInt(i.vendas||0);
        
        if (i.sdr_name && i.sdr_name.length > sdrMap[key].name.length) {
            sdrMap[key].name = i.sdr_name;
        }
    });

    tbody.innerHTML = '';
    let c = {crit:0, warn:0, succ:0};
    
    if(Object.keys(sdrMap).length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#888">Sem dados</td></tr>';
    } else {
        Object.values(sdrMap).forEach(s => {
            const pa = s.pTotal > 0 ? (s.r/s.pTotal)*100 : 0; 
            const ar = s.r > 0 ? (s.v/s.r)*100 : 0;
            
            const noshowData = sdrNoShow[s.name] || {total: 0, real: 0, perd: 0};
            const noshow = noshowData.total - noshowData.real - noshowData.perd;
            
            let st='green'; 
            if(pa<20 || ar<70) { st='red'; c.crit++; } 
            else if(pa<40 || ar<90) { st='yellow'; c.warn++; } 
            else c.succ++;
            
            tbody.innerHTML += `<tr>
                <td><span class="status-dot ${st}"></span></td>
                <td class="sinaleiro-name">${s.name}</td>
                <td>${s.pTotal}</td>
                <td>${s.pMes}</td>
                <td>${s.r}</td>
                <td><span class="badge ${getBadgeClassPA(pa)}">${pa.toFixed(1)}%</span></td>
                <td>${s.v}</td>
                <td><span class="badge ${getBadgeClassAR(ar)}">${ar.toFixed(1)}%</span></td>
                <td><span class="badge ${noshow >= 3 ? 'red' : (noshow >= 1 ? 'yellow' : 'green')}">${noshow}</span></td>
            </tr>`;
        });
    }
    
    document.getElementById('alert-critical').textContent = c.crit;
    document.getElementById('alert-warning').textContent = c.warn;
    document.getElementById('alert-success').textContent = c.succ;
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
        document.getElementById(`bant-val-${i}`).textContent = d.l; 
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

function renderLossAnalysis() {
    const pContainer = document.getElementById('perdas-canal-container');
    const nContainer = document.getElementById('noshow-canal-container');
    if(!pContainer) return;
    
    const filtered = applyFilters(DATA_CACHE.loss);
    const lossMap = {};
    
    filtered.forEach(i => {
        const ch = i.canal_nome || 'Desc';
        if(!lossMap[ch]) lossMap[ch] = {total:0, real:0, perd:0};
        lossMap[ch].total += parseInt(i.total_agendados)||0; 
        lossMap[ch].real += parseInt(i.qtd_realizadas)||0; 
        lossMap[ch].perd += parseInt(i.qtd_perdidas_143)||0;
    });
    
    const dataArr = Object.keys(lossMap).map(ch => {
        const s = lossMap[ch]; 
        const noshowCount = s.total - s.real - s.perd;
        const txPerda = s.total > 0 ? (s.perd/s.total)*100 : 0; 
        const txNoshow = s.total > 0 ? (noshowCount/s.total)*100 : 0;
        return { ch, txPerda, txNoshow, perdAbs: s.perd, noshowAbs: noshowCount, total: s.total };
    });
    
    pContainer.innerHTML = ''; 
    nContainer.innerHTML = '';
    
    if(dataArr.length===0) { 
        pContainer.innerHTML = nContainer.innerHTML = '<div style="text-align:center;color:#666">Sem dados</div>'; 
        return; 
    }
    
    dataArr.sort((a,b)=>b.txPerda - a.txPerda).forEach(i => {
        const w = Math.min(i.txPerda, 100); 
        const c = i.txPerda >= 20 ? 'high' : (i.txPerda >= 10 ? 'medium' : 'low');
        pContainer.innerHTML += `<div class="loss-bar-item">
            <span class="loss-bar-name">${i.ch}</span>
            <div class="loss-bar-track">
                <div class="loss-bar-fill ${c}" style="width:${w}%" data-tooltip="${i.perdAbs} perdas de ${i.total} agendadas (${i.txPerda.toFixed(1)}%)"></div>
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
                <div class="loss-bar-fill ${c}" style="width:${w}%" data-tooltip="${i.noshowAbs} no-shows de ${i.total} agendadas (${i.txNoshow.toFixed(1)}%)"></div>
            </div>
            <span class="loss-bar-value">${i.txNoshow.toFixed(1)}%</span>
        </div>`;
    });
}