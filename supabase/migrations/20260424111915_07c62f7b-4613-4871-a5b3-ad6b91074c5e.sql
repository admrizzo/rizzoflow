-- Tabela para documentos da proposta vinculados ao card
CREATE TABLE public.proposal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  proposal_link_id UUID REFERENCES public.proposal_links(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  category_label TEXT NOT NULL,
  owner_type TEXT NOT NULL DEFAULT 'proponente',
  owner_label TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_documents_card ON public.proposal_documents(card_id);
CREATE INDEX idx_proposal_documents_link ON public.proposal_documents(proposal_link_id);

ALTER TABLE public.proposal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros podem ver proposal_documents"
  ON public.proposal_documents FOR SELECT TO authenticated
  USING (is_team_member(auth.uid()));

CREATE POLICY "Admins e editores podem gerenciar proposal_documents"
  ON public.proposal_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Anon pode inserir proposal_documents"
  ON public.proposal_documents FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon pode ver proposal_documents"
  ON public.proposal_documents FOR SELECT TO anon
  USING (true);

-- Bucket privado para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-documents', 'proposal-documents', false);

-- RLS no bucket
CREATE POLICY "Anon pode subir arquivos de proposta"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'proposal-documents');

CREATE POLICY "Membros podem ver arquivos de proposta"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'proposal-documents' AND is_team_member(auth.uid()));

CREATE POLICY "Admins podem gerenciar arquivos de proposta"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'proposal-documents' AND has_role(auth.uid(), 'admin'::app_role));