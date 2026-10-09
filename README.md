# Satanabe Admin v1.1.3 Alpha — Categorias

Painel administrativo responsivo para gerenciamento de keys, clientes, cobranças/renovações, revendedores, patches e logs.

## Publicar no GitHub Pages

Envie **todo o conteúdo deste ZIP para a raiz do repositório** do Satanabe Admin, substituindo os arquivos antigos.

Arquivos principais:
- `index.html`
- `app.js`
- `styles.css`
- `VERSION`
- `CHANGELOG.md`
- `README.md`

A publicação continua estática e compatível com GitHub Pages. O backend Supabase do projeto já possui a estrutura e a Edge Function necessárias para a área de revendedores.

## Revendedores

A aba **Revendedores** permite:
- criar a conta-base de um revendedor;
- definir nome da loja, responsável, e-mail, WhatsApp e PIX;
- preparar o identificador/slug que será usado futuramente pela Store;
- permitir ou remover acesso às abas Overview, Keys, Clientes e Receita;
- visualizar receita, keys e clientes separados por revendedor;
- entrar no painel interno de cada revendedor pelo Admin;
- ativar/desativar o revendedor;
- ativar/desativar as keys pertencentes a ele.

O login do revendedor agora é integrado ao Supabase Auth. Ao criar um revendedor com e-mail, o Admin tenta enviar o acesso automaticamente. Se o envio de e-mail não estiver disponível, o Admin exibe um **link de acesso** para copiar e enviar pelo WhatsApp.

A Store multi-loja ainda não faz parte desta versão.

## Isolamento dos dados

Keys, clientes e transações agora podem receber um `reseller_id`. Os registros que já existiam continuam sem `reseller_id` e permanecem classificados como vendas diretas do Admin.

## Preços configurados

| Plano | Valor |
|---|---:|
| 3 horas — teste | R$ 0 |
| 3 horas | R$ 4 |
| 10 horas | R$ 8 |
| 1 dia | R$ 14 |
| 3 dias | R$ 30 |
| 7 dias | R$ 40 |
| 1 mês | R$ 70 |

## Segurança

A área de revendedores usa uma Edge Function protegida por sessão do Supabase Auth e pela mesma allowlist administrativa do restante do painel. A tabela de revendedores possui RLS ativado e não é lida diretamente pelo navegador.

## Versão

`1.1.3-alpha-categorias`


## v1.1.1 Alpha
- Acesso de revendedor por e-mail integrado ao Supabase Auth.
- Botão Enviar/Reenviar acesso na aba Revendedores.
- Permissão separada para Receita.
- Atalho para o Satanabe Reseller.


## Acesso do revendedor

O painel esperado é `https://espancashots.github.io/satanabe-reseller/`. Em Supabase Auth → URL Configuration, adicione `https://espancashots.github.io/satanabe-reseller/**` aos Redirect URLs.

Para envio automático de convites a qualquer endereço de e-mail em produção, configure SMTP próprio no Supabase Auth. Sem SMTP próprio, o Admin consegue gerar um link manual para você copiar e enviar ao revendedor.


## Cópia para novo GitHub
Esta distribuição foi preparada para ser publicada em outra conta GitHub sem trocar o backend. A Supabase, as Edge Functions, o bucket de patches, o login administrativo e os dados permanecem os mesmos. Consulte `DEPLOY-NOVO-GITHUB.md`.

## Abas do External
Ao importar ou editar um patch, o Admin permite escolher **Rankeada**, **Apostado** ou **Skin**. O Admin envia `category` com valores canônicos `rankeada`, `apostado` ou `skins`, consumidos pela Edge Function `admin-patches-api` do Supabase Lupa. A leitura mantém compatibilidade com respostas antigas via `interfaceTab`/`interface_tab`. A edição de categoria não reenvia o `.3105`; o upload só ocorre se um novo arquivo for selecionado.
