let burnupChartInstance = null;

/**
 * Cria/Atualiza o Gráfico de Burnup com suporte a granularidade
 * @param {Array} filteredData - Dados diários (aggData do data-fetchers)
 * @param {Array} metasData - Array de metas filtradas
 * @param {String} startDateStr - 'YYYY-MM-DD'
 * @param {String} endDateStr - 'YYYY-MM-DD'
 * @param {String} granularity - 'day', 'week', 'month', 'quarter', 'weekday'
 */
async function createBurnupChart(filteredData, metasData, startDateStr, endDateStr, granularity = 'day') {
    try {
        const ctx = document.getElementById('burnupChart');
        if (!ctx) return;

        if (burnupChartInstance) {
            burnupChartInstance.destroy();
        }

        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T23:59:59');
        
        // Mapear dados do Realizado por dia
        const dailyMap = {};
        filteredData.forEach(item => {
            if (item.data_referencia) dailyMap[item.data_referencia] = parseInt(item.qtd_realizada) || 0;
        });

        // Mapear Pace Diário baseado no Webhook de Metas
        const paceMap = {};
        metasData.forEach(m => {
            if(m.data && m['pace esperado']) {
                const parts = m.data.split('/');
                if(parts.length === 3) {
                    const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    if(!paceMap[isoDate]) paceMap[isoDate] = 0;
                    paceMap[isoDate] += parseInt(m['pace esperado']) || 0;
                }
            }
        });

        // A Meta Total é extraída do DOM, já calculada dinamicamente pelas datas do fetcher
        const metaTotalDOM = parseInt(document.getElementById('metaMes')?.textContent || 0);
        const metaTotal = metaTotalDOM > 0 ? metaTotalDOM : 100;

        const labels = [];
        const dataRealizado = [];
        const dataPace = [];
        const dataMeta = [];
        const tooltips = []; 

        let curr = new Date(start);
        let acumuladoGlobal = 0;
        let acumuladoPace = 0;
        let buckets = new Map();

        const allDays = [];
        while (curr <= end) {
            const dStr = curr.toISOString().split('T')[0];
            const val = dailyMap[dStr] || 0;
            const paceDay = paceMap[dStr] || 0;
            
            acumuladoGlobal += val;
            acumuladoPace += paceDay;
            
            allDays.push({
                date: new Date(curr),
                dateStr: dStr,
                value: val,
                acumulado: acumuladoGlobal,
                pace: acumuladoPace
            });
            curr.setDate(curr.getDate() + 1);
        }

        const getGroupKey = (dateObj, type) => {
            const d = dateObj.getDate();
            const m = dateObj.getMonth();
            const y = dateObj.getFullYear();
            const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            
            if (type === 'day') return `${String(d).padStart(2,'0')}/${meses[m]}`;
            if (type === 'month') return `${meses[m]}/${y}`;
            if (type === 'quarter') return `Q${Math.floor(m/3)+1}/${y}`;
            if (type === 'week') {
                const oneJan = new Date(y, 0, 1);
                const numberOfDays = Math.floor((dateObj - oneJan) / (24 * 60 * 60 * 1000));
                const result = Math.ceil((dateObj.getDay() + 1 + numberOfDays) / 7);
                return `Sem ${result}`;
            }
            if (type === 'weekday') {
                const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                return dias[dateObj.getDay()];
            }
            return d;
        };

        allDays.forEach(dayInfo => {
            const key = getGroupKey(dayInfo.date, granularity);
            
            if (!buckets.has(key)) {
                buckets.set(key, { 
                    lastAccumulated: dayInfo.acumulado,
                    lastPace: dayInfo.pace,
                    periodValue: dayInfo.value, 
                    lastDate: dayInfo.date
                });
            } else {
                const b = buckets.get(key);
                b.lastAccumulated = dayInfo.acumulado;
                b.lastPace = dayInfo.pace;
                b.periodValue += dayInfo.value;
                b.lastDate = dayInfo.date;
            }
        });

        let keysArr = Array.from(buckets.keys());
        
        if (granularity === 'weekday') {
            const order = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            keysArr.sort((a,b) => order.indexOf(a) - order.indexOf(b));
        }

        const hoje = new Date();
        hoje.setHours(0,0,0,0);

        keysArr.forEach((key) => {
            labels.push(key);
            const bucket = buckets.get(key);
            
            // A Linha da Meta é o valor final calculado para o Período, reta.
            dataMeta.push(metaTotal);
            // Injeta o Pace Acumulado calculado através do webhook
            dataPace.push(bucket.lastPace); 

            if (bucket.lastDate <= hoje || (bucket.lastDate > hoje && bucket.lastDate.getMonth() === hoje.getMonth() && bucket.lastDate.getFullYear() === hoje.getFullYear())) {
                dataRealizado.push(bucket.lastAccumulated);
            } else {
                dataRealizado.push(null);
            }

            tooltips.push(bucket.periodValue);
        });

        burnupChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Realizado',
                        data: dataRealizado,
                        borderColor: '#ff0000',
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#ff0000',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        tension: 0.1,
                        fill: true
                    },
                    {
                        label: 'Pace',
                        data: dataPace,
                        borderColor: '#666',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Meta',
                        data: dataMeta,
                        borderColor: '#22c55e',
                        borderWidth: 2,
                        borderDash: [10, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: { color: '#888', usePointStyle: true, boxWidth: 8 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(20, 20, 20, 0.95)',
                        titleColor: '#fff',
                        titleFont: { size: 13, weight: 'bold' },
                        bodyColor: '#ccc',
                        bodyFont: { size: 12 },
                        borderColor: '#333',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 4,
                        usePointStyle: true,
                        callbacks: {
                            title: (items) => `Período: ${items[0].label}`,
                            label: (item) => {
                                if (item.dataset.label === 'Realizado') {
                                    const idx = item.dataIndex;
                                    const valPeriodo = tooltips[idx];
                                    const pace = dataPace[idx];
                                    
                                    return [
                                        `Realizado (Total): ${item.raw}`,
                                        `Neste Período: ${valPeriodo}`,
                                        `Pace Esperado: ${pace}`
                                    ];
                                }
                                return `${item.dataset.label}: ${Math.round(item.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#1f1f1f', drawBorder: false },
                        ticks: { color: '#666', font: { size: 10 } }
                    },
                    y: {
                        grid: { color: '#1f1f1f', borderDash: [2, 2] },
                        ticks: { color: '#666', font: { size: 10 } },
                        beginAtZero: true,
                        suggestedMax: metaTotal * 1.1
                    }
                }
            }
        });

    } catch (error) {
        console.error('Erro ao criar gráfico de burnup:', error);
    }
}