// Lanzador de escritorio para HosteleriaSaaS.
//
// Se distribuye compilado como HosteleriaSaaS.exe (Node.js Single Executable
// Application, ver scripts/desktop/build.sh) junto a una carpeta server/ (el
// build de Next.js en modo standalone) y un .env.local que el usuario
// rellena con sus claves de Supabase. Al hacer doble clic: arranca
// server/server.js como proceso hijo (usando el Node.js que el usuario ya
// tiene instalado) y abre el navegador en localhost.
import { spawn, exec } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { isSea } from "node:sea";

const PORT = 3000;

// Como binario SEA, process.execPath es la ruta real del .exe; ejecutando
// este archivo directamente con `node launcher.mjs` (pruebas locales),
// usamos su propia ubicacion.
const baseDir = isSea() ? path.dirname(process.execPath) : path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(baseDir, "server");
const envPath = path.join(baseDir, ".env.local");
const envExamplePath = path.join(baseDir, ".env.local.example");

function waitForEnterAndExit(code) {
  console.log("\nPulsa Enter para cerrar esta ventana...");
  process.stdin.resume();
  process.stdin.once("data", () => process.exit(code));
}

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function waitForServer(url, timeoutMs, onDone) {
  const start = Date.now();
  (function attempt() {
    http
      .get(url, (res) => {
        res.resume();
        onDone(true);
      })
      .on("error", () => {
        if (Date.now() - start > timeoutMs) {
          onDone(false);
          return;
        }
        setTimeout(attempt, 500);
      });
  })();
}

function openBrowser(url) {
  if (process.platform === "win32") {
    exec(`start "" "${url}"`);
  } else if (process.platform === "darwin") {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

function main() {
  console.log("HosteleriaSaaS - iniciando...\n");

  if (!fs.existsSync(serverDir) || !fs.existsSync(path.join(serverDir, "server.js"))) {
    console.error("No se encuentra la carpeta 'server' junto a este programa.");
    console.error("Vuelve a descargar el paquete completo (el .exe no funciona suelto).");
    waitForEnterAndExit(1);
    return;
  }

  if (!fs.existsSync(envPath)) {
    console.error("Falta el archivo .env.local junto a este programa.");
    if (fs.existsSync(envExamplePath)) {
      console.error("Copia .env.local.example a .env.local y rellena tus claves de Supabase.");
    }
    waitForEnterAndExit(1);
    return;
  }

  const fileEnv = loadEnvFile(envPath);
  if (!fileEnv.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("El archivo .env.local no tiene SUPABASE_SERVICE_ROLE_KEY. Revisa DEPLOYMENT.md.");
    waitForEnterAndExit(1);
    return;
  }

  const child = spawn(process.platform === "win32" ? "node.exe" : "node", ["server.js"], {
    cwd: serverDir,
    env: {
      ...process.env,
      ...fileEnv,
      PORT: String(PORT),
    },
    stdio: "inherit",
    windowsHide: false,
  });

  child.on("error", (err) => {
    console.error("No se pudo arrancar el servidor. ¿Tienes Node.js instalado y en el PATH?");
    console.error(err.message);
    waitForEnterAndExit(1);
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\nEl servidor se detuvo con un error (codigo ${code}).`);
      waitForEnterAndExit(code);
    } else {
      process.exit(0);
    }
  });

  waitForServer(`http://localhost:${PORT}`, 30000, (ok) => {
    if (ok) {
      console.log(`\nListo. Abriendo http://localhost:${PORT} en tu navegador...`);
      console.log("Deja esta ventana abierta mientras uses la aplicacion. Ciérrala para apagar el servidor.\n");
      openBrowser(`http://localhost:${PORT}`);
    } else {
      console.error("El servidor tardo demasiado en responder. Revisa los mensajes de arriba.");
    }
  });

  process.on("SIGINT", () => {
    child.kill();
    process.exit(0);
  });
}

main();
