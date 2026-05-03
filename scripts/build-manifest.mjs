import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const verifyOnly = process.argv.includes("--verify");
const documentsPath = "src/content/documents/groups";
const redirectsMapPath = "src/content/documents/redirects.json";
const outputPath = "src/content/documents/manifest.json";
const redirectsPath = "public/_redirects";

const publicationKinds = {
  "annual-report": {
    type: "Річна інформація",
    displayType: "Річна інформація",
    slug: "richna-informatsiia",
  },
  "special-info": {
    type: "Особлива інформація",
    displayType: "Особлива інформація",
    slug: "osoblyva-informatsiia",
  },
  "shareholder-info": {
    type: "Інформація для акціонерів",
    displayType: "Для акціонерів",
    slug: "informatsiia-dlia-aktsioneriv",
  },
  "shareholders-meeting": {
    type: "Загальні збори акціонерів",
    displayType: "Загальні збори",
    slug: "zahalni-zbory",
  },
  protocol: {
    type: "Протоколи",
    displayType: "Протоколи",
    slug: "protokol",
  },
  "ownership-structure": {
    type: "Структура власності",
    displayType: "Структура власності",
    slug: "struktura-vlasnosti",
  },
  "organization-structure": {
    type: "Організаційна структура",
    displayType: "Організаційна структура",
    slug: "orhanizatsiina-struktura",
  },
  "issuer-info": {
    type: "Інформація емітента",
    displayType: "Інформація емітента",
    slug: "informatsiia-emitenta",
  },
};

const kindByType = Object.fromEntries(
  Object.entries(publicationKinds).map(([kind, value]) => [value.type, kind]),
);

const typeAliasMap = {
  "Інше": "issuer-info",
  "Річна інформація": "annual-report",
  "Річна інформація емітента": "annual-report",
  "Особлива інформація": "special-info",
  "Особлива інформація емітента": "special-info",
  "Інформація для акціонерів": "shareholder-info",
  "Повідомлення для акціонерів": "shareholder-info",
  "Загальні збори акціонерів": "shareholders-meeting",
  "Протоколи": "protocol",
  "Протоколи та рішення": "protocol",
  "Структура власності": "ownership-structure",
  "Організаційна структура": "organization-structure",
  "Інформація емітента": "issuer-info",
};

const fileRoleLabels = {
  main: "Основний документ",
  signature: "Підпис основного документа",
  xml: "XML-звіт",
  "xml-signature": "Підпис XML-звіту",
};

const transliteration = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ie",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ю: "iu",
  я: "ia",
  ь: "",
  ъ: "",
  ы: "y",
  э: "e",
};

const monthNames = {
  "січня": "01",
  "sichnia": "01",
  "лютого": "02",
  "liutoho": "02",
  "березня": "03",
  "bereznia": "03",
  "квітня": "04",
  "kvitnia": "04",
  "травня": "05",
  "travnia": "05",
  "червня": "06",
  "chervnia": "06",
  "липня": "07",
  "lypnia": "07",
  "серпня": "08",
  "serpnia": "08",
  "вересня": "09",
  "veresnia": "09",
  "жовтня": "10",
  "zhovtnia": "10",
  "листопада": "11",
  "lystopada": "11",
  "грудня": "12",
  "hrudnia": "12",
};

function normalizeDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const iso = text.match(/^((?:19|20)\d{2})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dotted = text.match(/^(\d{2})[.-](\d{2})[.-]((?:19|20)\d{2})$/);
  if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;
  return text;
}

function isIsoDate(value) {
  return /^((?:19|20)\d{2})-\d{2}-\d{2}$/.test(String(value || ""));
}

function formatDisplayDate(iso) {
  const normalized = normalizeDate(iso);
  if (!normalized) return "";
  const [year, month, day] = normalized.split("-");
  return `${day}.${month}.${year}`;
}

function dateFromTextMonth(value) {
  const match = String(value || "").match(/(\d{1,2})[\s-]+([а-яіїєґa-z]+)[\s-]+((?:19|20)\d{2})/i);
  if (!match) return null;
  const month = monthNames[match[2].toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .split("")
    .map((char) => transliteration[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function inferPeriodEnd(group) {
  const explicit = normalizeDate(group.periodEnd);
  if (explicit) return explicit;
  if (group.reportingYear && group.publicationKind === "annual-report") return `${group.reportingYear}-12-31`;

  const text = `${group.titleOverride || group.title || ""} ${group.id || ""}`;
  const dotted = text.match(/(\d{2})[.-](\d{2})[.-]((?:19|20)\d{2})/);
  if (dotted && /станом|за\s+\d{4}\s+рік|річн/i.test(text)) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;

  const textMonth = dateFromTextMonth(text);
  if (textMonth && /станом|stanom/i.test(text)) return textMonth;

  const annual = annualYearFromText(text);
  if (annual) return `${annual[1]}-12-31`;
  return null;
}

function inferReportingYear(group, periodEnd) {
  if (group.reportingYear) return Number(group.reportingYear);
  if (periodEnd) return Number(periodEnd.slice(0, 4));
  const annual = annualYearFromText(`${group.titleOverride || group.title || ""} ${group.id || ""}`);
  return annual ? Number(annual[1]) : null;
}

function annualYearFromText(value) {
  return String(value || "").match(/(?:за|za)[\s-]+((?:19|20)\d{2})[\s-]+(?:р[іi]к|rik|год|god|hod)/i);
}

function normalizeKind(group) {
  if (group.publicationKind && publicationKinds[group.publicationKind]) return group.publicationKind;
  if (group.type && typeAliasMap[group.type]) return typeAliasMap[group.type];
  if (group.type && kindByType[group.type]) return kindByType[group.type];
  return "issuer-info";
}

function hasKnownKind(group) {
  return Boolean(
    (group.publicationKind && publicationKinds[group.publicationKind])
      || (group.type && typeAliasMap[group.type])
      || (group.type && kindByType[group.type]),
  );
}

function titleForGroup(group, kind, publishedAt, periodEnd, reportingYear) {
  if (group.titleOverride || group.title) return group.titleOverride || group.title;

  const period = formatDisplayDate(periodEnd);
  const published = formatDisplayDate(publishedAt);
  if (kind === "annual-report" && reportingYear) return `Річна інформація емітента цінних паперів за ${reportingYear} рік`;
  if (kind === "annual-report") return `Річна інформація емітента цінних паперів за ${publishedAt.slice(0, 4)} рік`;
  if (kind === "organization-structure" && period) return `Організаційна структура станом на ${period}`;
  if (kind === "organization-structure") return "Організаційна структура";
  if (kind === "ownership-structure" && period) return `Структура власності емітента станом на ${period}`;
  if (kind === "ownership-structure") return "Структура власності емітента";
  if (kind === "special-info") return `Особлива інформація від ${published}`;
  if (kind === "shareholders-meeting") return `Інформація щодо загальних зборів акціонерів від ${published}`;
  if (kind === "protocol") return `Протокол загальних зборів акціонерів (${published})`;
  if (kind === "shareholder-info") return `Інформація для акціонерів від ${published}`;
  return `Інформація емітента від ${published}`;
}

function displayTitleForGroup(group, kind, title, publishedAt, periodEnd, reportingYear) {
  if (group.displayTitleOverride || group.displayTitle) return group.displayTitleOverride || group.displayTitle;

  const period = formatDisplayDate(periodEnd);
  const published = formatDisplayDate(publishedAt);
  if (kind === "annual-report" && reportingYear) return `Річна інформація за ${reportingYear} рік`;
  if (kind === "organization-structure" && period) return `Організаційна структура станом на ${period}`;
  if (kind === "ownership-structure" && period) return `Структура власності станом на ${period}`;
  if (kind === "special-info") return `Особлива інформація від ${published}`;
  if (title.length <= 92) return title;
  return `${title.slice(0, 89).trim()}...`;
}

function idForGroup(group, kind, publishedAt, periodEnd, reportingYear) {
  if (group.id) return group.id;
  const pieces = [publishedAt?.slice(0, 4), publicationKinds[kind].slug];
  if (kind === "annual-report" && reportingYear) pieces.push(`za-${reportingYear}-rik`);
  if ((kind === "organization-structure" || kind === "ownership-structure") && periodEnd) pieces.push(`stanom-na-${periodEnd}`);
  if (kind !== "annual-report" && kind !== "organization-structure" && kind !== "ownership-structure") pieces.push(publishedAt);
  return slugify(pieces.filter(Boolean).join("-"));
}

function ensureUniqueGroupIds(groups) {
  const used = new Map();
  return groups.map((group) => {
    const count = used.get(group.id) || 0;
    used.set(group.id, count + 1);
    return count === 0 ? group : { ...group, id: `${group.id}-${count + 1}` };
  });
}

function fileFormat(publicPath) {
  const lower = publicPath.toLowerCase();
  if (lower.endsWith(".xml.p7s")) return "P7S";
  return extname(publicPath).replace(".", "").toUpperCase();
}

function inferRole(file, index) {
  const path = String(file.publicPath || file.path || file || "").toLowerCase();
  const explicit = typeof file === "object" && file.role;
  if (explicit) return explicit;
  if (path.endsWith(".xml.p7s")) return "xml-signature";
  if (path.endsWith(".p7s")) return index > 1 ? "xml-signature" : "signature";
  if (path.endsWith(".xml")) return "xml";
  return "main";
}

function hashAndSize(publicPath) {
  const fsPath = join("public", publicPath.replace(/^\//, ""));
  const bytes = readFileSync(fsPath);
  return {
    sizeBytes: bytes.length,
    checksumSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function signatureTargetPath(file) {
  if (!file.publicPath.toLowerCase().endsWith(".p7s")) return null;
  return file.publicPath.slice(0, -4);
}

function uniqueId(base, used) {
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function defaultFileId(role, count) {
  if (role === "main") return count === 1 ? "main" : `main-${count}`;
  if (role === "xml") return count === 1 ? "xml" : `xml-${count}`;
  if (role === "signature") return count === 1 ? "signature" : `signature-${count}`;
  if (role === "xml-signature") return count === 1 ? "xml-signature" : `xml-signature-${count}`;
  return count === 1 ? "file" : `file-${count}`;
}

function sourceFilePath(file) {
  if (typeof file === "string") return normalizePublicPath(file);
  if (file.publicPath) return normalizePublicPath(file.publicPath);
  if (file.path) return normalizePublicPath(file.path.replace(/^files\//, "documents/"));
  throw new Error(`Invalid file entry: ${JSON.stringify(file)}`);
}

function normalizePublicPath(value) {
  const clean = String(value || "").trim().replace(/^\/?public\//, "");
  const publicPath = clean.startsWith("/") ? clean : `/${clean}`;
  return publicPath.normalize("NFC");
}

function normalizeFiles(files, groupId) {
  const roleCounts = new Map();
  const usedIds = new Set();
  const records = files.map((source, index) => {
    const publicPath = sourceFilePath(source);
    const current = hashAndSize(publicPath);
    if (verifyOnly && typeof source === "object" && source.sizeBytes && source.checksumSha256) {
      if (current.sizeBytes !== source.sizeBytes || current.checksumSha256 !== source.checksumSha256) {
        throw new Error(`Checksum/size mismatch: ${publicPath}`);
      }
    }

    const role = inferRole({ ...source, publicPath }, index);
    roleCounts.set(role, (roleCounts.get(role) || 0) + 1);

    return {
      id: typeof source === "object" && source.id ? uniqueId(source.id, usedIds) : null,
      filename: typeof source === "object" && source.filename ? source.filename : basename(publicPath),
      label: typeof source === "object" && source.label ? source.label : fileRoleLabels[role] || "Файл",
      format: typeof source === "object" && source.format ? source.format : fileFormat(publicPath),
      role,
      signsFileId: typeof source === "object" && source.signsFileId ? source.signsFileId : null,
      publicPath,
      sizeBytes: current.sizeBytes,
      checksumSha256: current.checksumSha256,
    };
  });

  const byPublicPath = new Map(records.map((file) => [file.publicPath, file]));

  for (const file of records) {
    if (file.id || file.role === "signature" || file.role === "xml-signature") continue;
    const previousCount = records.filter((candidate) => candidate.role === file.role && candidate.id).length + 1;
    file.id = uniqueId(defaultFileId(file.role, previousCount), usedIds);
  }

  for (const file of records) {
    if (file.role !== "signature" && file.role !== "xml-signature") continue;
    const directTarget = signatureTargetPath(file) ? byPublicPath.get(signatureTargetPath(file)) : null;
    const fallbackTarget = file.role === "xml-signature"
      ? records.find((candidate) => candidate.role === "xml")
      : records.find((candidate) => candidate.role === "main");
    const explicitTarget = file.signsFileId ? records.find((candidate) => candidate.id === file.signsFileId) : null;
    const target = explicitTarget || directTarget || fallbackTarget;
    if (!target) throw new Error(`Signature without target in ${groupId}: ${file.publicPath}`);
    file.signsFileId = target.id;
    if (!file.id) file.id = uniqueId(`${target.id}-signature`, usedIds);
  }

  for (const file of records) {
    if ((file.role === "signature" || file.role === "xml-signature") && !records.some((candidate) => candidate.id === file.signsFileId)) {
      throw new Error(`Invalid signsFileId in ${groupId}: ${file.publicPath}`);
    }
  }

  return records;
}

function validateGroupSource(group) {
  const label = group.id || group.titleOverride || group.title || group.publishedAt || "unknown document group";

  if (!hasKnownKind(group)) {
    throw new Error(`Document group "${label}" must define a known publicationKind or legacy type.`);
  }

  const publishedAt = normalizeDate(group.publishedAt) || normalizeDate(group.date);
  if (!isIsoDate(publishedAt)) {
    throw new Error(`Document group "${label}" must define publishedAt in YYYY-MM-DD format.`);
  }

  if (!["draft", "published"].includes(group.status)) {
    throw new Error(`Document group "${label}" must define status as draft or published.`);
  }

  const files = Array.isArray(group.files) ? group.files : group.files ? [group.files] : [];
  if (files.length === 0) {
    throw new Error(`Document group "${label}" must reference at least one file.`);
  }
}

function normalizeGroup(group) {
  group = { ...(group.advanced || {}), ...group };
  validateGroupSource(group);
  const publicationKind = normalizeKind(group);
  const publishedAt = normalizeDate(group.publishedAt) || normalizeDate(group.date);
  const periodEnd = inferPeriodEnd({ ...group, publicationKind });
  const reportingYear = inferReportingYear(group, periodEnd);
  const year = Number(group.year || publishedAt.slice(0, 4));
  const id = idForGroup(group, publicationKind, publishedAt, periodEnd, reportingYear);
  const title = titleForGroup(group, publicationKind, publishedAt, periodEnd, reportingYear);
  const displayTitle = displayTitleForGroup(group, publicationKind, title, publishedAt, periodEnd, reportingYear);
  const kind = publicationKinds[publicationKind];

  const normalized = {
    id,
    title,
    displayTitle,
    type: group.typeOverride || kind.type,
    displayType: group.displayTypeOverride || kind.displayType,
    year,
    publishedAt,
    periodEnd,
    reportingYear,
    status: group.status,
    files: normalizeFiles(Array.isArray(group.files) ? group.files : group.files ? [group.files] : [], id),
  };

  if (!normalized.periodEnd) delete normalized.periodEnd;
  if (!normalized.reportingYear) delete normalized.reportingYear;
  return normalized;
}

function readDocumentGroups() {
  if (!existsSync(documentsPath)) return [];
  return readdirSync(documentsPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => JSON.parse(readFileSync(join(documentsPath, entry.name), "utf8")))
    .map(normalizeGroup);
}

function readRedirectsMap() {
  if (!existsSync(redirectsMapPath)) return {};
  return Object.fromEntries(
    Object.entries(JSON.parse(readFileSync(redirectsMapPath, "utf8"))).map(([target, source]) => [
      normalizePublicPath(target),
      source,
    ]),
  );
}

const redirectsMap = readRedirectsMap();
const groups = ensureUniqueGroupIds(readDocumentGroups())
  .filter((group) => group.status === "published")
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.year - a.year || a.id.localeCompare(b.id));

const redirects = [
  "# Issuer file redirects",
  ...groups.flatMap((group) =>
    group.files
      .filter((file) => redirectsMap[file.publicPath])
      .map((file) => {
        const sourcePath = new URL(redirectsMap[file.publicPath]).pathname;
        return `${sourcePath}  ${file.publicPath}  301`;
      }),
  ).sort(),
  "",
].join("\n");

const manifestOutput = JSON.stringify(groups, null, 2) + "\n";

if (verifyOnly) {
  const currentManifest = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";
  const currentRedirects = existsSync(redirectsPath) ? readFileSync(redirectsPath, "utf8") : "";
  if (currentManifest !== manifestOutput) {
    throw new Error(`${outputPath} is stale. Run npm run manifest and commit the generated manifest.`);
  }
  if (currentRedirects !== redirects) {
    throw new Error(`${redirectsPath} is stale. Run npm run manifest and commit the generated redirects.`);
  }
} else {
  writeFileSync(outputPath, manifestOutput);
  writeFileSync(redirectsPath, redirects);
}

console.log(`Manifest ready: ${groups.length} groups, ${groups.reduce((sum, group) => sum + group.files.length, 0)} files`);
