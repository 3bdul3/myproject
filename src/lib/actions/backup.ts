"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

const dataDir = path.join(process.cwd(), "data");
const projectRoot = process.cwd();

export async function triggerBackup() {
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destDir = path.join(projectRoot, `data-backup-${timestamp}`);
  fs.cpSync(dataDir, destDir, { recursive: true });

  revalidatePath("/settings/backups");
}

export async function listBackups() {
  const session = await auth();
  if (session?.user?.role !== "admin") return [];

  const entries = fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("data-backup-"));

  return entries
    .map((e) => {
      const dirPath = path.join(projectRoot, e.name);
      const files = fs.readdirSync(dirPath);
      const sizeBytes = files.reduce((sum, f) => sum + fs.statSync(path.join(dirPath, f)).size, 0);
      return { name: e.name, fileCount: files.length, sizeBytes };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
}
