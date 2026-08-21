# Event Flow (52)

Crie uma aplicação web responsiva para confirmação de presença em evento com controle completo de pagamento, pensada para uso simples pelo organizador e pelos convidados.

Contexto do negócio:

Hoje a lista de presença acontece em um grupo de WhatsApp, onde as pessoas escrevem nome e sobrenome manualmente. Quero transformar isso em uma aplicação organizada, com confirmação, controle financeiro, lista de convidados e painel administrativo.

Objetivo principal:

Centralizar confirmação de presença, controle de pagamento, acompanhamento de status dos convidados e organização da lista do evento em um único sistema simples, bonito e fácil de usar.

Público:

- Organizador do evento

- Equipe de apoio

- Convidados

Fluxo principal do sistema:

1. O organizador cria um evento.

2. O organizador cadastra ou importa os convidados a partir da lista do WhatsApp.

3. Cada convidado pode acessar um link individual ou um link público de confirmação.

4. O convidado informa nome e sobrenome, confirma presença e visualiza se existe pagamento pendente.

5. Se o evento for pago, o convidado pode pagar na hora.

6. Após o pagamento aprovado, o status deve mudar automaticamente para “confirmado e pago”.

7. O organizador acompanha tudo em um dashboard administrativo.

8. No dia do evento, a equipe pode consultar ou fazer check-in dos participantes.

Regras de negócio:

- Nome e sobrenome são obrigatórios.

- O sistema deve evitar duplicidade de convidados com mesmo nome e sobrenome; se houver conflito, pedir confirmação ao organizador.

- Cada convidado deve ter um status de presença:

  - Pendente

  - Confirmado

  - Cancelado

  - Lista de espera

  - Compareceu

- Cada convidado deve ter um status de pagamento:

  - Não se aplica

  - Pendente

  - Pago

  - Isento

  - Estornado

  - Parcial

- O sistema deve permitir eventos gratuitos e eventos pagos.

- O organizador pode definir valor do convite/ingresso.

- O organizador pode marcar convidados como cortesia/isentos.

- O sistema deve registrar data e hora da confirmação.

- O sistema deve registrar data e hora do pagamento.

- O sistema deve registrar forma de pagamento.

- O sistema deve exibir valor total previsto, valor recebido, valor pendente e quantidade de pagantes.

- O sistema deve permitir lista de espera quando atingir o limite de vagas.

- Quando uma vaga for liberada, o organizador pode promover alguém da lista de espera.

- O sistema deve permitir observações por convidado, como “vai levar acompanhante”, “pagou em dinheiro”, “VIP”, “pendente de confirmação no WhatsApp”.

- O organizador deve poder editar qualquer cadastro manualmente.

Controle de acompanhantes:

- O sistema deve ter opção para permitir acompanhantes.

- O organizador define o número máximo de acompanhantes por convidado.

- O convidado pode informar quantidade de acompanhantes.

- O sistema calcula valor total com base no número de acompanhantes, quando aplicável.

- O dashboard deve mostrar total de pessoas confirmadas incluindo acompanhantes.

Origem da lista do WhatsApp:

- Criar funcionalidade para o organizador copiar e colar uma lista de nomes vinda do WhatsApp.

- O sistema deve interpretar linhas com nome e sobrenome e transformar em registros de convidados.

- Se houver linhas duplicadas ou incompletas, mostrar para revisão antes de salvar.

- Criar tela de “importação da lista do WhatsApp” com pré-visualização dos dados importados.

Pagamentos:

- Estruturar o sistema para integração com Stripe.

- Criar checkout simples e mobile-first.

- Suportar pagamento por cartão e métodos digitais quando disponíveis.

- Após pagamento aprovado, atualizar automaticamente o status do convidado.

- Se o pagamento falhar, manter como pendente e exibir mensagem clara.

- Registrar histórico de tentativas de pagamento.

- Criar recibo simples após pagamento aprovado.

- Permitir que o organizador registre pagamento manual, por exemplo PIX, dinheiro ou transferência.

- Quando o pagamento for manual, o sistema deve exigir que o organizador informe método, valor, data e observação.

- Criar tela financeira com:

  - Total esperado

  - Total recebido

  - Total pendente

  - Total de isentos

  - Total estornado

  - Receita por método de pagamento

- Criar filtros por status de pagamento.

- Permitir exportação da lista financeira.

Dashboard administrativo:

Criar um painel com visual moderno e profissional contendo:

- Total de convidados

- Total confirmados

- Total pendentes

- Total cancelados

- Total em lista de espera

- Total de comparecimentos

- Total arrecadado

- Total pendente de recebimento

- Taxa de confirmação

- Taxa de pagamento

- Lista dos últimos pagamentos

- Lista das últimas confirmações

- Alertas de convidados duplicados ou com dados incompletos

Telas do sistema:

1. Login administrativo

2. Dashboard principal

3. Cadastro e edição de evento

4. Lista de convidados

5. Importação da lista do WhatsApp

6. Página pública de confirmação

7. Página de checkout/pagamento

8. Tela de check-in no evento

9. Relatórios financeiros

10. Configurações do evento

Lista de convidados:

- Exibir tabela com:

  - Nome

  - Sobrenome

  - Telefone

  - Status de presença

  - Status de pagamento

  - Valor devido

  - Valor pago

  - Acompanhantes

  - Observações

  - Data da confirmação

- Permitir busca por nome.

- Permitir filtros por presença, pagamento e check-in.

- Permitir ações rápidas:

  - Confirmar manualmente

  - Marcar como pago

  - Marcar como isento

  - Editar

  - Remover

  - Fazer check-in

Página pública do convidado:

- Exibir nome do evento, data, hora, local e descrição curta.

- Exibir formulário simples com nome e sobrenome.

- Se o convidado existir, mostrar seu status.

- Permitir confirmar presença.

- Se houver cobrança, mostrar valor e botão para pagar.

- Exibir mensagens claras:

  - Presença confirmada

  - Pagamento pendente

  - Pagamento aprovado

  - Evento lotado / lista de espera

- Design simples, c

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sinc-nh.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/be46d593-126b-4d70-a9be-50f0d33e0c9f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
