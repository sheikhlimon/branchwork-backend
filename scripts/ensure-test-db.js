#!/usr/bin/env node

/**
 * Branchwork Test Database Readiness Guard
 *
 * Ensures PostgreSQL is reachable before Jest starts.
 * If stopped, automatically starts it via Docker/Podman compose and pushes the schema.
 * If Docker is unavailable, prints an actionable guide rather than 37 failing test traces.
 */

const net = require("net");
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT_DIR, ".env");
const ENV_EXAMPLE_PATH = path.join(ROOT_DIR, ".env.example");
const PRISMA_ENV_PATH = path.join(ROOT_DIR, "prisma", ".env");

// 1. Auto-create .env from .env.example if missing
if (!fs.existsSync(ENV_PATH) && fs.existsSync(ENV_EXAMPLE_PATH)) {
  try {
    fs.copyFileSync(ENV_EXAMPLE_PATH, ENV_PATH);
    console.log("[Branchwork] Auto-created .env from .env.example");
  } catch (err) {
    console.warn(`[Branchwork] Warning: Could not auto-create .env: ${err.message}`);
  }
}

// 2. Clean up redundant prisma/.env to avoid Prisma dual-env conflicts
if (fs.existsSync(PRISMA_ENV_PATH)) {
  try {
    fs.rmSync(PRISMA_ENV_PATH, { force: true, recursive: true });
    console.log("[Branchwork] Cleaned up conflicting prisma/.env file");
  } catch (err) {
    console.warn(`[Branchwork] Warning: Could not remove prisma/.env: ${err.message}`);
  }
}

// 3. Resolve database host and port
function getDbTarget() {
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl && fs.existsSync(ENV_PATH)) {
    const envContent = fs.readFileSync(ENV_PATH, "utf8");
    const match = envContent.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (match) {
      dbUrl = match[1];
    }
  }

  if (!dbUrl) {
    return { host: "127.0.0.1", port: 5432 };
  }

  try {
    const parsed = new URL(dbUrl);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    };
  } catch (urlErr) {
    // If standard URL parsing fails (e.g. unencoded credentials), extract via regex
    const regexMatch = dbUrl.match(/@([^/:?#]+)(?::(\d+))?/);
    if (regexMatch) {
      return {
        host: regexMatch[1] || "127.0.0.1",
        port: regexMatch[2] ? parseInt(regexMatch[2], 10) : 5432,
      };
    }

    console.warn(
      `[Branchwork] Warning: Failed to parse DATABASE_URL ("${dbUrl}"): ${urlErr.message}. Defaulting to 127.0.0.1:5432.`
    );
    return { host: "127.0.0.1", port: 5432 };
  }
}

// 4. Check if TCP port is open
function checkPortOpen(host, port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    const finish = (result) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));

    // Prefer IPv4 loopback for localhost to avoid IPv6 resolution delays
    const targetHost = host === "localhost" ? "127.0.0.1" : host;
    socket.connect(port, targetHost);
  });
}

// 5. Poll port until ready
async function waitForPort(host, port, maxWaitMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const isOpen = await checkPortOpen(host, port, 500);
    if (isOpen) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// 6. Detect compose command (docker compose or podman compose)
function getComposeCommand() {
  const dockerCheck = spawnSync("docker", ["compose", "version"], { stdio: "ignore" });
  if (dockerCheck.status === 0) {
    return ["docker", "compose"];
  }

  const podmanCheck = spawnSync("podman", ["compose", "version"], { stdio: "ignore" });
  if (podmanCheck.status === 0) {
    return ["podman", "compose"];
  }

  return null;
}

function printFriendlyErrorBanner(host, port) {
  console.error("\n" + "=".repeat(78));
  console.error("⚠️  [Branchwork] PostgreSQL database is not reachable at " + host + ":" + port);
  console.error("=".repeat(78));
  console.error("Branchwork uses a live PostgreSQL integration test suite to verify:");
  console.error("  • Multi-tenant catalog isolation (zero cross-branch data leakage)");
  console.error("  • Branch-scoped RBAC permissions (owner vs branch staff)");
  console.error("  • Relational integrity (@@unique([organizationId, sku]), onDelete: Restrict)\n");
  console.error("👉 To start the database container, run:");
  console.error("     docker compose up -d postgres   (or: podman compose up -d postgres)\n");
  console.error("   Then re-run tests with:");
  console.error("     npm test");
  console.error("=".repeat(78) + "\n");
}

async function main() {
  const { host, port } = getDbTarget();

  const isAlreadyOpen = await checkPortOpen(host, port, 800);
  if (isAlreadyOpen) {
    // Database is reachable, proceed with tests immediately
    return;
  }

  console.log(`[Branchwork] PostgreSQL not detected at ${host}:${port}. Checking container service...`);

  const composeCmd = getComposeCommand();
  if (!composeCmd) {
    printFriendlyErrorBanner(host, port);
    process.exit(1);
  }

  console.log(`[Branchwork] Starting PostgreSQL container via ${composeCmd.join(" ")} up -d postgres...`);
  const startResult = spawnSync(composeCmd[0], [...composeCmd.slice(1), "up", "-d", "postgres"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  if (startResult.status !== 0) {
    printFriendlyErrorBanner(host, port);
    process.exit(1);
  }

  console.log("[Branchwork] Waiting for PostgreSQL to be ready...");
  const isNowOpen = await waitForPort(host, port, 20000);

  if (!isNowOpen) {
    printFriendlyErrorBanner(host, port);
    process.exit(1);
  }

  // Ensure Prisma tables exist in the freshly started database
  try {
    execSync("npx prisma db push --skip-generate", {
      cwd: ROOT_DIR,
      stdio: "pipe",
    });
    console.log("[Branchwork] ✅ PostgreSQL is ready and schema is synchronized. Starting tests...\n");
  } catch (pushErr) {
    console.warn(`[Branchwork] Warning: Schema push returned a notice (${pushErr.message}). Starting tests...\n`);
  }
}

main().catch((err) => {
  console.error("[Branchwork] Unexpected error during database readiness check:", err);
  process.exit(1);
});
