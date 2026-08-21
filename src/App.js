
import React, { useMemo, useState } from "react";
import { Building2, CalendarDays, CheckCircle2, ChevronRight, Clock3, HeartPulse, Plus, Save, Settings2, Sparkles, Trash2, Users, AlertTriangle, Download } from "lucide-react";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const SHIFTS = ["Matin", "Après-midi", "Soir"];
const MODALITIES = ["Centre lourd", "UDM", "AutoD"];
const SESSION_HOURS = 5 + 50 / 60;

const initialSettings = {
  ideCentre: 4,
  ideUdm: 4,
  ideAutod: 6,
  asCentre: 8,
  asUdm: 1,
  asAutod: 1,
  shiftMinutes: 350,
  weeklyHours: 35,
};

const defaultCenter = {
  id: 1,
  name: "Châteauroux",
  days: Object.fromEntries(DAYS.map((day) => [day, {
    open: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].includes(day),
    shifts: {
      "Matin": { open: true, patients: 32, modality: "Centre lourd" },
      "Après-midi": { open: true, patients: 32, modality: "Centre lourd" },
      "Soir": { open: true, patients: 12, modality: "Centre lourd" },
    },
  }])),
};

function Field({ label, value, onChange, suffix, min = 0, step = 1 }) {
  return <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
    <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
      <input type="number" min={min} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none" />
      {suffix && <span className="whitespace-nowrap text-xs font-medium text-slate-400">{suffix}</span>}
    </div>
  </label>;
}

function Badge({ children, tone = "teal" }) {
  const styles = tone === "amber" ? "bg-amber-50 text-amber-700 ring-amber-200" : tone === "blue" ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-teal-50 text-teal-700 ring-teal-200";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles}`}>{children}</span>;
}

function App() {
  const [page, setPage] = useState(1);
  const [settings, setSettings] = useState(initialSettings);
  const [centers, setCenters] = useState([defaultCenter]);
  const [selectedId, setSelectedId] = useState(1);
  const [generated, setGenerated] = useState(null);
  const [roleView, setRoleView] = useState("IDE");
  const [weekView, setWeekView] = useState(1);
  const [integratedRules, setIntegratedRules] = useState([
    { id: "contractHours", group: "Contraintes obligatoires", label: "Respecter le temps de travail contractuel IDE et AS, avec une moyenne de 35 h par semaine et des écarts minimisés", enabled: true },
    { id: "dayStructure", group: "Contraintes obligatoires", label: "Limiter une journée à 1 séance isolée de 5 h 50 ou 2 séances consécutives de 11 h 40", enabled: true },
    { id: "restAfterEvening", group: "Contraintes obligatoires", label: "Après une soirée, interdire une affectation le lendemain matin", enabled: true },
    { id: "fairConstraints", group: "Contraintes obligatoires", label: "Répartir équitablement les soirées, les samedis et les contraintes particulières", enabled: true },
    { id: "skills", group: "Contraintes obligatoires", label: "Couvrir chaque poste par la catégorie professionnelle habilitée IDE ou AS", enabled: true },
    { id: "minEmployees", group: "Objectifs prioritaires", priority: 1, label: "Utiliser le minimum de salariés nécessaire pour couvrir l'activité", enabled: true },
    { id: "shortCycle", group: "Objectifs prioritaires", priority: 2, label: "Proposer le cycle le plus court possible, en testant 2, 3, 4 puis 5 semaines", enabled: true },
    { id: "fullDays", group: "Objectifs prioritaires", priority: 3, label: "Maximiser les journées complètes de 11 h 40 et minimiser les séances isolées", enabled: true },
    { id: "fewDays", group: "Objectifs prioritaires", priority: 4, label: "Concentrer le temps de travail sur 3 jours par semaine plutôt que 4 ou 5", enabled: true },
    { id: "alternateDays", group: "Objectifs prioritaires", priority: 5, label: "Favoriser l'alternance Travail - Repos - Travail - Repos", enabled: true },
    { id: "limitSeries", group: "Objectifs prioritaires", priority: 6, label: "Éviter 3 jours travaillés consécutifs et interdire plus de 3 jours consécutifs", enabled: true },
    { id: "balanceHours", group: "Objectifs prioritaires", priority: 7, label: "Rapprocher chaque salarié de sa cible horaire et minimiser l'écart entre salariés", enabled: true },
    { id: "automaticControls", group: "Contrôles automatiques", label: "Afficher les contrôles individuels et collectifs complets", enabled: true },
  ]);
  const [newRule, setNewRule] = useState("");
  const ruleEnabled = (id) => integratedRules.find((rule) => rule.id === id)?.enabled !== false;
  const toggleRule = (id) => setIntegratedRules((rules) => rules.map((rule) => rule.id === id && !rule.locked ? { ...rule, enabled: !rule.enabled } : rule));
  const addRule = () => {
    const label = newRule.trim();
    if (!label) return;
    setIntegratedRules((rules) => [...rules, { id: `custom-${Date.now()}`, label, enabled: true, custom: true }]);
    setNewRule("");
  };
  const removeRule = (id) => setIntegratedRules((rules) => rules.filter((rule) => rule.id !== id || !rule.custom));


  const selected = centers.find((c) => c.id === selectedId) || centers[0];

  const staffing = (shift) => {
    if (!shift.open) return { ide: 0, as: 0 };
    const ratios = { "Centre lourd": settings.ideCentre, UDM: settings.ideUdm, AutoD: settings.ideAutod };
    const ide = Math.ceil(shift.patients / Math.max(1, ratios[shift.modality]));
    let as = 0;
    if (shift.modality === "Centre lourd") as = Math.ceil(shift.patients / Math.max(1, settings.asCentre));
    if (shift.modality === "UDM") as = settings.asUdm;
    if (shift.modality === "AutoD") as = settings.asAutod;
    return { ide, as };
  };

  const centerTotals = useMemo(() => {
    if (!selected) return { ide: 0, as: 0, patients: 0 };
    let ide = 0, as = 0, patients = 0;
    DAYS.forEach((d) => SHIFTS.forEach((s) => {
      const sh = selected.days[d].shifts[s];
      if (selected.days[d].open && sh.open) {
        const n = staffing(sh); ide += n.ide; as += n.as; patients += sh.patients;
      }
    }));
    return { ide, as, patients };
  }, [selected, settings]);

  const updateSelected = (updater) => setCenters((items) => items.map((c) => c.id === selectedId ? updater(c) : c));

  const addCenter = () => {
    const id = Date.now();
    const copy = JSON.parse(JSON.stringify(defaultCenter));
    copy.id = id; copy.name = `Nouvel établissement ${centers.length + 1}`;
    setCenters([...centers, copy]); setSelectedId(id); setGenerated(null);
  };

  const deleteCenter = () => {
    if (centers.length <= 1) return;
    const next = centers.filter((c) => c.id !== selectedId);
    setCenters(next); setSelectedId(next[0].id); setGenerated(null);
  };

  function generatePlanning() {
    const needs = { IDE: [], AS: [] };
    DAYS.forEach((day, dayIndex) => SHIFTS.forEach((shift, shiftIndex) => {
      const data = selected.days[day].shifts[shift];
      if (!selected.days[day].open || !data.open) return;
      const n = staffing(data);
      for (let i = 0; i < n.ide; i++) needs.IDE.push({ day, dayIndex, shift, shiftIndex });
      for (let i = 0; i < n.as; i++) needs.AS.push({ day, dayIndex, shift, shiftIndex });
    }));

    const sessionsPerWorkerWeek = Math.max(1, Math.round(settings.weeklyHours / (settings.shiftMinutes / 60)));
    let weeks = ruleEnabled("shortCycle") ? 2 : 5;
    if (ruleEnabled("shortCycle") && ruleEnabled("contractHours")) {
      const candidates = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      weeks = candidates.find((candidate) =>
        (needs.IDE.length * candidate) % sessionsPerWorkerWeek === 0 &&
        (needs.AS.length * candidate) % sessionsPerWorkerWeek === 0
      ) || 12;
    }


    const buildRole = (role) => {
      const totalSlots = needs[role].length * weeks;
      const targetSessionsPerWorker = sessionsPerWorkerWeek * weeks;
      const theoreticalMinimum = Math.max(1, Math.ceil(totalSlots / targetSessionsPerWorker));
      const peakConcurrent = Math.max(1, ...DAYS.flatMap((day) => SHIFTS.map((shift) => needs[role].filter((slot) => slot.day === day && slot.shift === shift).length)));
      const workersCount = ruleEnabled("minEmployees") ? Math.max(theoreticalMinimum, peakConcurrent) : Math.max(theoreticalMinimum + 1, peakConcurrent);
      const workers = Array.from({ length: workersCount }, (_, i) => ({ name: `${role} ${i + 1}`, weeks: Array.from({ length: weeks }, () => []) }));

      for (let w = 0; w < weeks; w++) {
        const slots = needs[role].map((x) => ({ ...x, week: w }));
        slots.sort((a, b) => a.dayIndex - b.dayIndex || a.shiftIndex - b.shiftIndex);
        slots.forEach((slot) => {
          const candidates = workers.map((worker, index) => {
            const list = worker.weeks[w];
            const sameDay = list.filter((x) => x.day === slot.day);
            const allSlots = worker.weeks.flat();
            const sessionsThisWeek = list.length;
            const sessionsOnCycle = allSlots.length;
            const alreadyOnSlot = sameDay.some((x) => x.shift === slot.shift);
            const consecutivePair = sameDay.length === 1 && Math.abs(sameDay[0].shiftIndex - slot.shiftIndex) === 1;
            const nonConsecutivePair = sameDay.length === 1 && !consecutivePair;
            const workedDayIndexes = [...new Set(list.map((x) => x.dayIndex))];
            const workedYesterday = workedDayIndexes.includes(slot.dayIndex - 1);
            const workedTwoDaysAgo = workedDayIndexes.includes(slot.dayIndex - 2);
            const workedThreeDaysAgo = workedDayIndexes.includes(slot.dayIndex - 3);
            const eveningYesterday = list.some((x) => x.shift === "Soir" && x.dayIndex === slot.dayIndex - 1);
            const morningAfterEveningBlocked = ruleEnabled("restAfterEvening") && slot.shift === "Matin" && eveningYesterday;
            const dayStructureBlocked = ruleEnabled("dayStructure") && (sameDay.length >= 2 || nonConsecutivePair);
            const contractBlocked = ruleEnabled("contractHours") && sessionsThisWeek >= sessionsPerWorkerWeek;
            const longSeriesBlocked = ruleEnabled("limitSeries") && workedYesterday && workedTwoDaysAgo && workedThreeDaysAgo && sameDay.length === 0;
            const blocked = alreadyOnSlot || dayStructureBlocked || morningAfterEveningBlocked || contractBlocked || longSeriesBlocked;


            const workedDays = workedDayIndexes.length;
            const fullDayBonus = ruleEnabled("fullDays") && consecutivePair ? 120 : 0;
            const isolatedPenalty = ruleEnabled("fullDays") && sameDay.length === 0 ? 25 : 0;
            const fewDaysPenalty = ruleEnabled("fewDays") ? Math.max(0, workedDays + (sameDay.length === 0 ? 1 : 0) - 3) * 35 : 0;
            const alternationPenalty = ruleEnabled("alternateDays") && workedYesterday && sameDay.length === 0 ? 45 : 0;
            const threeDayPenalty = ruleEnabled("limitSeries") && workedYesterday && workedTwoDaysAgo && sameDay.length === 0 ? 90 : 0;
            const projectedGap = Math.abs(targetSessionsPerWorker - (sessionsOnCycle + 1));
            const balancePenalty = ruleEnabled("balanceHours") || ruleEnabled("contractHours") ? projectedGap * 8 : 0;
            const eveningsOnCycle = allSlots.filter((x) => x.shift === "Soir").length;
            const saturdaysOnCycle = worker.weeks.reduce((total, week) => total + (week.some((x) => x.day === "Samedi") ? 1 : 0), 0);
            const newSaturday = slot.day === "Samedi" && sameDay.length === 0;
            const equityPenalty = ruleEnabled("fairConstraints") ?
              (slot.shift === "Soir" ? eveningsOnCycle * 80 : 0) + (newSaturday ? saturdaysOnCycle * 100 : 0) : 0;
            const loadBonus = ruleEnabled("minEmployees") ? sessionsOnCycle * 12 : 0;
            const score = blocked ? 1000000 : isolatedPenalty + fewDaysPenalty + alternationPenalty + threeDayPenalty + balancePenalty + equityPenalty - fullDayBonus - loadBonus;
            return { index, score, blocked };
          }).sort((a, b) => a.score - b.score);
          const best = candidates.find((candidate) => !candidate.blocked) || candidates[0];
          workers[best.index].weeks[w].push(slot);
        });
      }
      return workers.filter((worker) => worker.weeks.some((week) => week.length > 0));
    };

    const roleData = { IDE: buildRole("IDE"), AS: buildRole("AS") };
    const controls = {};
    const collectiveControls = {};
    ["IDE", "AS"].forEach((role) => {
      controls[role] = roleData[role].map((worker) => {
        const allSlots = worker.weeks.flat();
        const sessions = allSlots.length;
        const hours = sessions * settings.shiftMinutes / 60;
        const target = settings.weeklyHours * weeks;
        const fullDays = worker.weeks.reduce((total, week) => total + DAYS.filter((day) => week.filter((slot) => slot.day === day).length === 2).length, 0);
        const isolatedSessions = worker.weeks.reduce((total, week) => total + DAYS.filter((day) => week.filter((slot) => slot.day === day).length === 1).length, 0);
        const evenings = allSlots.filter((slot) => slot.shift === "Soir").length;
        const saturdays = new Set(allSlots.filter((slot) => slot.day === "Samedi").map((slot) => `${slot.week}-${slot.day}`)).size;
        const workedDays = worker.weeks.reduce((total, week) => total + new Set(week.map((slot) => slot.day)).size, 0);
        const restDays = weeks * DAYS.length - workedDays;
        return { name: worker.name, sessions, hours, target, deviation: hours - target, fullDays, isolatedSessions, evenings, saturdays, workedDays, restDays };
      });
      const roleHours = controls[role].map((control) => control.hours);
      const plannedSlots = roleData[role].reduce((total, worker) => total + worker.weeks.reduce((sum, week) => sum + week.length, 0), 0);
      const requiredSlots = needs[role].length * weeks;
      collectiveControls[role] = {
        coverage: requiredSlots === 0 ? 100 : Math.min(100, plannedSlots / requiredSlots * 100),
        plannedSlots,
        requiredSlots,
        totalHours: roleHours.reduce((sum, hours) => sum + hours, 0),
        eveningMin: Math.min(...controls[role].map((control) => control.evenings)),
        eveningMax: Math.max(...controls[role].map((control) => control.evenings)),
        saturdayMin: Math.min(...controls[role].map((control) => control.saturdays)),
        saturdayMax: Math.max(...controls[role].map((control) => control.saturdays)),
        maxHourGap: roleHours.length ? Math.max(...roleHours) - Math.min(...roleHours) : 0,
        isolatedSessions: controls[role].reduce((sum, control) => sum + control.isolatedSessions, 0),
        fullDays: controls[role].reduce((sum, control) => sum + control.fullDays, 0),
      };
    });
    setGenerated({ weeks, roleData, controls, collectiveControls, sessionsPerWorkerWeek });
    setWeekView(1); setPage(3);
  }

  const save = () => {
    try { localStorage.setItem("nephroshift", JSON.stringify({ settings, centers })); } catch (_) {}
  };

  const nav = [
    { n: 1, label: "Paramètres généraux", icon: Settings2 },
    { n: 2, label: "Gestion des établissements", icon: Building2 },
    { n: 3, label: "Génération du roulement", icon: CalendarDays },
  ];

  return <div className="min-h-screen bg-[#f4f7f7] text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20"><HeartPulse size={24} /></div>
          <div><h1 className="text-xl font-bold tracking-tight">NéphroShift</h1><p className="text-xs text-slate-500">Planification intelligente des équipes de dialyse</p></div>
        </div>
        <button onClick={save} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:border-teal-300 hover:text-teal-700"><Save size={16}/> Enregistrer</button>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-6 lg:grid-cols-[270px_1fr] lg:px-8">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">Configuration</p>
        {nav.map(({ n, label, icon: Icon }) => <button key={n} onClick={() => setPage(n)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${page === n ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-50"}`}>
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${page === n ? "bg-teal-600 text-white" : "bg-slate-100"}`}><Icon size={16}/></span>
          <span className="flex-1">{label}</span><ChevronRight size={15}/>
        </button>)}
        <div className="mt-4 rounded-xl bg-slate-900 p-4 text-white">
          <p className="text-xs font-semibold text-teal-300">Repère</p>
          <p className="mt-1 text-sm font-bold">1 séance = {Math.floor(settings.shiftMinutes/60)} h {String(settings.shiftMinutes%60).padStart(2,"0")}</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">Deux séances consécutives représentent 11 h 40 et une semaine complète 6 séances.</p>
        </div>
      </aside>

      <main>
        {page === 1 && <section>
          <div className="mb-6"><Badge>Étape 1 sur 3</Badge><h2 className="mt-3 text-3xl font-bold tracking-tight">Paramètres généraux</h2><p className="mt-2 text-slate-500">Définissez les ratios de prise en charge et les règles de temps de travail utilisées dans tous les établissements.</p></div>
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Users size={20}/></div><div><h3 className="font-bold">Ratios IDE</h3><p className="text-sm text-slate-500">Nombre maximal de patients par IDE</p></div></div><div className="grid gap-4 sm:grid-cols-3">
              <Field label="Centre lourd" value={settings.ideCentre} onChange={(v)=>setSettings({...settings,ideCentre:v})} suffix="patients / IDE" min={1}/>
              <Field label="UDM" value={settings.ideUdm} onChange={(v)=>setSettings({...settings,ideUdm:v})} suffix="patients / IDE" min={1}/>
              <Field label="AutoD" value={settings.ideAutod} onChange={(v)=>setSettings({...settings,ideAutod:v})} suffix="patients / IDE" min={1}/>
            </div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><Users size={20}/></div><div><h3 className="font-bold">Ratios AS</h3><p className="text-sm text-slate-500">Par patient en centre, par séance en UDM et AutoD</p></div></div><div className="grid gap-4 sm:grid-cols-3">
              <Field label="Centre lourd" value={settings.asCentre} onChange={(v)=>setSettings({...settings,asCentre:v})} suffix="patients / AS" min={1}/>
              <Field label="Séance UDM" value={settings.asUdm} onChange={(v)=>setSettings({...settings,asUdm:v})} suffix="AS / séance" min={0}/>
              <Field label="Séance AutoD" value={settings.asAutod} onChange={(v)=>setSettings({...settings,asAutod:v})} suffix="AS / séance" min={0}/>
            </div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2"><div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-teal-50 p-2.5 text-teal-600"><Clock3 size={20}/></div><div><h3 className="font-bold">Temps de travail</h3><p className="text-sm text-slate-500">Base contractuelle utilisée par le moteur d'optimisation</p></div></div><div className="grid gap-4 sm:grid-cols-2 lg:w-2/3">
              <Field label="Durée d'une séance" value={settings.shiftMinutes} onChange={(v)=>setSettings({...settings,shiftMinutes:v})} suffix="minutes" min={1}/>
              <Field label="Temps de travail hebdomadaire" value={settings.weeklyHours} onChange={(v)=>setSettings({...settings,weeklyHours:v})} suffix="heures" min={1}/>
            </div><div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900"><CheckCircle2 className="mr-2 inline" size={17}/> À ces paramètres, un temps plein représente <strong>{Math.round(settings.weeklyHours/(settings.shiftMinutes/60))} séances par semaine</strong>.</div></div>
          </div>
          <div className="mt-6 flex justify-end"><button onClick={()=>setPage(2)} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700">Continuer vers les établissements</button></div>
        </section>}

        {page === 2 && selected && <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Badge>Étape 2 sur 3</Badge><h2 className="mt-3 text-3xl font-bold tracking-tight">Gestion des établissements</h2><p className="mt-2 text-slate-500">Configurez les ouvertures, modalités et volumes patients de chaque séance.</p></div><div className="flex gap-2"><button onClick={addCenter} className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={17}/> Nouvel établissement</button><button onClick={deleteCenter} disabled={centers.length<=1} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 disabled:opacity-30"><Trash2 size={17}/></button></div></div>
          <div className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]">
            <label><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Établissement actif</span><select value={selectedId} onChange={(e)=>{setSelectedId(Number(e.target.value));setGenerated(null)}} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-teal-500">{centers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Nom de l'établissement</span><input value={selected.name} onChange={(e)=>updateSelected(c=>({...c,name:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-teal-500"/></label>
            <div className="flex items-end"><Badge tone="blue">{centerTotals.patients} passages / semaine</Badge></div>
          </div>
          <div className="space-y-4">{DAYS.map(day => <div key={day} className={`rounded-2xl border bg-white shadow-sm ${selected.days[day].open ? "border-slate-200" : "border-slate-100 opacity-65"}`}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><button onClick={()=>updateSelected(c=>({...c,days:{...c.days,[day]:{...c.days[day],open:!c.days[day].open}}}))} className={`h-6 w-11 rounded-full p-1 transition ${selected.days[day].open?"bg-teal-600":"bg-slate-200"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${selected.days[day].open?"translate-x-5":""}`}/></button><h3 className="font-bold">{day}</h3></div><span className="text-xs font-semibold text-slate-400">{selected.days[day].open ? "Journée ouverte" : "Fermé"}</span></div>
            {selected.days[day].open && <div className="grid gap-3 p-4 xl:grid-cols-3">{SHIFTS.map(shiftName => { const sh=selected.days[day].shifts[shiftName]; const n=staffing(sh); return <div key={shiftName} className={`rounded-xl border p-4 ${sh.open?"border-slate-200 bg-slate-50/60":"border-dashed border-slate-200"}`}><div className="mb-3 flex items-center justify-between"><span className="font-bold">{shiftName}</span><input type="checkbox" checked={sh.open} onChange={(e)=>updateSelected(c=>({...c,days:{...c.days,[day]:{...c.days[day],shifts:{...c.days[day].shifts,[shiftName]:{...sh,open:e.target.checked}}}}}))} className="h-5 w-5 accent-teal-600"/></div>{sh.open && <><div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-slate-500">Patients<input type="number" min="0" value={sh.patients} onChange={(e)=>updateSelected(c=>({...c,days:{...c.days,[day]:{...c.days[day],shifts:{...c.days[day].shifts,[shiftName]:{...sh,patients:Number(e.target.value)}}}}}))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900"/></label><label className="text-xs font-semibold text-slate-500">Modalité<select value={sh.modality} onChange={(e)=>updateSelected(c=>({...c,days:{...c.days,[day]:{...c.days[day],shifts:{...c.days[day].shifts,[shiftName]:{...sh,modality:e.target.value}}}}}))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900">{MODALITIES.map(m=><option key={m}>{m}</option>)}</select></label></div><div className="mt-3 flex gap-2"><Badge>{n.ide} IDE</Badge><Badge tone="blue">{n.as} AS</Badge></div></>}</div>})}</div>}
          </div>)}</div>
          <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white"><div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-slate-400">Séances patients / semaine</p><p className="mt-1 text-2xl font-bold">{centerTotals.patients}</p></div><div><p className="text-xs text-slate-400">Postes IDE à couvrir</p><p className="mt-1 text-2xl font-bold">{centerTotals.ide}</p></div><div><p className="text-xs text-slate-400">Postes AS à couvrir</p><p className="mt-1 text-2xl font-bold">{centerTotals.as}</p></div></div></div>
          <div className="mt-6 flex justify-end"><button onClick={()=>setPage(3)} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white">Préparer le roulement</button></div>
        </section>}

        {page === 3 && selected && <section>
          <div className="mb-6"><Badge>Étape 3 sur 3</Badge><h2 className="mt-3 text-3xl font-bold tracking-tight">Génération du roulement</h2><p className="mt-2 text-slate-500">Le moteur recherche le cycle le plus court compatible avec les besoins et le temps de travail.</p></div>
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-lg font-bold">Lancer une optimisation</h3><div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Établissement</p><p className="mt-1 font-bold">{selected.name}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Besoin IDE</p><p className="mt-1 font-bold">{centerTotals.ide} postes / sem.</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Besoin AS</p><p className="mt-1 font-bold">{centerTotals.as} postes / sem.</p></div></div><button onClick={generatePlanning} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700"><Sparkles size={19}/> Générer la trame optimisée IDE + AS</button></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">Règles de génération</h3><p className="mt-1 text-xs leading-5 text-slate-500">Activez uniquement les contraintes que vous souhaitez appliquer.</p></div><Badge>{integratedRules.filter((rule) => rule.enabled).length} actives</Badge></div><div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto pr-1">{integratedRules.map((rule)=><div key={rule.id} className={`flex items-center gap-3 rounded-xl border p-3 ${rule.enabled?"border-teal-200 bg-teal-50/60":"border-slate-200 bg-slate-50"}`}><input type="checkbox" checked={rule.enabled} onChange={()=>toggleRule(rule.id)} className="h-5 w-5 shrink-0 accent-teal-600"/><button type="button" onClick={()=>toggleRule(rule.id)} className={`flex-1 text-left text-xs font-semibold leading-5 ${rule.enabled?"text-slate-800":"text-slate-400"}`}>{rule.label}</button>{rule.custom && <button type="button" onClick={()=>removeRule(rule.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Supprimer"><Trash2 size={15}/></button>}</div>)}</div><div className="mt-4 border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Ajouter une règle</p><div className="flex gap-2"><input value={newRule} onChange={(e)=>setNewRule(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter") addRule()}} placeholder="Saisir une contrainte supplémentaire" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"/><button type="button" onClick={addRule} disabled={!newRule.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-600 text-white disabled:bg-slate-200"><Plus size={18}/></button></div><p className="mt-2 text-[11px] leading-4 text-slate-400">Une règle ajoutée est enregistrée et cochée. Elle reste déclarative tant qu'aucune logique spécifique ne lui est associée.</p></div></div>
          </div>

          {generated && <div className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-4"><div className="rounded-2xl bg-teal-600 p-5 text-white"><p className="text-xs text-teal-100">Cycle proposé</p><p className="mt-1 text-3xl font-bold">{generated.weeks} sem.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">Effectif théorique IDE</p><p className="mt-1 text-3xl font-bold">{generated.roleData.IDE.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">Effectif théorique AS</p><p className="mt-1 text-3xl font-bold">{generated.roleData.AS.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">Cible / semaine</p><p className="mt-1 text-3xl font-bold">{generated.sessionsPerWorkerWeek} séances</p></div></div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div className="flex rounded-xl bg-slate-100 p-1">{["IDE","AS"].map(r=><button key={r} onClick={()=>setRoleView(r)} className={`rounded-lg px-4 py-2 text-sm font-bold ${roleView===r?"bg-white text-teal-700 shadow-sm":"text-slate-500"}`}>{r}</button>)}</div><div className="flex flex-wrap gap-1">{Array.from({length:generated.weeks},(_,i)=><button key={i} onClick={()=>setWeekView(i+1)} className={`rounded-lg px-3 py-2 text-xs font-bold ${weekView===i+1?"bg-slate-900 text-white":"bg-slate-100 text-slate-600"}`}>S{i+1}</button>)}</div></div>
              <div className="overflow-x-auto p-4"><table className="w-full min-w-[900px] border-separate border-spacing-1 text-xs"><thead><tr><th className="sticky left-0 bg-white p-2 text-left">Salarié</th>{DAYS.map(d=><th key={d} className="p-2 text-center text-slate-500">{d}</th>)}<th className="p-2">Heures</th></tr></thead><tbody>{generated.roleData[roleView].map(worker=>{const slots=worker.weeks[weekView-1]; const hours=slots.length*settings.shiftMinutes/60; return <tr key={worker.name}><td className="sticky left-0 rounded-lg bg-white p-2 font-bold shadow-sm">{worker.name}</td>{DAYS.map(day=>{const daySlots=slots.filter(x=>x.day===day).sort((a,b)=>a.shiftIndex-b.shiftIndex); return <td key={day} className={`h-14 rounded-lg p-1 text-center ${daySlots.length?"bg-teal-50 text-teal-900":"bg-slate-50 text-slate-300"}`}>{daySlots.length?daySlots.map(x=><div key={x.shift} className="font-semibold">{x.shift}</div>):"Repos"}</td>})}<td className="rounded-lg bg-slate-50 p-2 text-center font-bold">{hours.toFixed(2).replace(".",",")} h</td></tr>})}</tbody></table></div><div className="border-t border-slate-100 px-4 py-5"><div className="mb-3 flex items-center justify-between"><div><h4 className="text-sm font-bold text-slate-800">Contrôle des effectifs par jour et par séance</h4><p className="mt-1 text-xs text-slate-500">Totaux de la semaine affichée pour la catégorie {roleView}.</p></div><Badge tone="blue">Semaine {weekView}</Badge></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] border-separate border-spacing-1 text-xs"><thead><tr><th className="rounded-lg bg-slate-100 p-2 text-left text-slate-600">Séance</th>{DAYS.map((day)=><th key={day} className="rounded-lg bg-slate-100 p-2 text-center text-slate-600">{day}</th>)}<th className="rounded-lg bg-slate-900 p-2 text-center text-white">Total semaine</th></tr></thead><tbody>{SHIFTS.map((shift)=><tr key={shift}><td className="rounded-lg bg-white p-2 font-bold text-slate-700 ring-1 ring-slate-200">{shift}</td>{DAYS.map((day)=>{const total=generated.roleData[roleView].reduce((sum,worker)=>sum+worker.weeks[weekView-1].filter((slot)=>slot.day===day&&slot.shift===shift).length,0);return <td key={day} className={`rounded-lg p-2 text-center font-bold ${total>0?"bg-teal-50 text-teal-800":"bg-slate-50 text-slate-300"}`}>{total}</td>})}<td className="rounded-lg bg-slate-900 p-2 text-center font-bold text-white">{generated.roleData[roleView].reduce((sum,worker)=>sum+worker.weeks[weekView-1].filter((slot)=>slot.shift===shift).length,0)}</td></tr>)}</tbody><tfoot><tr><td className="rounded-lg bg-blue-50 p-2 font-bold text-blue-800">Total jour</td>{DAYS.map((day)=><td key={day} className="rounded-lg bg-blue-50 p-2 text-center font-bold text-blue-800">{generated.roleData[roleView].reduce((sum,worker)=>sum+worker.weeks[weekView-1].filter((slot)=>slot.day===day).length,0)}</td>)}<td className="rounded-lg bg-blue-700 p-2 text-center font-bold text-white">{generated.roleData[roleView].reduce((sum,worker)=>sum+worker.weeks[weekView-1].length,0)}</td></tr></tfoot></table></div></div><div className="border-t border-slate-100 p-4"><div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-teal-50 p-4 text-center"><p className="text-xs text-slate-500">Total IDE</p><p className="text-2xl font-bold text-teal-700">{generated.roleData.IDE.length}</p></div><div className="rounded-xl bg-blue-50 p-4 text-center"><p className="text-xs text-slate-500">Total AS</p><p className="text-2xl font-bold text-blue-700">{generated.roleData.AS.length}</p></div><div className="rounded-xl bg-slate-900 p-4 text-center text-white"><p className="text-xs text-slate-300">Effectif total mobilisé</p><p className="text-2xl font-bold">{generated.roleData.IDE.length + generated.roleData.AS.length}</p></div></div></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold">Contrôle du cycle {roleView}</h3><p className="text-sm text-slate-500">Comparaison des heures générées à la cible contractuelle.</p></div><Download size={19} className="text-slate-400"/></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{generated.controls[roleView].map(c=>{const ok=Math.abs(c.hours-c.target)<0.1; return <div key={c.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-bold">{c.name}</p><p className="text-xs text-slate-500">{c.sessions} séances</p></div><div className="text-right"><p className={`text-sm font-bold ${ok?"text-teal-700":"text-amber-700"}`}>{c.hours.toFixed(2).replace(".",",")} h</p><p className="text-[10px] text-slate-400">cible {c.target} h</p></div></div>})}</div><div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800"><AlertTriangle size={17} className="shrink-0"/><span>Cette trame constitue une aide à la planification. Les écarts éventuels signalent qu'un ajustement manuel, un renfort ou une évolution du nombre de semaines peut être nécessaire avant validation.</span></div></div>
          </div>}
        </section>}
      </main>
    </div>
  </div>;
}

export default App;
