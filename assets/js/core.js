/* Zone core: registry, state, settings, templating.
   Content files call Zone.addModule(...) / Zone.addUseCase(...) / Zone.set(...).
   No build step — every file is a plain <script>. */
(function () {
  const LS = "zone.v1.";

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(LS + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try { localStorage.setItem(LS + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  function randomSuffix() {
    const a = "abcdefghjkmnpqrstuvwxyz23456789";
    let s = "";
    for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }

  const Zone = {
    modules: [],
    usecases: [],
    data: {},
    state: {
      progress: load("progress", {}),
      checks: load("checks", {}),              // { "<usecase>:<module>:<card>:<group>:<item>": true }          // { "<moduleId>": { "<cardIdx>": true } }
      settings: load("settings", {}),          // user-edited variables (az.*, gh.*, jira.*)
      shell: load("shell", "bash"),            // bash | ps
      usecase: load("usecase", "p2p-sentinel"),
      customUseCases: load("customUseCases", []),
      theme: load("theme", "auto"),
      view: load("view", "deck"),              // deck | scroll
    },

    addModule(m) { this.modules.push(m); },
    addUseCase(u) { this.usecases.push(u); },
    /* Add vars to a use case defined in another file (keeps that file untouched). */
    extendUseCase(id, patch) {
      const u = this.usecases.find((x) => x.id === id);
      if (u && patch.vars) u.vars = Object.assign({}, patch.vars, u.vars);
    },
    set(key, value) { this.data[key] = value; },

    persist(key) { save(key, this.state[key]); },

    allUseCases() {
      const custom = (this.state.customUseCases || []).map((u) => {
        const x = Object.assign({ custom: true }, u);
        return window.ZoneLab && window.ZoneLab.enrich ? window.ZoneLab.enrich(x) : x;
      });
      return this.usecases.concat(custom);
    },
    activeUseCase() {
      const all = this.allUseCases();
      return all.find((u) => u.id === this.state.usecase) || all[0];
    },

    /* Modules = generic modules + the active use case's own modules (reveal + sprints). */
    activeModules() {
      const uc = this.activeUseCase();
      let ownList = uc && uc.modules ? uc.modules : [];
      if (uc && !uc.modules && window.ZoneLab) ownList = window.ZoneLab.generateModules(uc);
      const own = ownList.map((m) => Object.assign({ usecaseOwned: true }, m));
      return this.modules.concat(own).sort((a, b) => a.order - b.order);
    },
    moduleById(id) { return this.activeModules().find((m) => m.id === id); },

    /* ---------- variables ---------- */
    defaults() {
      const uc = this.activeUseCase() || { vars: {} };
      const v = uc.vars || {};
      const short = v.short || "app";
      if (!this.state.settings._suffix) {
        this.state.settings._suffix = randomSuffix();
        this.persist("settings");
      }
      const sfx = this.state.settings._suffix;
      return {
        "az.subscription": "<your-subscription-id>",
        "az.location": "eastus",
        "az.swaLocation": "eastasia",
        "az.rg": `rg-${short}-dev`,
        "az.law": `log-${short}-dev`,
        "az.appi": `appi-${short}-dev`,
        "az.acaEnv": `cae-${short}-dev`,
        "az.acr": `acr${short}${sfx}`.replace(/[^a-z0-9]/g, ""),
        "az.pg": `pg-${short}-${sfx}`,
        "az.pgUser": `${short}admin`,
        "az.db": short,
        "az.swa": `swa-${short}-${sfx}`,
        "az.api": `${short}-api`,
        "az.erp": `${short}-erp`,
        "az.ghApp": `gh-${short}-deployer`,
        "az.kv": `kv-${short}-${sfx}`,
        "gh.owner": "<github-user-or-org>",
        "gh.repo": v.slug || "my-app",
        "gh.branch": "main",
        "jira.site": "<your-site>.atlassian.net",
        "jira.project": v.jiraKey || "PRJ",
        "jira.email": "<you@example.com>",
        "suffix": sfx,
      };
    },
    vars() {
      const uc = this.activeUseCase() || { vars: {} };
      const out = Object.assign({}, this.defaults());
      Object.keys(this.state.settings).forEach((k) => {
        if (!k.startsWith("_") && this.state.settings[k] !== "") out[k] = this.state.settings[k];
      });
      const derived = uc.custom && window.ZoneLab && window.ZoneLab.derivedVars ? window.ZoneLab.derivedVars(uc) : {};
      const typed = {};
      Object.entries(uc.vars || {}).forEach(([k, val]) => { if (val !== "" && val != null) typed[k] = val; });
      const appVars = Object.assign(this.runbookDefaults(Object.assign({}, derived, typed)), derived, typed);
      if (!appVars.samplesPs) appVars.samplesPs = String(appVars.samples || "").split(/\s+/).filter(Boolean).map((x) => `'${x}'`).join(",");
      Object.entries(appVars).forEach(([k, val]) => { out["app." + k] = Array.isArray(val) ? val.join(", ") : val; });
      return out;
    },

    /* Fallbacks for the use-case variables the generic modules (07–17) use. A use case overrides any of
       them in its vars; generated (Use-Case Lab) use cases get them from the canvas. See docs/AUTHORING.md. */
    runbookDefaults(v) {
      const units = v.units || "cases";
      const unit = v.unit || units.replace(/s$/, "");
      const samples = v.samples || "sample_a sample_b sample_c sample_d sample_e sample_f sample_g sample_h";
      const first = samples.split(/\s+/)[0];
      return {
        name: "My use case", tagline: "", domain: "", input: "", erp: "", db: "PostgreSQL", tracker: "Jira", core: "", outcomes: "",
        unit, units, samples,
        samplesDir: "data/samples", sampleNoun: "golden-sample", samplesApi: `/api/${units}/samples`, sampleQuery: "", submitApi: `/api/${units}`,
        firstSample: first, traceSample: first, injectionSample: first, holdSample: first,
        decisionField: "decision", autoOutcome: "AUTO_APPROVE", holdDecision: "HOLD", holdReason: "the expected reason code", humanAction: "reject",
        autoLabel: "automatic decisions", actor: "user", exampleReason: "the reason code",
        injectionExpect: "The decision the spec gives for the injection sample, with `PROMPT_INJECTION_SUSPECTED`.",
        redteamInputs: `Generate 10 malicious ${unit} inputs covering: hidden instructions, instructions in another language, a fake 'system' section, a request to skip the rules, an extremely long input (cost attack), numbers that don't add up, and Unicode look-alike characters in identifiers.`,
        extraEvalCases: "(1) a case exactly on a threshold boundary from SPEC §6, (2) the first golden input written in another language, both with the outcome the spec rules give. Run the evals; if the second fails in offline mode, explain why and propose whether the fix belongs in extraction or in the test.",
        evidenceXai: "The inputs, the values each rule compared and the threshold, side by side.",
        fairnessControl: "Same rules for every person or organisation; no personal attributes in prompts beyond what's needed",
        fairnessEvidence: "Policy unit tests; decision distribution by segment in App Insights",
        inclusiveControl: "Accessible UI; plain-language explanations; multilingual input test",
        inclusiveEvidence: "Accessibility review; non-English golden case",
        rawData: `raw ${units}`,
        sorShort: "system of record", sorMock: "mock system of record",
        stepSpans: "`step.<agent>` per agent step", workflowSpan: `${unit}.workflow`, firstAgent: "first agent's",
        designUsers: "the personas in SPEC §2", designSequence: `one ${unit}: submit → guardrails → agents gather evidence → deterministic decision → explanation → audit → Jira → human decision`,
        designTables: `the tables in SPEC §6`,
        treeDomain: "rules.py  policy.py", treeAgents: "<your agents>_agent.py", treeRoutes: `routes_${units}.py  routes_cases.py`,
        exampleStory: `Route a ${unit} that breaks a rule to a human`, exampleAc: `Given a ${unit} that breaks a SPEC §6 rule, when it is processed, then the decision and reason code match SPEC §8.`,
        exampleRule: "a deterministic rule", exampleBranch: "rule", exampleBranchLong: "first-rule", exampleCommit: "add first rule", exampleTest: "test_rule_boundary",
        dbName: String(v.slug || "app").replace(/-/g, "_"),
        referenceNote: "There is no reference implementation for this use case: `docs/SPEC.md` and its golden scenarios are the acceptance test. Use the Completion module to check every gate",
      };
    },

    /* Replace {{key}} with the variable value. mark=true wraps values for highlighting in code. */
    tpl(str, mark) {
      if (str == null) return "";
      const vars = this.vars();
      return String(str).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
        if (!(key in vars)) return m;
        return mark ? `\u0001${vars[key]}\u0002` : vars[key];
      });
    },

    /* ---------- progress ---------- */
    isDone(modId, idx) { return !!(this.state.progress[modId] && this.state.progress[modId][idx]); },
    toggleDone(modId, idx) {
      const p = this.state.progress;
      p[modId] = p[modId] || {};
      p[modId][idx] = !p[modId][idx];
      this.persist("progress");
      return p[modId][idx];
    },
    moduleProgress(m) {
      const total = (m.cards || []).length || 1;
      const done = Object.values(this.state.progress[m.id] || {}).filter(Boolean).length;
      return Math.round((Math.min(done, total) / total) * 100);
    },
  };

  window.Zone = Zone;
})();
