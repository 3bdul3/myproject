import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const destDir = path.join(process.cwd(), `data-backup-${timestamp}`);

fs.cpSync(dataDir, destDir, { recursive: true });

console.log(`Backed up data/ to ${destDir}`);
process.exit(0);
