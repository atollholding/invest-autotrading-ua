import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const verifyOnly = process.argv.includes("--verify");
const sourcePath = "research/issuer-files/manifest.json";
const cmsDocumentsPath = "src/content/documents/groups";
const outputPath = "src/content/documents/manifest.json";
const redirectsPath = "public/_redirects";

const displayTypeByType = {
  "Інформація для акціонерів": "Для акціонерів",
  "Інформація емітента": "Інформація емітента",
  "Загальні збори акціонерів": "Загальні збори",
  "Організаційна структура": "Організаційна структура",
  "Особлива інформація": "Особлива інформація",
  "Протоколи": "Протоколи",
  "Річна інформація": "Річна інформація",
  "Структура власності": "Структура власності",
};

const fileRoleLabels = {
  main: "Основний документ",
  signature: "Підпис основного документа",
  xml: "XML-звіт",
  "xml-signature": "Підпис XML-звіту",
};

function inferDate(group) {
  const text = `${group.title} ${group.directory || ""} ${(group.files || []).map((file) => file.legacyUrl).join(" ")}`;
  const dotted = text.match(/(\d{2})[.-](\d{2})[.-]((?:19|20)\d{2})/);
  if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;
  const compact = text.match(/((?:19|20)\d{2})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const year = String(group.year || "").match(/(?:19|20)\d{2}/)?.[0] || "2000";
  return `${year}-12-31`;
}

function formatDisplayDate(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function inferPeriodEnd(group) {
  if (group.periodEnd) return group.periodEnd;
  const text = `${group.title} ${group.directory || ""}`;
  const dotted = text.match(/(\d{2})[.-](\d{2})[.-]((?:19|20)\d{2})/);
  if (dotted && /станом|за\s+\d{4}\s+рік|річн/i.test(text)) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;

  const monthNames = {
    січня: "01",
    лютого: "02",
    березня: "03",
    квітня: "04",
    травня: "05",
    червня: "06",
    липня: "07",
    серпня: "08",
    вересня: "09",
    жовтня: "10",
    листопада: "11",
    грудня: "12",
  };
  const named = text.toLowerCase().match(/(\d{1,2})\s+(січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня)\s+((?:19|20)\d{2})/);
  if (named && /станом/.test(text.toLowerCase())) {
    return `${named[3]}-${monthNames[named[2]]}-${named[1].padStart(2, "0")}`;
  }

  const annual = text.match(/за\s+((?:19|20)\d{2})\s+р[іi]к/i);
  if (annual) return `${annual[1]}-12-31`;
  return null;
}

function inferReportingYear(group, periodEnd) {
  if (group.reportingYear) return Number(group.reportingYear);
  if (periodEnd) return Number(periodEnd.slice(0, 4));
  const annual = String(group.title || "").match(/за\s+((?:19|20)\d{2})\s+р[іi]к/i);
  return annual ? Number(annual[1]) : null;
}

function inferRole(file, index) {
  const name = `${file.path || file.publicPath || ""} ${file.label || ""}`.toLowerCase();
  if (name.endsWith(".xml.p7s") || name.includes("xml.p7s")) return "xml-signature";
  if (name.endsWith(".p7s") || file.format === "P7S") return index > 1 ? "xml-signature" : "signature";
  if (file.format === "XML" || name.endsWith(".xml")) return "xml";
  return "main";
}

function inferDisplayTitle(group, publishedAt, periodEnd) {
  if (group.displayTitle) return group.displayTitle;
  const title = group.title || "";
  const date = formatDisplayDate(publishedAt);
  const period = formatDisplayDate(periodEnd);

  if (group.type === "Річна інформація") {
    const year = inferReportingYear(group, periodEnd) || group.year;
    return `Річна інформація за ${year} рік`;
  }
  if (group.type === "Структура власності" && period) return `Структура власності станом на ${period}`;
  if (group.type === "Організаційна структура" && period) return `Організаційна структура станом на ${period}`;
  if (group.type === "Особлива інформація" && date) return `Особлива інформація від ${date}`;
  if (title.length <= 92) return title;
  return `${title.slice(0, 89).trim()}...`;
}

function normalizeType(type) {
  if (type === "Інше") return "Інформація емітента";
  if (type === "Річна інформація емітента") return "Річна інформація";
  if (type === "Особлива інформація емітента") return "Особлива інформація";
  if (type === "Повідомлення для акціонерів") return "Інформація для акціонерів";
  if (type === "Протоколи та рішення") return "Протоколи";
  return type;
}

function publicPathFromResearchPath(path) {
  return `/${path.replace(/^files\//, "documents/")}`;
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

function normalizeFiles(files, groupId) {
  const roleCounts = new Map();
  const usedIds = new Set();
  const records = files.map((file, index) => {
    const role = file.role || inferRole(file, index);
    roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    const explicitId = file.id || null;
    const id = explicitId ? uniqueId(explicitId, usedIds) : null;
    return {
      id,
      filename: file.filename || basename(file.publicPath),
      label: file.label || fileRoleLabels[role] || "Файл",
      format: file.format || extname(file.publicPath).replace(".", "").toUpperCase(),
      role,
      signsFileId: file.signsFileId || null,
      publicPath: file.publicPath,
      legacyUrl: file.legacyUrl || null,
      sizeBytes: file.sizeBytes,
      checksumSha256: file.checksumSha256,
    };
  });

  const byPublicPath = new Map(records.map((file) => [file.publicPath, file]));
  for (const file of records) {
    if (file.id) continue;
    if (file.role === "signature" || file.role === "xml-signature") continue;
    const count = records.filter((candidate) => candidate.role === file.role && candidate.id).length + 1;
    file.id = uniqueId(defaultFileId(file.role, count), usedIds);
  }

  for (const file of records) {
    if (file.role !== "signature" && file.role !== "xml-signature") continue;
    const targetPath = signatureTargetPath(file);
    const directTarget = targetPath ? byPublicPath.get(targetPath) : null;
    const fallbackTarget = file.role === "xml-signature"
      ? records.find((candidate) => candidate.role === "xml")
      : records.find((candidate) => candidate.role === "main");
    const explicitTarget = file.signsFileId ? records.find((candidate) => candidate.id === file.signsFileId) : null;
    const target = explicitTarget || directTarget || fallbackTarget;
    if (!target) {
      throw new Error(`Signature without target in ${groupId}: ${file.publicPath}`);
    }
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

function normalizeGroup(group, files, source = "legacy") {
  const type = normalizeType(group.type);
  const publishedAt = group.publishedAt || inferDate({ ...group, files });
  const periodEnd = inferPeriodEnd(group);
  const reportingYear = inferReportingYear(group, periodEnd);
  const normalized = {
    id: group.id,
    title: group.title,
    displayTitle: inferDisplayTitle({ ...group, type }, publishedAt, periodEnd),
    type,
    displayType: group.displayType || displayTypeByType[type] || type,
    year: Number(group.year),
    publishedAt,
    periodEnd,
    reportingYear,
    status: group.status || "published",
    source,
    files: normalizeFiles(files, group.id),
  };
  if (!normalized.periodEnd) delete normalized.periodEnd;
  if (!normalized.reportingYear) delete normalized.reportingYear;
  return normalized;
}

function readCmsDocuments() {
  if (!existsSync(cmsDocumentsPath)) return [];
  return readdirSync(cmsDocumentsPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const group = JSON.parse(readFileSync(join(cmsDocumentsPath, entry.name), "utf8"));
      const files = (group.files || []).map((file, index) => {
        const current = hashAndSize(file.publicPath);
        return {
          id: file.id || null,
          filename: file.filename || basename(file.publicPath),
          label: file.label,
          format: file.format || extname(file.publicPath).replace(".", "").toUpperCase(),
          role: file.role || inferRole(file, index),
          signsFileId: file.signsFileId || null,
          publicPath: file.publicPath,
          legacyUrl: file.legacyUrl || null,
          sizeBytes: current.sizeBytes,
          checksumSha256: current.checksumSha256,
        };
      });
      return normalizeGroup(group, files, "cms");
    });
}

if (!existsSync(sourcePath)) {
  throw new Error(`Missing source manifest: ${sourcePath}`);
}

const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const legacyGroups = source.groups.map((group) => {
  const files = group.files.map((file, index) => {
    const publicPath = publicPathFromResearchPath(file.path);
    const current = hashAndSize(publicPath);
    if (verifyOnly && (current.sizeBytes !== file.sizeBytes || current.checksumSha256 !== file.checksumSha256)) {
      throw new Error(`Checksum/size mismatch: ${file.path}`);
    }
    return {
      filename: basename(file.path),
      label: file.label,
      format: file.format || extname(file.path).replace(".", "").toUpperCase(),
      role: inferRole(file, index),
      publicPath,
      legacyUrl: file.legacyUrl,
      sizeBytes: current.sizeBytes,
      checksumSha256: current.checksumSha256,
    };
  });
  return normalizeGroup({ ...group, status: "published" }, files, "legacy");
});

const groups = [...legacyGroups, ...readCmsDocuments()]
  .filter((group) => group.status === "published")
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.year - a.year);

writeFileSync(outputPath, JSON.stringify(groups, null, 2) + "\n");

const redirects = [
  "# Legacy issuer file redirects generated from research/issuer-files/manifest.json",
  ...groups.flatMap((group) =>
    group.files
      .filter((file) => file.legacyUrl)
      .map((file) => {
        const legacyPath = new URL(file.legacyUrl).pathname;
        return `${legacyPath}  ${file.publicPath}  301`;
      }),
  ),
  "",
].join("\n");
writeFileSync(redirectsPath, redirects);

console.log(`Manifest ready: ${groups.length} groups, ${groups.reduce((sum, group) => sum + group.files.length, 0)} files`);
