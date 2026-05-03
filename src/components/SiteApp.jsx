import { useEffect, useMemo, useRef, useState } from "react";

const pages = {
  home: "/",
  about: "/about/",
  documents: "/documents/",
  contacts: "/contacts/",
};

function pageFromPath(pathname) {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/about") return "about";
  if (clean === "/documents") return "documents";
  if (clean === "/contacts") return "contacts";
  return "home";
}

function documentUrl(groupId) {
  return `/documents/#${encodeURIComponent(groupId)}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function shortSum(sum) {
  return String(sum || "").slice(0, 8);
}

function fileRoleLabel(file) {
  const labels = {
    main: "Основний документ",
    signature: "Підпис основного документа",
    xml: "XML-звіт",
    "xml-signature": "Підпис XML-звіту",
  };
  return labels[file.role] || "Файл";
}

function fileDisplayLabel(file) {
  if (file.label && file.label === file.filename) return fileRoleLabel(file);
  if (file.label && file.label !== "Завантажити файл" && file.label !== "Скачать файл") return file.label;
  return fileRoleLabel(file);
}

function signedTargetLabel(file, files) {
  if (!file.signsFileId) return "";
  const target = files.find((candidate) => candidate.id === file.signsFileId);
  if (!target) return "";
  return `Підписує: ${target.filename}`;
}

function yearsSince(since) {
  const n = new Date().getFullYear() - since;
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "років";
  if (mod10 === 1 && mod100 !== 11) word = "рік";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "роки";
  return `${n} ${word}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function companyDisplayName(company) {
  return company.displayName || "ПрАТ «Автотрейдінг Інвест»";
}

function normalizeManifest(manifest) {
  return manifest.map((group) => ({
    ...group,
    date: group.publishedAt || group.date,
    files: group.files || [],
  }));
}

function fillText(text, vars = {}) {
  return String(text || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => vars[key] ?? "");
}

function updateDocumentMetadata(pageId, pageContent) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const seo = pageContent?.[pageId]?.seo;
  const title = seo?.title;
  const description = seo?.description;
  const url = `${window.location.origin}${window.location.pathname}`;

  if (title) {
    document.title = title;
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  }

  if (description) {
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  }

  document.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", url);
}

function TextLines({ lines, emphasisLine = -1 }) {
  const safeLines = Array.isArray(lines) ? lines : String(lines || "").split("\n");
  return safeLines.map((line, index) => (
    <span key={`${line}-${index}`}>
      {index > 0 && <br />}
      {index === emphasisLine ? <em>{line}</em> : line}
    </span>
  ));
}

function InlineLines({ lines }) {
  const safeLines = Array.isArray(lines) ? lines : String(lines || "").split("\n");
  return safeLines.map((line, index) => (
    <span key={`${line}-${index}`}>
      {index > 0 && <br />}
      {line}
    </span>
  ));
}

function FormatBadge({ fmt }) {
  const value = String(fmt || "FILE").toUpperCase();
  return <span className={`fmt fmt--${value.toLowerCase()}`}>{value}</span>;
}

function BrandMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="2" width="28" height="28" />
        <line x1="16" y1="2" x2="16" y2="30" />
        <line x1="2" y1="16" x2="30" y2="16" />
      </g>
    </svg>
  );
}

function Crosshair({ style }) {
  return <span className="crosshair" style={style} />;
}

function ArchViz() {
  const cells = useMemo(() => {
    const grid = [];
    for (let row = 0; row < 12; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        const index = row * 8 + column;
        const seed = (row * 37 + column * 13 + 7) % 100;
        const lit = row > 1 && row < 10 && (seed < 32 || (row === 5 && column < 4) || (row === 7 && column > 3));
        grid.push({ index, lit });
      }
    }
    return grid;
  }, []);

  return (
    <div className="archviz">
      <div className="archviz__grid" />
      <div className="archviz__horizon" />
      <div className="archviz__facade">
        {cells.map((cell) => <div key={cell.index} className={cell.lit ? "lit" : ""} />)}
      </div>
      <div className="archviz__corner" style={{ top: 24, left: 32 }}>50.45748° N</div>
      <div className="archviz__corner" style={{ top: 24, right: 32 }}>30.40770° E</div>
      <div className="archviz__corner" style={{ bottom: 24, left: 32 }}>fig. 01 — фасад</div>
      <div className="archviz__corner" style={{ bottom: 24, right: 32 }}>київ / kyiv</div>
      <Crosshair style={{ top: 80, left: 80 }} />
      <Crosshair style={{ top: 80, right: 80 }} />
      <Crosshair style={{ bottom: 80, left: 80 }} />
      <Crosshair style={{ bottom: 80, right: 80 }} />
    </div>
  );
}

function Header({ page, go, company, navigation }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navigation?.items || [
    { id: "home", label: "Головна" },
    { id: "about", label: "Про компанію" },
    { id: "documents", label: "Документи ПрАТ" },
    { id: "contacts", label: "Контакти" },
  ];

  function handleGo(id, event) {
    setMobileOpen(false);
    go(id, event);
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="brand" href="/" onClick={(event) => handleGo("home", event)}>
          <BrandMark />
          <div>
            <div className="brand__text">{navigation?.brandLabel || "Автотрейдінг Інвест"}</div>
          </div>
        </a>
        <nav className={`nav ${mobileOpen ? "nav--mobile-open" : ""}`}>
          {items.map(({ id, label }) => (
            <a
              key={id}
              href={pages[id]}
              className={`nav__item ${page === id ? "nav__item--active" : ""}`}
              onClick={(event) => handleGo(id, event)}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="header-meta">
          <a className="header-meta__phone" href={company.phoneHref}>{company.phone}</a>
        </div>
        <button className="menu-btn" onClick={() => setMobileOpen((open) => !open)} aria-label="Меню" aria-expanded={mobileOpen}>
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}

function Footer({ go, company, navigation }) {
  const displayName = companyDisplayName(company);
  const footer = navigation?.footer || {};
  const navItems = navigation?.items || [
    { id: "home", label: "Головна" },
    { id: "about", label: "Про компанію" },
    { id: "documents", label: "Документи ПрАТ" },
    { id: "contacts", label: "Контакти" },
  ];
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div>
            <div className="site-footer__brand"><InlineLines lines={footer.brandLines || ["Автотрейдінг", "Інвест"]} /></div>
            <div className="site-footer__tag">{footer.tagline || "ДЕВЕЛОПМЕНТ · ОРЕНДА · ЕКСПЛУАТАЦІЯ"}</div>
          </div>
          <div className="site-footer__col">
            <h4>{footer.siteHeading || "Сайт"}</h4>
            {navItems.map(({ id, label }) => (
              <a key={id} href={pages[id]} onClick={(event) => go(id, event)}>{label}</a>
            ))}
          </div>
          <div className="site-footer__col">
            <h4>{footer.contactsHeading || "Контакти"}</h4>
            <a href={company.phoneHref}>{company.phone}</a>
            <a href={company.emailHref}>{company.email}</a>
            <p style={{ opacity: 0.7 }}><InlineLines lines={footer.addressLines || ["пр. Берестейський, 67", "Київ, 03062"]} /></p>
          </div>
          <div className="site-footer__col">
            <h4>{footer.groupHeading || "Група компаній"}</h4>
            <a href={company.groupUrl} target="_blank" rel="noopener">{footer.groupLabel || "Atoll Holding ↗"}</a>
          </div>
        </div>
        <div className="site-footer__bottom">
          <div>© 2000–2026 {displayName}</div>
          <div>{footer.locationLabel || "Київ · Україна"}</div>
        </div>
      </div>
    </footer>
  );
}

function useToast() {
  const [msg, setMsg] = useState(null);
  const timerRef = useRef(null);
  const show = (text) => {
    setMsg(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMsg(null), 1800);
  };
  const node = msg ? <div className="toast toast--show">{msg}</div> : null;
  return { show, node };
}

function ExpVisual({ idx }) {
  const visuals = [
    <svg viewBox="0 0 200 150" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <pattern id={`grid-${idx}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(26,29,32,0.06)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="200" height="150" fill={`url(#grid-${idx})`} />
      <rect x="20" y="80" width="160" height="50" fill="none" stroke="#1a1d20" strokeWidth="1" />
      <line x1="20" y1="100" x2="180" y2="100" stroke="#1a1d20" strokeWidth="0.5" />
      <rect x="30" y="105" width="20" height="20" fill="#c89849" opacity="0.6" />
      <rect x="60" y="105" width="20" height="20" fill="#1a1d20" opacity="0.1" />
      <rect x="90" y="105" width="20" height="20" fill="#1a1d20" opacity="0.1" />
      <rect x="120" y="105" width="20" height="20" fill="#1a1d20" opacity="0.1" />
      <rect x="150" y="105" width="20" height="20" fill="#1a1d20" opacity="0.1" />
      <line x1="0" y1="130" x2="200" y2="130" stroke="#1a1d20" strokeWidth="0.5" />
    </svg>,
    <svg viewBox="0 0 200 150" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <pattern id={`grid-${idx}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(26,29,32,0.06)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="200" height="150" fill={`url(#grid-${idx})`} />
      <rect x="70" y="20" width="60" height="110" fill="none" stroke="#1a1d20" strokeWidth="1" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((row) => [0, 1, 2].map((column) => (
        <rect
          key={`${row}-${column}`}
          x={75 + column * 18}
          y={25 + row * 12}
          width="14"
          height="8"
          fill={(row === 3 && column === 1) || (row === 6 && column === 0) ? "#c89849" : "#1a1d20"}
          opacity={(row === 3 && column === 1) || (row === 6 && column === 0) ? "0.7" : "0.12"}
        />
      )))}
      <line x1="0" y1="130" x2="200" y2="130" stroke="#1a1d20" strokeWidth="0.5" />
    </svg>,
    <svg viewBox="0 0 200 150" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <pattern id={`grid-${idx}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(26,29,32,0.06)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="200" height="150" fill={`url(#grid-${idx})`} />
      <path d="M 20 100 L 40 70 L 60 100 L 80 70 L 100 100 L 120 70 L 140 100 L 160 70 L 180 100 L 180 130 L 20 130 Z" fill="none" stroke="#1a1d20" strokeWidth="1" />
      <line x1="20" y1="100" x2="180" y2="100" stroke="#1a1d20" strokeWidth="0.5" />
      <rect x="60" y="110" width="14" height="20" fill="#c89849" opacity="0.5" />
      <rect x="100" y="110" width="14" height="20" fill="#1a1d20" opacity="0.1" />
      <rect x="140" y="110" width="14" height="20" fill="#1a1d20" opacity="0.1" />
      <line x1="0" y1="130" x2="200" y2="130" stroke="#1a1d20" strokeWidth="0.5" />
    </svg>,
    <svg viewBox="0 0 200 150" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <pattern id={`grid-${idx}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(26,29,32,0.06)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="200" height="150" fill={`url(#grid-${idx})`} />
      <path d="M 60 130 L 100 50 L 140 130 Z" fill="none" stroke="#1a1d20" strokeWidth="1" />
      <line x1="100" y1="50" x2="100" y2="130" stroke="#c89849" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="80" y1="90" x2="120" y2="90" stroke="#1a1d20" strokeWidth="0.5" opacity="0.4" />
      <line x1="70" y1="110" x2="130" y2="110" stroke="#1a1d20" strokeWidth="0.5" opacity="0.4" />
      <line x1="0" y1="130" x2="200" y2="130" stroke="#1a1d20" strokeWidth="0.5" />
    </svg>,
  ];
  return <div className="exp__visual">{visuals[idx]}</div>;
}

function HomePage({ go, manifest, company, content }) {
  const recent = manifest.slice(0, 5);
  const years = manifest.map((group) => group.year).filter(Boolean);
  const yearMin = years.length ? Math.min(...years) : 2011;
  const yearMax = years.length ? Math.max(...years) : new Date().getFullYear();
  const displayName = companyDisplayName(company);
  const vars = {
    displayName,
    yearsSinceFounded: yearsSince(company.foundedYear || 2000),
  };
  const hero = content?.hero || {};
  const about = content?.about || {};
  const directions = content?.directions || {};
  const experience = content?.experience || {};
  const documents = content?.documents || {};
  const location = content?.location || {};

  return (
    <main className="page">
      <section className="section--hero">
        <div className="hero">
          <div className="hero__visual"><ArchViz /></div>
          <div className="hero__overlay" />
          <div className="hero__content">
            <div className="hero__eyebrow">{hero.eyebrow || "№ 01 — з 2000 року"}</div>
            <h1 className="hero__title"><TextLines lines={hero.titleLines || ["Девелопмент", "і експлуатація", "нерухомості"]} emphasisLine={hero.emphasisLine ?? 2} /></h1>
            <p className="hero__sub">
              {fillText(hero.lead || "{displayName} — управління, технічне обслуговування, оренда та експлуатація власної нерухомості в Києві з досвідом реалізації комерційних, адміністративних і промислових об'єктів.", vars)}
            </p>
            <div className="hero__actions">
              <a className="btn" href="/about/" onClick={(event) => go("about", event)}>{hero.primaryAction || "Про компанію"} <span className="btn__arrow" /></a>
              <a className="btn btn--ghost" href="/contacts/" onClick={(event) => go("contacts", event)}>{hero.secondaryAction || "Зв'язатися"}</a>
            </div>
          </div>
          <div className="hero__facts">
            {(hero.facts || [
              { key: "Засновано", value: "2000", sub: "{yearsSinceFounded} стабільної роботи" },
              { key: "Адреса", value: "Берестейський 67", sub: "Київ, 03062" },
            ]).map((fact) => (
              <div key={fact.key} className="hero__fact">
                <div className="hero__fact-key">{fillText(fact.key, vars)}</div>
                <div className="hero__fact-val">{fillText(fact.value, vars)}</div>
                <div className="hero__fact-sub">{fillText(fact.sub, vars)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">{about.eyebrow || "№ 02 — Про компанію"}</div>
              <h2 className="h-section" style={{ marginTop: 16 }}><TextLines lines={about.titleLines || ["Стабільний оператор", "власної нерухомості"]} /></h2>
            </div>
            <div>
              <p className="section-head__lead">
                {fillText(about.lead || "{displayName} працює у сфері управління власною нерухомістю та має досвід реалізації об'єктів автомобільної, адміністративної й промислової інфраструктури. Компанія входить до групи «Атолл Холдинг».", vars)}
              </p>
              <p style={{ marginTop: 20, fontSize: 17, color: "var(--steel)", maxWidth: "56ch" }}>
                {fillText(about.text || "Основний напрям — управління, технічне обслуговування, оренда та експлуатація нерухомості. Компанія забезпечує безперебійне функціонування об'єктів інфраструктури групи та інтегрує нові будівлі в експлуатацію.", vars)}
              </p>
              <a className="btn btn--ghost btn--sm" style={{ marginTop: 32 }} href="/about/" onClick={(event) => go("about", event)}>{about.action || "Детальніше про компанію"} <span className="btn__arrow" /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="section--tight" style={{ borderTop: "1px solid var(--line-soft)" }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 32 }}>{directions.eyebrow || "№ 03 — Напрями діяльності"}</div>
          <div className="directions">
            {(directions.items || []).map(({ num, title, description }) => (
              <div key={num || title} className="direction">
                <div className="direction__num">{num}</div>
                <div>
                  <div className="direction__title">{title}</div>
                  <div className="direction__desc">{description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">{experience.eyebrow || "№ 04 — Досвід"}</div>
              <h2 className="h-section" style={{ marginTop: 16 }}><TextLines lines={experience.titleLines || ["Реалізовані", "напрями об'єктів"]} /></h2>
            </div>
            <div>
              <p className="section-head__lead">
                {experience.lead || "У портфоліо компанії — проєкти автомобільної інфраструктури, адміністративні та промислові об'єкти, виробничі площі та роботи з благоустрою. Окремий напрям — концепція рекреаційного простору «В гармонії з природою»."}
              </p>
            </div>
          </div>
          <div className="exp">
            {(experience.items || []).map(({ category, title, note }, idx) => (
              <div key={category} className="exp__cell">
                <ExpVisual idx={idx} />
                <div className="exp__cat">{category}</div>
                <div className="exp__title">{title}</div>
                <div className="exp__count">{note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">{documents.eyebrow || "№ 05 — Документи ПрАТ"}</div>
              <h2 className="h-section" style={{ marginTop: 16 }}><TextLines lines={documents.titleLines || ["Офіційний архів", "розкриття інформації"]} /></h2>
            </div>
            <div>
              <p className="section-head__lead">
                {documents.lead || "На сайті публікується обов'язкова інформація емітента цінних паперів: річна та особлива інформація, повідомлення для акціонерів, протоколи, структура власності, організаційна структура та супровідні файли електронного підпису."}
              </p>
              <p style={{ marginTop: 20, fontFamily: "var(--mono)", fontSize: 12, color: "var(--steel)", letterSpacing: "0.06em" }}>
                {documents.periodLabel || "Період архіву"} {yearMin}–{yearMax} · ОФІЦІЙНЕ РОЗКРИТТЯ ЕМІТЕНТА
              </p>
              <a className="btn" style={{ marginTop: 32 }} href="/documents/" onClick={(event) => go("documents", event)}>{documents.action || "Відкрити архів"} <span className="btn__arrow" /></a>
            </div>
          </div>
          <div style={{ marginTop: 32 }}>
            <div className="docpreview__list">
              {recent.map((group) => (
                <a key={group.id} className="docpreview__row" href={documentUrl(group.id)} onClick={(event) => go("documents", event, group.id)}>
                  <div className="docpreview__date">{formatDate(group.date)}</div>
                  <div>
                    <div className="docpreview__title">{group.displayTitle || group.title}</div>
                    <div className="docpreview__type">{group.displayType || group.type}</div>
                  </div>
                  <div className="docpreview__formats">
                    {[...new Set(group.files.map((file) => file.format))].map((fmt) => <FormatBadge key={fmt} fmt={fmt} />)}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section--tight" style={{ background: "var(--bg-soft)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 48, alignItems: "center" }}>
            <div>
              <div className="eyebrow">{location.eyebrow || "№ 06 — Контакти"}</div>
              <h2 className="h-section" style={{ marginTop: 16, fontSize: "clamp(28px, 3.5vw, 48px)" }}>{location.title || "Київ, проспект Берестейський, будинок 67"}</h2>
              <p style={{ marginTop: 16, color: "var(--steel)", fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {company.phone} · {company.email}
              </p>
            </div>
            <a className="btn" href="/contacts/" onClick={(event) => go("contacts", event)}>{location.action || "Зв'язатися"} <span className="btn__arrow" /></a>
          </div>
        </div>
      </section>
    </main>
  );
}

function DocumentsPage({ manifest, content }) {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const hero = content?.hero || {};
  const filters = content?.filters || {};
  const empty = content?.empty || {};
  const notice = content?.notice || {};
  const types = useMemo(() => Array.from(new Set(manifest.map((group) => group.displayType || group.type))).sort(), [manifest]);
  const years = useMemo(() => Array.from(new Set(manifest.map((group) => group.year))).sort((a, b) => b - a), [manifest]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return manifest.filter((group) => {
      if (yearFilter !== "all" && group.year !== yearFilter) return false;
      if (typeFilter !== "all" && (group.displayType || group.type) !== typeFilter) return false;
      if (!query) return true;
      const haystack = `${group.displayTitle || ""} ${group.title} ${group.displayType || ""} ${group.type} ${group.year} ${group.reportingYear || ""} ${group.files.map((file) => `${file.filename} ${file.role}`).join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [manifest, search, yearFilter, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((group) => {
      if (!map.has(group.year)) map.set(group.year, []);
      map.get(group.year).push(group);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  useEffect(() => {
    const syncHash = () => {
      if (typeof window === "undefined") return;
      const targetId = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!targetId || !manifest.some((group) => group.id === targetId)) return;
      setSearch("");
      setYearFilter("all");
      setTypeFilter("all");
      setOpenId(targetId);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [manifest]);

  useEffect(() => {
    if (!openId || typeof window === "undefined") return;
    window.setTimeout(() => {
      document.getElementById(`document-${openId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  }, [openId]);

  function toggleGroup(groupId) {
    const nextId = openId === groupId ? null : groupId;
    setOpenId(nextId);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", nextId ? documentUrl(nextId) : "/documents/");
    }
  }

  return (
    <main className="page">
      <section className="docpage__hero">
        <div className="container">
          <div className="eyebrow">{hero.eyebrow || "Розкриття інформації емітента"}</div>
          <h1 className="docpage__title">{hero.title || "Документи ПрАТ"}</h1>
          <p className="docpage__lead">
            {hero.lead || "Повний архів обов'язкової інформації, що публікується ПрАТ «Автотрейдінг Інвест»: річна та особлива інформація емітента, повідомлення для акціонерів, протоколи загальних зборів, структура власності, організаційна структура, XML-звіти та файли кваліфікованого електронного підпису."}
          </p>
          <div className="docpage__stats">
            <div>
              <div className="docpage__stat-num">{years.length ? Math.min(...years) : 2011}<span style={{ color: "var(--steel-2)" }}>–</span>{years.length ? Math.max(...years) : new Date().getFullYear()}</div>
              <div className="docpage__stat-lbl">{hero.periodLabel || "Період архіву"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingTop: 32, paddingBottom: 96 }}>
        <div className="filters">
          <div className="search">
            <svg className="search__icon" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <input id="documents-search" name="documents-search" aria-label={filters.searchLabel || "Пошук документів"} placeholder={filters.searchPlaceholder || "Пошук документів"} value={search} onChange={(event) => setSearch(event.target.value)} />
            <span className="search__count">{filtered.length} / {manifest.length}</span>
          </div>
          <div className="filter-group">
            <span className="filter-group__label">{filters.yearLabel || "Рік"}</span>
            <button className={`chip ${yearFilter === "all" ? "chip--active" : ""}`} onClick={() => setYearFilter("all")}>{filters.allLabel || "усі"}</button>
            {years.map((year) => <button key={year} className={`chip ${yearFilter === year ? "chip--active" : ""}`} onClick={() => setYearFilter(year)}>{year}</button>)}
          </div>
          <div className="filter-group">
            <span className="filter-group__label">{filters.typeLabel || "Тип"}</span>
            <button className={`chip ${typeFilter === "all" ? "chip--active" : ""}`} onClick={() => setTypeFilter("all")}>{filters.allLabel || "усі"}</button>
            {types.map((type) => <button key={type} className={`chip ${typeFilter === type ? "chip--active" : ""}`} onClick={() => setTypeFilter(type)}>{type}</button>)}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty__title">{empty.title || "За обраними фільтрами документів не знайдено"}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.06em" }}>{empty.hint || "СПРОБУЙТЕ ЗМІНИТИ ПОШУКОВИЙ ЗАПИТ АБО ОЧИСТИТИ ФІЛЬТРИ"}</div>
            <button className="btn btn--ghost btn--sm" style={{ marginTop: 24 }} onClick={() => { setSearch(""); setYearFilter("all"); setTypeFilter("all"); }}>{empty.clearAction || "Очистити фільтри"}</button>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            {grouped.map(([year, items]) => (
              <div key={year} className="timeline">
                <div className="timeline__year">
                  <div className="timeline__year-num">{year}</div>
                  <div className="timeline__year-count">
                    <span>{items.length}</span>{" "}
                    <span className="timeline__year-count-full">{items.length === 1 ? "оприлюднення" : "оприлюднень"}</span>
                    <span className="timeline__year-count-short">оприл.</span>
                  </div>
                </div>
                <div>
                  {items.map((group) => <DocRow key={group.id} group={group} open={openId === group.id} onToggle={() => toggleGroup(group.id)} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 64, padding: "32px", background: "var(--bg-soft)", borderLeft: "2px solid var(--accent)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--steel)", marginBottom: 12 }}>
            {notice.title || "Юридичне застереження"}
          </div>
          <p style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: "78ch" }}>
            {notice.text || "Юридично значимими є оригінальні файли документа разом із файлами кваліфікованого електронного підпису (.p7s) та XML-звітами. Для кожного файлу публікується контрольна сума SHA-256 — це дозволяє пересвідчитися, що завантажений файл не змінено. Повне значення суми доступне у деталях файлу та в публічному переліку документів архіву."}
          </p>
        </div>
      </section>
    </main>
  );
}

function DocRow({ group, open, onToggle }) {
  const formats = [...new Set(group.files.map((file) => file.format))];
  const title = group.displayTitle || group.title;
  const meta = [
    group.displayType || group.type,
    group.reportingYear ? `звітний ${group.reportingYear}` : null,
    `${group.files.length} ${group.files.length === 1 ? "файл" : "файли"}`,
  ].filter(Boolean).join(" · ");
  return (
    <div id={`document-${group.id}`} className={`docrow ${open ? "docrow--open" : ""}`} onClick={onToggle}>
      <div className="docrow__head">
        <div className="docrow__date">{formatDate(group.date)}</div>
        <div>
          <div className="docrow__title">{title}</div>
          <div className="docrow__type">{meta}</div>
        </div>
        <div className="docrow__formats">{formats.map((fmt) => <FormatBadge key={fmt} fmt={fmt} />)}</div>
        <button className="docrow__expand" onClick={(event) => { event.stopPropagation(); onToggle(); }} aria-label="Розгорнути" aria-expanded={open}>
          <span className="docrow__expand-icon" />
        </button>
      </div>
      {open && (
        <div className="docrow__files" onClick={(event) => event.stopPropagation()}>
          {group.title !== title && (
            <div className="docrow__legal-title">
              <span>Повна назва</span>
              {group.title}
            </div>
          )}
          {group.files.map((file) => (
            <div key={file.publicPath} className="fileitem">
              <FormatBadge fmt={file.format} />
              <div>
                <div className="fileitem__label">{fileDisplayLabel(file)}</div>
                <div className="fileitem__name">{file.filename}</div>
                {signedTargetLabel(file, group.files) && <div className="fileitem__linkage">{signedTargetLabel(file, group.files)}</div>}
              </div>
              <div className="fileitem__size">{formatBytes(file.sizeBytes)}</div>
              <div className="fileitem__sum" title={`SHA-256: ${file.checksumSha256}`}>
                <span className="fileitem__sum-label">SHA</span>{shortSum(file.checksumSha256)}…
              </div>
              <a className="fileitem__btn" href={file.publicPath} download>
                Завантажити <span style={{ fontSize: 14, lineHeight: 1 }}>↓</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AboutPage({ go, company, content }) {
  const displayName = companyDisplayName(company);
  const vars = { displayName };
  const hero = content?.hero || {};
  const history = content?.history || {};
  const principles = content?.principles || {};
  const legal = content?.legal || {};
  return (
    <main className="page">
      <section className="docpage__hero">
        <div className="container">
          <div className="eyebrow">{hero.eyebrow || "Про компанію"}</div>
          <h1 className="docpage__title"><TextLines lines={hero.titleLines || ["Девелопер і оператор", "власної нерухомості"]} /></h1>
          <p className="docpage__lead">
            {fillText(hero.lead || "{displayName} працює у сфері управління власною нерухомістю понад чверть століття — з досвідом реалізації об'єктів автомобільної, адміністративної й промислової інфраструктури в Україні.", vars)}
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="about-grid">
            <div>
              <div className="eyebrow" style={{ marginBottom: 24 }}>{history.eyebrow || "№ 01 — Історія і група"}</div>
              <h2 className="h-section" style={{ fontSize: "clamp(32px, 3.5vw, 48px)", marginBottom: 32 }}><TextLines lines={history.titleLines || ["З 2000 року —", "у складі групи «Атолл Холдинг»"]} /></h2>
            </div>
            <div className="about-grid__text">
              {(history.paragraphs || []).map((paragraph) => <p key={paragraph}>{fillText(paragraph, vars)}</p>)}
            </div>
          </div>
        </div>
      </section>
      <section className="section--tight" style={{ background: "var(--bg-soft)" }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 32 }}>{principles.eyebrow || "№ 02 — Принципи роботи"}</div>
          <div className="principles">
            {(principles.items || []).map(({ title, description }, index) => (
              <div key={title} className="principle">
                <div className="principle__num">0{index + 1}</div>
                <h3 className="principle__title">{title}</h3>
                <p className="principle__desc">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 32 }}>{legal.eyebrow || "№ 03 — Юридична інформація"}</div>
          <div className="requisites">
            {[
              ["Повна назва", company.displayFullName || company.fullName],
              ["Скорочена назва", company.legalShortName || company.name],
              ["Код ЄДРПОУ", company.edrpou],
              ["Дата заснування", company.founded],
              ["Керівник", company.director],
              ["Юридична адреса", company.address],
              ["Група компаній", legal.groupValue || "«Атолл Холдинг»"],
            ].map(([key, value]) => (
              <div key={key} className="requisites__row">
                <div className="requisites__key">{key}</div>
                <div className="requisites__val">{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a className="btn" href="/documents/" onClick={(event) => go("documents", event)}>{legal.documentsAction || "Документи ПрАТ"} <span className="btn__arrow" /></a>
            <a className="btn btn--ghost" href="/contacts/" onClick={(event) => go("contacts", event)}>{legal.contactsAction || "Зв'язатися з компанією"}</a>
          </div>
        </div>
      </section>
    </main>
  );
}

function ContactsPage({ company, toast, content }) {
  const displayName = companyDisplayName(company);
  const hero = content?.hero || {};
  const card = content?.card || {};
  const map = content?.map || {};
  const toastText = content?.toast || {};
  const copyAddress = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(company.address).then(() => toast.show(toastText.addressCopied || "Адресу скопійовано"));
    } else {
      toast.show(toastText.addressCopied || "Адресу скопійовано");
    }
  };

  return (
    <main className="page">
      <section className="docpage__hero">
        <div className="container">
          <div className="eyebrow">{hero.eyebrow || "Контакти"}</div>
          <h1 className="docpage__title"><TextLines lines={hero.titleLines || ["Київ,", "проспект Берестейський, 67"]} /></h1>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="contacts">
            <div className="contact-card">
              <div className="contact-card__row">
                <div className="contact-card__lbl">{card.legalNameLabel || "Юридична назва"}</div>
                <div className="contact-card__val">{displayName}</div>
              </div>
              <div className="contact-card__row">
                <div className="contact-card__lbl">{card.addressLabel || "Адреса"}</div>
                <div className="contact-card__val"><InlineLines lines={card.addressLines || ["пр. Берестейський, 67", "Київ, 03062, Україна"]} /></div>
                <button className="contact-card__action" onClick={copyAddress}>{card.copyAddressAction || "Копіювати адресу"} <span style={{ fontSize: 14 }}>⎘</span></button>
                <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 10, color: "var(--steel-2)", letterSpacing: "0.06em" }}>{company.formerAddressNote}</div>
              </div>
              <div className="contact-card__row">
                <div className="contact-card__lbl">{card.phoneLabel || "Телефон"}</div>
                <div className="contact-card__val">{company.phone}</div>
                <a className="contact-card__action" href={company.phoneHref}>{card.phoneAction || "Подзвонити"} <span style={{ fontSize: 14 }}>↗</span></a>
              </div>
              <div className="contact-card__row">
                <div className="contact-card__lbl">{card.emailLabel || "E-mail"}</div>
                <div className="contact-card__val">{company.email}</div>
                <a className="contact-card__action" href={company.emailHref}>{card.emailAction || "Написати"} <span style={{ fontSize: 14 }}>↗</span></a>
              </div>
              <div className="contact-card__row">
                <div className="contact-card__lbl">{card.directorLabel || "Керівник"}</div>
                <div className="contact-card__val">{company.director}</div>
              </div>
            </div>
            <div>
              <div className="map-wrap">
                <iframe src={company.mapsEmbed} loading="lazy" title={map.title || "Google Maps — Берестейський 67"} />
                <a className="map-link" href={company.mapsUrl} target="_blank" rel="noopener">{map.action || "Відкрити в Google Maps ↗"}</a>
              </div>
              <div style={{ marginTop: 24, fontFamily: "var(--mono)", fontSize: 11, color: "var(--steel)", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>{company.coordinates.latDisplay}</div>
                <div>{company.coordinates.lngDisplay}</div>
                <div>{map.caption || "fig. 02 — локація"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SiteApp({ initialPage = "home", manifest, company, content = {} }) {
  const [page, setPage] = useState(initialPage);
  const toast = useToast();
  const documents = useMemo(() => normalizeManifest(manifest || []), [manifest]);
  const navigation = content.navigation || {};
  const pageContent = content.pages || {};

  useEffect(() => {
    const sync = () => setPage(pageFromPath(window.location.pathname));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    updateDocumentMetadata(page, pageContent);
  }, [page, pageContent]);

  function go(id, event, hash) {
    if (event) event.preventDefault();
    setPage(id);
    if (typeof window !== "undefined") {
      const url = hash ? `${pages[id]}#${encodeURIComponent(hash)}` : pages[id];
      window.history.pushState({}, "", url);
      updateDocumentMetadata(id, pageContent);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  return (
    <div className="app">
      <Header page={page} go={go} company={company} navigation={navigation} />
      {page === "home" && <HomePage go={go} manifest={documents} company={company} content={pageContent.home} />}
      {page === "about" && <AboutPage go={go} company={company} content={pageContent.about} />}
      {page === "documents" && <DocumentsPage manifest={documents} content={pageContent.documents} />}
      {page === "contacts" && <ContactsPage company={company} toast={toast} content={pageContent.contacts} />}
      <Footer go={go} company={company} navigation={navigation} />
      {toast.node}
    </div>
  );
}
