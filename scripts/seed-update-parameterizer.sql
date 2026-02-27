-- =============================================================================
-- SEED UPDATE: Parametrizer scenarios — more specific steps & instructions
-- Run manually in Supabase SQL Editor after initial seed
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Guia 2: Parametrização — Regras (scenarios 1–5)
-- ─────────────────────────────────────────────────────────────────────────────

-- Scenario 1: Criar regra de parametrização de conteúdo para escola
UPDATE test_scenarios
SET
  precondition = 'Acesso de edição à escola. Escola sem regra de parametrização existente (pode ter kits vinculados — a regra terá prioridade).',
  steps_to_execute =
'1. Acesse a escola desejada (Menu > Escolas > selecione a escola).
2. Vá para a aba "Parametrização de conteúdo".
3. Selecione o ano letivo no filtro (obrigatório).
4. Clique em "Criar Regra".
5. Navegue pela árvore de coleções e selecione pelo menos 1 coleção (ao selecionar um nó pai, todos os filhos são selecionados automaticamente).
6. Clique em "Salvar".
7. Vá para a aba "Histórico" da escola.',
  expected_result =
'Novo evento aparece na timeline com:
• Origem: Usuário
• Recurso: "Parametrizador"
• Impacto: Direto
• Resumo: "Parametrização de conteúdo criada"
Ao abrir os detalhes: texto descritivo indicando quem criou a regra e em qual escola, com o nome da regra e a árvore de conteúdo expandível (coleções > níveis > anos > componentes).

IMPORTANTE: Se a escola já possuía kits vinculados, eles NÃO são removidos — ficam "em espera" até que a regra seja removida. A regra SEMPRE tem prioridade sobre kits.',
  key_rules = 'Impacto deve ser Direto. A regra tem prioridade absoluta sobre kits vinculados.'
WHERE title = '1. Criar regra de parametrização de conteúdo para escola';


-- Scenario 2: Editar regra de parametrização de conteúdo para escola
UPDATE test_scenarios
SET
  precondition = 'Regra de parametrização existente na escola (a escola deve ter type: "RULE" na parametrização).',
  steps_to_execute =
'1. Acesse a escola desejada.
2. Vá para a aba "Parametrização de conteúdo".
3. Clique no botão "Editar" na regra existente.
4. No drawer/modal de edição, navegue pela árvore de coleções.
5. Marque novas coleções ou desmarque coleções existentes (é obrigatório manter pelo menos 1 coleção selecionada).
6. Clique em "Salvar".
7. Vá para a aba "Histórico" da escola.',
  expected_result =
'Novo evento de atualização aparece na timeline.
• Resumo: "Parametrização de conteúdo atualizada"
Ao abrir os detalhes: texto indicando quem atualizou a regra e em qual escola, com o snapshot atualizado da configuração.

A atualização tem efeito imediato na Estante de Conteúdos da escola.',
  key_rules = 'É obrigatório manter pelo menos 1 coleção selecionada.'
WHERE title = '2. Editar regra de parametrização de conteúdo para escola';


-- Scenario 3: Criar regra via Kit
UPDATE test_scenarios
SET
  precondition = 'Kit com status ATIVO disponível no sistema. Escola sem regra de parametrização existente.',
  steps_to_execute =
'1. Acesse a escola desejada.
2. Vá para a aba "Parametrização de conteúdo".
3. Se não houver parametrização, o sistema exibirá um estado vazio com opções.
4. Escolha a opção de vincular kits: clique em "Editar" e selecione kits ativos.
5. O sistema verificará automaticamente se alguma escola já possui uma REGRA — se tiver, a regra terá prioridade.
6. Confirme a vinculação.
7. Vá para a aba "Histórico" da escola.',
  expected_result =
'Novo evento aparece na timeline.
• Resumo: "Parametrização de conteúdo criada a partir de kits"
Ao abrir os detalhes: texto indicando que a regra foi criada a partir de kits, com a árvore de conteúdo gerada visível.

A escola passará a ter acesso às coleções do kit imediatamente.',
  key_rules = 'O kit DEVE estar com status ATIVO para ser vinculado. Kits BLOQUEADOS não podem ser vinculados a novas escolas.'
WHERE title = '3. Criar regra via Kit';


-- Scenario 4: Deletar regra de parametrização de conteúdo
UPDATE test_scenarios
SET
  precondition = 'Regra de parametrização existente na escola com coleções.',
  steps_to_execute =
'1. Acesse a escola desejada.
2. Vá para a aba "Parametrização de conteúdo".
3. Na lista de coleções da regra:
   • Para excluir uma coleção individual: clique no ícone de exclusão da coleção e confirme no modal.
   • Para exclusão em lote: marque os checkboxes das coleções desejadas e clique em "Excluir coleções selecionadas".
4. Confirme a exclusão no modal: "Esta ação não poderá ser desfeita."
5. Remova TODAS as coleções para efetivamente eliminar a regra.
6. Vá para a aba "Histórico" da escola.',
  expected_result =
'Novo evento de remoção aparece na timeline.
• Impacto: Direto
• Resumo: "Parametrização de conteúdo removida para o ano {ano}"
Ao abrir os detalhes: texto indicando que o usuário removeu a regra DA instituição (usando a preposição "da", não "na").

IMPORTANTE: Se TODAS as coleções forem removidas, a regra fica efetivamente vazia e os kits vinculados voltam a ter efeito automaticamente.',
  key_rules = 'Verificar preposição "da" (não "na") no texto descritivo. Se todas as coleções forem removidas, os kits vinculados voltam a ter efeito.'
WHERE title = '4. Deletar regra de parametrização de conteúdo';


-- Scenario 5: Copiar regra para outra escola
UPDATE test_scenarios
SET
  precondition = 'Regra de parametrização existente em uma escola de origem. Escola destino acessível.',
  steps_to_execute =
'1. Acesse a escola de ORIGEM que possui a regra.
2. Vá para a aba "Parametrização de conteúdo".
3. Utilize a ação de copiar regra para outra escola.
4. Selecione a escola de DESTINO.
5. Confirme a cópia.
6. Vá para a aba "Histórico" da escola DESTINO (não da origem).',
  expected_result =
'Novo evento de cópia aparece na timeline da escola DESTINO.
• Resumo: "Parametrização de conteúdo copiada"
Ao abrir os detalhes: texto indicando que o usuário copiou a regra PARA A instituição destino (preposição "para a"), com a configuração copiada visível.

IMPORTANTE: Se a escola destino já possuía kits vinculados, a regra copiada terá prioridade sobre eles.',
  key_rules = 'Verificar que o evento aparece na escola DESTINO e usa preposição "para a". A regra copiada terá prioridade sobre kits existentes na escola destino.'
WHERE title = '5. Copiar regra para outra escola';


-- ─────────────────────────────────────────────────────────────────────────────
-- Guia 2: Parametrização — Kits (scenarios 6–10)
-- ─────────────────────────────────────────────────────────────────────────────

-- Scenario 6: Mudar status do kit
UPDATE test_scenarios
SET
  precondition = 'Kit existente vinculado a escolas. Status atual do kit conhecido (Rascunho, Ativo ou Bloqueado).',
  steps_to_execute =
'1. Acesse o Parametrizador de Conteúdos (menu principal) > aba "Kits".
2. Localize o kit desejado na lista (use filtros se necessário).
3. Clique no menu de ações (⋮) do kit.
4. Selecione a ação de status desejada:
   • "Ativar" — muda para Ativo (permite vincular a escolas).
   • "Bloquear" — muda para Bloqueado (impede novos vínculos, mas escolas já vinculadas mantêm o vínculo).
   • "Converter para rascunho" — muda para Rascunho.
5. Confirme a alteração.
6. Vá para a aba "Histórico" de uma escola vinculada ao kit.',
  expected_result =
'Novo evento aparece na timeline da escola vinculada.
• Impacto: Indireto
• Resumo: "Status do kit ''{Nome do Kit}'' alterado para ''{Novo Status}''"
Ao abrir os detalhes: código e status do kit visíveis.

Transições permitidas:
  - Rascunho → Ativo, Bloqueado
  - Ativo → Rascunho, Bloqueado
  - Bloqueado → Ativo, Rascunho',
  key_rules = 'Impacto deve ser Indireto (a alteração foi no kit, não na escola). Kits BLOQUEADOS não podem ser vinculados a NOVAS escolas, mas escolas já vinculadas mantêm o vínculo.'
WHERE title = '6. Mudar status do kit';


-- Scenario 7: Atualização de kit (Snapshot completo)
UPDATE test_scenarios
SET
  precondition = 'Kit existente vinculado a escolas. Kit com status que permita edição.',
  steps_to_execute =
'1. Acesse o Parametrizador de Conteúdos > aba "Kits".
2. Localize o kit desejado na lista.
3. Clique no menu de ações (⋮) do kit e selecione "Editar".
4. Altere nome, descrição ou status conforme necessário.
5. Para modificar coleções, navegue pela árvore e marque/desmarque coleções (é obrigatório manter pelo menos 1 coleção selecionada).
6. Clique em "Salvar".
7. Se receber erro de conflito (409), recarregue a página e tente novamente — outro usuário pode ter editado o kit.
8. Vá para a aba "Histórico" de uma escola vinculada ao kit.',
  expected_result =
'Novo evento de atualização aparece na timeline.
• Impacto: Indireto
• Resumo: "Kit ''{Nome}'' atualizado"
Ao abrir os detalhes: nome e código do kit visíveis (com link clicável para a página do kit), árvore de conteúdo expandível.
Botão "Mostrar detalhes"/"Ocultar detalhes" funciona corretamente.

A versão do kit é incrementada automaticamente a cada edição (controle de concorrência).',
  key_rules = 'Verificar que o nome do kit é um link clicável e que o botão expandir/colapsar funciona. Se receber erro 409 (conflito de versão), é comportamento esperado — recarregue e tente novamente.'
WHERE title = '7. Atualização de kit (Snapshot completo)';


-- Scenario 8: Vínculo de kit em massa
UPDATE test_scenarios
SET
  precondition = 'Kit existente com status ATIVO. Múltiplas escolas disponíveis para vínculo.',
  steps_to_execute =
'1. Acesse o Parametrizador de Conteúdos > aba "Kits".
2. Clique no kit desejado para abrir os detalhes.
3. Na seção "Escolas vinculadas", clique no botão para vincular novas escolas.
4. No drawer que se abre, busque e selecione múltiplas escolas.
5. O sistema verificará automaticamente se alguma escola já possui uma REGRA de parametrização — se tiver, ela será destacada com um aviso (a regra terá prioridade sobre o kit).
6. Confirme a vinculação.
7. Vá para a aba "Histórico" de uma das escolas vinculadas.',
  expected_result =
'Novo evento aparece na timeline.
• Impacto: Indireto
• Resumo: "Recebeu o kit ''{Nome do Kit}''"
Ao abrir os detalhes: informações do kit com resumo da configuração.

As escolas vinculadas passarão a ter acesso às coleções do kit imediatamente (exceto se tiverem regra — nesse caso o kit fica em espera).',
  key_rules = 'O kit DEVE estar com status ATIVO. Se a escola já possuir uma REGRA, a regra terá prioridade — o kit ficará em espera. Verificar o alerta informativo para escolas com regra existente.'
WHERE title = '8. Vínculo de kit em massa';


-- Scenario 9: Desvínculo em massa de kit
UPDATE test_scenarios
SET
  precondition = 'Kit vinculado a múltiplas escolas. Acesso à página de detalhes do kit.',
  steps_to_execute =
'1. Acesse o Parametrizador de Conteúdos > aba "Kits".
2. Clique no kit desejado para abrir os detalhes.
3. Na seção "Escolas vinculadas", localize as escolas a desvincular.
4. Marque o checkbox das escolas desejadas.
5. Clique no botão de desvinculação em massa (ou use o menu de ação individual).
6. Confirme a desvinculação.
7. Vá para a aba "Histórico" de uma das escolas desvinculadas.',
  expected_result =
'Novo evento aparece na timeline.
• Impacto: Indireto
• Resumo: "Perdeu vínculo com o kit ''{Nome do Kit}''"

A escola perde acesso IMEDIATAMENTE após a desvinculação às coleções do kit.',
  key_rules = 'A escola perde acesso imediatamente. É possível desvincular múltiplas escolas de uma vez.'
WHERE title = '9. Desvínculo em massa de kit';


-- Scenario 10: Desvincular TODAS as escolas do kit
UPDATE test_scenarios
SET
  precondition = 'Kit vinculado a escolas. Necessário para poder excluir o kit posteriormente.',
  steps_to_execute =
'1. Acesse o Parametrizador de Conteúdos > aba "Kits".
2. Clique no kit desejado para abrir os detalhes.
3. Na seção "Escolas vinculadas", selecione TODAS as escolas (marque todos os checkboxes).
4. Clique no botão de desvinculação em massa.
5. Confirme a desvinculação de todas as escolas.
6. Vá para a aba "Histórico" de uma escola que estava vinculada.',
  expected_result =
'Novo evento aparece na timeline.
• Impacto: Indireto
• Resumo: "Perdeu vínculo com o kit ''{Nome do Kit}''"
Ao abrir os detalhes: alerta informativo adicional deve estar visível.

Todas as escolas perdem acesso imediatamente. Após desvincular todas as escolas, o kit pode ser excluído.',
  key_rules = 'Verificar que o alerta informativo aparece nos detalhes. É necessário desvincular todas as escolas antes de excluir um kit.'
WHERE title = '10. Desvincular TODAS as escolas do kit';


-- ─────────────────────────────────────────────────────────────────────────────
-- Guia 3: Pacotes e Produtos — scenario 15 (permissões) update
-- ─────────────────────────────────────────────────────────────────────────────

-- Scenario 18: Falso positivo — reforçar contexto
UPDATE test_scenarios
SET
  key_rules = 'IMPORTANTE: Nenhum evento deve ser gerado. Se aparecer evento, é BUG. Isso vale especificamente para alterações em permissões de série/perfil de um Produto DENTRO de um Pacote — essas são sub-recursos e não devem afetar o histórico da escola.'
WHERE title = '18. Falso positivo — alterar permissões de série/perfil de produto dentro de pacote';
