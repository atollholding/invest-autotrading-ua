import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { relative, join, posix, sep } from "node:path";

const clean = process.argv.includes("--clean");
const documentsPath = "src/content/documents/groups";
const uploadsPath = "public/documents/uploads";
const ignoredFiles = new Set([".gitkeep", ".DS_Store", "Thumbs.db"]);

function toPublicPath(value) {
  if (!value) return null;
  const normalized = String(value).replaceAll("\\", "/").replace(/^\/+/, "");

  if (normalized.startsWith("public/documents/")) {
    return `/${normalized.slice("public/".length)}`;
  }

  if (normalized.startsWith("documents/")) {
    return `/${normalized}`;
  }

  return null;
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(path);
    if (!entry.isFile() || ignoredFiles.has(entry.name)) return [];
    return path;
  });
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${path}: ${error.message}`);
  }
}

function collectReferencedFiles() {
  if (!existsSync(documentsPath)) return new Set();

  const referenced = new Set();

  for (const entry of readdirSync(documentsPath, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;

    const group = readJson(join(documentsPath, entry.name));
    const files = Array.isArray(group.files) ? group.files : [];

    for (const file of files) {
      const publicPath = toPublicPath(file);
      if (publicPath) referenced.add(publicPath);
    }
  }

  return referenced;
}

const referenced = collectReferencedFiles();
const uploadedFiles = walkFiles(uploadsPath).map((file) => {
  const relativePath = relative("public", file).split(sep).join(posix.sep);
  return {
    file,
    publicPath: `/${relativePath}`,
  };
});

const orphanFiles = uploadedFiles.filter(({ publicPath }) => !referenced.has(publicPath));

if (orphanFiles.length === 0) {
  console.log("No orphan document uploads found.");
  process.exit(0);
}

console.error(`Found ${orphanFiles.length} orphan document upload${orphanFiles.length === 1 ? "" : "s"}:`);

for (const { file } of orphanFiles) {
  console.error(`- ${file}`);
}

if (!clean) {
  console.error("\nRun npm run documents:clean-orphans to remove these files after review.");
  process.exit(1);
}

for (const { file } of orphanFiles) {
  rmSync(file);
}

console.log(`Removed ${orphanFiles.length} orphan document upload${orphanFiles.length === 1 ? "" : "s"}.`);
