# Apresentações — Px GYM

Dois decks no mesmo design, cada um em arquivo único e sem internet:

| Arquivo | Conteúdo |
|---|---|
| `apresentacao-px-gym.html` | Proposta de especificação e arquitetura (32 slides) |
| `apresentacao-dominio-interface.html` | Fase “Domínio e Interface Primeiro”, 100% mock: **o deck que se apresenta** (27 slides, com referência de código) |
| `apresentacao-dominio-interface-completa.html` | A mesma fase em detalhe, para consulta e perguntas (87 slides, 105 trechos de código) |

## Deck da proposta

`apresentacao-px-gym.html` é o deck pronto: **arquivo único, 32 slides, sem internet**.
As fontes Geist vão embutidas em base64, então basta dar duplo clique nele.

## Apresentar

| Tecla | Ação |
|---|---|
| `→` `espaço` `PageDown` | próximo slide |
| `←` `PageUp` | slide anterior |
| `Home` / `End` | primeiro / último |
| `O` | visão geral de todos os slides (clique num deles para ir direto) |
| `F` | tela cheia |
| clique | metade direita avança, metade esquerda volta |

Os itens da Agenda (slide 2) são clicáveis. A URL guarda o slide atual (`…html#14`),
então dá para abrir direto num ponto específico ou recarregar sem perder o lugar.

Para gerar um PDF de backup: `Ctrl+P` → paisagem → margens nenhuma → **marcar "Gráficos de plano de fundo"**.

## Editar

O deck é montado a partir dos arquivos `_part1.html` … `_part6.html`:

| Arquivo | Conteúdo |
|---|---|
| `_part1` | `<head>`, tokens de cor e todo o CSS |
| `_part2` | capa, agenda, contexto, stack, escopo, requisitos |
| `_part3` | atores e diagramas de casos de uso |
| `_part4` | classes, persistência, DER local e remoto, RLS |
| `_part5` | objetos, estados, robustez, sequência, atividades, componentes |
| `_part6` | DDD, Clean Architecture, TDD, rastreabilidade, cronograma, fechamento, JS |

Edite a parte que interessa e rode, da raiz do repositório:

```bash
node docs/apresentacao/build.mjs
```

O script reescreve `apresentacao-px-gym.html` com as fontes embutidas.

Os slides são desenhados num palco fixo de **1280×720** que a CSS escala para
qualquer tela, então o layout é idêntico no notebook e no projetor. Cada slide é
uma `<section class="slide" data-sec="...">`; o `data-sec` vira o nome da seção na
barra inferior, e a numeração do rodapé é gerada sozinha — para inserir ou remover
um slide, basta mexer no HTML (só não esqueça de conferir os `data-go` da agenda).

Os diagramas são SVG autoral, não imagens: dá para ajustar texto e coordenadas
direto no arquivo, e eles continuam nítidos em qualquer resolução.

O conteúdo sai de [`docs/`](../) — a mesma verdade, em formato de apresentação.

## Deck “Domínio e Interface Primeiro”

Mesmas teclas e o mesmo palco de 1280×720. Os slides ficam em
[`dominio-interface/`](dominio-interface/): `resumo/` gera o deck de 27 slides e
`completo/` gera o de 87. O o `<head>` com o CSS é reaproveitado de `_part1.html`.

```bash
node docs/apresentacao/dominio-interface/build.mjs            # gera os dois decks
node docs/apresentacao/dominio-interface/build.mjs --report   # lista cada trecho de código e sua faixa de linhas
```

Formato de um slide:

```
=== 1 · Domínio puro :: tight
# Título
> Subtítulo opcional
<div class="panel">…HTML do corpo…</div>
@refs core/domain/x.ts :: trecho da linha :: rótulo ;; mobile/adapters/y.ts :: outro trecho
```

Dentro do corpo:

| Diretiva | Vira |
|---|---|
| `{{r caminho :: trecho :: rótulo}}` | chip `arquivo:linha` |
| `{{rs caminho :: trecho}}` | chip curto, só `arquivo.ts:linha` |
| `{{code caminho :: de :: até :: destaque ;; destaque :: small cols=90}}` | bloco com o código real e a numeração do arquivo |

`core/` é `packages/core/src/`, `mobile/` é `apps/mobile/src/`, `db/` é
`packages/db/src/` e `raiz/` é a raiz do repositório. “trecho” é um pedaço literal
de uma linha; em `até`, `+N` pega N linhas e `<trecho` para antes da linha.

**As referências não envelhecem em silêncio:** o build procura cada trecho no
código-fonte. Se o arquivo mudar e o trecho sumir, o build falha dizendo qual
slide ficou órfão; se a linha só mudou de lugar, o número é atualizado sozinho.
Por isso, depois de mexer no código, rode o build de novo antes de apresentar.
