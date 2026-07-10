# Prompt — etapas configuráveis no pipeline

Copie o conteúdo abaixo e envie ao Codex no diretório raiz do outro projeto.

---

Você é um engenheiro de software sênior responsável por implementar etapas configuráveis em um pipeline/Kanban de CRM.

Antes de alterar qualquer arquivo:

1. Leia integralmente os arquivos de instruções do repositório, como `AGENTS.md`, `CLAUDE.md`, `README.md` e documentos de arquitetura, segurança, banco de dados e multi-tenancy.
2. Mapeie a stack, a estrutura de pastas, o modelo de autenticação, os cargos existentes, o cliente do banco e todas as telas que usam o estágio do lead.
3. Localize:
   - A tabela de leads e a coluna que armazena o estágio.
   - Constraints, enums, triggers, funções, índices e policies relacionados ao estágio.
   - As listas de etapas fixas no frontend.
   - Pipeline, cadastro/listagem de leads, badges, filtros, dashboard, histórico, relatórios, automações, webhooks e APIs que dependem das etapas.
4. Preserve alterações existentes do usuário e não edite migrations já aplicadas. Crie uma migration nova.

## Objetivo

Permitir que usuários autorizados possam criar e administrar etapas do pipeline sem editar código. A configuração deve ser persistida no banco e usada como fonte de verdade em todo o sistema.

O usuário autorizado deve conseguir:

- Criar uma etapa.
- Alterar o nome visível.
- Alterar a cor.
- Reordenar as etapas.
- Excluir uma etapa somente quando isso for seguro.
- Visualizar imediatamente as alterações no pipeline.

Use os cargos equivalentes a `admin_master`, `admin` e `gerente` para gerenciamento. Vendedores ou usuários comuns podem apenas consultar as etapas. Adapte os nomes aos cargos reais do projeto e não crie cargos paralelos.

## Modelagem obrigatória

Crie uma tabela equivalente a `pipeline_etapas` com, no mínimo:

- `id`: chave primária.
- `slug`: identificador interno único, estável e adequado para persistência.
- `nome`: nome exibido ao usuário.
- `cor`: cor hexadecimal validada.
- `ordem`: posição da coluna no pipeline.
- `created_at`.
- `updated_at`.

Regras:

- O `slug` deve ser gerado no cadastro, normalizado e validado.
- Alterar o nome visível não deve alterar automaticamente o `slug`, pois ele pode estar presente em leads, históricos, integrações e automações.
- Nome deve ser obrigatório, sem espaços vazios e ter limite razoável, como 60 caracteres.
- Cor deve aceitar apenas o formato `#RRGGBB`.
- Ordem não pode ser negativa.
- Cadastre na migration as etapas que o sistema já utiliza, preservando exatamente os identificadores internos atuais.
- A migration deve ser idempotente sempre que for viável, usando recursos como `if exists`, `if not exists` e `on conflict do nothing`.

## Compatibilidade com o banco existente

Se a coluna de estágio possuir uma `CHECK constraint` ou enum com valores fixos, substitua essa limitação por validação baseada na tabela configurável.

Implemente uma garantia no banco para impedir que um lead receba um estágio inexistente. Pode ser trigger ou relacionamento apropriado, conforme o schema real.

Não remova constraints sem confirmar que pertencem à coluna de estágio. Não faça buscas genéricas que possam remover validações não relacionadas.

Ao excluir uma etapa:

- Nunca deixe leads órfãos.
- Bloqueie a exclusão quando existirem leads vinculados e apresente uma mensagem clara para que eles sejam movidos antes.
- Se o produto já tiver uma UX consolidada para migração em massa, pode oferecer a seleção de uma etapa de destino e executar a transferência de forma transacional.

Atualize automaticamente `updated_at` quando a configuração mudar.

## Segurança e autorização

Ative RLS na tabela de etapas quando o projeto usar Supabase/RLS.

Crie policies separadas para:

- `SELECT`: qualquer usuário autenticado que possa usar o CRM.
- `INSERT`: somente cargos gestores autorizados.
- `UPDATE`: somente cargos gestores autorizados, incluindo `USING` e `WITH CHECK`.
- `DELETE`: somente cargos gestores autorizados.

A interface não é uma barreira de segurança. As permissões devem ser garantidas no backend ou banco.

Reaproveite funções de autorização existentes. Não confie em cargo enviado pelo navegador. Não use service role no client-side e não exponha segredos.

Se o sistema for multi-tenant:

- Inclua o identificador do tenant na tabela de etapas.
- Faça a unicidade do `slug` e da ordem considerar o tenant.
- Filtre todas as consultas pelo tenant.
- Garanta isolamento nas policies RLS.
- Valide que o lead e a etapa pertencem ao mesmo tenant.
- Não use uma configuração global se cada empresa precisa de pipeline próprio.

## Ordenação

A reordenação deve persistir no banco e ser consistente em concorrência e falhas.

Prefira uma função/RPC transacional que receba a sequência completa de IDs e:

1. Valide autorização e tenant.
2. Confirme que todos os IDs pertencem ao mesmo escopo.
3. Atualize todas as posições dentro de uma única transação.
4. Normalize as posições para uma sequência sem lacunas.

Evite duas atualizações paralelas independentes quando isso puder deixar ordens duplicadas após uma falha parcial.

## Interface de configuração

Adicione uma área “Etapas do pipeline” na tela de configurações existente.

Ela deve permitir:

- Informar nome e cor para criar uma etapa.
- Editar nome e cor de uma etapa existente.
- Reordenar por botões ou drag-and-drop acessível.
- Remover com confirmação.
- Exibir estados de carregamento e salvamento.
- Desabilitar ações durante requisições.
- Exibir erros retornados pelo banco de forma compreensível.
- Impedir submissões duplicadas.
- Ocultar ou desabilitar controles de escrita para usuários sem permissão.

Não permita salvar nome vazio. Informe que o identificador interno permanece estável quando o nome é alterado.

## Integração completa

Remova as etapas fixas como fonte principal do frontend. A tabela configurável deve alimentar:

- Colunas e ordem do pipeline.
- Nome e cor dos badges.
- Filtros e seletores de estágio.
- Cadastro e edição de leads.
- Drawer/modal de detalhes.
- Histórico de mudanças.
- Dashboard, gráficos e relatórios.
- APIs, server actions e validações.
- Automações e integrações que consultam os estágios.

Pode existir um fallback local somente para compatibilidade durante carregamento ou implantação gradual. Ele não deve impedir que novas etapas apareçam em outras telas.

Não converta estágios desconhecidos silenciosamente para a primeira etapa. Caso exista dado legado não configurado, preserve-o, sinalize-o e forneça uma estratégia segura de correção.

Defina explicitamente qual é a etapa inicial de novos leads. Prefira um campo como `is_inicial` ou uma configuração equivalente, garantindo apenas uma etapa inicial por pipeline/tenant. Não dependa implicitamente do slug `oportunidade` se o produto permite personalização completa.

Mantenha o identificador do estágio nos registros de histórico, mas resolva nome e cor atuais pela configuração ao exibir. Se o requisito de auditoria exigir o nome que existia na época do evento, armazene também um snapshot do nome.

## Realtime e atualização

Após criar ou editar uma etapa, atualize o estado local imediatamente após confirmação do banco.

Se o projeto já usar Supabase Realtime ou mecanismo equivalente, assine alterações da tabela para refletir configurações feitas em outra sessão. Caso não use, mantenha a arquitetura simples e recarregue os dados ao entrar na tela/pipeline.

## Qualidade da implementação

- Centralize tipos, normalização e fallback em módulo reutilizável.
- Evite duplicar consultas e mapas de configuração em várias páginas.
- Preserve os padrões visuais e arquiteturais do projeto.
- Trate falhas sem deixar estado otimista incorreto.
- Não altere código não relacionado.
- Não esconda erros apenas com `console.error`; informe o usuário quando a ação falhar.

## Validação obrigatória

Ao terminar:

1. Execute a verificação TypeScript.
2. Execute lint, testes e build disponíveis no projeto.
3. Valide a migration quanto a reexecução e dependências.
4. Confira manualmente os seguintes cenários:
   - Gestor cria uma etapa e ela aparece na posição correta.
   - Gestor renomeia e troca a cor; todas as telas exibem a mudança.
   - Gestor reordena e a ordem permanece após recarregar.
   - Lead é movido para uma nova etapa e a alteração persiste.
   - Estágio inexistente é rejeitado pelo banco.
   - Etapa com leads não pode ser excluída sem migração.
   - Etapa vazia pode ser excluída.
   - Vendedor consegue consultar, mas não criar, editar, reordenar ou excluir.
   - Um tenant não consegue consultar ou alterar etapas de outro tenant, se aplicável.
5. Revise o diff final e preserve arquivos preexistentes do usuário.

## Entrega esperada

Implemente efetivamente as alterações; não entregue apenas uma explicação.

Na resposta final, informe de forma objetiva:

- O que foi implementado.
- Quais arquivos foram criados ou alterados.
- Como aplicar a migration no ambiente existente.
- Quais verificações foram executadas e seus resultados.
- Qualquer ação externa ainda necessária, sem afirmar que o banco de produção foi atualizado se a migration não tiver sido aplicada nele.

Não faça commit, push, deploy ou alteração no banco de produção sem autorização explícita.

