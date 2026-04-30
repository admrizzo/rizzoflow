## Objetivo

Permitir que o time solicite correção específica (etapa + campo/documento + pessoa + mensagem) e que o cliente, ao abrir o link, vá direto ao item, corrija apenas aquilo e clique em "Enviar correção" — sem percorrer a proposta inteira.

## 1. Estrutura de dados (correção estruturada)

Hoje `proposal_correction_requests.requested_sections` é `jsonb` armazenando array de strings (`['documentos','fiador',...]`). Vamos manter o formato compatível, mas aceitar **objetos estruturados** dentro do mesmo array:

```json
[
  {
    "step": "documents",
    "field": "proof_of_income",
    "party_id": "uuid-or-null",
    "party_label": "Fiador 1 — João Silva",
    "label": "Comprovante de renda",
    "action": "replace_document"
  },
  {
    "step": "personal",
    "field": "whatsapp",
    "party_label": "Locatário principal",
    "label": "WhatsApp",
    "action": "edit_field"
  }
]
```

Sem migração de schema — o campo já é `jsonb`. Strings antigas continuam funcionando (retrocompatível).

## 2. Catálogo de etapas e campos (frontend)

Novo arquivo `src/lib/correctionCatalog.ts`:

- `CorrectionStep`: `personal | documents | residents | guarantee | negotiation | contract | review`
- `STEP_LABELS` para exibição
- `STEP_TO_PUBLIC_STEP` mapeando para o índice do stepper em `PropostaPublica.tsx`
- `FIELD_CATALOG`: lista de campos por etapa, cada um com `{ key, label, action: 'edit_field'|'replace_document', appliesToParties: ('locatario_principal'|'locatario_adicional'|'conjuge'|'fiador'|'conjuge_fiador'|'empresa'|'representante')[] }`
- `PARTY_KIND_LABELS`

## 3. Modal de solicitar correção (`RequestCorrectionDialog.tsx`)

Reescrita do conteúdo:

- Lista de "itens de correção" (n itens). Cada item:
  - Select **Etapa**
  - Select **Campo/documento** (filtrado pela etapa)
  - Select **Pessoa relacionada** (filtrado pelo campo: só exibe se aplicável; carrega `card_parties` reais quando o card existir; senão usa rótulos genéricos)
  - Botão remover
- Botão "+ Adicionar outro item de correção"
- Textarea de **mensagem geral** (obrigatória)
- Botão "Solicitar correção" — envia `requested_sections` como array de objetos estruturados.

`useCreateCorrectionRequest` aceita o novo formato (apenas tipagem; a coluna já é `jsonb`).

## 4. Página pública (`PropostaPublica.tsx`)

### 4.1 Banner de correção

Quando `pendingCorrection` existe e contém objetos estruturados:

- Mostra cada item como card clicável com: `etapa → campo (pessoa)` + descrição.
- Clicar leva direto para a etapa via `setCurrentStep(STEP_TO_PUBLIC_STEP[item.step])`, e dispara um `scrollIntoView` + highlight no campo, usando `data-correction-key={field}` em inputs/blocos.

### 4.2 Modo "correção direcionada"

Detecta se **todos** os itens são `action: 'edit_field'` ou `'replace_document'` em poucas etapas:

- Esconde o stepper completo de avanço por etapa.
- Mostra somente as etapas envolvidas com os campos/documentos a corrigir destacados.
- Adiciona botão fixo no topo/rodapé: **"Enviar correção"** — ao clicar:
  - Salva os campos/documentos alterados (reaproveita `saveDraftAndProgress` parcial e o fluxo de upload existente).
  - Marca `proposal_correction_requests.status = 'responded'` + `responded_at = now()`.
  - Registra log `proposal_correction_responded` (já existe).
  - Atualiza `proposal_links.status = 'enviada'`.
  - Mostra tela de sucesso ("Correção enviada com sucesso").
- Não obriga passar pela revisão completa.

### 4.3 Anexar `correction_request_id` aos uploads

Para itens com `action: 'replace_document'`, ao fazer upload daquele documento específico, já gravamos `correction_request_id = pendingCorrection.id` (lógica já existe em `uploadProposalDocument`; só garantir que o caminho de upload no modo direcionado passa o id).

### 4.4 Highlight visual

Helper `useCorrectionHighlight(fieldKey)` que retorna classes (`ring-2 ring-primary/60 bg-primary/5`) quando o campo está na lista de pendências.

## 5. Card interno (`CardDetailDialog.tsx`)

No bloco "Correção solicitada":
- Renderiza a lista estruturada (etapa, campo, pessoa, mensagem) em vez de só os nomes de seções.
- Mantém retrocompatibilidade quando `requested_sections` for array de strings (formato antigo).

## 6. Catálogo inicial de campos

| Etapa | Campos |
|---|---|
| personal | nome_completo, cpf, rg, whatsapp, email, data_nascimento, profissao, renda, fonte_renda, estado_civil, regime_bens, nacionalidade |
| documents | doc_foto, comprovante_residencia, comprovante_renda, doc_conjuge, doc_fiador, doc_conjuge_fiador, contrato_social, matricula_imovel |
| residents | conjuge_dados, locatario_adicional, qtde_moradores, possui_pets |
| guarantee | tipo_garantia, fiador_dados, seguro_fianca, caucao_valor, titulo_capitalizacao |
| negotiation | valor_proposto, condicoes_proposta, observacoes_negociacao |
| contract | data_inicio, dia_vencimento, tipo_assinatura, retirada_chaves |
| review | outros |

## 7. Como testar

1. Abrir um card com proposta enviada → "Solicitar correção".
2. Adicionar 2 itens: (a) editar WhatsApp do Locatário principal, (b) reenviar Comprovante de renda do Fiador 1.
3. Salvar mensagem geral e enviar.
4. Abrir o link público em janela anônima → deve aparecer banner com 2 cards clicáveis e botão "Enviar correção".
5. Clicar no item de WhatsApp → vai para etapa Dados Pessoais com o campo destacado.
6. Clicar no item de Comprovante → vai para Documentos com o slot do fiador destacado; fazer upload.
7. Clicar em "Enviar correção" → tela de sucesso; no card a badge muda para "Correção recebida" e o documento novo aparece com badge azul.

## 8. Notas técnicas

- Tipagem: nova interface `CorrectionItem` em `useCorrectionRequests.ts`; `requested_sections` passa a ser `Array<CorrectionItem | string>` (string = formato legado).
- Sem mudanças de schema/RLS.
- Reaproveitar mecanismos já existentes: `correction_request_id` em `proposal_documents`, `useOpenCardRealtime`, `proposal_correction_responded` log.
- Stepper público recebe um `targetSteps: number[]` opcional para limitar/ocultar etapas fora do escopo da correção.
