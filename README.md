# Dashboard Revenue v4 - Ferraz Piai

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-4.0-blue.svg)

> Dashboard de monitoramento de vendas em tempo real para gestão de funil de pré-vendas

## 📋 Sobre o Projeto

Dashboard interativo desenvolvido para monitorar e analisar o desempenho do funil de pré-vendas da **V4 Company**. O sistema oferece visibilidade executiva sobre métricas de conversão, performance de SDRs, qualificação de leads (BANT), efetividade de canais de aquisição e análise de perdas.

### Objetivo Principal

Fornecer insights em tempo real para tomada de decisão estratégica na gestão de equipes de vendas, otimização de canais e melhoria da qualidade de leads.

---

## ✨ Funcionalidades Principais

- **Monitoramento em Tempo Real** - Atualização automática via webhooks N8N
- **Dashboard Multi-Seção** - 6 visões especializadas de performance
- **Sistema de Alertas** - Indicadores visuais tipo semáforo para performance
- **Análise de Conversão** - Rastreamento completo do funil de vendas
- **Qualificação BANT** - Framework de 4 níveis para avaliar qualidade de leads
- **Performance por Canal** - Comparação de efetividade entre canais de aquisição
- **Análise de Perdas** - Identificação de motivos de perda e no-shows
- **Gráfico Burnup** - Visualização de progresso vs. meta mensal

---

## 📊 Seções do Dashboard

### Section 1: Visão Executiva
**Propósito:** Acompanhamento de metas e performance geral

**Métricas Disponíveis:**
- Meta do Mês (target de reuniões realizadas)
- Realizado (reuniões efetivamente realizadas)
- % Atingimento (progresso com código de cores)
- Pace Esperado vs. Pace Real
- Gráfico Burnup com evolução diária

**Código de Cores:**
- 🟢 Verde: ≥100% da meta
- 🟡 Amarelo: 70-99% da meta
- 🔴 Vermelho: <70% da meta

---

### Section 2: Sinaleiro de Gestão por SDR
**Propósito:** Monitoramento individual de Sales Development Representatives

**Métricas por SDR:**
- **Prospects** - Total de prospects no pipeline
- **Agendadas** - Reuniões agendadas
- **Conv. P→A** - Taxa de conversão Prospects → Agendadas
- **Realizadas** - Reuniões efetivamente realizadas
- **Conv. A→R** - Taxa de conversão Agendadas → Realizadas
- **Status** - Indicador visual de performance

**Regras de Status:**
- 🔴 **Crítico:** P→A < 20% OU A→R < 70%
- 🟡 **Atenção:** P→A < 40% OU A→R < 90%
- 🟢 **Na Meta:** P→A ≥ 40% E A→R ≥ 90%

**Resumo de Alertas:**
- Contagem de SDRs por status (Crítico/Atenção/Na Meta)

---

### Section 3: Análise de Qualificação (BANT)
**Propósito:** Avaliação de qualidade de leads baseada no framework BANT

**Sistema de Pontuação BANT:**
- **BANT 4** 🟢 - Lead totalmente qualificado (Budget, Authority, Need, Timeline)
- **BANT 3** 🔵 - Bom prospecto (3/4 critérios atendidos)
- **BANT 2** 🟡 - Potencial (2/4 critérios atendidos)
- **BANT 1** 🔴 - Baixa qualificação (≤1 critério atendido)

**Métricas:**
- Quantidade de leads por nível BANT
- Taxa de conversão para venda por qualificação
- Distribuição BANT por SDR com gráfico visual
- Insights e recomendações por nível

**Visualizações:**
- Cards superiores com contagens e conversões
- Tabela de distribuição por SDR com barras coloridas
- Hover mostrando valores absolutos e percentuais

---

### Section 4: Visão por Canal
**Propósito:** Análise de efetividade dos canais de aquisição

**Canais Monitorados:**
- Black Box
- Lead Broker
- Não identificado
- Indicação
- Evento

**Métricas:**
- Taxa de conversão (prospects → reuniões realizadas)
- Performance por SDR em cada canal
- Ranking de efetividade

**Visualizações:**
- **Lado Esquerdo:** Barras de efetividade por canal ordenadas por conversão
  - 🟢 Verde: ≥15%
  - 🟡 Amarelo: 8-15%
  - 🔴 Vermelho: <8%
- **Lado Direito:** Matriz SDR × Canal
  - Grid de performance com reuniões realizadas
  - Mini-barras coloridas por threshold de conversão
  - Valores absolutos + percentuais

---

### Section 5: Funil de Pré-vendas
**Propósito:** Rastreamento de leads através dos estágios do funil

**Estágios do Funil:**
1. **Prospect** - Ponto inicial, todos potenciais clientes
2. **Tent. Contato** - Tentativas de outreach realizadas
3. **Conectado** - Contato bem-sucedido estabelecido
4. **Reunião Agend.** - Reunião agendada
5. **Reunião Realizada** - Reunião efetivamente concluída

**Métricas:**
- Contagem em cada estágio
- Taxas de conversão entre estágios:
  - Prospect → Tentativa de Contato
  - Tentativa → Conectado
  - Conectado → Reunião Agendada
  - Agendada → Realizada
- Conversão global (Prospect → Reunião Realizada)
- **Ciclo Médio** - Tempo médio em dias

**Indicadores de Tempo:**
- 🟢 Verde: ≤5 dias (dentro da meta)
- 🔴 Vermelho: >5 dias (acima da meta)

---

### Section 6: Análise de Perdas
**Propósito:** Compreender razões de perdas e no-shows

**Categorias Rastreadas:**
- Percentual de Perdas por Canal
- Percentual de No-Show por Canal

**Métricas:**
- Taxa de perda (reuniões perdidas por objeções/rejeição)
- Taxa de no-show (reuniões não comparecidas)
- Comparação por canal
- Números absolutos no hover

**Código de Cores:**
- 🟢 Verde: <10%
- 🟡 Amarelo: 10-20%
- 🔴 Vermelho: ≥20%

**Motivos de Perda (Referência):**
- Sem resposta/Ghosting
- Preço/Orçamento
- Timing inadequado
- Concorrência
- No-show na reunião

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Sistema de design customizado com grid responsivo
- **JavaScript (Vanilla)** - Lógica de negócio e manipulação DOM
- **Chart.js** - Biblioteca para gráficos (Burnup)

### Backend & Integração
- **N8N** - Plataforma de automação para webhooks
- **PostgreSQL** - Banco de dados para persistência
- **Webhook Architecture** - Comunicação em tempo real

### Infraestrutura
- **Base URL:** `ferrazpiai-n8n-editor.uyk8ty.easypanel.host`
- **Formato de Dados:** JSON via REST APIs
- **Deploy:** Cliente-side (sem build process)

---

## 📂 Estrutura do Projeto

```
dashboard-revenue/
├── index.html                          # Ponto de entrada principal
├── README.md                           # Documentação do projeto
├── DEV-NOTES.md                        # Notas de desenvolvimento
├── backlog.md                          # Backlog de tarefas
│
├── api/                                # Arquivos de dados locais
│   ├── section-1-visao-executiva.json # Exemplo: dados burnup
│   ├── section-2-sinaleiro-sdr.json   # Exemplo: performance SDR
│   ├── section-5-funil.json           # Exemplo: estágios funil
│   ├── section-6-perdas.json          # Exemplo: análise perdas
│   ├── metas.json                     # Metas mensais por SDR
│   ├── last-update.json               # Timestamp de atualização
│   └── leads.sql                      # Schema do banco de dados
│
├── revenue-dashboard/
│   ├── assets/
│   │   ├── js/
│   │   │   ├── core.js                # Funções utilitárias
│   │   │   ├── data-fetchers.js       # Integração webhooks
│   │   │   └── charts.js              # Implementação Chart.js
│   │   │
│   │   ├── css/
│   │   │   ├── core.css               # Sistema grid & responsivo
│   │   │   ├── components.css         # Header, filtros, badges
│   │   │   └── sections.css           # Estilos específicos seções
│   │   │
│   │   └── sections/
│   │       ├── section-1-visao-executiva.html
│   │       ├── section-2-sinaleiro-sdr.html
│   │       ├── section-3-bant.html
│   │       ├── section-4-canais.html
│   │       ├── section-5-funil.html
│   │       └── section-6-perdas.html
│   │
│   └── index.html                     # Dashboard principal
│
└── report-pre-venda.html              # Relatório de pré-vendas
```

---

## 🔌 Endpoints e Fontes de Dados

### Webhooks N8N Ativos

| Endpoint | Seção | Tipo de Dados |
|----------|-------|---------------|
| `/webhook/view_executiva_burnup` | Section 1 | Dados diários burnup |
| `/webhook/view_performance_sdr` | Section 2 | Métricas performance SDR |
| `/webhook/analise-bant` | Section 3 | Dados qualificação BANT |
| `/webhook/view_performance_canais` | Section 4 | Performance por canal |
| `/webhook/view_funil_vendas` | Section 5 | Contagens e conversões funil |
| `/webhook/view_perdas_por_canal` | Section 6 | Análise perdas e no-shows |
| `/webhook/last_update` | Header | Timestamp última atualização |

### Arquivos JSON Locais

| Arquivo | Propósito | Conteúdo |
|---------|-----------|----------|
| `metas.json` | Metas mensais | Targets de reuniões por SDR/mês |
| `section-*.json` | Exemplos de dados | Formato esperado de cada endpoint |
| `last-update.json` | Timestamp | Formato ISO de atualização |

### Formato de Resposta Padrão

```json
{
  "data": [
    {
      "campo1": "valor1",
      "campo2": "valor2"
    }
  ]
}
```

---

## 🚀 Como Usar

### Pré-requisitos

- Navegador moderno com suporte a ES6+
- Acesso aos webhooks N8N configurados
- Conexão com internet para CDN Chart.js

### Instalação Local

1. Clone ou baixe o repositório
2. Abra `revenue-dashboard/index.html` diretamente no navegador
3. Não há necessidade de build ou instalação de dependências

### Deploy em Servidor

1. Faça upload de todos os arquivos para servidor web
2. Configure CORS nos endpoints N8N se necessário
3. Acesse via URL do servidor

### Configuração

- **Webhooks:** URLs hardcoded em `assets/js/data-fetchers.js`
- **Metas:** Editáveis em `api/metas.json`
- **Pipeline IDs:** Documentados em `DEV-NOTES.md`

---

## 📈 KPIs e Métricas Principais

### Métricas de Conversão
- **P→A (Prospect → Agendadas):** Meta ≥40%
- **A→R (Agendadas → Realizadas):** Meta ≥90%
- **Conversão Global:** Prospect → Reunião Realizada
- **Ciclo Médio:** Meta ≤5 dias

### Métricas de Performance
- **Atingimento Mensal:** % da meta alcançada
- **Pace Real vs. Esperado:** Avanço proporcional ao período
- **Taxa de No-Show:** Ideal <10%
- **Taxa de Perda:** Ideal <10%

### Métricas de Qualidade
- **Distribuição BANT:** Concentração em BANT 3 e 4
- **Conversão por BANT:** BANT 4 deve ter maior conversão
- **Efetividade de Canal:** Identificar canais com conversão >15%

---

## 🎨 Sistema de Design

### Paleta de Cores

```css
/* Cores Principais */
--primary: #ff0000;      /* V4 Brand */
--success: #22c55e;      /* Verde - Meta atingida */
--warning: #fbbf24;      /* Amarelo - Atenção */
--danger: #ef4444;       /* Vermelho - Crítico */
--info: #3b82f6;         /* Azul - Informação */

/* Backgrounds */
--bg-main: #0d0d0d;      /* Fundo principal */
--bg-card: #141414;      /* Cards */
--border: #2a2a2a;       /* Bordas */

/* Texto */
--text-primary: #ffffff; /* Texto principal */
--text-secondary: #888;  /* Texto secundário */
```

### Sistema Grid

- **Grid-2:** Layout 2 colunas iguais (1:1)
- **Grid-2-1:** Layout 2 colunas desiguais (2:1)
- **Responsivo:** Breakpoints em 1400px e 900px
- **Gap Padrão:** 20px entre elementos

### Componentes

- **Cards:** Border radius 6px, padding 20px
- **Badges:** Sistema colorido (verde/amarelo/vermelho)
- **Progress Bars:** Transições suaves, altura 4px
- **Tables:** Hover states, zebra striping
- **Tooltips:** Informações adicionais no hover

---

## 📝 Informações de Configuração

### Pipeline de Pré-vendas

**Pipeline ID:** `12184216`

**Status IDs:**
- `99026876` - PROSPECT
- `94128176` - TENTATIVA DE CONTATO
- `98005364` - Conectado
- `98005368` - Reunião Agendada
- `142` - Venda ganha

### SDRs Atuais
- **Gabriella Wudarski** (ID: 1446529)
- **Geovanna Santos** (ID: 1446527)

---

## 🤝 Contribuindo

Para adicionar novas funcionalidades ou reportar bugs:

1. Documente mudanças em `DEV-NOTES.md`
2. Adicione tarefas em `backlog.md`
3. Mantenha arquivos de exemplo em `/api` atualizados
4. Teste todas as seções após modificações

---

## 📄 Licença

Projeto desenvolvido para uso interno da **V4 Company - Ferraz Piai**.

---

## 📞 Suporte

Para dúvidas ou suporte técnico, consulte a documentação interna ou entre em contato com a equipe de desenvolvimento.

---

**Última Atualização:** Fevereiro 2026
**Versão:** 4.0
**Status:** ✅ Ativo em Produção
