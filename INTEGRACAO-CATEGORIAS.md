# Integração das categorias

Esta versão parte integralmente do ZIP `Satanabe-admin-panel-main` enviado pelo usuário. Foram preservados o painel de keys, clientes, revendedores, patches, licenças, configurações, logs, autenticação, Supabase, APIs e Storage existentes.

## Contrato Supabase

O pacote usa a Edge Function `admin-patches-api` já atualizada no projeto Lupa (`agkjutuvfjcahckhjkra`). O campo persistido é `patch_catalog.category` e os valores canônicos são `rankeada`, `apostado` e `skins`; o rótulo de interface `Skin` corresponde ao valor canônico plural `skins`. Na leitura, o Admin ainda aceita `category`, `interfaceTab` e `interface_tab`.

Não foi adicionada nem executada migração SQL.

## Edição sem reenvio do arquivo

O formulário de edição sempre envia a categoria escolhida. O `.3105` só é carregado para o Storage e enviado no payload se o campo opcional de arquivo receber outro arquivo. Sem arquivo novo, `storage_path`, `file_size` e versão do patch não são enviados para alteração. Após salvar, o painel recarrega o catálogo e confirma a categoria retornada pela API.

## Publicação no GitHub Pages

Extraia o ZIP diretamente na raiz do repositório Pages e publique os arquivos da raiz, especialmente `index.html`, `app.js`, `styles.css` e `.nojekyll`. Use a origem `main` / `(root)` conforme as configurações do repositório.
