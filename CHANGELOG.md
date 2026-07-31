# Changelog

## 0.1.10

- Menu de contexto migrado para os descritores v14 `label`, `visible` e `onClick`.
- Hook do menu migrado de `getChatLogEntryContext` para
  `getChatMessageContextOptions`.
- Removidos os avisos e a dependência dos campos depreciados `name`, `condition` e `callback`.
- Tokens não vinculados do mesmo ator-base deixaram de ser deduplicados pelo
  `actor.id`; cada ator sintético recebe ou remove o efeito separadamente.
- Compatibilidade mínima atualizada para `multiverse-d616` v0.1.57, com Active Effects e condições corrigidos.

## 0.1.9

- Upgrade para **Foundry VTT v14**.
- `module.json` atualizado para `compatibility.minimum = 14` e `compatibility.verified = 14`.
- Compatibilidade declarada com `multiverse-d616` v0.1.55 ou superior.
- Atualizado suporte a `CONFIG.statusEffects` no formato v14, agora chaveado por `id`.
- Mantida tolerância para o formato antigo em array usado em versões anteriores do Foundry.
- Menu de contexto do chat mais robusto para HTML/jQuery/elementos de contexto diferentes.
- Fallback de criação/remoção manual de `ActiveEffect` mantido com `statuses`.
- README revisado e adicionado `MIGRATION_NOTES.md`.

## 0.1.8

- Base anterior usada para a migração v14.

## 0.1.7

- Manifest/download ajustados para o padrão do Foundry com assets estáveis (`module.json` e `module.zip`).

## 0.1.6

- Corrigido `manifest` para URL estável (`releases/latest/download/module.json`) conforme padrão do Foundry.
- Atualizado `download` para a release `v0.1.6`.

## 0.1.5

- Incluído endereço de manifest no README.
- `module.json`: adicionados campos `manifest` e `download` apontando para a release `v0.1.5`.

## 0.1.4

- Preparação para publicação no GitHub: metadata `url`/`bugs` no `module.json`.
- Adicionado README e CHANGELOG.

## 0.1.3

- Extempore registra a condição em `customConditions` para exibir descrição no token como condições nativas.

## 0.1.2

- Ajustes internos de parsing do chat.

## 0.1.1

- Ajustes internos de parsing do chat.

## 0.1.0

- Versão inicial: criar/remover efeitos extemporâneos a partir do chat.
