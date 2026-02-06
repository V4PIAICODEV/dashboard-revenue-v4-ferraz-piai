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

        populateDropdowns();
        renderAll();

    } catch (error) { console.error("Erro LoadData:", error); }
}

function getArr(json) { return Array.isArray(json) ? json : (json.data || []); }

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
            const id = item.responsible_user_id || item.sdr_id;
            if (String(id) !== String(GlobalFilter.sdrId)) return false;
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
    if (sdrSelect && sdrSelect.options.length <= 1) {
        const unique = new Map();
        [...DATA_CACHE.sdr, ...DATA_CACHE.bant].forEach(i => {
            if(i.responsible_user_id && i.sdr_name) unique.set(i.responsible_user_id, i.sdr_name);
            if(i.sdr_id && i.sdr_name) unique.set(i.sdr_id, i.sdr_name);
        });
        unique.forEach((name, id) => {
            const opt = document.createElement('option');
            opt.value = id; opt.textContent = name;
            sdrSelect.appendChild(opt);
        });
    }
    const chSelect = document.getElementById('channelFilter');
    if (chSelect && chSelect.options.length <= 1) {
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
    const filtered = applyFilters(DATA_CACHE.burnup);
    const dailyAgg = {};
    filtered.forEach(item => {
        const k = item.data_referencia;
        if(!dailyAgg[k]) dailyAgg[k] = 0;
        dailyAgg[k] += parseInt(item.qtd_realizada) || 0;
    });
    const aggData = Object.keys(dailyAgg).map(k => ({ data_referencia: k, qtd_realizada: dailyAgg[k] })).sort((a,b)=>new Date(a.data_referencia)-new Date(b.data_referencia));
    const realizado = aggData.reduce((sum, i) => sum + i.qtd_realizada, 0);

    const start = new Date(GlobalFilter.startDate + 'T00:00:00');
    const end = new Date(GlobalFilter.endDate + 'T23:59:59');
    
    let targetMetas = DATA_CACHE.metas;
    if (GlobalFilter.sdrId !== 'all') {
        targetMetas = targetMetas.filter(m => String(m.id) === String(GlobalFilter.sdrId));
    }
    
    const targetYear = end.getFullYear();
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const nomeMes = meses[end.getMonth()];
    const metaMensal = targetMetas.filter(m => m.ano === targetYear && m.mes === nomeMes).reduce((sum,m) => sum + (m.valor||0), 0);
    
    const daysInMonth = new Date(targetYear, end.getMonth() + 1, 0).getDate();
    const daysSelected = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    let metaProp = 0;
    if (daysSelected >= 28) metaProp = metaMensal;
    else if(daysInMonth > 0) metaProp = Math.round((metaMensal / daysInMonth) * daysSelected);

    const elMeta = document.getElementById('metaMes'); if(elMeta) elMeta.textContent = metaProp;
    const elReal = document.getElementById('realizadoMes'); if(elReal) elReal.textContent = realizado;
    const ating = metaProp > 0 ? (realizado/metaProp)*100 : 0;
    const elPerc = document.getElementById('atingimentoPerc'); if(elPerc) elPerc.textContent = ating.toFixed(1) + '%';
    const elPace = document.getElementById('paceEsperado'); if(elPace) elPace.textContent = metaProp;
    const elFaltam = document.getElementById('faltamReuniaoes'); if(elFaltam) elFaltam.textContent = `faltam ${Math.max(0, metaProp - realizado)} reuniões`;

    createBurnupChart(aggData, targetMetas, GlobalFilter.startDate, GlobalFilter.endDate);
}

function renderFunnelData() {
    const filtered = applyFilters(DATA_CACHE.funnel);
    const counts = { prospect: 0, tentativa: 0, conectado: 0, reuniao: 0, venda: 0, sum_days: 0, count_days: 0 };
    filtered.forEach(i => {
        counts.prospect += parseInt(i.count_prospect)||0;
        counts.tentativa += parseInt(i.count_tentativa)||0;
        counts.conectado += parseInt(i.count_conectado)||0;
        counts.reuniao += parseInt(i.count_reuniao)||0;
        counts.venda += parseInt(i.count_venda)||0;
        counts.sum_days += parseFloat(i.sum_days_to_close)||0;
        counts.count_days += parseInt(i.count_closed_with_days)||0;
    });
    
    const max = counts.prospect || 1;
    updateFunnelBar('prospect', counts.prospect, max);
    updateFunnelBar('tentativa', counts.tentativa, max);
    updateFunnelBar('conectado', counts.conectado, max);
    updateFunnelBar('reuniao', counts.reuniao, max);
    updateFunnelBar('venda', counts.venda, max);
    
    updateConversion('tentativa', counts.prospect, counts.tentativa);
    updateConversion('conectado', counts.tentativa, counts.conectado);
    updateConversion('reuniao', counts.conectado, counts.reuniao);
    updateConversion('venda', counts.reuniao, counts.venda);
    
    const elGlobal = document.querySelector('[data-global-conversion]');
    if(elGlobal) elGlobal.textContent = (counts.prospect > 0 ? (counts.venda/counts.prospect)*100 : 0).toFixed(1) + '%';
    
    const elCiclo = document.querySelector('[data-cycle-days]');
    if(elCiclo) {
        const ciclo = counts.count_days > 0 ? (counts.sum_days/counts.count_days) : 0;
        elCiclo.textContent = ciclo.toFixed(1) + ' dias';
        elCiclo.style.color = ciclo > 5 ? '#ef4444' : '#22c55e';
    }
}

function updateFunnelBar(s, v, m) {
    const elVal = document.querySelector(`[data-value="${s}"]`);
    const elFill = document.querySelector(`[data-stage="${s}"]`);
    if(elVal) elVal.textContent = v;
    if(elFill) elFill.style.width = `${(v/m)*100}%`;
}
function updateConversion(s, b, v) {
    const el = document.querySelector(`[data-conversion="${s}"]`);
    if(el) el.textContent = (b > 0 ? (v/b)*100 : 0).toFixed(1) + '%';
}

function renderChannelPerformance() {
    const effContainer = document.getElementById('channel-effectiveness-container');
    const matrixBody = document.getElementById('channel-matrix-body');
    const matrixHead = document.getElementById('channel-matrix-head');
    if(!effContainer) return;

    const filtered = applyFilters(DATA_CACHE.channels);
    const chStats = {};
    const sdrMatrix = {};
    const allCh = new Set();
    
    filtered.forEach(i => {
        const ch = i.canal_nome || 'Desc';
        const sdr = i.sdr_name || 'Desc';
        const tl = parseInt(i.total_leads)||0;
        const v = parseInt(i.vendas)||0;
        allCh.add(ch);
        if(!chStats[ch]) chStats[ch] = {l:0, r:parseInt(i.reunioes)||0, v:0};
        chStats[ch].l += tl;
        chStats[ch].r += parseInt(i.reunioes)||0;
        chStats[ch].v += v;
        if(!sdrMatrix[sdr]) sdrMatrix[sdr]={};
        if(!sdrMatrix[sdr][ch]) sdrMatrix[sdr][ch]={v:0, l:0};
        sdrMatrix[sdr][ch].v += v;
        sdrMatrix[sdr][ch].l += tl;
    });

    effContainer.innerHTML = '';
    if(!Object.keys(chStats).length) effContainer.innerHTML = '<div style="text-align:center;color:#666">Sem dados</div>';
    
    Object.keys(chStats).sort((a,b) => (chStats[b].v/chStats[b].l||0) - (chStats[a].v/chStats[a].l||0)).forEach(ch => {
        const s = chStats[ch];
        const cv = s.l > 0 ? (s.v/s.l)*100 : 0;
        let color = 'very-low';
        if (cv >= 15) color = 'high'; else if (cv >= 8) color = 'medium';
        const w = Math.min((cv/30)*100, 100);

        effContainer.innerHTML += `
            <div class="channel-row">
                <span class="channel-name">${ch}</span>
                <div class="channel-bar-container">
                    <div class="channel-bar-track">
                        <div class="channel-bar-fill ${color}" style="width:${w}%">
                            <span class="channel-bar-text">${cv.toFixed(1)}% conv.</span>
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
    matrixHead.innerHTML = `<tr><th>SDR</th>${sortedCh.map(c=>`<th>${c.toUpperCase()}</th>`).join('')}</tr>`;
    matrixBody.innerHTML = '';
    
    Object.keys(sdrMatrix).forEach(sdr => {
        let html = `<tr><td>${sdr}</td>`;
        sortedCh.forEach(ch => {
            const d = sdrMatrix[sdr][ch];
            if(d && d.v > 0) {
                const cv = d.l > 0 ? (d.v/d.l)*100 : 0;
                const cl = cv >= 15 ? 'green' : (cv >= 8 ? 'yellow' : 'red');
                const w = Math.min((cv/20)*30, 40);
                html += `<td><div class="matrix-cell-content"><span class="mini-bar ${cl}" style="width:${Math.max(w,4)}px"></span><span class="matrix-value">${d.v}</span><span class="matrix-perc">(${cv.toFixed(0)}%)</span></div></td>`;
            } else {
                html += `<td><div class="matrix-cell-content"><span class="status-dot red" style="width:6px;height:6px;box-shadow:none"></span><span class="matrix-value" style="color:#666">0</span><span class="matrix-perc">(0%)</span></div></td>`;
            }
        });
        matrixBody.innerHTML += html + '</tr>';
    });
}

function renderSdrPerformance() {
    const tbody = document.getElementById('sinaleiro-body');
    if(!tbody) return;
    const filtered = applyFilters(DATA_CACHE.sdr);
    const sdrMap = {};
    filtered.forEach(i => {
        const id = i.responsible_user_id;
        if(!sdrMap[id]) sdrMap[id] = { name: i.sdr_name, p:0, r:0, v:0 };
        sdrMap[id].p += parseInt(i.prospects||0);
        sdrMap[id].r += parseInt(i.reunioes||0);
        sdrMap[id].v += parseInt(i.vendas||0);
    });
    tbody.innerHTML = '';
    let c = {crit:0, warn:0, succ:0};
    if(Object.keys(sdrMap).length === 0) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888">Sem dados</td></tr>';
    else {
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
        const sc = parseInt(i.bant_score)||1;
        const l = parseInt(i.total_leads)||0;
        const v = parseInt(i.vendas)||0;
        if(bantMap[sc]) { bantMap[sc].l += l; bantMap[sc].v += v; }
        const sdr = i.sdr_name || 'Desc';
        if(!sdrAgg[sdr]) sdrAgg[sdr]={t:0, b4:0, b3:0, b2:0, b1:0};
        sdrAgg[sdr].t += l;
        if(sc===4) sdrAgg[sdr].b4 += l; if(sc===3) sdrAgg[sdr].b3 += l; if(sc===2) sdrAgg[sdr].b2 += l; if(sc===1) sdrAgg[sdr].b1 += l;
    });
    [4,3,2,1].forEach(i => {
        const d = bantMap[i];
        const cv = d.l > 0 ? (d.v/d.l)*100 : 0;
        document.getElementById(`bant-val-${i}`).textContent = d.l;
        document.getElementById(`bant-conv-${i}`).textContent = cv.toFixed(1)+'%';
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
        const d = bantMap[sc];
        const cv = d.l > 0 ? (d.v/d.l)*100 : 0;
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
        lossMap[ch].total += parseInt(i.total_agendados)||0;
        lossMap[ch].real += parseInt(i.qtd_realizadas)||0;
        lossMap[ch].perd += parseInt(i.qtd_perdidas_143)||0;
    });
    const dataArr = Object.keys(lossMap).map(ch => {
        const s = lossMap[ch];
        const noshowCount = s.total - s.real - s.perd;
        const txPerda = s.total > 0 ? (s.perd/s.total)*100 : 0;
        const txNoshow = s.total > 0 ? (noshowCount/s.total)*100 : 0;
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