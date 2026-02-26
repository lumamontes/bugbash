import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required. Set it in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

function id() {
  return crypto.randomUUID();
}

function ts(daysAgo = 0): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

async function seed() {
  console.log('Seeding database...\n');

  // ── Reset ────────────────────────────────────────────────────────────────
  console.log('Clearing existing data...');
  await pool.query(`
    TRUNCATE
      test_resources, test_step_results, test_steps, scenario_executions,
      test_scenarios, test_sections, test_scripts, test_credentials,
      bug_tags, bug_evidence, bug_comments, bugs,
      user_badges, badge_definitions,
      session_participants, sessions,
      auth_sessions, invite_links,
      tags, users, squads, organizations
    CASCADE
  `);
  console.log('Done.\n');

  // ── Organization ───────────────────────────────────────────────────────────
  const orgId = id();
  await db.insert(schema.organizations).values({
    id: orgId,
    name: 'Arcotech',
    slug: 'arcotech',
    createdAt: ts(90),
  });
console.log('Created organization: Arcotech');

// ── Squad ─────────────────────────────────────────────────────────────────
const squadId = id();
await db.insert(schema.squads).values({
  id: squadId,
  name: 'Onboarding LMS',
  orgId,
  createdAt: ts(90),
});
console.log('Created squad: Onboarding LMS');

// ── Admin User ─────────────────────────────────────────────────────────────
const adminId = id();
await db.insert(schema.users).values({
  id: adminId,
  name: 'Admin',
  email: 'admin@arcotech.com.br',
  role: 'admin',
  isFirstUser: true,
  orgId,
  createdAt: ts(90),
});
console.log('Created admin: admin@arcotech.com.br');

// ── Tags ───────────────────────────────────────────────────────────────────
const tagData = [
  { name: 'regressão', color: '#ef4444' },
  { name: 'ux', color: '#8b5cf6' },
  { name: 'performance', color: '#f97316' },
  { name: 'segurança', color: '#dc2626' },
  { name: 'mobile', color: '#06b6d4' },
  { name: 'api', color: '#22c55e' },
];

for (const t of tagData) {
  await db.insert(schema.tags).values({
    id: id(),
    name: t.name,
    color: t.color,
    orgId,
  });
}
console.log(`Created ${tagData.length} tags`);

// ── Session: Bug Bash Histórico Operacional ───────────────────────────────
const sessionId = id();
await db.insert(schema.sessions).values({
  id: sessionId,
  title: 'Bug Bash Histórico Operacional',
  description: 'Sessão de bug bash para validação do Histórico Operacional no Backoffice. Foco em parametrização de conteúdo, pacotes/produtos, filtros e edge cases.',
  status: 'draft',
  orgId,
  createdBy: adminId,
  kickoffDuration: 15,
  executionDuration: 90,
  wrapupDuration: 15,
  widgetEnabled: false,
  createdAt: ts(1),
});
console.log('Created session: Bug Bash Histórico Operacional');

// ── Test Script ───────────────────────────────────────────────────────────
const scriptId = id();
await db.insert(schema.testScripts).values({
  id: scriptId,
  sessionId,
  title: 'Histórico Operacional — Roteiro Completo',
  description: 'Roteiro de testes para validação do Histórico Operacional de Escolas no Backoffice. Cobre parametrização de conteúdo (regras e kits), pacotes/produtos, filtros e edge cases.',
  orderIndex: 0,
  createdAt: ts(1),
});

// ── Guia 1: Boas-Vindas (informational section) ──────────────────────────
const guia1Id = id();
await db.insert(schema.testSections).values({
  id: guia1Id,
  scriptId,
  title: 'Guia 1: Boas-Vindas',
  description: `O Histórico Operacional exibe uma linha do tempo de todas as ações que afetam as configurações de uma entidade (Escola). Acesso: Aba de Escolas > clique na escola > aba "Histórico".

IMPORTANTE:
• Impacto Direto = alterações feitas diretamente na escola. Impacto Indireto = alterações em recurso global que afeta a escola.
• Banner laranja NÃO é bug — eventos legados sem autor são esperados.
• Mudar permissões de série/perfil de um Produto dentro de um Pacote NÃO deve gerar evento no histórico da escola.
• Filtros combinados devem funcionar rapidamente (stress test).
• Textos devem estar humanizados, sem JSON ou dados técnicos crus.`,
  status: 'active',
  sortOrder: 0,
  createdAt: ts(1),
});

// ── Guia 2: Parametrização de Conteúdo — Regras ──────────────────────────
const guia2RegrasId = id();
await db.insert(schema.testSections).values({
  id: guia2RegrasId,
  scriptId,
  title: 'Guia 2: Parametrização — Regras',
  description: 'Cenários de teste para CRUD de regras de parametrização de conteúdo.',
  status: 'active',
  sortOrder: 1,
  createdAt: ts(1),
});

const regrasScenarios = [
  {
    title: '1. Criar regra de parametrização de conteúdo para escola',
    precondition: 'Acesso de edição à escola',
    stepsToExecute: '1. Ir para edição da escola\n2. Aba "Parametrização de conteúdo"\n3. Criar uma nova regra selecionando coleções, níveis, anos e componentes curriculares\n4. Salvar\n5. Ir na aba "Histórico"',
    expectedResult: 'Novo evento aparece na timeline com:\n• Origem: Usuário\n• Recurso: "Parametrizador"\n• Impacto: Direto\n• Resumo: "Parametrização de conteúdo criada"\nAo abrir os detalhes: texto descritivo indicando quem criou a regra e em qual escola, com o nome da regra e a árvore de conteúdo expandível (coleções > níveis > anos > componentes).',
    keyRules: 'Impacto deve ser Direto.',
  },
  {
    title: '2. Editar regra de parametrização de conteúdo para escola',
    precondition: 'Regra existente na escola',
    stepsToExecute: '1. Editar uma regra existente (adicionar/remover coleção, nível ou componente)\n2. Salvar\n3. Ir na aba "Histórico"',
    expectedResult: 'Novo evento de atualização aparece na timeline.\n• Resumo: "Parametrização de conteúdo atualizada"\nAo abrir os detalhes: texto indicando quem atualizou a regra e em qual escola, com o snapshot atualizado da configuração.',
    keyRules: null,
  },
  {
    title: '3. Criar regra via Kit',
    precondition: 'Kit disponível para a escola',
    stepsToExecute: '1. Na escola, criar regra de parametrização com base em kit\n2. Ir na aba "Histórico"',
    expectedResult: 'Novo evento aparece na timeline.\n• Resumo: "Parametrização de conteúdo criada a partir de kits"\nAo abrir os detalhes: texto indicando que a regra foi criada a partir de kits, com a árvore de conteúdo gerada visível.',
    keyRules: null,
  },
  {
    title: '4. Deletar regra de parametrização de conteúdo',
    precondition: 'Regra existente na escola',
    stepsToExecute: '1. Na escola, aba "Parametrização de conteúdo"\n2. Deletar uma regra\n3. Aba "Histórico"',
    expectedResult: 'Novo evento de remoção aparece na timeline.\n• Impacto: Direto\n• Resumo: "Parametrização de conteúdo removida para o ano {ano}"\nAo abrir os detalhes: texto indicando que o usuário removeu a regra DA instituição (usando a preposição "da", não "na").',
    keyRules: 'Verificar preposição "da" (não "na") no texto descritivo.',
  },
  {
    title: '5. Copiar regra para outra escola',
    precondition: 'Regra existente em uma escola de origem',
    stepsToExecute: '1. Copiar uma regra de parametrização de uma escola para outra\n2. Ir na aba "Histórico" da escola destino',
    expectedResult: 'Novo evento de cópia aparece na timeline da escola DESTINO.\n• Resumo: "Parametrização de conteúdo copiada"\nAo abrir os detalhes: texto indicando que o usuário copiou a regra PARA A instituição destino (preposição "para a"), com a configuração copiada visível.',
    keyRules: 'Verificar que o evento aparece na escola DESTINO e usa preposição "para a".',
  },
];

for (let i = 0; i < regrasScenarios.length; i++) {
  const sc = regrasScenarios[i];
  await db.insert(schema.testScenarios).values({
    id: id(),
    sectionId: guia2RegrasId,
    title: sc.title,
    precondition: sc.precondition,
    stepsToExecute: sc.stepsToExecute,
    expectedResult: sc.expectedResult,
    keyRules: sc.keyRules,
    sortOrder: i,
    createdAt: ts(1),
  });
}

// ── Guia 2: Parametrização de Conteúdo — Kits ────────────────────────────
const guia2KitsId = id();
await db.insert(schema.testSections).values({
  id: guia2KitsId,
  scriptId,
  title: 'Guia 2: Parametrização — Kits',
  description: 'Cenários de teste para operações com Kits e impacto indireto no histórico de escolas.',
  status: 'active',
  sortOrder: 2,
  createdAt: ts(1),
});

const kitsScenarios = [
  {
    title: '6. Mudar status do kit',
    precondition: 'Kit vinculado a escolas',
    stepsToExecute: '1. Parametrizador de Conteúdos > Kits\n2. Mudar status de um kit vinculado a escolas (ex: Ativo → Desabilitado)\n3. Aba "Histórico" de uma escola vinculada',
    expectedResult: 'Novo evento aparece na timeline da escola vinculada.\n• Impacto: Indireto\n• Resumo: "Status do kit \'{Nome do Kit}\' alterado para \'{Novo Status}\'"\nAo abrir os detalhes: código e status do kit visíveis.',
    keyRules: 'Impacto deve ser Indireto (a alteração foi no kit, não na escola).',
  },
  {
    title: '7. Atualização de kit (Snapshot completo)',
    precondition: 'Kit vinculado a escolas',
    stepsToExecute: '1. Editar conteúdo de um kit (coleções, níveis, componentes)\n2. Salvar\n3. Aba "Histórico" de escola vinculada',
    expectedResult: 'Novo evento de atualização aparece na timeline.\n• Impacto: Indireto\n• Resumo: "Kit \'{Nome}\' atualizado"\nAo abrir os detalhes: nome e código do kit visíveis (com link clicável para a página do kit), árvore de conteúdo expandível.\nBotão "Mostrar detalhes"/"Ocultar detalhes" funciona corretamente.',
    keyRules: 'Verificar que o nome do kit é um link clicável e que o botão expandir/colapsar funciona.',
  },
  {
    title: '8. Vínculo de kit em massa',
    precondition: 'Kit existente, múltiplas escolas',
    stepsToExecute: '1. Vincular um kit a múltiplas escolas (vínculo em massa)\n2. Aba "Histórico" de uma das escolas',
    expectedResult: 'Novo evento aparece na timeline.\n• Impacto: Indireto\n• Resumo: "Recebeu o kit \'{Nome do Kit}\'"\nAo abrir os detalhes: informações do kit com resumo da configuração.',
    keyRules: null,
  },
  {
    title: '9. Desvínculo em massa de kit',
    precondition: 'Kit vinculado a múltiplas escolas',
    stepsToExecute: '1. Desvincular um kit de múltiplas escolas\n2. Aba "Histórico" de uma das escolas desvinculadas',
    expectedResult: 'Novo evento aparece na timeline.\n• Impacto: Indireto\n• Resumo: "Perdeu vínculo com o kit \'{Nome do Kit}\'"',
    keyRules: null,
  },
  {
    title: '10. Desvincular TODAS as escolas do kit',
    precondition: 'Kit vinculado a escolas',
    stepsToExecute: '1. No kit, desvincular todas as escolas de uma vez\n2. Aba "Histórico" de uma escola que estava vinculada',
    expectedResult: 'Novo evento aparece na timeline.\n• Impacto: Indireto\n• Resumo: "Perdeu vínculo com o kit \'{Nome do Kit}\'"\nAo abrir os detalhes: alerta informativo adicional deve estar visível.',
    keyRules: 'Verificar que o alerta informativo aparece nos detalhes.',
  },
];

for (let i = 0; i < kitsScenarios.length; i++) {
  const sc = kitsScenarios[i];
  await db.insert(schema.testScenarios).values({
    id: id(),
    sectionId: guia2KitsId,
    title: sc.title,
    precondition: sc.precondition,
    stepsToExecute: sc.stepsToExecute,
    expectedResult: sc.expectedResult,
    keyRules: sc.keyRules,
    sortOrder: i,
    createdAt: ts(1),
  });
}

// ── Guia 3: Pacotes e Produtos ────────────────────────────────────────────
const guia3Id = id();
await db.insert(schema.testSections).values({
  id: guia3Id,
  scriptId,
  title: 'Guia 3: Pacotes e Produtos',
  description: 'Cenários de teste para vínculo/desvínculo de pacotes e validação de falsos positivos.',
  status: 'active',
  sortOrder: 3,
  createdAt: ts(1),
});

const pacotesScenarios = [
  {
    title: '11. Vincular pacote à escola',
    precondition: 'Acesso de edição à escola, pacote disponível',
    stepsToExecute: '1. Menu Gestão → Escolas → selecionar escola\n2. Aba "Pacotes"\n3. Clicar em "Adicionar pacotes"\n4. No drawer, marcar um pacote que contenha produtos novos para a escola\n5. Clicar "Salvar" e confirmar no modal\n6. Ir na aba "Histórico" da escola',
    expectedResult: 'Novo evento aparece na timeline.\n• Impacto: Direto\n• Resumo: indica que a escola recebeu o pacote (e consequentemente acesso aos produtos)\nAo abrir os detalhes: lista dos pacotes adicionados com seus nomes.',
    keyRules: null,
  },
  {
    title: '12. Desvincular pacote da escola',
    precondition: 'Escola com pacote vinculado (pacote customizado, não padrão)',
    stepsToExecute: '1. Editar escola\n2. Remover um pacote\n3. Salvar\n4. Aba "Histórico"',
    expectedResult: 'Novo evento aparece na timeline.\n• Impacto: Direto\n• Resumo: "Perdeu vínculo com o pacote \'{Nome do Pacote}\'"',
    keyRules: null,
  },
  {
    title: '13. Vincular produto em um pacote',
    precondition: 'Pacote existente vinculado a escolas',
    stepsToExecute: '1. Menu Gestão → Pacotes\n2. Clicar em "Editar pacote" no pacote desejado\n3. Na tabela de Produtos, marcar o checkbox de um produto não selecionado\n4. Clicar em "Confirmar"\n5. No modal de confirmação, digitar o nome do pacote e confirmar\n6. Ir na aba "Histórico" de uma escola vinculada a esse pacote',
    expectedResult: 'Novo evento aparece na timeline.\n• Impacto: Indireto\n• Resumo: indica que o pacote foi atualizado com o produto adicionado\nAo abrir os detalhes: lista do produto adicionado.\nVerificar que a escola vinculada ao pacote agora tem acesso ao novo produto.',
    keyRules: 'Impacto deve ser Indireto (a alteração foi no pacote, não na escola).',
  },
  {
    title: '14. Desvincular produto de um pacote',
    precondition: 'Pacote com produtos vinculado a escolas',
    stepsToExecute: '1. Menu Gestão → Pacotes\n2. Clicar em "Editar pacote" no pacote desejado\n3. Na tabela de Produtos, desmarcar o checkbox de um produto selecionado\n4. Clicar em "Confirmar"\n5. No modal de confirmação, digitar o nome do pacote e confirmar\n6. Ir na aba "Histórico" de uma escola vinculada a esse pacote',
    expectedResult: 'Novo evento aparece na timeline.\n• Impacto: Indireto\n• Resumo: indica que o pacote foi atualizado com o produto removido\nAo abrir os detalhes: lista do produto removido.\nVerificar que a escola vinculada ao pacote perde acesso ao produto removido.',
    keyRules: 'Impacto deve ser Indireto.',
  },
  {
    title: '15. Alterar permissão de produto dentro do pacote',
    precondition: 'Pacote com produtos vinculado a escolas',
    stepsToExecute: '1. Menu Gestão → Pacotes\n2. Clicar em "Editar pacote"\n3. Na tabela de Produtos, clicar em "Editar permissões" no produto desejado\n4. No drawer de permissões, alterar perfis (ex: marcar/desmarcar "Coordenador") ou séries (ex: marcar/desmarcar "5º ano")\n5. Clicar em "Confirmar" no drawer\n6. Clicar em "Confirmar" no formulário do pacote\n7. Digitar nome do pacote no modal e confirmar\n8. Ir na aba "Histórico" de uma escola vinculada a esse pacote',
    expectedResult: 'Novo evento aparece na timeline.\n• Impacto: Indireto\n• Resumo: indica que as permissões do produto no pacote foram alteradas\nAo abrir os detalhes: detalhes de perfis/séries alterados.',
    keyRules: 'Impacto deve ser Indireto.',
  },
  {
    title: '16. Deletar produto',
    precondition: 'Produto existente vinculado a escolas via pacote',
    stepsToExecute: '1. Menu Gestão → Produtos\n2. Clicar no menu de ações (⋮) do produto desejado\n3. Selecionar "Excluir produto"\n4. No modal, digitar o nome do produto e clicar "Excluir"\n5. Verificar toast de sucesso\n6. Ir na aba "Histórico" de uma escola que tinha acesso ao produto (via pacote)',
    expectedResult: 'Toast: "O produto \'{nome}\' foi excluído". O produto desaparece da lista.\nNa escola: novo evento aparece na timeline.\n• Impacto: Indireto\n• Resumo: indica que o produto foi removido.',
    keyRules: null,
  },
  {
    title: '17. Deletar pacote',
    precondition: 'Pacote customizado (não padrão) vinculado a escolas',
    stepsToExecute: '1. Menu Gestão → Pacotes\n2. Clicar no menu de ações (⋮) do pacote desejado (não pode ser pacote padrão)\n3. Selecionar "Excluir pacote"\n4. No modal, digitar o nome do pacote e confirmar\n5. Verificar toast de sucesso\n6. Ir na aba "Histórico" de uma escola que estava vinculada ao pacote',
    expectedResult: 'Toast: "O pacote \'{nome}\' foi excluído". O pacote desaparece da lista.\nNa escola: novo evento aparece na timeline.\n• Impacto: Direto\n• Resumo: indica que a escola perdeu o vínculo com o pacote.',
    keyRules: 'Pacotes padrão (standard) não podem ser excluídos — usar pacote customizado.',
  },
  {
    title: '18. Falso positivo — alterar permissões de série/perfil de produto dentro de pacote',
    precondition: 'Pacote vinculado à escola com produtos',
    stepsToExecute: '1. Alterar permissões de série/perfil de um Produto que está dentro de um Pacote associado à escola\n2. Ir na aba "Histórico" da escola',
    expectedResult: 'Nenhum novo evento deve aparecer no histórico da escola.\nAlterações em sub-recursos de pacotes (como permissões de produto) não devem gerar eventos no histórico.',
    keyRules: 'IMPORTANTE: Nenhum evento deve ser gerado. Se aparecer evento, é BUG.',
  },
];

for (let i = 0; i < pacotesScenarios.length; i++) {
  const sc = pacotesScenarios[i];
  await db.insert(schema.testScenarios).values({
    id: id(),
    sectionId: guia3Id,
    title: sc.title,
    precondition: sc.precondition,
    stepsToExecute: sc.stepsToExecute,
    expectedResult: sc.expectedResult,
    keyRules: sc.keyRules,
    sortOrder: i,
    createdAt: ts(1),
  });
}

// ── Guia 4: Filtros, Navegação e Edge Cases ───────────────────────────────
const guia4Id = id();
await db.insert(schema.testSections).values({
  id: guia4Id,
  scriptId,
  title: 'Guia 4: Filtros, Navegação e Edge Cases',
  description: 'Cenários de teste para filtros, paginação, ordenação, drawer de detalhes e edge cases do Histórico Operacional.',
  status: 'active',
  sortOrder: 4,
  createdAt: ts(1),
});

const filtrosScenarios = [
  {
    title: '19. Filtrar por período',
    precondition: 'Escola com eventos no histórico',
    stepsToExecute: '1. Testar filtro "Últimos 7 dias"\n2. Testar filtro "Últimos 30 dias"\n3. Testar filtro "Todo o período"\n4. Testar intervalo customizado usando o seletor de datas',
    expectedResult: 'A tabela atualiza corretamente com cada filtro, mostrando apenas os eventos do período selecionado.\nO seletor de datas para intervalo customizado funciona normalmente.',
    keyRules: null,
  },
  {
    title: '20. Filtrar por origem',
    precondition: 'Escola com eventos de diferentes origens',
    stepsToExecute: '1. Filtrar por cada tipo de origem: Usuário, Sistema, Integração, Script, Desconhecida\n2. Observar os ícones na coluna de origem',
    expectedResult: 'Cada filtro mostra apenas os eventos da origem selecionada.\nÍcones corretos: pessoa (Usuário), engrenagem (Sistema/Integração/Script), interrogação (Desconhecida).',
    keyRules: null,
  },
  {
    title: '21. Filtrar por recurso',
    precondition: 'Escola com eventos de diferentes recursos',
    stepsToExecute: '1. Abrir o filtro de recurso\n2. Filtrar por cada tipo disponível (ex: Parametrizador, Pacote)',
    expectedResult: 'Todos os tipos de recurso aparecem com nomes legíveis em português.\nNão devem aparecer códigos técnicos ou nomes em inglês nos filtros.',
    keyRules: 'Se algum filtro aparecer com nome técnico (ex: código ao invés de nome legível), é bug.',
  },
  {
    title: '22. Filtrar por impacto',
    precondition: 'Escola com eventos diretos e indiretos',
    stepsToExecute: '1. Filtrar por "Direto"\n2. Filtrar por "Indireto"\n3. Passar o mouse sobre as tags de impacto',
    expectedResult: 'Filtros funcionam corretamente, mostrando apenas eventos do tipo selecionado.\nAs tags de impacto têm cores diferentes para Direto e Indireto.\nAo passar o mouse sobre a tag, aparece um tooltip explicando a diferença entre impacto direto e indireto.',
    keyRules: 'Verificar que o tooltip de explicação aparece ao passar o mouse.',
  },
  {
    title: '23. Busca por palavra-chave',
    precondition: 'Escola com eventos variados',
    stepsToExecute: '1. Clicar na barra de busca\n2. Digitar o nome de um kit, regra, pacote ou código conhecido\n3. Aguardar os resultados aparecerem',
    expectedResult: 'Após digitar, a tabela filtra automaticamente (com um pequeno delay).\nOs resultados exibidos contêm a palavra buscada.',
    keyRules: null,
  },
  {
    title: '24. Stress test — todos os filtros combinados',
    precondition: 'Escola com muitos eventos',
    stepsToExecute: '1. Preencher TODOS os filtros ao mesmo tempo:\n   • Palavra-chave (ex: "Matemática")\n   • Período longo\n   • Recurso específico\n   • Origem\n   • Impacto\n2. Observar o tempo de resposta',
    expectedResult: 'Resultados aparecem rapidamente, sem travamentos ou erros.\nA combinação de todos os filtros não causa lentidão perceptível.',
    keyRules: 'Se houver lentidão perceptível ou travamento, reportar como bug de performance.',
  },
  {
    title: '25. Limpar filtros',
    precondition: 'Filtros aplicados',
    stepsToExecute: '1. Aplicar múltiplos filtros\n2. Clicar no botão "Limpar filtros"',
    expectedResult: 'Todos os filtros são resetados.\nO painel de detalhes (drawer) fecha, se estiver aberto.\nA tabela volta ao estado inicial mostrando todos os eventos.',
    keyRules: null,
  },
  {
    title: '26. Navegar entre eventos no drawer',
    precondition: 'Múltiplos eventos no histórico',
    stepsToExecute: '1. Clicar em um evento para abrir o painel de detalhes\n2. Usar as setas de navegação (anterior/próximo) para navegar entre eventos',
    expectedResult: 'O painel atualiza mostrando os dados do evento correto.\nAs setas ficam desabilitadas quando chega no primeiro ou último evento.\nDurante o carregamento, aparece um indicador de loading.',
    keyRules: null,
  },
  {
    title: '27. Copiar link do evento',
    precondition: 'Evento visível na tabela',
    stepsToExecute: '1. Clicar no ícone de copiar link na tabela\n2. Abrir a URL copiada em uma nova aba do navegador',
    expectedResult: 'A URL é copiada para a área de transferência.\nAo abrir a URL em nova aba, a página carrega diretamente com o painel de detalhes do evento correto aberto.',
    keyRules: 'Testar abrindo a URL copiada em nova aba para confirmar que funciona.',
  },
  {
    title: '28. Ordenação por data/hora',
    precondition: 'Múltiplos eventos',
    stepsToExecute: '1. Clicar no cabeçalho "Data e Hora" da tabela\n2. Clicar novamente para alternar a direção',
    expectedResult: 'A tabela reordena entre mais recente primeiro e mais antigo primeiro.\nO padrão é mais recente primeiro.',
    keyRules: null,
  },
  {
    title: '29. Paginação',
    precondition: 'Escola com mais de 10 eventos',
    stepsToExecute: '1. Verificar quantos itens aparecem por página\n2. Navegar para a próxima página\n3. Verificar os totais exibidos',
    expectedResult: 'São exibidos 10 itens por página.\nA paginação funciona corretamente (avançar/voltar páginas).\nOs totais exibidos estão corretos.',
    keyRules: null,
  },
  {
    title: '30. Escola sem histórico',
    precondition: 'Escola sem nenhum evento registrado',
    stepsToExecute: '1. Acessar a aba "Histórico" de uma escola que não possui eventos',
    expectedResult: 'Uma mensagem amigável é exibida indicando que não há registros (ex: "Nenhuma ação registrada" ou "Esta escola ainda não possui registros no histórico").\nNão deve aparecer erro ou tabela vazia sem explicação.',
    keyRules: null,
  },
  {
    title: '31. Evento com ator desconhecido (banner laranja)',
    precondition: 'Escola com eventos antigos (legados)',
    stepsToExecute: '1. Navegar para páginas mais antigas da timeline\n2. Procurar eventos que mostram ícone de interrogação na coluna de origem',
    expectedResult: 'Eventos antigos sem informação de autor mostram:\n• Ícone de interrogação na coluna Origem\n• Banner/alerta informando que não há informação sobre quem realizou a ação\nIsso é comportamento ESPERADO para dados antigos.',
    keyRules: 'NÃO REPORTAR COMO BUG — é comportamento esperado para dados retroativos.',
  },
  {
    title: '32. Textos humanizados (sem dados técnicos)',
    precondition: 'Eventos de diferentes tipos no histórico',
    stepsToExecute: '1. Abrir os detalhes de diferentes tipos de eventos (Pacotes, Regras, Kits)\n2. Ler todos os textos, labels e informações exibidas',
    expectedResult: 'Todos os textos devem estar em linguagem natural e legível.\nNão deve aparecer nenhum dado técnico visível como: JSON, IDs internos, códigos de sistema, ou labels em inglês/não traduzidos.\nAs informações devem estar bem formatadas visualmente.',
    keyRules: 'Qualquer JSON, ID técnico ou label não traduzido visível ao usuário é BUG.',
  },
];

for (let i = 0; i < filtrosScenarios.length; i++) {
  const sc = filtrosScenarios[i];
  await db.insert(schema.testScenarios).values({
    id: id(),
    sectionId: guia4Id,
    title: sc.title,
    precondition: sc.precondition,
    stepsToExecute: sc.stepsToExecute,
    expectedResult: sc.expectedResult,
    keyRules: sc.keyRules,
    sortOrder: i,
    createdAt: ts(1),
  });
}

console.log('Created test script with 5 sections and 32 scenarios');

// ── Dados de Teste (Escolas) ──────────────────────────────────────────────
const testResourcesData = [
  // Sala 1: Parametrização (KIT + Rules)
  { label: 'Escola Parametrizador KIT - Luma', value: 'ID: preencher', group: 'Sala Parametrização', sortOrder: 0 },
  { label: 'Escola Parametrizador Rules - Luma', value: 'ID: preencher', group: 'Sala Parametrização', sortOrder: 1 },
  { label: 'Escola Parametrizador KIT - Jessica', value: 'ID: preencher', group: 'Sala Parametrização', sortOrder: 2 },
  { label: 'Escola Parametrizador Rules - Jessica', value: 'ID: preencher', group: 'Sala Parametrização', sortOrder: 3 },
  // Sala 2: Pacotes e Produtos
  { label: 'Escola Pacotes - Jonatas', value: 'ID: preencher', group: 'Sala Pacotes/Produtos', sortOrder: 0 },
  { label: 'Escola Produtos - Jonatas', value: 'ID: preencher', group: 'Sala Pacotes/Produtos', sortOrder: 1 },
  { label: 'Escola Pacotes - Isa', value: 'ID: preencher', group: 'Sala Pacotes/Produtos', sortOrder: 2 },
  { label: 'Escola Produtos - Isa', value: 'ID: preencher', group: 'Sala Pacotes/Produtos', sortOrder: 3 },
];

for (const res of testResourcesData) {
  await db.insert(schema.testResources).values({
    id: id(),
    sessionId,
    label: res.label,
    value: res.value,
    group: res.group,
    sortOrder: res.sortOrder,
    createdAt: ts(1),
  });
}
console.log(`Created ${testResourcesData.length} test resources (escolas de teste)`);

// ── Badge Definitions ─────────────────────────────────────────────────────
const badges = [
  { slug: 'first-blood', name: 'Primeiro Sangue', description: 'Primeiro bug reportado em uma sessão', icon: '🩸', tier: 'bronze' as const, category: 'bugs' as const, threshold: 1 },
  { slug: 'bug-hunter', name: 'Caçador de Bugs', description: '5 bugs reportados no total', icon: '🔍', tier: 'bronze' as const, category: 'bugs' as const, threshold: 5 },
  { slug: 'bug-slayer', name: 'Exterminador', description: '20 bugs reportados no total', icon: '⚔️', tier: 'silver' as const, category: 'bugs' as const, threshold: 20 },
  { slug: 'bug-legend', name: 'Lenda', description: '50 bugs reportados no total', icon: '👑', tier: 'gold' as const, category: 'bugs' as const, threshold: 50 },
  { slug: 'quality-star', name: 'Estrela da Qualidade', description: 'Bug com quality score ≥ 80', icon: '⭐', tier: 'bronze' as const, category: 'quality' as const, threshold: 1 },
  { slug: 'perfectionist', name: 'Perfeccionista', description: '5 bugs com quality score ≥ 80', icon: '💎', tier: 'silver' as const, category: 'quality' as const, threshold: 5 },
  { slug: 'eagle-eye', name: 'Olho de Águia', description: 'Encontrou um bug bloqueante', icon: '🦅', tier: 'gold' as const, category: 'quality' as const, threshold: 1 },
  { slug: 'duplicate-detective', name: 'Detetive de Duplicatas', description: '3 bugs confirmados como duplicatas', icon: '🕵️', tier: 'bronze' as const, category: 'quality' as const, threshold: 3 },
  { slug: 'team-player', name: 'Jogador de Equipe', description: 'Participou de 5 sessões', icon: '🤝', tier: 'bronze' as const, category: 'collaboration' as const, threshold: 5 },
  { slug: 'veteran', name: 'Veterano', description: 'Participou de 10 sessões', icon: '🎖️', tier: 'silver' as const, category: 'collaboration' as const, threshold: 10 },
  { slug: 'streak-3', name: 'Sequência de 3', description: '3 sessões consecutivas', icon: '🔥', tier: 'bronze' as const, category: 'streaks' as const, threshold: 3 },
  { slug: 'streak-5', name: 'Sequência de 5', description: '5 sessões consecutivas', icon: '💥', tier: 'silver' as const, category: 'streaks' as const, threshold: 5 },
  { slug: 'script-master', name: 'Mestre do Roteiro', description: 'Completou todos os passos de um roteiro', icon: '📜', tier: 'bronze' as const, category: 'special' as const, threshold: 1 },
  { slug: 'all-rounder', name: 'Completo', description: 'Reportou bug + completou roteiro + participou de triagem na mesma sessão', icon: '🏆', tier: 'platinum' as const, category: 'special' as const, threshold: 1 },
];

for (const badge of badges) {
  await db.insert(schema.badgeDefinitions).values({
    id: id(),
    ...badge,
    createdAt: ts(90),
  });
}
console.log(`Created ${badges.length} badge definitions`);

  console.log('\n--- Seed complete ---');
  console.log('\nDemo user (email-only login):');
  console.log('  Admin: admin@arcotech.com.br');
  console.log('\nSession: Bug Bash Histórico Operacional (draft)');
  console.log('Squad: Onboarding LMS');
}

seed()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
