window.Compendium = (() => {
    let currentTab = "monsters"; // "monsters" | "rules"
    let selectedKey = null;
    let monstersCache = [];
    let rulesCache = [];
  
    // Dictionnaire pour afficher proprement le nom de tes fichiers dans le filtre
    const CATEGORY_LABELS = {
      Weapon_Mastery_Properties: "Maîtrises d'armes",
      Conditions: "États",
      Ability_Scores : "Caractéristiques",
      Alignments: "Alignements",
      Backgrounds: "Historiques",
      Classes: "Classes",
      Weapon_Properties: "Propriété d'armes",
      Traits: "Caractéristiques",
      Subspecies : "Sous-espèces",
      Subclasses: "Sous-classes",
      Spells: "Sorts",
      Species: "Espèces",
      Skills: "Talents",
      Proficiencies: "Compétences",
      Poisons : "Poisons",
      Magic_Schools: "Ecoles de magies",
      Magic_Items: "Items magiques",
      Levels: "Niveaux",
      Languages: "Langages",
      Features : "capacités",
      Feats: "dons",
      Equipment_Categories: "Catégories d'équipements",
      Damage_Types: "Types de dégats"
    };
  
    function normalize(str) {
      return String(str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    }
  
    function getMod(score) {
      const mod = Math.floor((score - 10) / 2);
      return mod >= 0 ? `+${mod}` : `${mod}`;
    }
  
    function formatCategoryName(varName) {
      if (CATEGORY_LABELS[varName]) return CATEGORY_LABELS[varName];
      return varName
        .replace(/^5e_SRD_/i, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, l => l.toUpperCase());
    }
  
    // Scanne automatiquement toutes les variables globales chargées depuis data/
    function discoverDatasets() {
      monstersCache = [];
      rulesCache = [];
  
      Object.keys(window).forEach(key => {
        let val;
        try {
          val = window[key];
        } catch (e) {
          return; // Ignore les propriétés protégées du navigateur
        }
  
        if (!Array.isArray(val) || val.length === 0) return;
  
        const sample = val[0];
        if (!sample || typeof sample !== "object" || !("index" in sample) || !("name" in sample)) {
          return;
        }
  
        const categoryLabel = formatCategoryName(key);
  
        val.forEach(item => {
          const isMonster = item.hit_points !== undefined && item.armor_class !== undefined;
          const enriched = {
            ...item,
            _category: item.category || categoryLabel,
            _uid: `${key}::${item.index}`
          };
  
          if (isMonster) {
            monstersCache.push(enriched);
          } else {
            rulesCache.push(enriched);
          }
        });
      });
  
      monstersCache.sort((a, b) => a.name.localeCompare(b.name, "fr"));
      rulesCache.sort((a, b) => a.name.localeCompare(b.name, "fr"));
      populateCategoryFilter();
    }
  
    function populateCategoryFilter() {
      const selectEl = document.getElementById("compendium-category");
      const categories = [...new Set(rulesCache.map(item => item._category))].sort((a, b) =>
        a.localeCompare(b, "fr")
      );
  
      selectEl.innerHTML = `<option value="all">Toutes catégories (${rulesCache.length})</option>`;
      categories.forEach(cat => {
        const count = rulesCache.filter(i => i._category === cat).length;
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = `${cat} (${count})`;
        selectEl.appendChild(opt);
      });
    }
  
    function getFilteredItems() {
      const query = normalize(document.getElementById("compendium-search").value);
      const selectedCat = document.getElementById("compendium-category").value;
  
      const source = currentTab === "monsters" ? monstersCache : rulesCache;
  
      return source.filter(item => {
        const matchesName = normalize(item.name).includes(query);
        const matchesCat =
          currentTab === "monsters" || selectedCat === "all" || item._category === selectedCat;
        return matchesName && matchesCat;
      });
    }
  
    function renderList() {
      const listEl = document.getElementById("compendium-results");
      const items = getFilteredItems();
  
      listEl.innerHTML = "";
      if (items.length === 0) {
        listEl.innerHTML = `<li style="color:var(--text-muted); cursor:default;">Aucun résultat trouvé.</li>`;
        return;
      }
  
      items.forEach(item => {
        const li = document.createElement("li");
        if (item._uid === selectedKey) li.classList.add("selected");
  
        const subtitle =
          currentTab === "monsters"
            ? `FP ${item.challenge_rating ?? "?"}`
            : item._category;
  
        li.innerHTML = `<span>${item.name}</span><small style="color:var(--text-muted)">${subtitle}</small>`;
        li.addEventListener("click", () => {
          selectedKey = item._uid;
          renderList();
          renderDetail(item);
        });
        listEl.appendChild(li);
      });
    }
  
    function renderBlockList(title, entries) {
      if (!Array.isArray(entries) || entries.length === 0) return "";
      const html = entries
        .map(e => `<p style="margin-bottom:5px;"><strong>${e.name}.</strong> ${e.desc || e.description || ""}</p>`)
        .join("");
      return `<div class="detail-section"><h4>${title}</h4>${html}</div>`;
    }
  
    function renderDetail(item) {
      const detailEl = document.getElementById("compendium-detail");
  
      if (currentTab === "monsters") {
        const acValue = Array.isArray(item.armor_class)
          ? item.armor_class[0]?.value ?? 10
          : item.armor_class;
        const dexMod = Math.floor(((item.dexterity || 10) - 10) / 2);
  
        detailEl.innerHTML = `
          <div class="detail-header">
            <div>
              <h3>${item.name}</h3>
              <small>${item.size || ""} ${item.type || ""}, ${item.alignment || ""}</small>
            </div>
            <button id="btn-send-to-tracker" class="btn btn-primary">+ Combat</button>
          </div>
  
          <p><strong>CA :</strong> ${acValue} | <strong>PV :</strong> ${item.hit_points} (${item.hit_dice || "—"}) | <strong>FP :</strong> ${item.challenge_rating ?? "—"}</p>
  
          <div class="stat-grid">
            <div><strong>FOR</strong><br>${item.strength ?? 10} (${getMod(item.strength ?? 10)})</div>
            <div><strong>DEX</strong><br>${item.dexterity ?? 10} (${getMod(item.dexterity ?? 10)})</div>
            <div><strong>CON</strong><br>${item.constitution ?? 10} (${getMod(item.constitution ?? 10)})</div>
            <div><strong>INT</strong><br>${item.intelligence ?? 10} (${getMod(item.intelligence ?? 10)})</div>
            <div><strong>SAG</strong><br>${item.wisdom ?? 10} (${getMod(item.wisdom ?? 10)})</div>
            <div><strong>CHA</strong><br>${item.charisma ?? 10} (${getMod(item.charisma ?? 10)})</div>
          </div>
  
          ${renderBlockList("Capacités", item.special_abilities)}
          ${renderBlockList("Actions", item.actions)}
          ${renderBlockList("Réactions", item.reactions)}
          ${renderBlockList("Actions légendaires", item.legendary_actions)}
        `;
  
        document.getElementById("btn-send-to-tracker").addEventListener("click", () => {
          const rolledInit = Math.floor(Math.random() * 20) + 1 + dexMod;
          window.Tracker.addCombatant({
            name: item.name,
            init: rolledInit,
            maxHp: item.hit_points,
            ac: acValue,
            type: "monster"
          });
        });
      } else {
        const rawText = item.desc || item.description || "Aucune description disponible.";
        const paragraphs = Array.isArray(rawText)
          ? rawText.map(p => `<p style="margin-bottom:6px;">${p}</p>`).join("")
          : `<p>${rawText}</p>`;
  
        detailEl.innerHTML = `
          <div class="detail-header">
            <div>
              <h3>${item.name}</h3>
              <small>${item._category}</small>
            </div>
          </div>
          <div>${paragraphs}</div>
        `;
      }
    }
  
    function init() {
      discoverDatasets();
      renderList();
  
      document.getElementById("compendium-search").addEventListener("input", renderList);
      document.getElementById("compendium-category").addEventListener("change", renderList);
  
      document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          currentTab = btn.dataset.tab;
          selectedKey = null;
  
          const catSelect = document.getElementById("compendium-category");
          catSelect.classList.toggle("hidden", currentTab === "monsters");
  
          document.getElementById("compendium-detail").innerHTML =
            `<p class="placeholder-text">Sélectionne un élément dans la liste pour afficher sa fiche.</p>`;
          renderList();
        });
      });
    }
  
    return { init };
  })();