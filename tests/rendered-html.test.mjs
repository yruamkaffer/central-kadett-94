import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mantém a identidade e a base local-first", async () => {
  const [page, layout, storage] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/storage/local-db.ts", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /lang="pt-BR"/);
  assert.match(layout, /Central Kadett 94/);
  assert.match(page, /Fala, piloto/);
  assert.match(page, /BORA PRA GARAGEM/);
  assert.match(page, /EXPORTAR BACKUP/);
  assert.match(storage, /indexedDB\.open/);
  assert.match(storage, /fuelType: "Não confirmado"/);
});

test("está preparado para Vercel sem backend obrigatório", async () => {
  const [pkgText, vercelText] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  ]);
  const pkg = JSON.parse(pkgText);
  const vercel = JSON.parse(vercelText);
  assert.equal(pkg.scripts.dev, "next dev");
  assert.equal(pkg.scripts.build, "next build");
  assert.equal(vercel.framework, "nextjs");
  assert.equal(pkg.dependencies["@supabase/supabase-js"], undefined);
});
