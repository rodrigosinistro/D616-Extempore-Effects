# D616 Extempore Effects

Módulo para o **Foundry VTT v13** inspirado no PF2e Extempore Effects, adaptado para o sistema **Multiverse-D616**.

## O que ele faz

- Cria **efeitos rápidos** a partir de mensagens do chat.
- O efeito é aplicado como **condição no token** (ícone **M**) e permanece **até você remover**.
- A condição recebe **nome e descrição** (igual às condições nativas do sistema), registradas em `customConditions`.

## Como usar

1. Ative o módulo em **Manage Modules**.
2. No Chat, clique com o botão direito na mensagem do poder/item e escolha:
   - **Criar Efeito (Extempore)** (aplica aos tokens selecionados, ou ao speaker se nenhum token estiver selecionado)

## Remover

- Remova normalmente pelo **HUD de condições do token** (como qualquer condição).
- Ou use a opção de contexto no Chat para remover o efeito / remover todos.

## Requisitos

- Foundry VTT v13
- Sistema **multiverse-d616**

## Manifest (para instalar pelo Foundry)

Use este endereço no Foundry (**Install Module**):

<<<<<<< HEAD
https://raw.githubusercontent.com/rodrigosinistro/D616-Extempore-Effects/main/module.json

## Repositório

https://github.com/rodrigosinistro/D616-Extempore-Effects
=======
https://github.com/rodrigosinistro/D616-Extempore-Effects/releases/latest/download/module.json

> Importante: ao criar a Release `v0.1.7` no GitHub, anexe os arquivos:
> - `module.json`
> - `module.zip`
>
> Assim os links `manifest`/`download` do módulo ficam válidos e o Foundry consegue atualizar automaticamente.

## Repositório

https://github.com/rodrigosinistro/D616-Extempore-Effects


## Publicar no GitHub (Foundry)
Na sua Release (não-draft), anexe estes assets com estes nomes exatos:
- **module.json** (este arquivo do repositório)
- **module.zip** (o zip do módulo; pode ser este mesmo zip renomeado)

O Foundry instala/atualiza via o Manifest URL acima.
>>>>>>> bc1fd2c1b908b8958f99b6a34a993d165f836ceb
