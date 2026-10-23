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
      progress: load("progress", {}),          // { "<moduleId>": { "<cardIdx>": true } }
      settings: load("settings", {}),          // user-edited variables (az.*, gh.*, jira.*)
      shell: load("shell", "bash"),            // bash | ps
      usecase: load("usecase", "p2p-sentinel"),
      customUseCases: load("customUseCases", []),
      theme: load("theme", "auto"),
      view: load("view", "deck"),              // deck | scroll
    },

    addModule(m) { this.modules.push(m); },
    addUseCase(u) { this.usecases.push(u); },
    set(key, value) { this.data[key] = value; },

    persist(key) { save(key, this.state[key]); },

    allUseCases() {
      const custom = (this.state.customUseCases || []).map((u) => Object.assign({ custom: true }, u));
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
      Object.entries(uc.vars || {}).forEach(([k, val]) => { out["app." + k] = val; });
      return out;
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

    /* ---------- files ---------- */
    /* Save a generated file. Inside the claude.ai viewer this goes through the `downloads`
       capability (the viewer confirms); in a normal browser tab it is a plain download. */
    async saveFile(filename, data, toast) {
      const say = toast || (() => {});
      let downloads = null;
      try { if (window.claude && typeof window.claude.use === "function") downloads = await window.claude.use("downloads"); } catch (e) { downloads = null; }
      if (downloads) {
        try {
          const res = await downloads.save({ filename, data });
          if (res && res.status === "saved") say("Saved " + filename);
        } catch (err) {
          say(err && err.code === "declined" ? "Download cancelled" : "Couldn't save the file here (" + ((err && err.code) || "unavailable") + ")");
        }
        return;
      }
      const blob = data instanceof Blob ? data : new Blob([data], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      say("Downloaded " + filename);
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
