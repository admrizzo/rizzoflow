---
name: Descrição adicional sem duplicidade
description: Nunca duplicar em "Descrição adicional" do card dados que já têm campo/bloco estruturado
type: preference
---
Sempre que existir campo estruturado no card (envolvidos, imóvel, endereço, negociação, valores, garantia, corretor, score, renda, comprometimento, documentos, etc.), NÃO duplicar essa informação em "Descrição adicional".

A "Descrição adicional" deve conter apenas observações livres digitadas pelo usuário ou informações excepcionais sem campo próprio. Se vazia, ocultar o bloco.

**Why:** Evita poluição visual e inconsistência (duas fontes da mesma informação).
**How to apply:** Ao criar/finalizar propostas (PropostaPublica, PropostaLocacao, RPC finalize_public_proposal) e em qualquer fluxo que gere `cards.description` automaticamente, manter `description` vazia se todos os dados já estão estruturados.
