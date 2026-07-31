# D616 Extempore Effects

Módulo para **Foundry VTT v14** inspirado no PF2e Extempore Effects, adaptado para o sistema **Multiverse-D616**.

## O que ele faz

- Cria **efeitos rápidos** a partir de mensagens do chat.
- Aplica o efeito como **condição no token** usando o ícone **M** do Multiverse-D616.
- Mantém o efeito **até ser removido manualmente**.
- Salva nome e descrição em `customConditions`, permitindo exibição junto das condições do sistema.
- Funciona com tokens selecionados e, quando não houver seleção, tenta usar o token/speaker da mensagem do chat.

## Como usar

1. Ative o módulo em **Manage Modules**.
2. No chat, clique com o botão direito na mensagem do poder, item ou traço.
3. Escolha uma das opções:
   - **Extempore Effects: Criar efeito (Extempore) neste(s) token(s)**
   - **Extempore Effects: Remover este efeito (Extempore) deste(s) token(s)**
   - **Extempore Effects: Remover TODOS os efeitos (Extempore) deste(s) token(s)**

## Remover efeitos

- Remova normalmente pelo **HUD de condições do token**.
- Ou use as opções de contexto do chat para remover o efeito específico ou todos os efeitos Extempore aplicados aos tokens selecionados.

## Requisitos

- **Foundry VTT v14**
- Sistema **multiverse-d616** v0.1.57 ou superior

## Compatibilidade v14

Esta versão usa o formato atual de `CONFIG.statusEffects` do Foundry VTT v14, tratado como objeto chaveado por `id`, mantendo tolerância para o formato antigo em array. O menu de contexto usa o hook `getChatMessageContextOptions` e os descritores v14 `label`, `visible` e `onClick`.

## Manifest para instalação

Use este endereço no Foundry em **Install Module**:

```text
https://raw.githubusercontent.com/rodrigosinistro/D616-Extempore-Effects/main/module.json
```

## Repositório

```text
https://github.com/rodrigosinistro/D616-Extempore-Effects
```
