let burnupChartInstance = null;

/**
 * Cria/Atualiza o Gráfico de Burnup
 * @param {Array} filteredData - Dados diários já filtrados por SDR/Canal (formato: [{data_referencia: 'YYYY-MM-DD', qtd_realizada: N}, ...])
 * @param {Array} metasData - Array de metas (para calcular a meta total do período)
 * @param {String} startDateStr - 'YYYY-MM-DD'
 * @param {String} endDateStr - 'YYYY-MM-DD'
 */
async function createBurnupChart(filteredData, metasData, startDateStr, endDateStr) {
    try {
        const ctx = document.getElementById('burnupChart');
        if (!ctx) return;

        // Destruir gráfico anterior para evitar sobreposição/memory leak
        if (burnupChartInstance) {
            burnupChartInstance.destroy();
        }

        // 1. Processar Datas do Intervalo (Eixo X Completo)
        // Isso garante que dias sem vendas apareçam com valor 0 ou acumulado anterior, sem buracos.
        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T23:59:59');
        const dateArray = [];
        let curr = new Date(start);

        while (curr <= end) {
            dateArray.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }

        // 2. Mapear Dados Reais (Agrupados por dia)
        // filteredData pode ter múltiplas entradas por dia se não estiver agregado. 
        // Mas o fetchExecutiveView já nos passa 'aggData' que é único por dia.
        const dataMap = {};
        filteredData.forEach(item => {
            if (item.data_referencia) {
                // data_referencia vem do banco como YYYY-MM-DD
                dataMap[item.data_referencia] = parseInt(item.qtd_realizada) || 0;
            }
        });

        // 3. Calcular Meta Total do Período (Para a linha de Meta e Pace)
        // Reutilizamos a lógica do fetchExecutiveView para consistência, mas aqui recalculamos para o gráfico.
        // Se filtro = Mês, Meta = Meta Mensal.
        // Se filtro = Custom, Meta = Proporcional ou Total (depende da regra de visualização).
        // Para Burnup, geralmente queremos ver a perseguição à Meta Mensal.
        
        // Achar Meta Mensal do SDR selecionado (ou todos)
        const targetYear = end.getFullYear();
        const nomeMes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][end.getMonth()];
        
        // Filtra metas pelo SDR selecionado no GlobalFilter (acessível via window ou passado como arg)
        // Como charts.js é separado, melhor calcular a meta total aqui baseada nos dados passados ou assumir que metasData já vem filtrado?
        // Vamos assumir que metasData é o array bruto e filtramos aqui se tivermos acesso ao ID.
        // Simplificação: Passar a Meta Total calculada como argumento seria melhor, mas vamos recalcular.
        
        // Hack: Pegar o valor que já foi calculado e inserido no DOM "Meta do Mês" para garantir consistência visual
        const metaTotalDOM = parseInt(document.getElementById('metaMes')?.textContent || 0);
        const metaTotal = metaTotalDOM > 0 ? metaTotalDOM : 100; // Fallback

        // 4. Construir Datasets
        const labels = [];
        const dataRealizado = [];
        const dataPace = [];
        const dataMeta = [];
        const dailyCounts = []; // Para tooltip

        let acumulado = 0;
        
        dateArray.forEach((dateObj, i) => {
            // Label: DD (ou DD/MM se cruzar mês)
            const d = String(dateObj.getDate()).padStart(2, '0');
            const m = String(dateObj.getMonth()+1).padStart(2, '0');
            const y = dateObj.getFullYear();
            const dateKey = `${y}-${m}-${d}`;
            
            labels.push(d); // Só dia para ficar limpo como no print

            // Realizado Acumulado
            const valDia = dataMap[dateKey] || 0;
            acumulado += valDia;
            
            // Só plotar realizado até "hoje" (para não mostrar linha reta no futuro)
            const hoje = new Date();
            // Zerar horas para comparação justa
            const hojeMidnight = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            const dateMidnight = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

            if (dateMidnight <= hojeMidnight) {
                dataRealizado.push(acumulado);
                dailyCounts.push(valDia);
            } else {
                dataRealizado.push(null); // Futuro = null para cortar a linha
                dailyCounts.push(null);
            }

            // Pace Ideal (Linear: de 0 até Meta no último dia)
            // i=0 -> pace ~0? Não, pace dia 1 = meta/dias.
            const totalDays = dateArray.length;
            const paceValue = (metaTotal / totalDays) * (i + 1);
            dataPace.push(paceValue);

            // Meta Constante
            dataMeta.push(metaTotal);
        });

        // 5. Configurar Chart.js
        burnupChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Realizado',
                        data: dataRealizado,
                        borderColor: '#ff0000', // Vermelho V4
                        backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#ff0000',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        tension: 0.1, // Linha levemente curva ou reta (0)
                        fill: true
                    },
                    {
                        label: 'Pace',
                        data: dataPace,
                        borderColor: '#666',
                        borderWidth: 2,
                        borderDash: [5, 5], // Tracejado
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Meta',
                        data: dataMeta,
                        borderColor: '#22c55e', // Verde
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
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        borderColor: '#333',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            title: (items) => `Dia ${items[0].label}`,
                            label: (item) => {
                                if (item.dataset.label === 'Realizado') {
                                    const diaIdx = item.dataIndex;
                                    const doDia = dailyCounts[diaIdx];
                                    const pace = dataPace[diaIdx].toFixed(0);
                                    return [
                                        `🔴 Realizadas no dia: ${doDia}`,
                                        `Pace esperado: ${pace}`,
                                        `Acumulado: ${item.raw}`
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
                        suggestedMax: metaTotal * 1.1 // Um pouco acima da meta
                    }
                }
            }
        });

    } catch (error) {
        console.error('Erro ao criar gráfico de burnup:', error);
    }
}