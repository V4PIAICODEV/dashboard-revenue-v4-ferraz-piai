// URLs
const WEBHOOKS = {
    // Atualização (Padrão)
    unifiedData: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_funil_vendas_acumulado', 
    bantAnalysis: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/analise-bant',
    viewMotivosPerdas: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/eeb6e911-d3a2-48fe-bba4-1be69dde309c', // URL atualizada
    
    // Criação (Safra)
    unifiedDataCreated: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/funil-vendas-created_at',
    bantAnalysisCreated: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/bant-created_at',
    viewMotivosPerdasCreated: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/motivos-perca-created_at',

    // Auxiliares
    metas: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/metas_prevendas',
    lastUpdate: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/last_update',
    lostReasonMap: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/lost-reason-map',
    viewProspectAtual: 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/view_prospect_atual'
};

const DATA_CACHE = {
    unified_updated: [], 
    unified_created: [],
    bant_updated: [], 
    bant_created: [],
    lossData_updated: [],
    lossData_created: [],
    metas: [], 
    lastUpdate: null,
    lossReasons: [],
    prospectsBucket: []
};

async function loadAllData() {
    try {
        const responses = await Promise.all([
            fetch(WEBHOOKS.metas).then(r => r.json()).catch(e => ({ data: [] })), // 0
            fetch(WEBHOOKS.unifiedData).then(r => r.json()).catch(e => ({ data: [] })), // 1
            fetch(WEBHOOKS.unifiedDataCreated).then(r => r.json()).catch(e => ({ data: [] })), // 2
            fetch(WEBHOOKS.bantAnalysis).then(r => r.json()).catch(e => ({ data: [] })), // 3
            fetch(WEBHOOKS.bantAnalysisCreated).then(r => r.json()).catch(e => ({ data: [] })), // 4
            fetch(WEBHOOKS.lastUpdate).then(r => r.json()).catch(e => ({ data: [] })), // 5
            fetch(WEBHOOKS.lostReasonMap).then(r => r.json()).catch(e => ({ data: [] })), // 6
            fetch(WEBHOOKS.viewMotivosPerdas).then(r => r.json()).catch(e => ({ data: [] })), // 7
            fetch(WEBHOOKS.viewMotivosPerdasCreated).then(r => r.json()).catch(e => ({ data: [] })), // 8
            fetch(WEBHOOKS.viewProspectAtual).then(r => r.json()).catch(e => ({ data: [] })) // 9
        ]);

        DATA_CACHE.metas = getArr(responses[0]);
        DATA_CACHE.unified_updated = getArr(responses[1]);
        DATA_CACHE.unified_created = getArr(responses[2]);
        DATA_CACHE.bant_updated = getArr(responses[3]);
        DATA_CACHE.bant_created = getArr(responses[4]);
        
        const upd = getArr(responses[5]);
        if(upd && upd.length) DATA_CACHE.lastUpdate = upd[0].data_hora_ultimo_update;

        DATA_CACHE.lossReasons = getArr(responses[6]);
        DATA_CACHE.lossData_updated = getArr(responses[7]);
        DATA_CACHE.lossData_created = getArr(responses[8]);
        DATA_CACHE.prospectsBucket = getArr(responses[9]);

        normalizeDataCache();
        populateDropdowns();
        renderAll();

    } catch (error) { 
        console.error("Erro Crítico em LoadData:", error); 
    }
}

function getArr(json) { 
    if (!json) return [];
    if (Array.isArray(json)) {
        if (json.length > 0 && json[0].data && Array.isArray(json[0].data)) {
            return json[0].data;
        }
        return json;
    }
    return json.data || []; 
}

function normalizeDataCache() {
    try {
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
        DATA_CACHE.unified_updated.forEach(i => learnIdentity(i.sdr_id, i.sdr_name));
        DATA_CACHE.unified_created.forEach(i => learnIdentity(i.sdr_id, i.sdr_name));
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
        DATA_CACHE.unified_updated.forEach(patchItem);
        DATA_CACHE.unified_created.forEach(patchItem);
        DATA_CACHE.prospectsBucket.forEach(patchItem);
        
        DATA_CACHE.lossData_updated.forEach(patchItem);
        DATA_CACHE.lossData_created.forEach(patchItem);
        
    } catch(e) { console.error("Erro no Normalize:", e); }
}

function getActiveUnified() { return GlobalFilter.dateType === 'created' ? DATA_CACHE.unified_created : DATA_CACHE.unified_updated; }
function getActiveBant() { return GlobalFilter.dateType === 'created' ? DATA_CACHE.bant_created : DATA_CACHE.bant_updated; }
function getActiveLoss() { return GlobalFilter.dateType === 'created' ? DATA_CACHE.lossData_created : DATA_CACHE.lossData_updated; }

function renderAll() {
    try { renderLastUpdate(); } catch(e) { console.error("Erro LastUpdate:", e); }
    try { renderExecutiveView(); } catch(e) { console.error("Erro Executive:", e); }
    try { renderSdrPerformance(); } catch(e) { console.error("Erro SDR Perf:", e); }
    try { renderBantAnalysis(); } catch(e) { console.error("Erro BANT:", e); }
    try { renderChannelPerformance(); } catch(e) { console.error("Erro Channel:", e); }
    try { renderFunnelData(); } catch(e) { console.error("Erro Funnel:", e); }
    try { renderLossAnalysis(); } catch(e) { console.error("Erro Loss:", e); }
    try { renderProspectsBucket(); } catch(e) { console.error("Erro Bucket:", e); }
}

function applyFilters(data) {
    if (!data || data.length === 0) return [];
    if (!GlobalFilter.startDate || !GlobalFilter.endDate) return data;
    
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
        
        [...DATA_CACHE.metas, ...DATA_CACHE.unified_updated, ...DATA_CACHE.prospectsBucket].forEach(i => {
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
        DATA_CACHE.unified_updated.forEach(i => {
            if(i.canal_origem) unique.add(i.canal_origem);
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
    if(el) el.textContent = DATA_CACHE.lastUpdate ? `Atualizado em: ${new Date(DATA_CACHE.lastUpdate).toLocaleString('pt-BR')} (Atualizações a cada 1 Hora)` : 'Carregando...';
}

function renderExecutiveView() {
    const filtered = applyFilters(getActiveUnified());
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

    const end = new Date(GlobalFilter.endDate + 'T23:59:59');
    
    let targetMetas = DATA_CACHE.metas;
    if (GlobalFilter.sdrId !== 'all') {
        targetMetas = targetMetas.filter(m => String(m['user id'] || m.id) === String(GlobalFilter.sdrId));
    }
    
    const mesAlvo = end.getMonth(); 
    const anoAlvo = end.getFullYear();
    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const nomeMesAlvo = nomesMeses[mesAlvo];

    let metaMesInteiro = 0;
    
    targetMetas.forEach(m => {
        let isSameMonth = false;
        if (m.mes && m.ano) {
            if (m.mes === nomeMesAlvo && parseInt(m.ano) === anoAlvo) isSameMonth = true;
        } else if (m.data) {
            const parts = m.data.split('/');
            if(parts.length === 3) {
                const mDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
                if (mDate.getMonth() === mesAlvo && mDate.getFullYear() === anoAlvo) isSameMonth = true;
            }
        }

        if (isSameMonth) {
            metaMesInteiro += (parseInt(m.valor) || parseInt(m['pace esperado']) || 0);
        }
    });

    const paceIdealPeriodo = calculatePace(metaMesInteiro, end, anoAlvo, mesAlvo);
    updateExecutiveDOM(metaMesInteiro, realizado, paceIdealPeriodo, anoAlvo, mesAlvo);

    const granularity = document.getElementById('burnupGranularity')?.value || 'day';
    if (typeof createBurnupChart === 'function') {
        createBurnupChart(aggData, targetMetas, GlobalFilter.startDate, GlobalFilter.endDate, granularity);
    }
}

function calculatePace(metaTotal, endDate, ano, mes) {
    if (metaTotal === 0) return 0;
    const today = new Date();
    const limitDate = endDate < today ? endDate : today;
    
    const totalDays = getBusinessDays(new Date(ano, mes, 1), new Date(ano, mes + 1, 0));
    const passedDays = getBusinessDays(new Date(ano, mes, 1), limitDate);
    
    return totalDays > 0 ? Math.round((metaTotal / totalDays) * passedDays) : 0;
}

function updateExecutiveDOM(meta, realizado, pace, ano, mes) {
    const elMeta = document.getElementById('metaMes'); if(elMeta) elMeta.textContent = meta;
    const elReal = document.getElementById('realizadoMes'); if(elReal) elReal.textContent = realizado;
    
    const ating = meta > 0 ? (realizado/meta)*100 : 0;
    const elPerc = document.getElementById('atingimentoPerc'); if(elPerc) elPerc.textContent = ating.toFixed(1) + '%';
    
    const elPace = document.getElementById('paceEsperado'); if(elPace) elPace.textContent = pace;
    const elFaltam = document.getElementById('faltamReuniaoes'); if(elFaltam) elFaltam.textContent = `faltam ${Math.max(0, meta - realizado)} reuniões`;

    const elPaceBadge = document.getElementById('paceBadge');
    const elPaceDias = document.getElementById('paceDias');
    
    if (elPaceBadge && elPaceDias) {
        const diff = realizado - pace;
        elPaceBadge.className = diff >= 0 ? 'pace-badge ahead' : 'pace-badge behind';
        elPaceBadge.textContent = diff >= 0 ? `+${diff} adiantado` : `${Math.abs(diff)} atrasado`; 
        
        const today = new Date();
        const endOfMonth = new Date(ano, mes + 1, 0);
        const diasUteisRestantes = getBusinessDays(today, endOfMonth) - (today.getDay()!==0&&today.getDay()!==6 ? 1 : 0);
        elPaceDias.textContent = `restam ~${Math.max(0, diasUteisRestantes)} dias úteis no mês`;
    }
    
    const barAting = document.getElementById('atingimentoBar'); if(barAting) barAting.style.width = Math.min(ating, 100) + '%';
    const barPace = document.getElementById('paceBar'); if(barPace) {
        const pctMes = meta > 0 ? (pace / meta) * 100 : 0;
        barPace.style.width = Math.min(pctMes, 100) + '%';
    }
}

function renderSdrPerformance() {
    const tbody = document.getElementById('sinaleiro-body');
    if(!tbody) return;
    
    const start = new Date(GlobalFilter.startDate + 'T00:00:00');
    const end = new Date(GlobalFilter.endDate + 'T23:59:59');
    
    const sdrMap = {};
    
    getActiveUnified().forEach(i => {
        if (GlobalFilter.sdrId !== 'all') {
            const id = i.sdr_id || i.responsible_user_id || i.id || i['user id'];
            if ((!id || String(id) === '0') && GlobalFilter.sdrId !== 'all') return;
            if (id && String(id) !== String(GlobalFilter.sdrId)) return;
        }
        if (GlobalFilter.channelId !== 'all') {
            const ch = i.canal_origem || i.canal_nome || 'Não identificado';
            if (ch !== GlobalFilter.channelId) return;
        }

        const key = i.sdr_id && String(i.sdr_id) !== '0' ? i.sdr_id : (i.sdr_name || 'Desconhecido');
        const chName = i.canal_origem || i.canal_nome || 'Não identificado';

        if(!sdrMap[key]) sdrMap[key] = { name: i.sdr_name || 'SDR', pTotal:0, r:0, v:0, ag_perd:0, channels: {} };
        if(!sdrMap[key].channels[chName]) sdrMap[key].channels[chName] = { pTotal:0, r:0, v:0, ag_perd:0 };
        
        let isDateInPeriod = false;
        if(i.data_referencia) {
            const dataRef = new Date(i.data_referencia + 'T12:00:00');
            if(dataRef >= start && dataRef <= end) isDateInPeriod = true;
        }
        
        if (isDateInPeriod) {
            const p = parseInt(i.count_prospect)||0;
            const r = parseInt(i.count_reuniao)||0;
            const v = parseInt(i.count_venda_ganha)||0;
            const ag = parseInt(i.count_reuniao_perdida)||0;

            sdrMap[key].pTotal += p;
            sdrMap[key].r += r;
            sdrMap[key].v += v;
            sdrMap[key].ag_perd += ag;

            sdrMap[key].channels[chName].pTotal += p;
            sdrMap[key].channels[chName].r += r;
            sdrMap[key].channels[chName].v += v;
            sdrMap[key].channels[chName].ag_perd += ag;
        }
        
        if (i.sdr_name && (!sdrMap[key].name || i.sdr_name.length > sdrMap[key].name.length)) {
            sdrMap[key].name = i.sdr_name;
        }
    });

    tbody.innerHTML = '';
    
    const validSdrs = Object.values(sdrMap).filter(s => s.pTotal > 0 || s.r > 0 || s.v > 0 || s.ag_perd > 0);

    if(validSdrs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888">Sem dados</td></tr>';
    } else {
        let index = 0;
        validSdrs.forEach(s => {
            const pa = s.pTotal > 0 ? (s.r/s.pTotal)*100 : 0; 
            const ar = s.r > 0 ? (s.v/s.r)*100 : 0;
            const noshow = s.ag_perd;
            
            let st='green'; 
            if(pa<20 || ar<70) st='red';
            else if(pa<40 || ar<90) st='yellow';
            
            // Renderiza o SDR Principal (Pai) com Drilldown
            tbody.innerHTML += `<tr class="drilldown-parent" onclick="toggleDrilldown('sdr-child-${index}', this)" style="cursor: pointer;">
                <td><span class="expand-icon">▶</span><span class="status-dot ${st}"></span></td>
                <td class="sinaleiro-name">${s.name}</td>
                <td>${s.pTotal}</td>
                <td>${s.r}</td>
                <td><span class="badge ${getBadgeClassPA(pa)}">${pa.toFixed(1)}%</span></td>
                <td>${s.v}</td>
                <td><span class="badge ${getBadgeClassAR(ar)}">${ar.toFixed(1)}%</span></td>
                <td><span class="badge ${noshow >= 3 ? 'red' : (noshow >= 1 ? 'yellow' : 'green')}">${Math.max(0, noshow)}</span></td>
            </tr>`;

            // Renderiza os Canais do SDR (Filhos)
            Object.keys(s.channels).sort((a,b) => s.channels[b].pTotal - s.channels[a].pTotal).forEach(ch => {
                const cData = s.channels[ch];
                if (cData.pTotal === 0 && cData.r === 0 && cData.v === 0 && cData.ag_perd === 0) return;

                const cpa = cData.pTotal > 0 ? (cData.r/cData.pTotal)*100 : 0;
                const car = cData.r > 0 ? (cData.v/cData.r)*100 : 0;
                const cnoshow = cData.ag_perd;

                tbody.innerHTML += `<tr class="sdr-child-${index}" style="display:none; background: #0a0a0a;">
                    <td></td>
                    <td style="padding-left: 20px; font-size: 11px; color: #888;">↳ ${ch}</td>
                    <td style="font-size: 11px; color: #ccc;">${cData.pTotal}</td>
                    <td style="font-size: 11px; color: #ccc;">${cData.r}</td>
                    <td><span class="badge ${getBadgeClassPA(cpa)}" style="font-size:10px;">${cpa.toFixed(1)}%</span></td>
                    <td style="font-size: 11px; color: #ccc;">${cData.v}</td>
                    <td><span class="badge ${getBadgeClassAR(car)}" style="font-size:10px;">${car.toFixed(1)}%</span></td>
                    <td><span class="badge ${cnoshow >= 3 ? 'red' : (cnoshow >= 1 ? 'yellow' : 'green')}" style="font-size:10px;">${Math.max(0, cnoshow)}</span></td>
                </tr>`;
            });
            index++;
        });
    }
}

function renderProspectsBucket() {
    const container = document.getElementById('balde-prospects-list');
    const totalEl = document.getElementById('balde-total-value');
    if (!container || !totalEl) return;
    
    let data = DATA_CACHE.prospectsBucket || [];
    
    if (GlobalFilter.sdrId !== 'all') {
        data = data.filter(d => String(d.sdr_id) === String(GlobalFilter.sdrId));
    }
    if (GlobalFilter.channelId !== 'all') {
        data = data.filter(d => d.canal_origem === GlobalFilter.channelId);
    }

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
        container.innerHTML = '<tr><td style="text-align:center; color:#666; padding: 20px;">Carteira Vazia</td></tr>';
        return;
    }

    Object.entries(sdrAgg)
        .sort((a,b) => b[1] - a[1])
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
    const filtered = applyFilters(getActiveBant());
    const distBody = document.getElementById('bant-distribution-body');
    const convBody = document.getElementById('bant-conversion-body');
    
    const bantMap = { 4:{l:0,v:0}, 3:{l:0,v:0}, 2:{l:0,v:0}, 1:{l:0,v:0} };
    const sdrAgg = {};
    
    filtered.forEach(i => {
        const sc = parseInt(i.bant_score)||1; 
        const l = parseInt(i.total_leads)||0; 
        const v = parseInt(i.vendas)||0;
        const sdr = i.sdr_name || 'Desconhecido';
        const ch = i.canal_origem || 'Não identificado';

        if(bantMap[sc]) { bantMap[sc].l += l; bantMap[sc].v += v; }
        
        if(!sdrAgg[sdr]) sdrAgg[sdr] = { t:0, b4:0, b3:0, b2:0, b1:0, channels: {} };
        if(!sdrAgg[sdr].channels[ch]) sdrAgg[sdr].channels[ch] = { t:0, b4:0, b3:0, b2:0, b1:0 };

        sdrAgg[sdr].t += l;
        sdrAgg[sdr].channels[ch].t += l;

        if(sc===4) { sdrAgg[sdr].b4 += l; sdrAgg[sdr].channels[ch].b4 += l; }
        if(sc===3) { sdrAgg[sdr].b3 += l; sdrAgg[sdr].channels[ch].b3 += l; }
        if(sc===2) { sdrAgg[sdr].b2 += l; sdrAgg[sdr].channels[ch].b2 += l; }
        if(sc===1) { sdrAgg[sdr].b1 += l; sdrAgg[sdr].channels[ch].b1 += l; }
    });
    
    [4,3,2,1].forEach(i => {
        const d = bantMap[i]; 
        const cv = d.l > 0 ? (d.v/d.l)*100 : 0;
        const elVal = document.getElementById(`bant-val-${i}`);
        if (elVal) elVal.textContent = d.l; 
        const convEl = document.getElementById(`bant-conv-${i}`);
        if(convEl) convEl.textContent = cv.toFixed(1)+'%';
    });
    
    distBody.innerHTML = '';
    if(!Object.keys(sdrAgg).length) {
        distBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Sem dados</td></tr>';
    } else {
        let index = 0;
        Object.keys(sdrAgg).forEach(s => {
            const d = sdrAgg[s];
            const p4 = d.t > 0 ? (d.b4/d.t)*100 : 0;
            const p3 = d.t > 0 ? (d.b3/d.t)*100 : 0;
            const p2 = d.t > 0 ? (d.b2/d.t)*100 : 0;
            const p1 = d.t > 0 ? (d.b1/d.t)*100 : 0;
            
            // LINHA PAI
            distBody.innerHTML += `<tr class="drilldown-parent" onclick="toggleDrilldown('bant-child-${index}', this)" style="cursor: pointer;">
                <td><span class="expand-icon">▶</span>${s}</td>
                <td><span class="badge green">${d.b4}</span></td>
                <td><span class="badge blue">${d.b3}</span></td>
                <td><span class="badge yellow">${d.b2}</span></td>
                <td><span class="badge red">${d.b1}</span></td>
                <td>${d.t}</td>
                <td>
                    <div class="bant-bar">
                        <div class="bant-bar-segment b4" style="width:${p4}%" data-tooltip="${d.b4} (${p4.toFixed(0)}%)"></div>
                        <div class="bant-bar-segment b3" style="width:${p3}%" data-tooltip="${d.b3} (${p3.toFixed(0)}%)"></div>
                        <div class="bant-bar-segment b2" style="width:${p2}%" data-tooltip="${d.b2} (${p2.toFixed(0)}%)"></div>
                        <div class="bant-bar-segment b1" style="width:${p1}%" data-tooltip="${d.b1} (${p1.toFixed(0)}%)"></div>
                    </div>
                </td>
            </tr>`;

            // LINHAS FILHAS (CANAIS - DRILLDOWN)
            Object.keys(d.channels).sort((a,b) => d.channels[b].t - d.channels[a].t).forEach(ch => {
                const cData = d.channels[ch];
                const cp4 = cData.t > 0 ? (cData.b4/cData.t)*100 : 0;
                const cp3 = cData.t > 0 ? (cData.b3/cData.t)*100 : 0;
                const cp2 = cData.t > 0 ? (cData.b2/cData.t)*100 : 0;
                const cp1 = cData.t > 0 ? (cData.b1/cData.t)*100 : 0;

                distBody.innerHTML += `<tr class="bant-child-${index}" style="display:none; background: #0a0a0a;">
                    <td style="padding-left: 25px; font-size: 11px; color: #888;">↳ ${ch}</td>
                    <td><span style="color:#22c55e; font-size:11px;">${cData.b4}</span></td>
                    <td><span style="color:#3b82f6; font-size:11px;">${cData.b3}</span></td>
                    <td><span style="color:#fbbf24; font-size:11px;">${cData.b2}</span></td>
                    <td><span style="color:#ef4444; font-size:11px;">${cData.b1}</span></td>
                    <td style="font-size: 11px;">${cData.t}</td>
                    <td>
                        <div class="bant-bar" style="height: 6px; opacity: 0.7;">
                            <div class="bant-bar-segment b4" style="width:${cp4}%" data-tooltip="${cData.b4} (${cp4.toFixed(0)}%)"></div>
                            <div class="bant-bar-segment b3" style="width:${cp3}%" data-tooltip="${cData.b3} (${cp3.toFixed(0)}%)"></div>
                            <div class="bant-bar-segment b2" style="width:${cp2}%" data-tooltip="${cData.b2} (${cp2.toFixed(0)}%)"></div>
                            <div class="bant-bar-segment b1" style="width:${cp1}%" data-tooltip="${cData.b1} (${cp1.toFixed(0)}%)"></div>
                        </div>
                    </td>
                </tr>`;
            });
            index++;
        });
    }
    
    convBody.innerHTML = '';
    const badges = {4:'green', 3:'blue', 2:'yellow', 1:'red'};
    const insights = {4:'Prioridade',3:'Trabalhar',2:'Nutrir',1:'Reavaliar'};
    
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

    const filtered = applyFilters(getActiveUnified());
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
                html += `<td><div class="matrix-cell-content"><span class="status-dot red" style="width:6px;height:6px;box-shadow:none"></span><span class="matrix-value" style="color:#666">0</span></div></td>`; 
            }
        });
        tbody.innerHTML += html + '</tr>';
    });
}

function renderFunnelData() {
    const filtered = applyFilters(getActiveUnified());
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
    if(convEl) convEl.textContent = convPerc.toFixed(1) + '%';
}

function renderLossAnalysis() {
    const nContainer = document.getElementById('noshow-canal-container');
    const mContainer = document.getElementById('motivos-perda-container');
    
    if(nContainer) {
        const filteredUnified = applyFilters(getActiveUnified());
        const lossMap = {};
        
        filteredUnified.forEach(i => {
            const ch = i.canal_origem || 'Não identificado';
            if(!lossMap[ch]) lossMap[ch] = {total_reuniao:0, perdida_reuniao:0};
            lossMap[ch].total_reuniao += parseInt(i.count_reuniao) || 0;
            lossMap[ch].perdida_reuniao += parseInt(i.count_reuniao_perdida) || 0;
        });
        
        const dataArr = Object.keys(lossMap).map(ch => {
            const s = lossMap[ch]; 
            const txNoshow = s.total_reuniao > 0 ? (s.perdida_reuniao / s.total_reuniao) * 100 : 0;
            return { ch, txNoshow, noshowAbs: s.perdida_reuniao };
        });
        
        nContainer.innerHTML = '';
        if(dataArr.length===0) { 
            nContainer.innerHTML = '<div style="text-align:center;color:#666">Sem dados no período</div>'; 
        } else {
            dataArr.sort((a,b)=>b.txNoshow - a.txNoshow).forEach(i => {
                const w = Math.min(i.txNoshow, 100); 
                const c = i.txNoshow >= 20 ? 'high' : (i.txNoshow >= 10 ? 'medium' : 'low');
                nContainer.innerHTML += `<div class="loss-bar-item"><span class="loss-bar-name">${i.ch}</span><div class="loss-bar-track"><div class="loss-bar-fill ${c}" style="width:${w}%" data-tooltip="${i.noshowAbs} no-shows (${i.txNoshow.toFixed(1)}%)"></div></div><span class="loss-bar-value">${i.txNoshow.toFixed(1)}%</span></div>`;
            });
        }
    }

    if(mContainer) {
        const idToReason = {};
        if (DATA_CACHE.lossReasons) {
            DATA_CACHE.lossReasons.forEach(r => {
                // Bug fix mapeamento: Tenta diversas propriedades comuns no JSON
                const id = r.id || r.loss_reason_id || r.id_lostReason || r.id_lostreason || r['id motivo'];
                const name = r.name || r.nome || r.title || r.name_lostreason || r.name_lostReason || r.text_value || 'Motivo Desconhecido';
                if(id) idToReason[String(id)] = name;
            });
        }

        const reasonsAgg = {};
        let totalLosses = 0;
        
        // Pega os dados brutos filtrados 
        const lossDataFiltered = applyFilters(getActiveLoss() || []);

        lossDataFiltered.forEach(item => {
            // Busca os campos exatamente como vêm no webhook
            const id = item.id_lostreason || item.id_lostReason || item.loss_reason_id;
            const count = parseInt(item.count_perdas) || parseInt(item.count) || 0;
            const ch = item.canal_origem || 'Não identificado';

            if (count > 0) {
                let name = id ? (idToReason[String(id)] || `Motivo ID: ${id}`) : 'Motivo não informado';
                
                if (!reasonsAgg[name]) reasonsAgg[name] = { total: 0, channels: {} };
                if (!reasonsAgg[name].channels[ch]) reasonsAgg[name].channels[ch] = 0;
                
                reasonsAgg[name].total += count;
                reasonsAgg[name].channels[ch] += count;
                totalLosses += count;
            }
        });

        mContainer.innerHTML = '';
        const entries = Object.entries(reasonsAgg).sort((a,b) => b[1].total - a[1].total);

        if (entries.length === 0) {
            mContainer.innerHTML = '<div style="text-align:center;color:#666;margin:auto;">Sem dados de motivos</div>';
        } else {
            let index = 0;
            entries.forEach(([name, data]) => {
                const perc = totalLosses > 0 ? (data.total / totalLosses) * 100 : 0;
                const w = Math.min(perc, 100);
                
                // LINHA PAI
                let html = `
                <div class="drilldown-group">
                    <div class="loss-bar-item drilldown-parent" onclick="toggleDrilldown('loss-child-${index}', this)" style="cursor:pointer; margin-bottom: 5px;">
                        <span class="expand-icon">▶</span>
                        <span class="loss-bar-name" style="width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${name}">${name}</span>
                        <div class="loss-bar-track">
                            <div class="loss-bar-fill medium" style="width:${w}%" data-tooltip="${data.total} (${perc.toFixed(1)}%)"></div>
                        </div>
                        <span class="loss-bar-value">${data.total}</span>
                    </div>
                    <div class="loss-child-${index}" style="display:none; padding-left: 20px; margin-bottom: 12px;">`;
                
                // LINHAS FILHAS (CANAIS - DRILLDOWN)
                Object.entries(data.channels).sort((a,b) => b[1] - a[1]).forEach(([ch, chCount]) => {
                    const cPerc = data.total > 0 ? (chCount / data.total) * 100 : 0;
                    const cw = Math.min(cPerc, 100);
                    html += `
                        <div class="loss-bar-item child-row" style="margin-bottom: 4px; opacity: 0.8;">
                            <span class="loss-bar-name" style="font-size: 11px; color: #888; width: 110px;">↳ ${ch}</span>
                            <div class="loss-bar-track" style="height: 6px;">
                                <div class="loss-bar-fill medium" style="width:${cw}%" data-tooltip="${chCount} (${cPerc.toFixed(1)}% do motivo)"></div>
                            </div>
                            <span class="loss-bar-value" style="font-size: 11px; color: #888;">${chCount}</span>
                        </div>`;
                });
                
                html += `</div></div>`;
                mContainer.innerHTML += html;
                index++;
            });
        }
    }
}