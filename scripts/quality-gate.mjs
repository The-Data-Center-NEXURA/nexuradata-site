#!/usr/bin/env node
/**
 * Runs the full NEXURADATA quality gate and records a local validation marker.
 *
 * The marker lives under .git/ so it is never committed. The deploy hook checks
 * it before Cloudflare production deploy commands.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const markerPath = join(ROOT, ".git", "nexuradata-quality-gate.json");

const steps = [
    ["npm", ["run", "ui:smoke"]],
    ["npm", ["run", "check"]],
    ["npm", ["run", "test:coverage"]],
    ["npm", ["run", "build"]],
    ["npm", ["run", "secret:scan"]],
    ["git", ["diff", "--check"]]
];

const run = (command, args) => {
    console.log(`\n$ ${[command, ...args].join(" ")}`);
    const result = spawnSync(command, args, {
        cwd: ROOT,
        stdio: "inherit",
        shell: false
    });

    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
};

for (const [command, args] of steps) {
    run(command, args);
}

if (existsSync(join(ROOT, ".git"))) {
    mkdirSync(dirname(markerPath), { recursive: true });
    writeFileSync(markerPath, `${JSON.stringify({
        status: "passed",
        generatedAt: new Date().toISOString(),
        command: "npm run quality:gate",
        steps: steps.map(([command, args]) => [command, ...args].join(" "))
    }, null, 2)}\n`, "utf8");
    console.log(`\nQuality gate marker written: ${markerPath}`);
} else {
    console.log("\n.git directory not found; quality gate passed but no local marker was written.");
}