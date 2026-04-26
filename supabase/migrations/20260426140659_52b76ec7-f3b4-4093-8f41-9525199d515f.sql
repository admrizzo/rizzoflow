-- Atualizar policies de checklists para incluir gestor e administrativo
DROP POLICY IF EXISTS "Admins e editores podem gerenciar checklists" ON public.checklists;

CREATE POLICY "Operacional pode gerenciar checklists"
ON public.checklists
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'administrativo'::app_role)
  OR public.has_role(auth.uid(), 'editor'::app_role) -- compat legada
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'administrativo'::app_role)
  OR public.has_role(auth.uid(), 'editor'::app_role)
);

-- Atualizar policies de checklist_items para incluir gestor e administrativo
DROP POLICY IF EXISTS "Admins e editores podem gerenciar checklist_items" ON public.checklist_items;

CREATE POLICY "Operacional pode gerenciar checklist_items"
ON public.checklist_items
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'administrativo'::app_role)
  OR public.has_role(auth.uid(), 'editor'::app_role) -- compat legada
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'administrativo'::app_role)
  OR public.has_role(auth.uid(), 'editor'::app_role)
);