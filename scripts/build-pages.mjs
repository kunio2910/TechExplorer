import {
  cp,
  mkdir,
  mkdtemp,
  writeFile,
  readFile,
  symlink,
  rm,
} from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = process.cwd();
const stage = await mkdtemp(path.join(root, ".pages-build-"));
for (const dir of ["components", "lib", "public"])
  await cp(path.join(root, dir), path.join(stage, dir), {
    recursive: true,
    filter: (source) => !source.includes(path.join("public", "uploads")),
  });
for (const file of ["package.json", "tsconfig.json", "postcss.config.mjs"])
  await cp(path.join(root, file), path.join(stage, file));
await writeFile(
  path.join(stage, "components", "StaticLink.tsx"),
  `import type {AnchorHTMLAttributes} from 'react';import {assetUrl} from '@/lib/runtime';export default function StaticLink({href,...props}:AnchorHTMLAttributes<HTMLAnchorElement>){return <a href={assetUrl(href)} {...props}/>;}`,
);
const explorerFile = path.join(stage, "components", "Explorer.tsx");
await writeFile(
  explorerFile,
  (await readFile(explorerFile, "utf8")).replace(
    'import Link from "next/link";',
    'import Link from "./StaticLink";',
  ),
);
await mkdir(path.join(stage, "app", "admin"), { recursive: true });
for (const file of ["layout.tsx", "globals.css", "error.tsx", "loading.tsx"])
  await cp(path.join(root, "app", file), path.join(stage, "app", file));
await writeFile(
  path.join(stage, "app", "page.tsx"),
  `import Explorer from '@/components/Explorer';import {seedProducts} from '@/lib/seed';export default function Page(){return <Explorer products={seedProducts.filter(p=>p.status==='published')}/>;}`,
);
const productDir = path.join(stage, "app", "explore", "[category]", "[slug]");
await mkdir(productDir, { recursive: true });
await writeFile(
  path.join(productDir, "page.tsx"),
  `import Explorer from '@/components/Explorer';import {seedProducts} from '@/lib/seed';import {notFound} from 'next/navigation';export function generateStaticParams(){return seedProducts.filter(p=>p.status==='published').map(p=>({category:'mainboard',slug:p.slug}));}export default async function Page({params}:{params:Promise<{category:string;slug:string}>}){const {category,slug}=await params;const products=seedProducts.filter(p=>p.status==='published');if(category!=='mainboard'||!products.some(p=>p.slug===slug))notFound();return <Explorer products={products} initialSlug={slug}/>;}`,
);
await writeFile(
  path.join(stage, "app", "admin", "page.tsx"),
  `import StaticAdmin from '@/components/StaticAdmin';import {seedProducts} from '@/lib/seed';export default function Admin(){return <StaticAdmin initialProducts={seedProducts.filter(p=>p.status==='published')}/>;}`,
);
// The temporary stage lives inside the repository, so Node can resolve the
// repository's dependencies through its parent directory. Avoid creating a
// Windows junction here because GitHub Pages builds run fine without it and
// junction creation is blocked in some local environments.
if (process.platform !== "win32") {
  await symlink(
    path.join(root, "node_modules"),
    path.join(stage, "node_modules"),
    "dir",
  );
}
await writeFile(
  path.join(stage, "next.config.mjs"),
  `export default {output:'export',basePath:'/TechExplorer',trailingSlash:true,env:{NEXT_PUBLIC_BASE_PATH:'/TechExplorer'},images:{unoptimized:true},experimental:{cpus:1},turbopack:{root:${JSON.stringify(root)}}};`,
);
const result = spawnSync(
  process.execPath,
  [path.join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
  {
    cwd: stage,
    stdio: "inherit",
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
const output = path.resolve(root, "pages-out");
if (path.dirname(output) !== path.resolve(root))
  throw Error("Unsafe output directory");
await rm(output, { recursive: true, force: true });
await cp(path.join(stage, "out"), output, { recursive: true });
await writeFile(path.join(output, ".nojekyll"), "");
console.log("GitHub Pages export ready: pages-out");
