const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  content: null,
  activeTab: "home",
  workFilter: "All",
  projectFilter: "All",
  workSearch: "",
  projectSearch: "",
  modalOpen: false,
  modalItem: null
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[s]));
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function deriveFilters(items) {
  const cats = uniq(items.map(i => i.category).filter(Boolean));
  return ["All", ...cats];
}

function setDocumentTitle() {
  if (!state.content?.site?.title) return;
  document.title = state.content.site.title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta && state.content.site.description) meta.setAttribute("content", state.content.site.description);
}

function applySiteText() {
  const c = state.content;
  if (!c) return;

  $("#brandName").textContent = c.site.name;
  $("#brandTagline").textContent = c.site.tagline;

  $("#heroEyebrow").textContent = c.hero.eyebrow;
  $("#heroTitle").childNodes[0].textContent = c.hero.headline + " ";
  $("#heroSubtitle").textContent = c.hero.subheadline;
  $("#heroBlurb").textContent = c.hero.blurb;

  // metrics
  const metrics = $("#heroMetrics");
  metrics.innerHTML = "";
  c.hero.metrics.forEach(m => {
    const el = document.createElement("div");
    el.className = "metric";
    el.innerHTML = `<div class="k">${escapeHtml(m.k)}</div><div class="v">${escapeHtml(m.v)}</div>`;
    metrics.appendChild(el);
  });

  // profile
  $("#avatarInitials").textContent = c.profile.initials;
  $("#profileName").textContent = c.site.name;
  $("#profileRole").textContent = c.profile.role;
  $("#profileNote").textContent = c.profile.note;

  const email = c.profile.email;
  $("#emailLink").setAttribute("href", `mailto:${email}`);
  $("#resumeLink").setAttribute("href", c.profile.resumeUrl || "#");
  $("#calendarLink").setAttribute("href", c.profile.calendarUrl || "#");
  $("#contactEmailBtn").setAttribute("href", `mailto:${email}`);

  // status + chips
  $("#statusText").textContent = c.site.status || "Available";
  const chipRow = $("#chipRow");
  chipRow.innerHTML = "";
  (c.hero.chips || []).forEach(ch => {
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = ch;
    chipRow.appendChild(span);
  });

  // about
  $("#aboutSubtitle").textContent = c.about.subtitle;
  $("#aboutBio").textContent = c.about.bio;

  const principles = $("#aboutPrinciples");
  principles.innerHTML = "";
  c.about.principles.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p;
    principles.appendChild(li);
  });

  const caps = $("#aboutCapabilities");
  caps.innerHTML = "";
  c.about.capabilities.forEach(p => {
    const span = document.createElement("span");
    span.className = "pill";
    span.textContent = p;
    caps.appendChild(span);
  });

  const tools = $("#aboutToolbox");
  tools.innerHTML = "";
  c.about.toolbox.forEach(p => {
    const span = document.createElement("span");
    span.className = "pill";
    span.textContent = p;
    tools.appendChild(span);
  });

  // work + projects subtitles
  $("#workSubtitle").textContent = c.work.subtitle;
  $("#projectsSubtitle").textContent = c.projects.subtitle;

  // links
  $("#linksSubtitle").textContent = c.links.subtitle;
  $("#contactBlurb").textContent = c.links.contactBlurb;
  $("#nowText").textContent = c.links.nowText;
  $("#availabilityStatus").textContent = c.site.status;
  $("#availabilityLocation").textContent = c.site.location;
  $("#availabilityTimezone").textContent = c.site.timezone;

  // socials
  const socials = $("#socials");
  socials.innerHTML = "";
  c.links.socials.forEach(s => {
    const a = document.createElement("a");
    a.className = "social";
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.innerHTML = `<div>${escapeHtml(s.label)}</div><span>${escapeHtml(s.handle || "")}</span>`;
    socials.appendChild(a);
  });

  // footer
  $("#footerName").textContent = c.site.name;
}

function renderFilters(rootEl, filters, active, onClick) {
  rootEl.innerHTML = "";
  filters.forEach(f => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "filter" + (f === active ? " is-active" : "");
    b.textContent = f;
    b.addEventListener("click", () => onClick(f));
    rootEl.appendChild(b);
  });
}

function matchesSearch(item, q) {
  if (!q) return true;
  const hay = [
    item.title, item.category, item.desc, item.year,
    ...(item.tags || [])
  ].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderGrid(rootEl, items) {
  rootEl.innerHTML = "";
  items.forEach(item => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item";
    btn.setAttribute("data-id", item.id);

    const tags = (item.tags || []).slice(0, 3).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("");
    btn.innerHTML = `
      <div class="item-top">
        <h3 class="item-title">${escapeHtml(item.title)}</h3>
        <span class="badge">${escapeHtml(item.badge || item.category || "Item")}</span>
      </div>
      <p class="item-desc">${escapeHtml(item.desc || "")}</p>
      <div class="item-meta">
        <div>${escapeHtml(item.category || "")}</div>
        <div>${escapeHtml(item.year || "")}</div>
      </div>
      <div class="item-tags">${tags}</div>
    `;

    btn.addEventListener("click", () => openModal(item));
    rootEl.appendChild(btn);
  });

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = `<p class="card-text">No results. Try a different filter or search.</p>`;
    rootEl.appendChild(empty);
  }
}

function buildWorkView() {
  const items = state.content.work.items;
  const filters = deriveFilters(items);
  renderFilters($("#workFilters"), filters, state.workFilter, (f) => {
    state.workFilter = f;
    updateWorkView();
  });

  $("#workSearch").addEventListener("input", (e) => {
    state.workSearch = e.target.value || "";
    updateWorkView();
  });

  updateWorkView();
}

function buildProjectView() {
  const items = state.content.projects.items;
  const filters = deriveFilters(items);
  renderFilters($("#projectFilters"), filters, state.projectFilter, (f) => {
    state.projectFilter = f;
    updateProjectView();
  });

  $("#projectSearch").addEventListener("input", (e) => {
    state.projectSearch = e.target.value || "";
    updateProjectView();
  });

  updateProjectView();
}

function updateWorkView() {
  const items = state.content.work.items;
  const filtered = items
    .filter(i => state.workFilter === "All" ? true : i.category === state.workFilter)
    .filter(i => matchesSearch(i, state.workSearch));
  renderGrid($("#workGrid"), filtered);
}

function updateProjectView() {
  const items = state.content.projects.items;
  const filtered = items
    .filter(i => state.projectFilter === "All" ? true : i.category === state.projectFilter)
    .filter(i => matchesSearch(i, state.projectSearch));
  renderGrid($("#projectsGrid"), filtered);
}

function setActiveTab(tab) {
  state.activeTab = tab;

  $$(".tab").forEach(t => {
    const on = t.dataset.tab === tab;
    t.classList.toggle("is-active", on);
    t.setAttribute("aria-selected", on ? "true" : "false");
  });

  $$(".panel").forEach(p => p.classList.toggle("is-active", p.dataset.panel === tab));

  // close mobile menu
  $("#navLinks").classList.remove("is-open");
  $("#navToggle").setAttribute("aria-expanded", "false");

  // update hash
  history.replaceState(null, "", `#${tab}`);
}

function initTabs() {
  $$(".tab").forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  // hero jump buttons
  $$("[data-jump]").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      setActiveTab(a.dataset.jump);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // initial tab from hash
  const hash = (location.hash || "").replace("#", "").trim();
  if (hash) {
    const exists = $(`.tab[data-tab="${hash}"]`);
    if (exists) setActiveTab(hash);
  }
}

function initMobileNav() {
  const toggle = $("#navToggle");
  const links = $("#navLinks");

  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // click outside closes menu
  document.addEventListener("click", (e) => {
    const isClickInside = links.contains(e.target) || toggle.contains(e.target);
    if (!isClickInside) {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function openModal(item) {
  state.modalOpen = true;
  state.modalItem = item;

  $("#modalTitle").textContent = item.title || "Details";
  $("#modalMeta").textContent = `${item.category || "Category"} • ${item.year || ""}`;
  $("#modalDesc").textContent = item.desc || "";

  const tags = $("#modalTags");
  tags.innerHTML = "";
  (item.tags || []).forEach(t => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = t;
    tags.appendChild(span);
  });

  const links = $("#modalLinks");
  links.innerHTML = "";
  (item.links || []).forEach(l => {
    const a = document.createElement("a");
    a.className = "btn btn-ghost";
    a.href = l.url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = l.label;
    links.appendChild(a);
  });

  const bullets = $("#modalBullets");
  bullets.innerHTML = "";
  (item.bullets || []).forEach(b => {
    const li = document.createElement("li");
    li.textContent = b;
    bullets.appendChild(li);
  });

  $("#modalNotes").textContent = item.notes || "";

  const modal = $("#modal");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");

  // focus close button
  $("#modalClose").focus();
  document.body.style.overflow = "hidden";
}

function closeModal() {
  state.modalOpen = false;
  state.modalItem = null;
  const modal = $("#modal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function initModal() {
  $("#modalClose").addEventListener("click", closeModal);
  $("#modalBackdrop").addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.modalOpen) closeModal();
  });
}

async function loadContent() {
  const res = await fetch("./content.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load content.json");
  return res.json();
}

function initCopyEmail() {
  $("#copyEmailBtn").addEventListener("click", async () => {
    const email = state.content?.profile?.email || "";
    try {
      await navigator.clipboard.writeText(email);
      $("#copyHint").textContent = "Copied email to clipboard.";
      setTimeout(() => { $("#copyHint").textContent = ""; }, 1800);
    } catch {
      $("#copyHint").textContent = "Could not copy. You can manually copy: " + email;
    }
  });
}

(async function main() {
  try {
    state.content = await loadContent();
    setDocumentTitle();
    applySiteText();

    initTabs();
    initMobileNav();
    initModal();
    initCopyEmail();

    buildWorkView();
    buildProjectView();

    // back to top
    $("#backToTop").addEventListener("click", (e) => {
      e.preventDefault();
      setActiveTab("home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  } catch (err) {
    console.error(err);
    document.body.innerHTML = `
      <div style="padding:24px;font-family:Inter,system-ui;color:white;">
        <h1>Setup error</h1>
        <p>Could not load <code>content.json</code>. If you opened index.html directly, some browsers block fetch.</p>
        <p><strong>Fix:</strong> run a tiny local server (I can give you the exact steps for Windows/Mac).</p>
      </div>
    `;
  }
})();