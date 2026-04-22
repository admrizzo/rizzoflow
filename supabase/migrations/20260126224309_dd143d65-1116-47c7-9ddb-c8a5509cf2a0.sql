-- 1. Deletar templates antigos do Fluxo do DEV (clonados do Venda)
DELETE FROM checklist_item_templates 
WHERE template_id IN (
  SELECT id FROM checklist_templates 
  WHERE board_id = 'd548ee8f-a2af-430c-9160-17c72bb14576'
);

DELETE FROM checklist_templates 
WHERE board_id = 'd548ee8f-a2af-430c-9160-17c72bb14576';

-- 2. Criar template: COMPRADOR (SEM FINANCIAMENTO)
INSERT INTO checklist_templates (board_id, name, position)
VALUES ('d548ee8f-a2af-430c-9160-17c72bb14576', 'COMPRADOR (SEM FINANCIAMENTO)', 0);

INSERT INTO checklist_item_templates (template_id, content, position)
SELECT t.id, item.content, item.position
FROM checklist_templates t
CROSS JOIN (VALUES
  ('CPF / cartão CNPJ', 0),
  ('RG', 1),
  ('Comprovante de residência mês xx/xxxx', 2),
  ('Certidão de nascimento (se solteiro) - xx/xxxx', 3),
  ('Certidão de casamento / divórcio (SE FOR O CASO) - xx/xxxx', 4),
  ('Certidão de estado civil atualizada xx/xxxx', 5),
  ('Pacto antenupcial', 6),
  ('Registro do pacto antenupcial', 7)
) AS item(content, position)
WHERE t.board_id = 'd548ee8f-a2af-430c-9160-17c72bb14576' 
  AND t.name = 'COMPRADOR (SEM FINANCIAMENTO)';

-- 3. Criar template: COMPRADOR (COM FINANCIAMENTO)
INSERT INTO checklist_templates (board_id, name, position)
VALUES ('d548ee8f-a2af-430c-9160-17c72bb14576', 'COMPRADOR (COM FINANCIAMENTO)', 1);

INSERT INTO checklist_item_templates (template_id, content, position)
SELECT t.id, item.content, item.position
FROM checklist_templates t
CROSS JOIN (VALUES
  ('CPF / cartão CNPJ', 0),
  ('RG / profissional / alteração contratual', 1),
  ('Comprovante de residência mês xx/xxxx', 2),
  ('Certidão de nascimento (se solteiro) - xx/xxxx', 3),
  ('Certidão de casamento / divórcio (SE FOR O CASO) - xx/xxxx', 4),
  ('Certidão de estado civil atualizada xx/xxxx', 5),
  ('Pacto antenupcial', 6),
  ('Registro do pacto antenupcial', 7),
  ('Data de admissão', 8),
  ('Contra cheque xx/xxxx', 9),
  ('Declaração de IRPF', 10),
  ('Outros documentos de comprovação de renda', 11),
  ('Carteira de trabalho se for usar FGTS', 12),
  ('Extrato FGTS', 13),
  ('Pesquisa cadastral - caixaaqui', 14)
) AS item(content, position)
WHERE t.board_id = 'd548ee8f-a2af-430c-9160-17c72bb14576' 
  AND t.name = 'COMPRADOR (COM FINANCIAMENTO)';

-- 4. Criar template: ANEXOS de Contrato
INSERT INTO checklist_templates (board_id, name, position)
VALUES ('d548ee8f-a2af-430c-9160-17c72bb14576', 'ANEXOS de Contrato', 2);

INSERT INTO checklist_item_templates (template_id, content, position)
SELECT t.id, item.content, item.position
FROM checklist_templates t
CROSS JOIN (VALUES
  ('ANEXO I - comissões', 0),
  ('ANEXO II - memorial exoval', 1),
  ('ANEXO III - itens de mobilia (se houver)', 2),
  ('Planta do apto', 3),
  ('planta garagem (se houver)', 4),
  ('Memoria descritivo', 5)
) AS item(content, position)
WHERE t.board_id = 'd548ee8f-a2af-430c-9160-17c72bb14576' 
  AND t.name = 'ANEXOS de Contrato';

-- 5. Criar campos personalizados para Fluxo do DEV
INSERT INTO board_fields (board_id, field_name, field_type, position)
VALUES 
  ('d548ee8f-a2af-430c-9160-17c72bb14576', 'Correspondente', 'text', 0),
  ('d548ee8f-a2af-430c-9160-17c72bb14576', 'Corretor Vendedor', 'text', 1),
  ('d548ee8f-a2af-430c-9160-17c72bb14576', 'Imobiliária', 'text', 2),
  ('d548ee8f-a2af-430c-9160-17c72bb14576', 'Detalhes', 'textarea', 3);