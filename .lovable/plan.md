

## Plano: Redesenhar a Gestão de Orçamentos e Prestadores no Fluxo de Manutenção

### Problema atual

A seção de prestadores trata orçamento e pagamento como dados simples dentro de cada prestador. Na prática, o fluxo real é:

1. Cadastrar prestadores e solicitar orçamentos a vários deles
2. Receber os orçamentos (com valores) de cada um
3. Comparar e aprovar UM prestador
4. Acompanhar a execução do serviço pelo prestador aprovado
5. Controlar o pagamento até a conclusão

O sistema atual já tem a estrutura certa na tabela `maintenance_providers` (budget_status, budget_value, is_selected, payment_status, payment_value). O que precisa melhorar é a **experiência visual** para deixar o fluxo mais claro e acompanhável.

### O que muda

**1. Visão resumo no topo da seção de prestadores**
- Card de resumo mostrando: quantos orçamentos solicitados, quantos recebidos, qual foi aprovado, status do pagamento
- Indicador visual do "estágio" atual do chamado: `Cotando → Orçamento recebido → Prestador definido → Em execução → Pago`

**2. Tabela comparativa de orçamentos**
- Quando há 2+ prestadores com orçamento recebido, mostrar uma mini-tabela comparativa lado a lado: Nome | Valor | Status
- Destaque visual no menor valor e no prestador selecionado
- Facilitar a comparação para aprovar o melhor

**3. Prestador aprovado em destaque**
- Quando um prestador é selecionado/aprovado, ele ganha destaque visual separado dos demais
- Mostra: nome, valor aprovado, status do pagamento, data de pagamento
- Os demais prestadores ficam colapsados abaixo como "Outros orçamentos"

**4. Timeline de acompanhamento no prestador aprovado**
- Indicadores visuais: Orçamento Aprovado → Serviço em Execução → Pagamento Pendente → Pago
- Datas registradas automaticamente (budget_received_at, paid_at)

### Mudanças técnicas

**Arquivos a editar:**

1. **`src/components/kanban/MaintenanceProvidersSection.tsx`** - Redesenhar completamente:
   - Adicionar resumo/status geral no topo
   - Criar visualização comparativa de orçamentos quando há múltiplos
   - Separar prestador aprovado dos demais
   - Adicionar mini-timeline de acompanhamento

2. **`src/hooks/useMaintenanceProviders.ts`** - Adicionar computed values:
   - `stage`: estágio atual do chamado (cotando, recebido, definido, executando, pago)
   - `receivedBudgets`: prestadores com orçamento recebido
   - `cheapestBudget`: menor valor recebido

**Não há mudanças no banco de dados** - a tabela `maintenance_providers` já tem todos os campos necessários (budget_status, budget_value, is_selected, payment_status, payment_value, budget_sent_at, budget_received_at, paid_at).

### Fluxo visual redesenhado

```text
┌─────────────────────────────────────────────┐
│ 🔧 Orçamentos e Prestadores                │
│                                             │
│ Etapa: [●Cotando ○Recebido ○Definido ○Pago]│
│ 3 orçamentos solicitados · 2 recebidos      │
├─────────────────────────────────────────────┤
│                                             │
│ ✅ PRESTADOR APROVADO (quando houver)       │
│ ┌─────────────────────────────────────┐     │
│ │ João Encanador    📞   R$ 1.200,00 │     │
│ │ Pagamento: Pendente                 │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ 📊 COMPARATIVO DE ORÇAMENTOS               │
│ ┌──────────────┬──────────┬─────────┐       │
│ │ Prestador    │ Valor    │ Status  │       │
│ ├──────────────┼──────────┼─────────┤       │
│ │ João         │ R$1.200★ │Recebido │       │
│ │ Pedro        │ R$1.500  │Recebido │       │
│ │ Maria        │    —     │Enviado  │       │
│ └──────────────┴──────────┴─────────┘       │
│                                             │
│ [+ Adicionar prestador]                     │
└─────────────────────────────────────────────┘
```

