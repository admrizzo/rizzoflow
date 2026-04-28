-- Restringe a leitura de cards para usar can_view_card, que já implementa o escopo correto:
--  - admin vê tudo
--  - gestor/administrativo/editor veem cards dos fluxos com acesso (respeitando owner_only_visibility)
--  - corretor só vê cards onde é criador, responsável, ou vinculado via proposal_links.broker_user_id

DROP POLICY IF EXISTS "Usuários podem ver cards dos boards com acesso" ON public.cards;

CREATE POLICY "Usuários podem ver cards conforme escopo"
ON public.cards
FOR SELECT
TO authenticated
USING (public.can_view_card(auth.uid(), id));
