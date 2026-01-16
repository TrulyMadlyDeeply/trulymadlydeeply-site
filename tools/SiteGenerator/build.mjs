import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const TEMPLATES = path.join(ROOT, "templates");
const PAGES = path.join(TEMPLATES, "pages");

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function emptyDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function copyRecursive(src, dest) {
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    await ensureDir(dest);
    const entries = await fs.readdir(src);
    for (const e of entries) {
      await copyRecursive(path.join(src, e), path.join(dest, e));
    }
  } else {
    await ensureDir(path.dirname(dest));
    await fs.copyFile(src, dest);
  }
}

async function readText(p) {
  return await fs.readFile(p, "utf8");
}

async function expandIncludes(sourceHtml) {
  // <!-- ORA:include templates/partials/header.html -->
  const includeRe = /<!--\s*ORA:include\s+(.+?)\s*-->/g;

  let result = sourceHtml;
  let match;

  while ((match = includeRe.exec(result)) !== null) {
    includeRe.lastIndex = 0;

    const includePathRaw = match[1].trim();
    const includePath = path.join(ROOT, includePathRaw);

    if (!(await exists(includePath))) {
      throw new Error(`Missing include file: ${includePathRaw}`);
    }

    const includeContent = await readText(includePath);
    result = result.replace(match[0], includeContent);
  }

  return result;
}

async function buildPages() {
  const entries = await fs.readdir(PAGES);
  const srcFiles = entries.filter((f) => f.endsWith(".src.html"));

  if (srcFiles.length === 0) {
    throw new Error("No source pages found in templates/pages (expected *.src.html).");
  }

  for (const file of srcFiles) {
    const srcPath = path.join(PAGES, file);
    const srcHtml = await readText(srcPath);
    const outHtml = await expandIncludes(srcHtml);

    const baseName = file.replace(".src.html", "");

    let outPath;
    if (baseName === "index") {
      outPath = path.join(DIST, "index.html");
    } else if (baseName === "personalisation") {
      outPath = path.join(DIST, "personalisation.html");
    } else {
      outPath = path.join(DIST, baseName, "index.html");
    }

    await ensureDir(path.dirname(outPath));
    await fs.writeFile(outPath, outHtml, "utf8");
    console.log(`Built: ${path.relative(ROOT, outPath)}`);
  }
}

async function copyStatic() {
  const staticItems = [
    "assets",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
    "CNAME"
  ];

  for (const item of staticItems) {
    const src = path.join(ROOT, item);
    if (await exists(src)) {
      const dest = path.join(DIST, item);
      await copyRecursive(src, dest);
      console.log(`Copied: ${item}`);
    }
  }
}

async function main() {
  const mustExist = [
    "templates/partials/head-common.html",
    "templates/partials/header.html",
    "templates/partials/nav.html",
    "templates/partials/footer.html",
    "templates/partials/analytics.html"
  ];

  for (const rel of mustExist) {
    const p = path.join(ROOT, rel);
    if (!(await exists(p))) {
      throw new Error(`Required file missing: ${rel}`);
    }
  }

  await emptyDir(DIST);
  await copyStatic();
  await buildPages();
  console.log("Build complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
