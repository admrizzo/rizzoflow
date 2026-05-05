 import { CardWithRelations } from '@/types/database';
 import { TitleContext, generateTitleFromPattern } from '@/hooks/useTitlePattern';
 
 interface BuildProposalCardTitleParams {
   currentTitle?: string | null;
   propertyIdentification?: string | null;
   parties?: Array<{ role: string; name?: string | null }> | null;
   draftData?: any | null;
   boardId?: string;
   titlePattern?: string | null;
 }
 
 /**
  * Helper centralizado para montar título seguro para cards de proposta.
  * Implementa lógica de prioridade e proteção contra "Não informado".
  */
 export function buildProposalCardTitle({
   currentTitle,
   propertyIdentification,
   parties,
   draftData,
   boardId,
   titlePattern,
 }: BuildProposalCardTitleParams): string {
   // 1. Tentar extrair nome do cliente com prioridade
   let clientName = '';
 
   // Prioridade 1: Razão Social/Nome da Empresa (PJ)
   const razaoSocial = draftData?.empresa?.razao_social || 
                      parties?.find(p => p.role === 'company' || p.role === 'empresa')?.name;
   
   // Prioridade 2: Nome do Proponente/Locatário Principal (PF)
   const nomePessoa = draftData?.dados_pessoais?.nome || 
                     parties?.find(p => p.role === 'primary_tenant' || p.role === 'locatario' || p.role === 'proponente')?.name;
 
   clientName = (razaoSocial || nomePessoa || '').trim();
 
   // Se o nome for inválido, tenta locatário adicional como fallback
   if (!clientName || clientName === 'Não informado') {
     const locAdicional = parties?.find(p => p.role === 'additional_tenant' || p.role === 'locatario_adicional')?.name;
     if (locAdicional) clientName = locAdicional.trim();
   }
 
   // 2. Se temos um padrão customizado para o board, usamos ele via TitlePattern logic
   if (titlePattern && titlePattern !== '{title}') {
     const context: TitleContext = {
       robust_code: draftData?.imovel?.codigo,
       building_name: propertyIdentification,
       description: draftData?.negociacao?.observacao,
       parties: {
         locatario: clientName,
         proprietario: parties?.find(p => p.role === 'proprietario')?.name,
       }
     };
     
     const newTitle = generateTitleFromPattern(titlePattern, context, clientName || propertyIdentification || 'Nova Proposta');
     
     // PROTEÇÃO: Nunca sobrescrever título bom por um "Não informado"
     if (currentTitle && 
         currentTitle !== 'Novo negócio' && 
         !currentTitle.startsWith('Não informado') && 
         (!newTitle || newTitle.startsWith('Não informado'))) {
       return currentTitle;
     }
     
     return newTitle || currentTitle || 'Nova Proposta';
   }
 
   // 3. Lógica padrão de fallback: {Cliente} — {Imóvel}
   let finalTitle = '';
   if (clientName && clientName !== 'Não informado' && propertyIdentification) {
     finalTitle = `${clientName} — ${propertyIdentification}`;
   } else if (clientName && clientName !== 'Não informado') {
     finalTitle = clientName;
   } else if (propertyIdentification) {
     finalTitle = propertyIdentification;
   } else {
     finalTitle = currentTitle || 'Nova Proposta';
   }
 
   // PROTEÇÃO FINAL: Nunca sobrescrever título bom por um "Não informado"
   if (currentTitle && 
       currentTitle !== 'Novo negócio' && 
       !currentTitle.startsWith('Não informado') && 
       (!finalTitle || finalTitle.startsWith('Não informado'))) {
     return currentTitle;
   }
 
   return finalTitle;
 }