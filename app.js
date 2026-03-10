/**
 * GitHub Analyzer — app.js
 * Fetches public GitHub data via the REST API and renders:
 *   • Analyze tab  – detailed stats for a single user
 *   • Compare tab  – side-by-side comparison of two users
 */

const GITHUB_API = "https://api.github.com";

/* ───────────────────────── Language colour map ───────────────────────── */
const LANG_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Scala: "#c22d40",
  R: "#198CE7",
  Lua: "#000080",
  Haskell: "#5e5086",
  Elixir: "#6e4a7e",
  Clojure: "#db5855",
  Vim: "#199f4b",
  Nix: "#7e7eff",
};

const DEFAULT_LANG_COLOR = "#8b949e";

/* ───────────────────────── Utility helpers ────────────────────────────── */

function fmtNumber(n) {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString();
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function sanitizeText(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function langColor(lang) {
  return LANG_COLORS[lang] || DEFAULT_LANG_COLOR;
}

/* ───────────────────────── GitHub API calls ───────────────────────────── */

async function fetchUser(username) {
  const res = await fetch(`${GITHUB_API}/users/${encodeURIComponent(username)}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error(`User "${username}" not found`);
    if (res.status === 403) throw new Error("API rate limit exceeded. Try again later.");
    throw new Error(`GitHub API error: ${res.status}`);
  }
  return res.json();
}

async function fetchRepos(username) {
  const perPage = 100;
  const url = `${GITHUB_API}/users/${encodeURIComponent(username)}/repos?per_page=${perPage}&sort=updated&type=owner`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

/* Aggregate language bytes across all repos */
function aggregateLanguages(repos) {
  const totals = {};
  for (const repo of repos) {
    if (repo.language) {
      totals[repo.language] = (totals[repo.language] || 0) + 1;
    }
  }
  return totals;
}

/* Build derived stats from user object + repos array */
function buildStats(user, repos) {
  const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const totalForks = repos.reduce((s, r) => s + (r.forks_count || 0), 0);
  const langCounts = aggregateLanguages(repos);

  const topRepos = [...repos]
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 6);

  // Sort languages by repo count descending
  const langsSorted = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const langTotal = langsSorted.reduce((s, [, c]) => s + c, 0) || 1;
  const langs = langsSorted.map(([name, count]) => ({
    name,
    count,
    pct: ((count / langTotal) * 100).toFixed(1),
    color: langColor(name),
  }));

  return {
    user,
    repos,
    totalStars,
    totalForks,
    langs,
    topRepos,
    publicRepos: user.public_repos || 0,
    followers: user.followers || 0,
    following: user.following || 0,
    gists: user.public_gists || 0,
  };
}

/* ───────────────────────── HTML builders ─────────────────────────────── */

function renderProfileCard(stats, compact = false) {
  const { user, langs, topRepos, totalStars, totalForks } = stats;

  const metaParts = [];
  if (user.company)
    metaParts.push(`<span><i class="fas fa-building"></i> ${sanitizeText(user.company)}</span>`);
  if (user.location)
    metaParts.push(`<span><i class="fas fa-map-marker-alt"></i> ${sanitizeText(user.location)}</span>`);
  if (user.blog)
    metaParts.push(
      `<span><i class="fas fa-link"></i> <a href="${sanitizeText(user.blog)}" target="_blank" rel="noopener noreferrer">${sanitizeText(user.blog)}</a></span>`
    );
  if (user.twitter_username)
    metaParts.push(
      `<span><i class="fab fa-twitter"></i> @${sanitizeText(user.twitter_username)}</span>`
    );
  metaParts.push(
    `<span><i class="fas fa-calendar-alt"></i> Joined ${fmtDate(user.created_at)}</span>`
  );

  const langBar = langs
    .map(
      (l) =>
        `<div class="lang-bar-segment" style="width:${l.pct}%;background:${l.color};" title="${sanitizeText(l.name)} ${l.pct}%"></div>`
    )
    .join("");

  const langLegend = langs
    .map(
      (l) =>
        `<div class="lang-item">
          <span class="lang-dot" style="background:${l.color};"></span>
          <span>${sanitizeText(l.name)}</span>
          <span class="lang-percent">${l.pct}%</span>
        </div>`
    )
    .join("");

  const repoCards = topRepos
    .map(
      (r) => `
      <a class="repo-item" href="${sanitizeText(r.html_url)}" target="_blank" rel="noopener noreferrer">
        <div class="repo-name">${sanitizeText(r.name)}</div>
        ${r.description ? `<div class="repo-desc">${sanitizeText(r.description)}</div>` : ""}
        <div class="repo-meta">
          ${
            r.language
              ? `<span><span class="repo-lang-dot" style="background:${langColor(r.language)};"></span>${sanitizeText(r.language)}</span>`
              : ""
          }
          <span><i class="fas fa-star"></i> ${fmtNumber(r.stargazers_count)}</span>
          <span><i class="fas fa-code-fork"></i> ${fmtNumber(r.forks_count)}</span>
        </div>
      </a>`
    )
    .join("");

  const profileUrl = `https://github.com/${encodeURIComponent(user.login)}`;

  return `
    <div class="profile-card">
      <div class="profile-header">
        <a href="${profileUrl}" target="_blank" rel="noopener noreferrer">
          <img class="profile-avatar" src="${sanitizeText(user.avatar_url)}" alt="${sanitizeText(user.login)} avatar" />
        </a>
        <div class="profile-info">
          <div class="profile-name">
            <a href="${profileUrl}" target="_blank" rel="noopener noreferrer">
              ${sanitizeText(user.name || user.login)}
            </a>
          </div>
          <div class="profile-login">@${sanitizeText(user.login)}</div>
          ${user.bio ? `<div class="profile-bio">${sanitizeText(user.bio)}</div>` : ""}
          <div class="profile-meta">${metaParts.join("")}</div>
        </div>
      </div>
      <div class="profile-body">
        <div>
          <div class="section-header"><i class="fas fa-chart-bar"></i> Overview</div>
          <div class="stats-row">
            <div class="stat-box">
              <div class="stat-value">${fmtNumber(stats.publicRepos)}</div>
              <div class="stat-label">Repos</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${fmtNumber(totalStars)}</div>
              <div class="stat-label">Stars</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${fmtNumber(totalForks)}</div>
              <div class="stat-label">Forks</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${fmtNumber(stats.followers)}</div>
              <div class="stat-label">Followers</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${fmtNumber(stats.following)}</div>
              <div class="stat-label">Following</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${fmtNumber(stats.gists)}</div>
              <div class="stat-label">Gists</div>
            </div>
          </div>
        </div>

        ${
          langs.length > 0
            ? `<div>
            <div class="section-header"><i class="fas fa-code"></i> Top Languages</div>
            <div class="lang-bar-wrap">${langBar}</div>
            <div class="lang-legend">${langLegend}</div>
          </div>`
            : ""
        }

        ${
          topRepos.length > 0
            ? `<div>
            <div class="section-header"><i class="fas fa-book-bookmark"></i> Top Repositories</div>
            <div class="repo-grid">${repoCards}</div>
          </div>`
            : ""
        }
      </div>
    </div>`;
}

/* Compare view: side-by-side stat table + mini profiles */
function renderCompare(statsA, statsB) {
  const fields = [
    { label: "Public Repos", key: "publicRepos" },
    { label: "Total Stars", key: "totalStars" },
    { label: "Total Forks", key: "totalForks" },
    { label: "Followers", key: "followers" },
    { label: "Following", key: "following" },
    { label: "Gists", key: "gists" },
  ];

  const rows = fields
    .map(({ label, key }) => {
      const va = statsA[key] ?? 0;
      const vb = statsB[key] ?? 0;
      const aClass = va > vb ? "winner" : va < vb ? "loser" : "";
      const bClass = vb > va ? "winner" : vb < va ? "loser" : "";
      return `
      <div class="compare-stat-row">
        <span class="compare-stat-val ${aClass}">${fmtNumber(va)}</span>
        <span class="compare-stat-label">${sanitizeText(label)}</span>
        <span class="compare-stat-val ${bClass}">${fmtNumber(vb)}</span>
      </div>`;
    })
    .join("");

  // Calculate overall winner (sum of field wins)
  let winsA = 0;
  let winsB = 0;
  for (const { key } of fields) {
    const va = statsA[key] ?? 0;
    const vb = statsB[key] ?? 0;
    if (va > vb) winsA++;
    else if (vb > va) winsB++;
  }

  const badgeA =
    winsA > winsB
      ? `<div class="compare-winner-badge"><i class="fas fa-trophy"></i> Overall Leader</div>`
      : "";
  const badgeB =
    winsB > winsA
      ? `<div class="compare-winner-badge"><i class="fas fa-trophy"></i> Overall Leader</div>`
      : "";

  function miniProfile(stats, badge) {
    const { user } = stats;
    const profileUrl = `https://github.com/${encodeURIComponent(user.login)}`;
    const metaParts = [];
    if (user.location)
      metaParts.push(
        `<span><i class="fas fa-map-marker-alt"></i> ${sanitizeText(user.location)}</span>`
      );
    metaParts.push(
      `<span><i class="fas fa-calendar-alt"></i> Joined ${fmtDate(user.created_at)}</span>`
    );

    return `
      <div class="compare-profile">
        <div class="profile-header">
          <a href="${profileUrl}" target="_blank" rel="noopener noreferrer">
            <img class="profile-avatar" src="${sanitizeText(user.avatar_url)}" alt="${sanitizeText(user.login)} avatar" style="width:72px;height:72px;" />
          </a>
          <div class="profile-info">
            <div class="profile-name">
              <a href="${profileUrl}" target="_blank" rel="noopener noreferrer">
                ${sanitizeText(user.name || user.login)}
              </a>
            </div>
            <div class="profile-login">@${sanitizeText(user.login)}</div>
            ${user.bio ? `<div class="profile-bio" style="font-size:0.82rem;">${sanitizeText(user.bio)}</div>` : ""}
            <div class="profile-meta">${metaParts.join("")}</div>
            ${badge}
          </div>
        </div>
        <div class="compare-stats">
          ${rows}
        </div>
      </div>`;
  }

  // For compare, show both mini profiles + shared stat table
  const profileUrl_a = `https://github.com/${encodeURIComponent(statsA.user.login)}`;
  const profileUrl_b = `https://github.com/${encodeURIComponent(statsB.user.login)}`;

  const header = `
    <div class="profile-card" style="margin-bottom:1.5rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.5rem 2rem;background:var(--surface-2);border-bottom:1px solid var(--border);flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:1rem;">
          <a href="${profileUrl_a}" target="_blank" rel="noopener noreferrer">
            <img class="profile-avatar" src="${sanitizeText(statsA.user.avatar_url)}" alt="${sanitizeText(statsA.user.login)}" style="width:52px;height:52px;" />
          </a>
          <div>
            <div class="profile-name" style="font-size:1.1rem;">
              <a href="${profileUrl_a}" target="_blank" rel="noopener noreferrer">${sanitizeText(statsA.user.name || statsA.user.login)}</a>
            </div>
            <div class="profile-login">@${sanitizeText(statsA.user.login)}</div>
            ${badgeA}
          </div>
        </div>
        <div class="vs-badge" style="font-size:1.1rem;">VS</div>
        <div style="display:flex;align-items:center;gap:1rem;">
          <div style="text-align:right;">
            <div class="profile-name" style="font-size:1.1rem;">
              <a href="${profileUrl_b}" target="_blank" rel="noopener noreferrer">${sanitizeText(statsB.user.name || statsB.user.login)}</a>
            </div>
            <div class="profile-login">@${sanitizeText(statsB.user.login)}</div>
            ${badgeB}
          </div>
          <a href="${profileUrl_b}" target="_blank" rel="noopener noreferrer">
            <img class="profile-avatar" src="${sanitizeText(statsB.user.avatar_url)}" alt="${sanitizeText(statsB.user.login)}" style="width:52px;height:52px;" />
          </a>
        </div>
      </div>
      <div style="padding:1.5rem 2rem;">
        <div class="section-header" style="margin-bottom:0.75rem;"><i class="fas fa-chart-bar"></i> Head-to-Head</div>
        <div style="max-width:640px;margin:0 auto;">
          <div class="compare-stat-row" style="font-size:0.78rem;color:var(--text-subtle);padding-bottom:0.4rem;">
            <span style="min-width:60px;text-align:center;font-weight:700;">${sanitizeText(statsA.user.login)}</span>
            <span style="flex:1;text-align:center;"></span>
            <span style="min-width:60px;text-align:center;font-weight:700;">${sanitizeText(statsB.user.login)}</span>
          </div>
          ${rows}
        </div>
      </div>
    </div>`;

  // Individual profile sections
  const profilesHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;">
      ${renderProfileCard(statsA)}
      ${renderProfileCard(statsB)}
    </div>`;

  return `
    ${header}
    <div class="section-header" style="margin-bottom:1rem;"><i class="fas fa-user"></i> Individual Profiles</div>
    ${profilesHtml}`;
}

/* ───────────────────────── Loading / Error helpers ───────────────────── */

function showLoading(container) {
  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-circle-notch"></i>
      Fetching data from GitHub…
    </div>`;
}

function showError(container, msg, detail = "") {
  container.innerHTML = `
    <div class="error-card">
      <i class="fas fa-exclamation-circle"></i>
      <div>
        <p>${sanitizeText(msg)}</p>
        ${detail ? `<p class="error-detail">${sanitizeText(detail)}</p>` : ""}
      </div>
    </div>`;
}

/* ───────────────────────── Tab switching ─────────────────────────────── */

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${tab}`).classList.add("active");
  });
});

/* ───────────────────────── Analyze ──────────────────────────────────── */

async function runAnalyze() {
  const input = document.getElementById("analyze-input");
  const username = input.value.trim();
  if (!username) {
    input.focus();
    return;
  }

  const result = document.getElementById("analyze-result");
  const btn = document.getElementById("analyze-btn");
  btn.disabled = true;
  showLoading(result);

  try {
    const [user, repos] = await Promise.all([fetchUser(username), fetchRepos(username)]);
    const stats = buildStats(user, repos);
    result.innerHTML = renderProfileCard(stats);
  } catch (err) {
    showError(result, err.message, "Check the username and try again.");
  } finally {
    btn.disabled = false;
  }
}

document.getElementById("analyze-btn").addEventListener("click", runAnalyze);
document.getElementById("analyze-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runAnalyze();
});

/* ───────────────────────── Compare ──────────────────────────────────── */

async function runCompare() {
  const inputA = document.getElementById("compare-input-1");
  const inputB = document.getElementById("compare-input-2");
  const usernameA = inputA.value.trim();
  const usernameB = inputB.value.trim();

  if (!usernameA) {
    inputA.focus();
    return;
  }
  if (!usernameB) {
    inputB.focus();
    return;
  }

  const result = document.getElementById("compare-result");
  const btn = document.getElementById("compare-btn");
  btn.disabled = true;
  showLoading(result);

  try {
    const [[userA, reposA], [userB, reposB]] = await Promise.all([
      Promise.all([fetchUser(usernameA), fetchRepos(usernameA)]),
      Promise.all([fetchUser(usernameB), fetchRepos(usernameB)]),
    ]);
    const statsA = buildStats(userA, reposA);
    const statsB = buildStats(userB, reposB);
    result.innerHTML = renderCompare(statsA, statsB);
  } catch (err) {
    showError(result, err.message, "Check both usernames and try again.");
  } finally {
    btn.disabled = false;
  }
}

document.getElementById("compare-btn").addEventListener("click", runCompare);
[document.getElementById("compare-input-1"), document.getElementById("compare-input-2")].forEach(
  (inp) => inp.addEventListener("keydown", (e) => { if (e.key === "Enter") runCompare(); })
);
