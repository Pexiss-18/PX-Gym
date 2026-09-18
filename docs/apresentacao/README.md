# Apresentação — Px GYM

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
