# Publicar esta cópia do Satanabe Admin em outro GitHub

Esta cópia mantém a MESMA Supabase e, portanto, administra as mesmas keys, clientes, revendedores, patches, logs e configurações já usados pelo Satanabe External.

## Passos
1. Crie um repositório novo na nova conta do GitHub.
2. Extraia este ZIP.
3. Envie TODOS os arquivos da raiz para a raiz do repositório (index.html, app.js, styles.css etc.).
4. No GitHub: Settings > Pages.
5. Em Build and deployment, escolha Deploy from a branch.
6. Branch: main; pasta: / (root).
7. Salve e abra a URL fornecida pelo GitHub Pages.

## O que foi preservado
- Supabase: https://agkjutuvfjcahckhjkra.supabase.co
- Mesmas Edge Functions do Admin.
- Mesmo bucket `patches-3105`.
- Mesmo sistema de login/allowlist.
- Mesmo Satanabe External e dados já cadastrados.
- Mesmo painel de revendedor externo já configurado.

## Nova organização de patches
Os formulários de importar e editar patch oferecem as categorias **Rankeada**, **Apostado** e **Skin**.

O frontend envia `category` com os valores canônicos `rankeada`, `apostado` e `skins` para `admin-patches-api` no projeto Supabase Lupa existente. A leitura ainda aceita os aliases legados `interfaceTab` e `interface_tab`. Não execute migrações SQL ao publicar este pacote: o schema já está preparado. Ao editar, o `.3105` só é enviado se outro arquivo for selecionado.

## Atenção
Não coloque `service_role` no repositório. O `app.js` contém apenas a chave publicável do projeto, como na versão original.
