"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { emptyState, loadState, loadUserState, saveUserState, type AppState, type IssuePriority, type ModalKind } from "../src/storage/local-db";
import { loadOrCreateCloudState, saveCloudState } from "../src/storage/cloud-sync";
import { getFirebaseClients, type FirebaseClients } from "../src/firebase/client";
import { componentHealth, formatBRL, nextComponentService, quoteSpread } from "../src/domain/calculations";

const nav = [
  ["cockpit", "Cockpit", "01"], ["sistemas", "Sistemas", "02"], ["pendencias", "Pendências", "03"],
  ["manutencao", "Manutenção", "04"], ["componentes", "Componentes", "05"], ["orcamentos", "Orçamentos", "06"],
  ["gastos", "Gastos", "07"], ["abastecimentos", "Abastecimentos", "08"], ["biblioteca", "Biblioteca", "09"],
  ["historia", "História", "10"], ["configuracoes", "Configurações", "11"],
] as const;

const systems = ["Motor", "Elétrica", "Arrefecimento", "Freios", "Suspensão", "Transmissão", "Carroceria", "Interior"];

function uid() { return crypto.randomUUID(); }
function today() { return new Date().toISOString().slice(0, 10); }
function dateBR(date?: string) { return date ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${date}T12:00:00`)) : "Não informado"; }

export default function Home() {
  const firebase = useMemo(() => getFirebaseClients(), []);
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null | undefined>(firebase ? undefined : null);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"connecting" | "syncing" | "synced" | "offline">("connecting");
  const [view, setView] = useState("cockpit");
  const [modal, setModal] = useState<ModalKind>(null);
  const [notice, setNotice] = useState("Conectando com a nuvem…");
  const [garage, setGarage] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef(state);
  const lastCloudUpdateRef = useRef("");
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => { loadState().then((saved) => { setState(saved); setReady(true); }); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (!firebase) return;
    return onAuthStateChanged(firebase.auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setCloudReady(false);
        setState(emptyState);
      }
    });
  }, [firebase]);

  useEffect(() => {
    if (!ready || !firebase || !user) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setSyncStatus("connecting");
      setNotice("Buscando seus dados na nuvem…");
    });

    loadUserState(user.uid)
      .then((userState) => loadOrCreateCloudState(firebase.db, user.uid, userState ?? stateRef.current))
      .then(async (result) => {
        if (!active) return;
        lastCloudUpdateRef.current = result.updatedAt;
        stateRef.current = result.state;
        setState(result.state);
        await saveUserState(user.uid, result.state);
        setCloudReady(true);
        setSyncStatus("synced");
        setNotice(result.migratedLocalData ? "Dados deste aparelho enviados pra nuvem" : "Tudo sincronizado na nuvem");
      })
      .catch(() => {
        if (!active) return;
        setCloudReady(true);
        setSyncStatus("offline");
        setNotice("Sem conexão: salvando neste aparelho por enquanto");
      });

    return () => { active = false; };
  }, [ready, user, firebase]);

  useEffect(() => {
    if (!ready || !user) return;
    saveUserState(user.uid, state);
    if (!firebase || !cloudReady) return;

    const timer = window.setTimeout(() => {
      setSyncStatus("syncing");
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            const updatedAt = await saveCloudState(firebase.db, user.uid, state);
            lastCloudUpdateRef.current = updatedAt;
            setSyncStatus("synced");
            setNotice("Tudo sincronizado na nuvem");
          } catch {
            setSyncStatus("offline");
            setNotice("Sem conexão: a cópia local continua segura");
          }
        });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [cloudReady, ready, user, state, firebase]);

  useEffect(() => {
    if (!firebase || !user || !cloudReady) return;
    const refreshFromCloud = () => {
      if (document.visibilityState === "hidden") return;
      loadOrCreateCloudState(firebase.db, user.uid, stateRef.current)
        .then((result) => {
          if (result.updatedAt <= lastCloudUpdateRef.current) return;
          lastCloudUpdateRef.current = result.updatedAt;
          stateRef.current = result.state;
          setState(result.state);
          setSyncStatus("synced");
          setNotice("Novidades carregadas da nuvem");
        })
        .catch(() => setSyncStatus("offline"));
    };
    window.addEventListener("focus", refreshFromCloud);
    document.addEventListener("visibilitychange", refreshFromCloud);
    return () => {
      window.removeEventListener("focus", refreshFromCloud);
      document.removeEventListener("visibilitychange", refreshFromCloud);
    };
  }, [cloudReady, user, firebase]);

  const expenses = useMemo(() => [
    ...state.services.map((s) => ({ id: s.id, date: s.date, category: "Manutenção", description: s.description, amount: s.total })),
    ...state.fuel.map((f) => ({ id: f.id, date: f.date, category: "Combustível", description: f.station || "Abastecimento", amount: f.total })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [state.services, state.fuel]);
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const openIssues = state.issues.filter((i) => i.status !== "Resolvida");
  const urgent = openIssues.filter((i) => i.priority === "Crítica" || i.priority === "Alta");
  const nextService = state.components.map((c) => ({ ...c, next: nextComponentService(c, state.vehicle.currentMileage) }))
    .filter((c) => c.next).sort((a, b) => (a.next?.remainingKm ?? Infinity) - (b.next?.remainingKm ?? Infinity))[0];

  function announce(message: string) { setNotice(message); window.setTimeout(() => setNotice(syncStatus === "offline" ? "Salvo neste aparelho; a nuvem tenta de novo depois" : "Tudo sincronizado na nuvem"), 3000); }
  function updateMileage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const mileage = Number(data.get("mileage"));
    if (!Number.isFinite(mileage) || mileage < 0) return;
    setState((s) => ({ ...s, vehicle: { ...s.vehicle, currentMileage: mileage, mileageUpdatedAt: new Date().toISOString() } }));
    setModal(null); announce("Quilometragem atualizada");
  }
  function addIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setState((s) => ({ ...s, issues: [{ id: uid(), title: String(data.get("title")), subsystem: String(data.get("subsystem")), priority: String(data.get("priority")) as IssuePriority, description: String(data.get("description") || ""), status: "Aberta", detectedAt: today(), estimatedCost: Number(data.get("estimatedCost")) || 0 }, ...s.issues] }));
    setModal(null); announce("Pendência registrada");
  }
  function addService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const issueId = String(data.get("issueId") || "");
    const parts = Number(data.get("partsCost")) || 0; const labor = Number(data.get("laborCost")) || 0; const other = Number(data.get("otherCost")) || 0;
    setState((s) => ({ ...s,
      services: [{ id: uid(), date: String(data.get("date")), mileage: Number(data.get("mileage")) || s.vehicle.currentMileage || 0, type: String(data.get("type")), provider: String(data.get("provider") || "Não informado"), description: String(data.get("description")), partsCost: parts, laborCost: labor, otherCost: other, total: parts + labor + other, issueId }, ...s.services],
      issues: s.issues.map((i) => i.id === issueId ? { ...i, status: "Resolvida", actualCost: parts + labor + other } : i),
    })); setModal(null); announce(issueId ? "Serviço salvo e pendência resolvida" : "Serviço registrado");
  }
  function addComponent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setState((s) => ({ ...s, components: [{ id: uid(), name: String(data.get("name")), subsystem: String(data.get("subsystem")), manufacturer: String(data.get("manufacturer") || "Não informado"), partNumber: String(data.get("partNumber") || "Não informado"), installedAt: String(data.get("installedAt") || ""), installedAtMileage: Number(data.get("installedAtMileage")) || 0, expectedLifeKm: Number(data.get("expectedLifeKm")) || 0, expectedLifeMonths: Number(data.get("expectedLifeMonths")) || 0, intervalSource: String(data.get("intervalSource") || "Não informada"), condition: "Em observação" }, ...s.components] }));
    setModal(null); announce("Componente registrado");
  }
  function addQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setState((s) => ({ ...s, quotes: [{ id: uid(), issueId: String(data.get("issueId")), provider: String(data.get("provider")), receivedAt: String(data.get("date")), validUntil: String(data.get("validUntil") || ""), partsCost: Number(data.get("partsCost")) || 0, laborCost: Number(data.get("laborCost")) || 0, otherCost: Number(data.get("otherCost")) || 0, warranty: String(data.get("warranty") || "Não informada"), duration: String(data.get("duration") || "Não informado"), status: "Recebido" }, ...s.quotes] }));
    setModal(null); announce("Orçamento adicionado");
  }
  function addFuel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const liters = Number(data.get("liters")); const price = Number(data.get("price"));
    setState((s) => ({ ...s, fuel: [{ id: uid(), date: String(data.get("date")), mileage: Number(data.get("mileage")), liters, pricePerLiter: price, total: liters * price, fuelType: String(data.get("fuelType") || "Não confirmado"), station: String(data.get("station") || ""), fullTank: data.get("fullTank") === "on" }, ...s.fuel] }));
    setModal(null); announce("Abastecimento registrado");
  }
  function exportBackup() {
    const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `central-kadett-94-${today()}.json`; link.click(); URL.revokeObjectURL(link.href);
    setState((s) => ({ ...s, settings: { ...s.settings, lastBackupAt: new Date().toISOString() } })); announce("Backup exportado");
  }
  async function importBackup(file?: File) {
    if (!file || file.size > 5_000_000) return announce("Arquivo ausente ou maior que 5 MB");
    try { const parsed = JSON.parse(await file.text()); if (parsed?.schemaVersion !== 1 || !parsed.vehicle || !Array.isArray(parsed.issues)) throw new Error(); setState(parsed); announce("Backup restaurado com sucesso"); }
    catch { announce("Backup inválido. Nenhum dado foi alterado"); }
  }
  function loadDemo() {
    setState((s) => ({ ...s, issues: [
      { id: "demo-issue-1", title: "Ruído ao frear", subsystem: "Freios", priority: "Alta", description: "Relato demonstrativo — requer avaliação profissional.", status: "Em análise", detectedAt: today(), estimatedCost: 480 },
      { id: "demo-issue-2", title: "Revisar mangueiras", subsystem: "Arrefecimento", priority: "Média", description: "Item de demonstração, sem diagnóstico.", status: "Aberta", detectedAt: today(), estimatedCost: 220 },
    ], quotes: [
      { id: "demo-q1", issueId: "demo-issue-1", provider: "Oficina Centro", receivedAt: today(), validUntil: "", partsCost: 260, laborCost: 180, otherCost: 0, warranty: "90 dias", duration: "1 dia", status: "Recebido" },
      { id: "demo-q2", issueId: "demo-issue-1", provider: "Auto Técnica Sul", receivedAt: today(), validUntil: "", partsCost: 310, laborCost: 140, otherCost: 30, warranty: "6 meses", duration: "2 dias", status: "Recebido" },
    ], settings: { ...s.settings, demoMode: true } })); announce("Dados demonstrativos ativados");
  }

  if (!ready || user === undefined) return <main className="boot"><p className="eyebrow">CENTRAL KADETT 94</p><h1>Ligando os sistemas…</h1><div className="bootline" /></main>;
  if (!firebase) return <AuthGate client={null} />;
  if (!user) return <AuthGate client={firebase} />;
  if (!cloudReady) return <main className="boot"><p className="eyebrow">CENTRAL KADETT 94</p><h1>Puxando sua garagem da nuvem…</h1><div className="bootline" /></main>;
  if (garage) return <GarageMode state={state} setState={setState} onExit={() => setGarage(false)} onModal={setModal} />;

  return <div className="app-shell">
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <header className="topbar">
      <button className="brand" onClick={() => setView("cockpit")} aria-label="Ir para o cockpit"><span className="brand-mark">K94</span><span><b>CENTRAL KADETT</b><small>COMPUTADOR DE BORDO PESSOAL</small></span></button>
      <div className="top-status"><span className={`signal ${syncStatus}`}><i /> {syncStatus === "synced" ? "NA NUVEM" : syncStatus === "offline" ? "OFFLINE" : "SINCRONIZANDO"}</span><span className="clock">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()).toUpperCase()}</span><button className="account-button" onClick={() => signOut(firebase.auth)} title={user.email ?? "Conta Firebase"}>SAIR</button></div>
      <button className="garage-button" onClick={() => setGarage(true)}><span>▣</span> BORA PRA GARAGEM</button>
    </header>
    <aside className="sidebar" aria-label="Navegação principal">
      <nav>{nav.map(([id, label, num]) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><span>{num}</span>{label}</button>)}</nav>
      <div className="privacy-note"><i className="signal-dot" /><div><b>GARAGEM NA NUVEM</b><small>Dados privados e sincronizados</small></div></div>
    </aside>
    <main id="conteudo" className="content" tabIndex={-1}>
      {view === "cockpit" && <Cockpit state={state} openIssues={openIssues} urgent={urgent} totalSpent={totalSpent} nextService={nextService} setView={setView} setModal={setModal} />}
      {view === "sistemas" && <SystemsView state={state} setView={setView} />}
      {view === "pendencias" && <IssuesView issues={state.issues} setModal={setModal} />}
      {view === "manutencao" && <ServicesView state={state} setModal={setModal} />}
      {view === "componentes" && <ComponentsView state={state} setModal={setModal} />}
      {view === "orcamentos" && <QuotesView state={state} setModal={setModal} />}
      {view === "gastos" && <ExpensesView expenses={expenses} total={totalSpent} />}
      {view === "abastecimentos" && <FuelView state={state} setModal={setModal} />}
      {view === "biblioteca" && <LibraryView state={state} />}
      {view === "historia" && <HistoryView state={state} />}
      {view === "configuracoes" && <SettingsView state={state} setState={setState} exportBackup={exportBackup} importRef={importRef} loadDemo={loadDemo} />}
      <LegalFoot />
    </main>
    <footer className="statusbar"><span>SCHEMA v{state.schemaVersion}.0</span><span aria-live="polite">● {notice}</span><span>PRIVADO • {user.email}</span></footer>
    <input ref={importRef} className="sr-only" type="file" accept="application/json" onChange={(e) => importBackup(e.target.files?.[0])} />
    {modal && <Modal kind={modal} state={state} onClose={() => setModal(null)} handlers={{ updateMileage, addIssue, addService, addComponent, addQuote, addFuel }} />}
  </div>;
}

function AuthGate({ client }: { client: FirebaseClients | null }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    setSubmitting(true);
    setMessage("");

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(client.auth, email, password);
      } else {
        await createUserWithEmailAndPassword(client.auth, email, password);
      }
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setMessage(firebaseAuthMessage(code));
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-screen">
    <section className="auth-card panel">
      <div className="auth-brand"><span className="brand-mark">K94</span><div><p className="eyebrow">CENTRAL KADETT 94</p><h1>Sua garagem, onde você estiver.</h1></div></div>
      <p>Entra pra abrir, editar e alimentar o histórico no celular, no PC ou naquela parada rápida na oficina.</p>
      {!client ? <div className="auth-alert"><b>Nuvem ainda não conectada</b><span>Faltam as variáveis públicas do Firebase neste ambiente.</span></div> : <>
        <div className="auth-tabs" role="tablist">
          <button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMessage(""); }} type="button">JÁ TENHO CONTA</button>
          <button role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMessage(""); }} type="button">CRIAR CONTA</button>
        </div>
        <form onSubmit={authenticate}>
          <Field label="E-mail"><input name="email" type="email" autoComplete="email" required autoFocus /></Field>
          <Field label="Senha"><input name="password" type="password" minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></Field>
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="primary auth-submit" disabled={submitting}>{submitting ? "CONECTANDO…" : mode === "login" ? "ABRIR MINHA GARAGEM" : "CRIAR MINHA CONTA"}</button>
        </form>
      </>}
      <small>Seus registros ficam protegidos por login e cada conta só enxerga os próprios dados.</small>
    </section>
  </main>;
}

function firebaseAuthMessage(code: string) {
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
    return "E-mail ou senha não bateram. Dá uma conferida.";
  }
  if (code === "auth/email-already-in-use") return "Esse e-mail já tem garagem. Vai em entrar e manda ver.";
  if (code === "auth/weak-password") return "Essa senha tá fraca. Usa pelo menos 6 caracteres.";
  if (code === "auth/invalid-email") return "Esse e-mail parece meio torto. Confere e tenta de novo.";
  return "Não deu pra conectar agora. Tenta de novo daqui a pouco.";
}

function PageHead({ eyebrow, title, text, action, onAction }: { eyebrow: string; title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{action && <button className="primary" onClick={onAction}>＋ {action}</button>}</div>;
}

function Cockpit({ state, openIssues, urgent, totalSpent, nextService, setView, setModal }: any) {
  const color = state.vehicle.color ?? "Cor não informada";
  const fuelType = state.vehicle.fuelType ?? "Combustível não confirmado";
  return <>
    <PageHead eyebrow="VISÃO GERAL // VEÍCULO 01" title="Fala, piloto." text="Bora dar uma geral no Kadett e ver o que tá pegando." />
    <section className="vehicle-hero panel">
      <div className="vehicle-copy"><div className="hero-kicker">{state.vehicle.manufacturer.toUpperCase()} <span>•</span> {state.vehicle.year}</div><h2>KADETT <em>{state.vehicle.trim}</em></h2><p>{state.vehicle.engine} <span>•</span> {fuelType.toUpperCase()} <span>•</span> {color.toUpperCase()}</p><div className="mileage"><small>QUILOMETRAGEM ATUAL</small><strong>{state.vehicle.currentMileage ? state.vehicle.currentMileage.toLocaleString("pt-BR") : "— — — — — —"}<b> KM</b></strong><button onClick={() => setModal("mileage")}>ATUALIZAR →</button></div></div>
      <div className="car-stage" aria-label="Contorno vetorial lateral do Chevrolet Kadett"><div className="scanlines" /><div className="kadett-outline" role="img" aria-label="Silhueta esquemática do Kadett GLS 1994" /><span>KADETT GLS // CONTORNO OEM</span></div>
      <div className="hero-stamp"><span>BASE LOCAL</span><b>01</b></div>
    </section>
    <section className="metric-grid">
      <button className="metric" onClick={() => setView("pendencias")}><span className="metric-icon amber">!</span><div><small>PENDÊNCIAS ABERTAS</small><strong>{openIssues.length.toString().padStart(2, "0")}</strong><p>{urgent.length ? `${urgent.length} pede atenção, hein` : "Tudo sussa por aqui"}</p></div><b>→</b></button>
      <button className="metric" onClick={() => setView("manutencao")}><span className="metric-icon cyan">⌁</span><div><small>PRÓXIMA MANUTENÇÃO</small><strong>{nextService?.next?.remainingKm != null ? `${nextService.next.remainingKm.toLocaleString("pt-BR")} km` : "Desconhecida"}</strong><p>{nextService ? nextService.name : "Cadastre um intervalo confiável"}</p></div><b>→</b></button>
      <button className="metric" onClick={() => setView("gastos")}><span className="metric-icon green">R$</span><div><small>TOTAL INVESTIDO</small><strong>{formatBRL(totalSpent)}</strong><p>{state.services.length + state.fuel.length} registros contabilizados</p></div><b>→</b></button>
    </section>
    <section className="dashboard-grid">
      <div className="panel systems-panel"><div className="panel-title"><div><small>MAPA DE SISTEMAS</small><h3>Condição registrada</h3></div><button onClick={() => setView("sistemas")}>VER DETALHES →</button></div><div className="system-map">{systems.slice(0, 6).map((system) => { const count = openIssues.filter((i: any) => i.subsystem === system).length; return <button key={system} onClick={() => setView("sistemas")}><span className={count ? "warn" : "unknown"}>{count ? "!" : "?"}</span><b>{system}</b><small>{count ? `${count} pendência${count > 1 ? "s" : ""}` : "Sem inspeção"}</small></button>; })}</div></div>
      <div className="panel attention-panel"><div className="panel-title"><div><small>PRIORIDADE</small><h3>O que tá pegando</h3></div><span>{urgent.length.toString().padStart(2, "0")}</span></div>{urgent.length ? <div className="attention-list">{urgent.slice(0, 3).map((issue: any) => <button key={issue.id} onClick={() => setView("pendencias")}><i className={issue.priority === "Crítica" ? "critical" : "high"}>{issue.priority[0]}</i><div><b>{issue.title}</b><small>{issue.subsystem} • {issue.status}</small></div><span>{formatBRL(issue.estimatedCost || 0)}</span></button>)}</div> : <div className="empty-mini"><b>Nada pegando fogo por aqui</b><p>Mas calma lá: sem inspeção, não dá pra cravar que tá tudo perfeito.</p></div>}<button className="secondary full" onClick={() => setModal("issue")}>＋ REGISTRAR PENDÊNCIA</button></div>
    </section>
  </>;
}

function SystemsView({ state, setView }: any) { return <><PageHead eyebrow="DIAGRAMA FUNCIONAL" title="Sistemas do veículo" text="Condição estimada e confiança dos dados aparecem separadamente." /><div className="cards-grid">{systems.map((system) => { const issues = state.issues.filter((i: any) => i.subsystem === system && i.status !== "Resolvida"); const components = state.components.filter((c: any) => c.subsystem === system); return <article className="system-card panel" key={system}><div className="system-card-top"><span>{system.slice(0,2).toUpperCase()}</span><i>{issues.length ? "ATENÇÃO" : "DESCONHECIDO"}</i></div><h2>{system}</h2><div className="confidence"><small>CONFIANÇA DOS DADOS</small><div><i style={{ width: components.length ? "48%" : "12%" }} /></div><b>{components.length ? "PARCIAL" : "BAIXA"}</b></div><p>{issues.length} pendência(s) • {components.length} componente(s)</p><button onClick={() => setView("pendencias")}>VER REGISTROS →</button></article>; })}</div><p className="disclaimer">? “Desconhecido” significa que ainda não há informação suficiente — não que o sistema esteja em perfeito estado.</p></> }

function IssuesView({ issues, setModal }: any) { return <><PageHead eyebrow="OFICINA // TRIAGEM" title="O que tá pegando" text="Sintomas, avaliações e pepinos do carro — sem transformar palpite em diagnóstico." action="Nova pendência" onAction={() => setModal("issue")} />{issues.length ? <div className="table panel"><div className="table-row table-head"><span>PRIORIDADE</span><span>PENDÊNCIA</span><span>SISTEMA</span><span>STATUS</span><span>ESTIMATIVA</span></div>{issues.map((issue: any) => <div className="table-row" key={issue.id}><span><i className={`priority ${issue.priority.toLowerCase()}`}>{issue.priority}</i></span><span><b>{issue.title}</b><small>{issue.description}</small></span><span>{issue.subsystem}</span><span>{issue.status}</span><span>{formatBRL(issue.estimatedCost || 0)}</span></div>)}</div> : <EmptyCard title="Tá tudo zerado por enquanto" text="Pintou um barulho estranho ou chegou a avaliação do mecânico? Joga aqui." action="Registrar primeira pendência" onAction={() => setModal("issue")} />}</> }

function ServicesView({ state, setModal }: any) { return <><PageHead eyebrow="DIÁRIO DE BORDO" title="Manutenções e serviços" text="Cada registro pode encerrar uma pendência e alimentar o histórico de gastos." action="Registrar serviço" onAction={() => setModal("service")} />{state.services.length ? <div className="timeline">{state.services.map((service: any) => <article className="timeline-item panel" key={service.id}><time>{dateBR(service.date)}<small>{service.mileage.toLocaleString("pt-BR")} km</small></time><div><span>{service.type}</span><h3>{service.description}</h3><p>{service.provider} • Peças {formatBRL(service.partsCost)} • Mão de obra {formatBRL(service.laborCost)}</p></div><strong>{formatBRL(service.total)}</strong></article>)}</div> : <EmptyCard title="O diário de manutenção está vazio" text="Registre o que foi feito, por quem, quando e quanto custou." action="Registrar serviço" onAction={() => setModal("service")} />}</> }

function ComponentsView({ state, setModal }: any) { return <><PageHead eyebrow="CICLO DE VIDA" title="Componentes" text="Intervalos são estimativas configuráveis e precisam de uma fonte confiável." action="Novo componente" onAction={() => setModal("component")} />{state.components.length ? <div className="cards-grid">{state.components.map((component: any) => { const health = componentHealth(component, state.vehicle.currentMileage); return <article className="component-card panel" key={component.id}><div className="system-card-top"><span>{component.subsystem.slice(0,2).toUpperCase()}</span><i>{health.label}</i></div><h2>{component.name}</h2><p>{component.manufacturer} • {component.partNumber}</p><div className="life-bar"><i style={{ width: `${health.percent}%` }} /></div><dl><div><dt>Instalação</dt><dd>{dateBR(component.installedAt)}</dd></div><div><dt>Intervalo</dt><dd>{component.expectedLifeKm ? `${component.expectedLifeKm.toLocaleString("pt-BR")} km` : "Não informado"}</dd></div><div><dt>Fonte</dt><dd>{component.intervalSource}</dd></div></dl></article>; })}</div> : <EmptyCard title="Vida útil ainda desconhecida" text="Cadastre componentes somente com dados e intervalos que você possa confirmar." action="Cadastrar componente" onAction={() => setModal("component")} />}</> }

function QuotesView({ state, setModal }: any) { const grouped = state.issues.map((issue: any) => ({ issue, quotes: state.quotes.filter((q: any) => q.issueId === issue.id) })).filter((g: any) => g.quotes.length); return <><PageHead eyebrow="CENTRAL DE PROPOSTAS" title="Batalha de orçamentos" text="Compare escopo, prazo e garantia. Barato demais também merece aquela conferida." action="Adicionar orçamento" onAction={() => setModal("quote")} />{grouped.length ? grouped.map(({ issue, quotes }: any) => { const spread = quoteSpread(quotes); return <section className="quote-group panel" key={issue.id}><div className="panel-title"><div><small>PENDÊNCIA RELACIONADA</small><h3>{issue.title}</h3></div><span>{quotes.length} PROPOSTAS</span></div><div className="quote-summary"><div><small>MENOR VALOR</small><b>{formatBRL(spread.min)}</b></div><div><small>MAIOR VALOR</small><b>{formatBRL(spread.max)}</b></div><div><small>DIFERENÇA</small><b>{formatBRL(spread.diff)}</b></div></div><div className="quote-cards">{quotes.map((q: any) => { const total = q.partsCost + q.laborCost + q.otherCost; return <article key={q.id}><span>{q.status}</span><h4>{q.provider}</h4><strong>{formatBRL(total)}</strong><p>Peças {formatBRL(q.partsCost)}<br/>Mão de obra {formatBRL(q.laborCost)}<br/>Prazo {q.duration}<br/>Garantia {q.warranty}</p></article>; })}</div></section>; }) : <EmptyCard title="Sem disputa de orçamento ainda" text="Joga pelo menos duas propostas do mesmo reparo pra comparar sem fazer conta no braço." action="Adicionar orçamento" onAction={() => setModal("quote")} />}</> }

function ExpensesView({ expenses, total }: any) { const maintenance = expenses.filter((e: any) => e.category === "Manutenção").reduce((s: number, e: any) => s + e.amount, 0); const fuel = total - maintenance; return <><PageHead eyebrow="PAINEL FINANCEIRO" title="Histórico de gastos" text="Valores realizados são separados de estimativas de reparos futuros." /><section className="finance-hero panel"><div><small>TOTAL REALIZADO</small><strong>{formatBRL(total)}</strong><p>{expenses.length} lançamentos automáticos</p></div><div className="bar-chart"><div style={{ height: total ? `${Math.max(12, maintenance / total * 100)}%` : "6%" }}><span>MAN</span></div><div style={{ height: total ? `${Math.max(12, fuel / total * 100)}%` : "6%" }}><span>COMB</span></div><div style={{ height: "6%" }}><span>OUT</span></div></div></section>{expenses.length ? <div className="table panel"><div className="table-row table-head"><span>DATA</span><span>DESCRIÇÃO</span><span>CATEGORIA</span><span>VALOR</span></div>{expenses.map((e: any) => <div className="table-row expense-row" key={e.id}><span>{dateBR(e.date)}</span><span><b>{e.description}</b></span><span>{e.category}</span><span>{formatBRL(e.amount)}</span></div>)}</div> : <EmptyCard title="Nenhum gasto realizado" text="Serviços e abastecimentos aparecerão aqui automaticamente." />}</> }

function FuelView({ state, setModal }: any) { let average: number | null = null; const full = state.fuel.filter((f: any) => f.fullTank).sort((a: any,b: any) => a.mileage-b.mileage); if (full.length >= 2) { const distance = full.at(-1).mileage - full[0].mileage; const liters = full.slice(1).reduce((s: number,f: any)=>s+f.liters,0); if(distance>0&&liters>0) average=distance/liters; } return <><PageHead eyebrow="REGISTRO DE CONSUMO" title="Abastecimentos" text="Médias só aparecem quando há dados de tanque completo suficientes." action="Novo abastecimento" onAction={() => setModal("fuel")} /><section className="fuel-metrics"><div className="panel"><small>CONSUMO MÉDIO</small><strong>{average ? `${average.toFixed(1)} km/l` : "Dados insuficientes"}</strong></div><div className="panel"><small>ABASTECIMENTOS</small><strong>{state.fuel.length}</strong></div><div className="panel"><small>ÚLTIMO PREÇO</small><strong>{state.fuel[0] ? `${formatBRL(state.fuel[0].pricePerLiter)}/l` : "Não informado"}</strong></div></section>{state.fuel.length ? <div className="timeline">{state.fuel.map((f: any)=><article className="timeline-item panel" key={f.id}><time>{dateBR(f.date)}<small>{f.mileage.toLocaleString("pt-BR")} km</small></time><div><span>{f.fullTank ? "TANQUE COMPLETO" : "PARCIAL"}</span><h3>{f.liters.toFixed(1)} litros</h3><p>{f.station || "Posto não informado"} • {f.fuelType}</p></div><strong>{formatBRL(f.total)}</strong></article>)}</div> : <EmptyCard title="Nenhum abastecimento" text="Registre dois tanques completos consecutivos para calcular uma média confiável." action="Registrar abastecimento" onAction={() => setModal("fuel")} />}</> }

function SettingsView({ state, setState, exportBackup, importRef, loadDemo }: any) { return <><PageHead eyebrow="SISTEMA // PREFERÊNCIAS" title="Configurações e backup" text="A nuvem mantém sua garagem igual em todos os aparelhos. O backup em arquivo continua disponível como segurança extra." /><div className="settings-grid"><section className="panel settings-card"><span>01</span><div><small>BACKUP COMPLETO</small><h2>Proteja seu histórico</h2><p>Exporte todos os registros para um arquivo JSON ou restaure um arquivo válido.</p><div className="button-row"><button className="primary" onClick={exportBackup}>EXPORTAR BACKUP</button><button className="secondary" onClick={() => importRef.current?.click()}>IMPORTAR</button></div><small>ÚLTIMO BACKUP: {state.settings.lastBackupAt ? dateBR(state.settings.lastBackupAt.slice(0,10)) : "NUNCA"}</small></div></section><section className="panel settings-card"><span>02</span><div><small>DADOS DEMONSTRATIVOS</small><h2>Explore sem compromisso</h2><p>Carregue exemplos claramente identificados para testar pendências e orçamentos.</p><button className="secondary" onClick={loadDemo} disabled={state.settings.demoMode}>{state.settings.demoMode ? "DEMONSTRAÇÃO ATIVA" : "CARREGAR DEMONSTRAÇÃO"}</button></div></section><section className="panel settings-card danger"><span>03</span><div><small>ZONA DE CUIDADO</small><h2>Restaurar prontuário base</h2><p>Volta sua conta para os dados iniciais do Kadett 1994. Exporte um backup antes se quiser guardar alterações.</p><button onClick={() => { if (window.confirm("Voltar para o prontuário base do Kadett? Suas alterações atuais serão substituídas na nuvem.")) setState(emptyState); }}>RESTAURAR BASE DO KADETT</button></div></section></div></> }

function LibraryView({ state }: any) {
  const library = state.library ?? [];
  return <><PageHead eyebrow="ARQUIVO TÉCNICO" title="Biblioteca do Kadett" text="Especificações, hipóteses, roteiro técnico e decisões do projeto em um lugar só." />{library.length ? <div className="knowledge-grid">{library.map((item: any) => <article className="knowledge-card panel" key={item.id}><span>{item.category}</span><h2>{item.title}</h2><p>{item.content}</p></article>)}</div> : <EmptyCard title="Biblioteca ainda vazia" text="Guarde especificações, torques, códigos GM, sensores, chicotes, fusíveis e referências técnicas por aqui." />}</>
}

function HistoryView({ state }: any) {
  const timeline = state.timeline ?? [];
  return <><PageHead eyebrow="MEMÓRIA DO VEÍCULO" title="História do Kadett" text={state.vehicle.restorationGoal || "Uma linha do tempo para fatos verificados, relatos e momentos importantes deste carro."} /><section className="identity-card panel"><div><small>IDENTIDADE</small><h2>{state.vehicle.manufacturer} {state.vehicle.model} {state.vehicle.trim} {state.vehicle.year}</h2><p>{state.vehicle.engine} • {state.vehicle.fuelType} • {state.vehicle.color ?? "Cor não informada"}</p></div><div><small>RODAS</small><p>{state.vehicle.wheels ?? "Rodas não informadas"}</p></div></section>{timeline.length ? <div className="timeline">{timeline.map((event: any) => <article className="timeline-item panel" key={event.id}><time>{dateBR(event.date)}<small>REGISTRO</small></time><div><span>PRONTUÁRIO</span><h3>{event.title}</h3><p>{event.description}</p></div><strong>OEM</strong></article>)}</div> : <EmptyCard title="História ainda vazia" text="A linha do tempo vai guardar fatos, compras, serviços e decisões importantes da restauração." />}</>
}

function EmptyCard({ title, text, action, onAction }: any) { return <div className="empty-card panel"><span>＋</span><h2>{title}</h2><p>{text}</p>{action && <button className="primary" onClick={onAction}>{action}</button>}</div> }

function GarageMode({ state, setState, onExit, onModal }: any) { const tasks = state.issues.filter((i: any) => i.status !== "Resolvida"); return <main className="garage"><header><div><small>MODO GARAGEM</small><h1>Mão na graxa</h1></div><button onClick={onExit}>VOLTAR PRO PAINEL</button></header><section className="garage-mileage"><span>QUILOMETRAGEM</span><strong>{state.vehicle.currentMileage ? `${state.vehicle.currentMileage.toLocaleString("pt-BR")} km` : "Não informada"}</strong><button onClick={() => { onExit(); onModal("mileage"); }}>ATUALIZAR</button></section><h2>CHECKLIST DE PENDÊNCIAS</h2>{tasks.length ? <div className="garage-list">{tasks.map((issue: any) => <label key={issue.id}><input type="checkbox" onChange={() => setState((s: AppState) => ({ ...s, issues: s.issues.map((i) => i.id === issue.id ? { ...i, status: "Resolvida" } : i) }))} /><span><b>{issue.title}</b><small>{issue.subsystem} • {issue.priority}</small></span></label>)}</div> : <EmptyCard title="Garagem tranquila" text="Se pintar algum detalhe, volta pro painel e manda pra lista." />}<div className="garage-actions"><button onClick={() => { onExit(); onModal("issue"); }}>＋ OBSERVAÇÃO</button><button onClick={() => { onExit(); onModal("component"); }}>↻ COMPONENTE</button><button onClick={() => { onExit(); onModal("service"); }}>✓ SERVIÇO</button></div><p>Condições e intervalos são registros e estimativas. Itens de segurança exigem avaliação profissional.</p></main> }

function Modal({ kind, state, onClose, handlers }: any) {
  const config: Record<string, [string, (e: FormEvent<HTMLFormElement>) => void]> = { mileage: ["Atualizar quilometragem", handlers.updateMileage], issue: ["Nova pendência", handlers.addIssue], service: ["Registrar serviço", handlers.addService], component: ["Novo componente", handlers.addComponent], quote: ["Adicionar orçamento", handlers.addQuote], fuel: ["Novo abastecimento", handlers.addFuel] };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><div><small>NOVO REGISTRO SINCRONIZADO</small><h2 id="modal-title">{config[kind][0]}</h2></div><button onClick={onClose} aria-label="Fechar">×</button></header><form onSubmit={config[kind][1]}>
    {kind === "mileage" && <Field label="Quilometragem atual"><input name="mileage" type="number" min="0" defaultValue={state.vehicle.currentMileage || ""} required autoFocus /></Field>}
    {kind === "issue" && <><Field label="Título"><input name="title" required autoFocus placeholder="Ex.: Ruído ao frear" /></Field><div className="form-grid"><Field label="Sistema"><select name="subsystem">{systems.map((s) => <option key={s}>{s}</option>)}</select></Field><Field label="Prioridade"><select name="priority"><option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option></select></Field></div><Field label="Descrição / fonte"><textarea name="description" placeholder="Descreva o sintoma ou a avaliação recebida" /></Field><Field label="Estimativa manual (R$)"><input name="estimatedCost" type="number" min="0" step="0.01" /></Field></>}
    {kind === "service" && <><div className="form-grid"><Field label="Data"><input name="date" type="date" defaultValue={today()} required /></Field><Field label="Quilometragem"><input name="mileage" type="number" defaultValue={state.vehicle.currentMileage || ""} /></Field></div><Field label="Descrição"><input name="description" required autoFocus placeholder="Serviço executado" /></Field><div className="form-grid"><Field label="Tipo"><select name="type"><option>Corretiva</option><option>Preventiva</option><option>Inspeção</option><option>Estética</option></select></Field><Field label="Oficina / responsável"><input name="provider" /></Field></div><Field label="Pendência resolvida"><select name="issueId"><option value="">Nenhuma</option>{state.issues.filter((i: any)=>i.status!=="Resolvida").map((i: any)=><option key={i.id} value={i.id}>{i.title}</option>)}</select></Field><div className="form-grid three"><Field label="Peças (R$)"><input name="partsCost" type="number" min="0" step="0.01" /></Field><Field label="Mão de obra"><input name="laborCost" type="number" min="0" step="0.01" /></Field><Field label="Outros"><input name="otherCost" type="number" min="0" step="0.01" /></Field></div></>}
    {kind === "component" && <><Field label="Componente"><input name="name" required autoFocus placeholder="Ex.: Correia dentada" /></Field><div className="form-grid"><Field label="Sistema"><select name="subsystem">{systems.map((s)=><option key={s}>{s}</option>)}</select></Field><Field label="Fabricante"><input name="manufacturer" /></Field></div><Field label="Código da peça"><input name="partNumber" /></Field><div className="form-grid"><Field label="Data da instalação"><input name="installedAt" type="date" /></Field><Field label="Km na instalação"><input name="installedAtMileage" type="number" min="0" /></Field></div><div className="form-grid"><Field label="Intervalo em km"><input name="expectedLifeKm" type="number" min="0" /></Field><Field label="Intervalo em meses"><input name="expectedLifeMonths" type="number" min="0" /></Field></div><Field label="Fonte do intervalo"><input name="intervalSource" placeholder="Manual, fabricante ou profissional" /></Field></>}
    {kind === "quote" && <><Field label="Pendência"><select name="issueId" required>{state.issues.filter((i:any)=>i.status!=="Resolvida").map((i:any)=><option key={i.id} value={i.id}>{i.title}</option>)}</select></Field><div className="form-grid"><Field label="Oficina / fornecedor"><input name="provider" required autoFocus /></Field><Field label="Data"><input name="date" type="date" defaultValue={today()} required /></Field></div><div className="form-grid three"><Field label="Peças (R$)"><input name="partsCost" type="number" min="0" step="0.01" /></Field><Field label="Mão de obra"><input name="laborCost" type="number" min="0" step="0.01" /></Field><Field label="Outros"><input name="otherCost" type="number" min="0" step="0.01" /></Field></div><div className="form-grid"><Field label="Prazo"><input name="duration" placeholder="Ex.: 2 dias" /></Field><Field label="Garantia"><input name="warranty" placeholder="Ex.: 90 dias" /></Field></div></>}
    {kind === "fuel" && <><div className="form-grid"><Field label="Data"><input name="date" type="date" defaultValue={today()} required /></Field><Field label="Quilometragem"><input name="mileage" type="number" defaultValue={state.vehicle.currentMileage || ""} required /></Field></div><div className="form-grid"><Field label="Litros"><input name="liters" type="number" min="0.01" step="0.01" required /></Field><Field label="Preço por litro"><input name="price" type="number" min="0.01" step="0.001" required /></Field></div><div className="form-grid"><Field label="Combustível"><select name="fuelType"><option>Não confirmado</option><option>Gasolina</option><option>Etanol</option></select></Field><Field label="Posto"><input name="station" /></Field></div><label className="check"><input name="fullTank" type="checkbox" /> Tanque completo</label></>}
    <footer><button type="button" className="secondary" onClick={onClose}>CANCELAR</button><button className="primary" type="submit">SALVAR REGISTRO</button></footer>
  </form></section></div>;
}
function Field({ label, children }: any) { return <label className="field"><span>{label}</span>{children}</label> }
function LegalFoot() { return <div className="legal-foot"><p>Projeto pessoal e independente, sem vínculo com a Chevrolet ou a General Motors. Marcas e nomes pertencem aos seus respectivos proprietários.</p><p>As condições e intervalos exibidos são registros e estimativas. Reparos e itens de segurança devem ser avaliados por profissional qualificado.</p></div> }
