import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mantém a identidade, o cache local e a sincronização", async () => {
  const [page, layout, storage, cloud] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/storage/local-db.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/storage/cloud-sync.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /lang="pt-BR"/);
  assert.match(layout, /Central Kadett 94/);
  assert.match(page, /Fala, piloto/);
  assert.match(page, /BORA PRA GARAGEM/);
  assert.match(page, /EXPORTAR BACKUP/);
  assert.match(page, /Tudo sincronizado na nuvem/);
  assert.match(page, /LibraryView/);
  assert.match(page, /HistoryView/);

  assert.match(storage, /indexedDB\.open/);
  assert.match(storage, /fuelType: "Gasolina"/);
  assert.match(storage, /currentMileage: 528574/);
  assert.match(storage, /Fumaça branca\/azulada/);
  assert.match(storage, /GM Argenta/);
  assert.match(storage, /library:/);
  assert.match(storage, /timeline:/);

  assert.match(cloud, /userAppState/);
  assert.match(cloud, /normalizeState/);
  assert.match(cloud, /hasUserData\(data\.data\)/);
});

test("está preparado para Vercel e Firebase", async () => {
  const [pkgText, vercelText, rules] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
  ]);

  const pkg = JSON.parse(pkgText);
  const vercel = JSON.parse(vercelText);

  assert.equal(pkg.scripts.dev, "next dev");
  assert.equal(pkg.scripts.build, "next build");
  assert.equal(vercel.framework, "nextjs");
  assert.match(pkg.dependencies.firebase, /^\^12\./);
  assert.match(rules, /request\.auth\.uid == userId/);
  assert.match(rules, /userAppState/);
});

test("usa visual verde neon e silhueta personalizada do Kadett", async () => {
  const [page, css, svg] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/kadett-outline.svg", import.meta.url), "utf8"),
  ]);

  assert.match(css, /--orange:#39ff14/);
  assert.match(css, /kadett-outline\.svg/);
  assert.match(css, /color:#eef4ef/);
  assert.match(page, /KADETT GLS \/\/ CONTORNO OEM/);
  assert.match(svg, /Contorno vetorial de Chevrolet Kadett/);
  assert.doesNotMatch(page, /car-body/);
  assert.doesNotMatch(css, /#f16a2d/);
});
