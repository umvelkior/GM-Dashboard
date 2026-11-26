window.Tracker = (() => {
    const STORAGE_KEY = "mj_tracker_state_v1";
    const CONDITIONS = [
      "À terre", "Assourdi", "Aveuglé", "Charmé", "Concentration",
      "Effrayé", "Empoisonné", "Entravé", "Étourdi", "Inconscient",
      "Invisible", "Neutralisé", "Paralysé"
    ];
  
    let state = {
      round: 1,
      activeId: null,
      combatants: []
    };
  
    function save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  
    function load() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          state = JSON.parse(raw);
        } catch (e) {
          console.error("Erreur de lecture localStorage Tracker", e);
        }
      }
    }
  
    function sortCombatants() {
      state.combatants.sort((a, b) => b.init - a.init);
      if (!state.activeId && state.combatants.length > 0) {
        state.activeId = state.combatants[0].id;
      }
    }
  
    function addCombatant({ name, init, maxHp, ac, type = "monster" }) {
      // Numérotation automatique si un monstre porte déjà ce nom
      let finalName = name.trim();
      if (type === "monster") {
        const sameCount = state.combatants.filter(c =>
          c.name === finalName || c.name.startsWith(finalName + " #")
        ).length;
        if (sameCount > 0) {
          finalName = `${finalName} #${sameCount + 1}`;
        }
      }
  
      const newEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: finalName,
        init: Number(init) || 0,
        hp: Number(maxHp) || 1,
        maxHp: Number(maxHp) || 1,
        ac: Number(ac) || 10,
        type,
        conditions: []
      };
  
      state.combatants.push(newEntry);
      sortCombatants();
      save();
      render();
    }
  
    function updateHp(id, delta) {
      const target = state.combatants.find(c => c.id === id);
      if (!target) return;
      target.hp = Math.max(0, Math.min(target.maxHp, target.hp + delta));
      save();
      render();
    }
  
    function addCondition(id, condition) {
      if (!condition) return;
      const target = state.combatants.find(c => c.id === id);
      if (target && !target.conditions.includes(condition)) {
        target.conditions.push(condition);
        save();
        render();
      }
    }
  
    function removeCondition(id, condition) {
      const target = state.combatants.find(c => c.id === id);
      if (!target) return;
      target.conditions = target.conditions.filter(c => c !== condition);
      save();
      render();
    }
  
    function removeCombatant(id) {
      const idx = state.combatants.findIndex(c => c.id === id);
      if (idx === -1) return;
  
      if (state.activeId === id) {
        const next = state.combatants[idx + 1] || state.combatants[0];
        state.activeId = next && next.id !== id ? next.id : null;
      }
  
      state.combatants.splice(idx, 1);
      save();
      render();
    }
  
    function nextTurn() {
      if (state.combatants.length === 0) return;
      const currentIdx = state.combatants.findIndex(c => c.id === state.activeId);
  
      if (currentIdx === -1 || currentIdx + 1 >= state.combatants.length) {
        state.activeId = state.combatants[0].id;
        if (currentIdx !== -1) state.round += 1;
      } else {
        state.activeId = state.combatants[currentIdx + 1].id;
      }
  
      save();
      render();
    }
  
    function resetCombat() {
      state = { round: 1, activeId: null, combatants: [] };
      save();
      render();
    }
  
    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[m]));
    }
  
    function render() {
      document.getElementById("round-counter").textContent = state.round;
      const listEl = document.getElementById("combatant-list");
      listEl.innerHTML = "";
  
      if (state.combatants.length === 0) {
        listEl.innerHTML = `<p class="placeholder-text">Aucun participant. Ajoute des PJ ci-dessus ou importe un monstre depuis le compendium.</p>`;
        return;
      }
  
      state.combatants.forEach(c => {
        const isActive = c.id === state.activeId;
        const isDead = c.hp <= 0;
  
        const card = document.createElement("div");
        card.className = `combatant-card ${c.type} ${isActive ? "active-turn" : ""} ${isDead ? "dead" : ""}`;
  
        const conditionOptions = CONDITIONS.map(cond => `<option value="${cond}">${cond}</option>`).join("");
        const conditionBadges = c.conditions.map(cond =>
          `<span class="condition-tag" data-id="${c.id}" data-cond="${escapeHtml(cond)}" title="Cliquer pour retirer">${escapeHtml(cond)} ×</span>`
        ).join("");
  
        card.innerHTML = `
          <div class="comb-top">
            <div class="comb-identity">
              <span class="init-badge">${c.init}</span>
              <strong>${escapeHtml(c.name)}</strong>
              <span class="ac-badge">CA ${c.ac}</span>
            </div>
            <div class="hp-controls">
              <button class="btn-sm" data-action="hp" data-id="${c.id}" data-delta="-1">-1</button>
              <input type="number" class="hp-delta-input" id="delta-${c.id}" placeholder="PV" min="1">
              <button class="btn-sm" data-action="custom-dmg" data-id="${c.id}" title="Infliger dégâts">Dég.</button>
              <button class="btn-sm" data-action="custom-heal" data-id="${c.id}" title="Soigner">Soin</button>
              <span class="hp-display">${c.hp} / ${c.maxHp}</span>
              <button class="btn-sm" data-action="hp" data-id="${c.id}" data-delta="1">+1</button>
            </div>
          </div>
          <div class="comb-bottom">
            <div class="conditions-list">${conditionBadges}</div>
            <div style="display:flex; gap:4px; align-items:center;">
              <select class="btn-sm" data-action="add-cond" data-id="${c.id}">
                <option value="">+ État</option>
                ${conditionOptions}
              </select>
              <button class="btn-sm btn-danger" data-action="delete" data-id="${c.id}" title="Retirer">✕</button>
            </div>
          </div>
        `;
  
        listEl.appendChild(card);
      });
    }
  
    function init() {
      load();
      render();
  
      document.getElementById("add-combatant-form").addEventListener("submit", e => {
        e.preventDefault();
        addCombatant({
          name: document.getElementById("comb-name").value,
          init: document.getElementById("comb-init").value,
          maxHp: document.getElementById("comb-hp").value,
          ac: document.getElementById("comb-ac").value,
          type: document.getElementById("comb-type").value
        });
        e.target.reset();
        document.getElementById("comb-ac").value = 10;
      });
  
      document.getElementById("btn-next-turn").addEventListener("click", nextTurn);
      document.getElementById("btn-reset-combat").addEventListener("click", () => {
        if (confirm("Vider toute la liste d'initiative ?")) resetCombat();
      });
  
      const listEl = document.getElementById("combatant-list");
      listEl.addEventListener("click", e => {
        const btn = e.target.closest("[data-action]");
        if (btn) {
          const { action, id, delta } = btn.dataset;
          if (action === "hp") updateHp(id, Number(delta));
          if (action === "delete") removeCombatant(id);
          if (action === "custom-dmg" || action === "custom-heal") {
            const input = document.getElementById(`delta-${id}`);
            const val = Math.abs(Number(input.value)) || 0;
            if (val > 0) {
              updateHp(id, action === "custom-dmg" ? -val : val);
            }
          }
          return;
        }
  
        const tag = e.target.closest(".condition-tag");
        if (tag) {
          removeCondition(tag.dataset.id, tag.dataset.cond);
        }
      });
  
      listEl.addEventListener("change", e => {
        if (e.target.dataset.action === "add-cond") {
          addCondition(e.target.dataset.id, e.target.value);
          e.target.value = "";
        }
      });
    }
  
    return { init, addCombatant };
  })();