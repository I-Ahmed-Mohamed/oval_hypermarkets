
const state = {
  query: "",
  filter: "all",
  openCards: new Set(),
  favorites: new Set(JSON.parse(localStorage.getItem("ovalFavorites") || "[]")),
  recent: JSON.parse(localStorage.getItem("ovalRecent") || "[]"),
};

const $ = (selector) => document.querySelector(selector);
const grid = $("#companiesGrid");
const searchInput = $("#searchInput");
const toast = $("#toast");

const totalBranches = companiesData.reduce((sum, c) => sum + c.branches.length, 0);
$("#totalCompanies").textContent = companiesData.length;
$("#totalBranches").textContent = totalBranches;

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْ]/g, "")
    .trim();
}

function highlight(text) {
  const q = state.query.trim();
  if (!q) return text;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(safe, "gi"), match => `<mark>${match}</mark>`);
}

function branchKey(company, branch) {
  return `${company.name}__${branch.name}`;
}

function saveFavorites() {
  localStorage.setItem("ovalFavorites", JSON.stringify([...state.favorites]));
}

function saveRecent(item) {
  state.recent = [item, ...state.recent.filter(x => x.key !== item.key)].slice(0, 12);
  localStorage.setItem("ovalRecent", JSON.stringify(state.recent));
}

function getFilteredCompanies() {
  const q = normalize(state.query);

  return companiesData.map(company => {
    let branches = company.branches.filter(branch => {
      const matchesQuery = !q || normalize(`${company.name} ${branch.name}`).includes(q);
      const key = branchKey(company, branch);
      const matchesFilter =
        state.filter === "all" ||
        (state.filter === "favorites" && state.favorites.has(key)) ||
        (state.filter === "recent" && state.recent.some(item => item.key === key));
      return matchesQuery && matchesFilter;
    });

    const companyMatches = q && normalize(company.name).includes(q);
    if (companyMatches && state.filter === "all") {
      branches = company.branches;
    }

    return { ...company, branches };
  }).filter(company => company.branches.length > 0);
}

function render() {
  const data = getFilteredCompanies();
  const shownBranches = data.reduce((sum, c) => sum + c.branches.length, 0);
  $("#shownBranches").textContent = shownBranches;
  $("#emptyState").hidden = data.length > 0;
  updateHint(data, shownBranches);

  grid.innerHTML = data.map((company, index) => {
    const isOpen = state.query || state.openCards.has(company.name) || state.filter === "favorites" || state.filter === "recent";
    const initial = company.name.trim().slice(0, 1);
    const branches = company.branches.map(branch => {
      const key = branchKey(company, branch);
      const isFav = state.favorites.has(key);
      const linkClass = branch.link ? "map-link" : "map-link disabled";
      return `
        <div class="branch-item" data-key="${key}">
          <span class="branch-name" title="${branch.name}">${highlight(branch.name)}</span>
          <span class="branch-actions">
            <a class="${linkClass}" href="${branch.link || '#'}" target="_blank" rel="noopener" data-open-map="true" data-company="${company.name}" data-branch="${branch.name}" data-link="${branch.link || ''}" title="فتح اللوكيشن">⌖</a>
            <button class="fav-btn ${isFav ? 'active' : ''}" type="button" data-fav="${key}" title="إضافة للمفضلة">★</button>
          </span>
        </div>`;
    }).join("");

    return `
      <article class="company-card ${isOpen ? 'open' : ''}" style="animation-delay:${Math.min(index * 30, 300)}ms">
        <button class="company-head" type="button" data-company-toggle="${company.name}">
          <span class="company-title">
            <span class="company-icon">${initial}</span>
            <span><strong>${highlight(company.name)}</strong><small>${company.branches.length} فرع</small></span>
          </span>
          <span class="company-meta"><span class="count-pill">${company.branches.length}</span><span class="chev">⌄</span></span>
        </button>
        <div class="branch-list">${branches}</div>
      </article>`;
  }).join("");
}

function updateHint(data, shownBranches) {
  const hint = $("#smartHint");
  if (state.filter === "favorites") {
    hint.textContent = shownBranches ? `عندك ${shownBranches} فرع في المفضلة.` : "لسه مفيش فروع في المفضلة.";
    return;
  }
  if (state.filter === "recent") {
    hint.textContent = shownBranches ? "دي آخر الفروع اللي اتفتحت." : "افتح أي فرع وهيظهر هنا تلقائيًا.";
    return;
  }
  if (!state.query) {
    hint.textContent = `عندك ${companiesData.length} شركة و ${totalBranches} فرع جاهزين للبحث.`;
    return;
  }
  hint.textContent = data.length ? `تم العثور على ${shownBranches} نتيجة.` : "لا توجد نتيجة مطابقة.";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

searchInput.addEventListener("input", e => {
  state.query = e.target.value;
  render();
});

$("#clearSearch").addEventListener("click", () => {
  searchInput.value = "";
  state.query = "";
  render();
  searchInput.focus();
});

document.addEventListener("click", e => {
  const toggle = e.target.closest("[data-company-toggle]");
  if (toggle) {
    const name = toggle.dataset.companyToggle;
    state.openCards.has(name) ? state.openCards.delete(name) : state.openCards.add(name);
    render();
    return;
  }

  const fav = e.target.closest("[data-fav]");
  if (fav) {
    const key = fav.dataset.fav;
    state.favorites.has(key) ? state.favorites.delete(key) : state.favorites.add(key);
    saveFavorites();
    render();
    showToast(state.favorites.has(key) ? "تمت الإضافة للمفضلة" : "تم الحذف من المفضلة");
    return;
  }

  const map = e.target.closest("[data-open-map]");
  if (map && map.dataset.link) {
    saveRecent({ key: `${map.dataset.company}__${map.dataset.branch}`, company: map.dataset.company, branch: map.dataset.branch, link: map.dataset.link });
  }
});

document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    state.filter = chip.dataset.filter;
    render();
  });
});

const theme = localStorage.getItem("ovalTheme") || "dark";
document.documentElement.dataset.theme = theme;
$("#themeToggle").textContent = theme === "dark" ? "☾" : "☀";
$("#themeToggle").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("ovalTheme", next);
  $("#themeToggle").textContent = next === "dark" ? "☾" : "☀";
});

const backTop = $("#backTop");
window.addEventListener("scroll", () => backTop.classList.toggle("show", window.scrollY > 420));
backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

render();
