const state = {
  query: "",
  filter: "all",
  opened: new Set(),
  favorites: new Set(JSON.parse(localStorage.getItem("fav_locations") || "[]")),
  recent: JSON.parse(localStorage.getItem("recent_locations") || "[]")
};

const $ = (s) => document.querySelector(s);
const companiesEl = $("#companies");
const emptyEl = $("#empty");
const input = $("#searchInput");

function buildClientFilters(){
  const box = $("#quickFilters");
  const baseNames = new Set(["all","recent","favorites"]);
  LOCATIONS_DATA.forEach(c => {
    if(!c.type || baseNames.has(c.type)) return;
    if(box.querySelector(`[data-filter="${c.type}"]`)) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.filter = c.type;
    btn.textContent = c.client;
    box.insertBefore(btn, box.querySelector('[data-filter="recent"]'));
  });
}

function normalize(text){
  return String(text || "")
    .toLowerCase()
    .replace(/[أإآ]/g,"ا")
    .replace(/ة/g,"ه")
    .replace(/ى/g,"ي")
    .replace(/[ًٌٍَُِّْ]/g,"")
    .trim();
}

function keyOf(client, branch){
  return `${client}__${branch.code}__${branch.name}`;
}

function toast(msg){
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"), 1800);
}

function saveFavorites(){
  localStorage.setItem("fav_locations", JSON.stringify([...state.favorites]));
}

function saveRecent(item){
  state.recent = [item, ...state.recent.filter(x => x.key !== item.key)].slice(0, 15);
  localStorage.setItem("recent_locations", JSON.stringify(state.recent));
}

function highlight(text){
  if(!state.query) return text;
  const safe = state.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(text).replace(new RegExp(safe, "gi"), m => `<mark>${m}</mark>`);
}

function getFiltered(){
  const q = normalize(state.query);

  return LOCATIONS_DATA.map(company => {
    let branches = company.branches.filter(branch => {
      const key = keyOf(company.client, branch);
      const text = normalize([company.client, company.type, branch.code, branch.name, branch.area].join(" "));
      const matchesQuery = !q || text.includes(q);
      const matchesFilter =
        state.filter === "all" ||
        state.filter === company.type ||
        (state.filter === "favorites" && state.favorites.has(key)) ||
        (state.filter === "recent" && state.recent.some(x => x.key === key));

      return matchesQuery && matchesFilter;
    });

    const companyMatches = q && normalize(company.client).includes(q);
    if(companyMatches && (state.filter === "all" || state.filter === company.type)){
      branches = company.branches;
    }

    return { ...company, branches };
  }).filter(c => c.branches.length);
}

function render(){
  const data = getFiltered();
  const totalCompanies = LOCATIONS_DATA.length;
  const totalBranches = LOCATIONS_DATA.reduce((sum, c)=>sum + c.branches.length, 0);
  const resultBranches = data.reduce((sum, c)=>sum + c.branches.length, 0);

  $("#companyCount").textContent = totalCompanies;
  $("#branchCount").textContent = totalBranches;
  $("#resultCount").textContent = resultBranches;
  emptyEl.hidden = data.length > 0;

  companiesEl.innerHTML = data.map(company => {
    const isOpen = state.query || state.opened.has(company.client) || state.filter !== "all";
    const initial = company.client.slice(0,1);
    return `
      <article class="company-card ${isOpen ? "open" : ""}">
        <button class="company-head" type="button" data-toggle="${company.client}">
          <span class="company-title">
            <span class="company-icon">${initial}</span>
            <span>
              <strong>${highlight(company.client)}</strong>
              <small>${company.type === "amazon" ? "عميل أمازون" : "عميل"}</small>
            </span>
          </span>
          <span class="count">${company.branches.length} فرع ⌄</span>
        </button>

        <div class="branch-list">
          ${company.branches.map(branch => {
            const key = keyOf(company.client, branch);
            const fav = state.favorites.has(key);
            return `
              <div class="branch">
                <div class="branch-info">
                  <div class="branch-name">
                    <span>${highlight(branch.name)}</span>
                    <b class="branch-code">${highlight(branch.code)}</b>
                  </div>
                  <div class="branch-meta">
                    <span>${highlight(branch.area)}</span>
                    <span>${highlight(company.client)}</span>
                  </div>
                </div>
                <div class="branch-actions">
                  <a class="map-btn" href="${branch.map || "#"}" target="_blank" rel="noopener"
                    data-map="1"
                    data-key="${key}"
                    data-client="${company.client}"
                    data-name="${branch.name}"
                    data-code="${branch.code}"
                    data-area="${branch.area}"
                    data-url="${branch.map}">افتح اللوكيشن</a>
                  <button class="copy-btn" type="button"
                    data-copy="${branch.name} | ${branch.code} | ${branch.area} | ${branch.map}">⧉</button>
                  <button class="fav-btn ${fav ? "active" : ""}" type="button" data-fav="${key}">★</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </article>
    `;
  }).join("");
}

input.addEventListener("input", e => {
  state.query = e.target.value;
  render();
});

$("#clearBtn").addEventListener("click", () => {
  input.value = "";
  state.query = "";
  render();
  input.focus();
});

$("#quickFilters").addEventListener("click", e => {
  const btn = e.target.closest("button[data-filter]");
  if(!btn) return;
  document.querySelectorAll("#quickFilters button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  state.filter = btn.dataset.filter;
  render();
});

document.addEventListener("click", async e => {
  const toggle = e.target.closest("[data-toggle]");
  if(toggle){
    const client = toggle.dataset.toggle;
    state.opened.has(client) ? state.opened.delete(client) : state.opened.add(client);
    render();
    return;
  }

  const fav = e.target.closest("[data-fav]");
  if(fav){
    const key = fav.dataset.fav;
    state.favorites.has(key) ? state.favorites.delete(key) : state.favorites.add(key);
    saveFavorites();
    render();
    toast(state.favorites.has(key) ? "اتضاف للمفضلة" : "اتشال من المفضلة");
    return;
  }

  const copy = e.target.closest("[data-copy]");
  if(copy){
    await navigator.clipboard.writeText(copy.dataset.copy);
    toast("تم نسخ بيانات الفرع");
    return;
  }

  const map = e.target.closest("[data-map]");
  if(map){
    saveRecent({
      key: map.dataset.key,
      client: map.dataset.client,
      name: map.dataset.name,
      code: map.dataset.code,
      area: map.dataset.area,
      url: map.dataset.url
    });
  }
});

$("#copySummary").addEventListener("click", async () => {
  const data = getFiltered();
  const lines = [];
  data.forEach(c => c.branches.forEach(b => {
    lines.push(`${c.client} | ${b.name} | ${b.code} | ${b.area} | ${b.map}`);
  }));
  await navigator.clipboard.writeText(lines.join("\n"));
  toast("تم نسخ النتائج الظاهرة");
});

$("#openAllVisible").addEventListener("click", () => {
  const data = getFiltered();
  const first = data[0]?.branches[0];
  if(!first) return toast("مفيش نتيجة");
  window.open(first.map, "_blank", "noopener");
});

$("#resetData").addEventListener("click", () => {
  state.filter = "all";
  state.query = "";
  input.value = "";
  document.querySelectorAll("#quickFilters button").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
  render();
});

const savedTheme = localStorage.getItem("mandoub_theme") || "dark";
document.documentElement.dataset.theme = savedTheme;
$("#themeBtn").textContent = savedTheme === "light" ? "☀" : "☾";

$("#themeBtn").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("mandoub_theme", next);
  $("#themeBtn").textContent = next === "light" ? "☀" : "☾";
});

buildClientFilters();
render();

const imageModal = $("#imageModal");
const devImgBtn = $("#devImgBtn");
const closeModalBtn = $("#closeModalBtn");

if (devImgBtn && imageModal && closeModalBtn) {
  devImgBtn.addEventListener("click", () => imageModal.classList.add("show"));
  closeModalBtn.addEventListener("click", () => imageModal.classList.remove("show"));
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) imageModal.classList.remove("show");
  });
}
