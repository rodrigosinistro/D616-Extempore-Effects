# Migration Notes — D616 Extempore Effects v0.1.10

## Objetivo

Atualizar o módulo **D616 Extempore Effects** da base v0.1.8 para uso no **Foundry VTT v14** em conjunto com o sistema **multiverse-d616** atualizado para v14.

## Alterações técnicas

- `compatibility.minimum` e `compatibility.verified` ajustados para `14`.
- Versão incrementada para `0.1.10`.
- `relationships.systems[0].compatibility.minimum` definido como `0.1.57`, alinhado com a versão que corrige Active Effects e condições.
- `CONFIG.statusEffects` agora é manipulado preferencialmente como objeto chaveado por `id`, conforme o Foundry v14.
- Preservado fallback para array, permitindo tolerância durante transições e eventuais ambientes híbridos.
- Leitura do contexto de mensagem do chat endurecida para aceitar `HTMLElement`, jQuery-like e wrappers de evento.
- Menu de contexto migrado para o hook `getChatMessageContextOptions` e
  descritores `label`, `visible` e `onClick` do ApplicationV2.
- Seleções com vários tokens não vinculados do mesmo ator-base agora preservam
  cada ator sintético pelo UUID do token.
- Fallback manual de `ActiveEffect` preserva `statuses: [statusId]`, sem depender do antigo `flags.core.statusId`.

## Como testar

1. Instale o sistema `multiverse-d616` v0.1.57 ou superior.
2. Instale este módulo e ative em um mundo de teste.
3. Crie/abra uma cena com pelo menos um token de personagem.
4. Faça uma rolagem ou envie uma mensagem de poder/item no chat.
5. Clique com o botão direito na mensagem e use **Criar efeito (Extempore)**.
6. Confirme se o ícone **M** aparece como condição no token.
7. Remova pelo HUD de condições ou pelo menu de contexto do chat.

## Observação

Teste primeiro em uma cópia do mundo antes de migrar sua mesa principal.
