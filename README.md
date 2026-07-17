# Central Kadett 94

Computador de bordo pessoal para organizar a manutenção, os gastos e a história de um Chevrolet Kadett GLS 1.8 EFI 1994.

O app é local-first: os registros ficam no IndexedDB do navegador. Não existe login, backend ou banco externo no MVP. O backup pode ser exportado e restaurado em JSON.

## O que já funciona

- cockpit responsivo com indicadores e mapa de sistemas;
- atualização de quilometragem;
- pendências, serviços e componentes;
- cálculo de vida útil por tempo e quilometragem;
- comparação de orçamentos;
- gastos e abastecimentos;
- modo garagem para celular;
- backup completo em JSON;
- dados demonstrativos opcionais.

## Rodando localmente

Requer Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Validação

```bash
npm test
npm run lint
```

## Vercel

O projeto usa Next.js App Router padrão e está pronto para importação na Vercel. Conecte este repositório, mantenha o framework como Next.js e publique. Não há variáveis de ambiente obrigatórias.

Cada navegador começa com sua própria base local. Faça backups regularmente antes de limpar os dados do navegador.

## Privacidade

Nenhum dado pessoal é incluído no build e os registros do veículo não são enviados a servidores externos.

Projeto pessoal e independente, sem vínculo com a Chevrolet ou a General Motors.
