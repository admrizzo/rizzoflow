DROP POLICY IF EXISTS "Admins e editores podem gerenciar proposal_documents" ON public.proposal_documents;

CREATE POLICY "Operacional pode gerenciar proposal_documents"
ON public.proposal_documents
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'administrativo'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'administrativo'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
);