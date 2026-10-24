import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

function parseChangelog(md: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  // Format: "## [2.5.0] - 2026-10-24" diikuti heading/isi
  const re = /^## \[([^\]]+)\] - (.+)$/gm;
  const matches: { version: string; date: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    matches.push({ version: m[1], date: m[2].trim(), index: m.index });
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].version.length + matches[i].date.length + 9;
    const end = i + 1 < matches.length ? matches[i + 1].index : md.length;
    const body = md.slice(matches[i].index, end);
    const titleMatch = body.match(/^###\s+(.+)/m);
    const items = [...body.matchAll(/^-\s+(.+)$/gm)].map((x) => x[1]);
    entries.push({
      version: matches[i].version,
      date: matches[i].date,
      title: titleMatch ? titleMatch[1].trim() : "",
      items,
    });
  }
  return entries;
}

export async function GET() {
  try {
    let md = "";
    let changelogMtime: string | null = null;
    let buildTime: string | null = null;

    const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
    if (fs.existsSync(changelogPath)) {
      md = fs.readFileSync(changelogPath, "utf-8");
      const mt = fs.statSync(changelogPath).mtime;
      // Konversi ke WIB (UTC+7)
      changelogMtime = new Date(mt.getTime() + 7 * 3600 * 1000)
        .toISOString()
        .replace("T", " ")
        .slice(0, 16)
        .concat(" WIB");
    }

    const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
    if (fs.existsSync(buildIdPath)) {
      const mt = fs.statSync(buildIdPath).mtime;
      buildTime = new Date(mt.getTime() + 7 * 3600 * 1000)
        .toISOString()
        .replace("T", " ")
        .slice(0, 16)
        .concat(" WIB");
    }

    const entries = parseChangelog(md);
    return NextResponse.json({
      success: true,
      data: {
        latest: entries[0] || null,
        entries,
        changelogMtime,
        buildTime,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
