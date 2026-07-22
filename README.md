# Central Kadett 94

Computador de bordo pessoal para organizar a manutenção, os gastos e a história de um Chevrolet Kadett GLS 1.8 EFI 1994.

O app combina cache local com uma garagem privada no Firebase. Depois do login, os registros são sincronizados entre computador e celular pelo Cloud Firestore; se a conexão cair, a cópia do aparelho continua disponível e volta a sincronizar quando a internet retornar. O backup também pode ser exportado e restaurado em JSON.

## O que já funciona

- cockpit responsivo com indicadores e mapa de sistemas;
- atualização de quilometragem;
- pendências, serviços e componentes;
- cálculo de vida útil por tempo e quilometragem;
- comparação de orçamentos;
- gastos e abastecimentos;
- modo garagem para celular;
- conta por e-mail e senha;
- sincronização em nuvem com regras de segurança do Firestore;
- backup completo em JSON;
- dados demonstrativos opcionais.

## Rodando localmente

Requer Node.js 22 ou superior.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Preencha `.env.local` com as chaves públicas do app Web criado no Firebase:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

No Firebase Console, habilite Authentication com e-mail/senha e crie um Cloud Firestore. As regras de segurança estão em `firestore.rules`; elas deixam cada conta acessar somente o próprio documento em `userAppState/{uid}`.

Abra [http://localhost:3000](http://localhost:3000).

## Validação

```bash
npm test
npm run lint
```

## Vercel

O projeto usa Next.js App Router padrão e está pronto para importação na Vercel. Configure as variáveis `NEXT_PUBLIC_FIREBASE_*` nos ambientes Production, Preview e Development antes de publicar.

O primeiro login migra os dados antigos encontrados no navegador quando a conta ainda não possui uma garagem na nuvem.

## Privacidade

Nenhum segredo administrativo é incluído no build. O navegador recebe somente as chaves públicas do Firebase; o acesso aos registros é limitado pelo Firebase Authentication e pelas regras do Firestore.

Projeto pessoal e independente, sem vínculo com a Chevrolet ou a General Motors.
