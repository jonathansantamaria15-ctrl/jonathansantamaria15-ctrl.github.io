/* Lanzador de escritorio para HosteleriaSaaS (Windows, x86-64).
 *
 * Compilado con MinGW-w64 (ver scripts/desktop/build.sh): un .exe nativo
 * minúsculo (~100 KB) sin runtime embebido. Reutiliza el Node.js que el
 * usuario ya tiene instalado: arranca server\server.js como proceso hijo
 * (heredando esta misma consola) y, en cuanto el servidor responde en
 * localhost, abre el navegador por defecto.
 *
 * La clave secreta de Supabase vive solo en el archivo .env.local que el
 * usuario coloca junto a este .exe -- nunca se compila dentro del binario.
 */
#include <windows.h>
#include <processenv.h>
#include <shellapi.h>
#include <winhttp.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#pragma comment(lib, "winhttp.lib")
#pragma comment(lib, "shell32.lib")

#define PORT 3000

static void press_enter_to_exit(int code) {
  printf("\nPulsa Enter para cerrar esta ventana...\n");
  fflush(stdout);
  getchar();
  ExitProcess((UINT)code);
}

static int path_exists(const char *path) {
  DWORD attrs = GetFileAttributesA(path);
  return attrs != INVALID_FILE_ATTRIBUTES;
}

/* Busca SUPABASE_SERVICE_ROLE_KEY=... en .env.local solo para validar que
 * el archivo esta relleno; el proceso hijo hereda el archivo via su propio
 * cwd + Node no necesita que se lo parseemos aqui (server.js no lee
 * .env.local por si mismo, asi que lo cargamos nosotros como variables de
 * entorno del proceso hijo). */
static int load_env_file(const char *path, char *env_block, size_t env_block_size, size_t *out_len) {
  FILE *f = fopen(path, "rb");
  if (!f) return 0;

  char line[4096];
  size_t offset = 0;
  int found_key = 0;

  while (fgets(line, sizeof(line), f)) {
    size_t len = strlen(line);
    while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r')) line[--len] = '\0';

    char *trimmed = line;
    while (*trimmed == ' ' || *trimmed == '\t') trimmed++;
    if (*trimmed == '\0' || *trimmed == '#') continue;

    char *eq = strchr(trimmed, '=');
    if (!eq) continue;

    if (strncmp(trimmed, "SUPABASE_SERVICE_ROLE_KEY", eq - trimmed) == 0 && eq[1] != '\0') {
      found_key = 1;
    }

    size_t piece_len = strlen(trimmed);
    if (offset + piece_len + 2 >= env_block_size) break;
    memcpy(env_block + offset, trimmed, piece_len);
    offset += piece_len;
    env_block[offset++] = '\0';
  }
  fclose(f);

  env_block[offset++] = '\0'; /* doble NUL final requerido por CreateProcess */
  *out_len = offset;
  return found_key;
}

static int wait_for_server(void) {
  HINTERNET hSession = WinHttpOpen(L"HosteleriaSaaS-Launcher/1.0", WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
                                    WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
  if (!hSession) return 0;

  int ok = 0;
  for (int attempt = 0; attempt < 60 && !ok; attempt++) {
    Sleep(500);
    HINTERNET hConnect = WinHttpConnect(hSession, L"localhost", PORT, 0);
    if (!hConnect) continue;
    HINTERNET hRequest = WinHttpOpenRequest(hConnect, L"GET", L"/", NULL, WINHTTP_NO_REFERER,
                                             WINHTTP_DEFAULT_ACCEPT_TYPES, 0);
    if (hRequest) {
      if (WinHttpSendRequest(hRequest, WINHTTP_NO_ADDITIONAL_HEADERS, 0, WINHTTP_NO_REQUEST_DATA, 0, 0, 0) &&
          WinHttpReceiveResponse(hRequest, NULL)) {
        ok = 1;
      }
      WinHttpCloseHandle(hRequest);
    }
    WinHttpCloseHandle(hConnect);
  }
  WinHttpCloseHandle(hSession);
  return ok;
}

int main(void) {
  printf("HosteleriaSaaS - iniciando...\n\n");

  char exePath[MAX_PATH];
  GetModuleFileNameA(NULL, exePath, MAX_PATH);
  char *lastSlash = strrchr(exePath, '\\');
  if (lastSlash) *lastSlash = '\0';
  char baseDir[MAX_PATH];
  strncpy(baseDir, exePath, MAX_PATH);

  char serverDir[MAX_PATH], serverJs[MAX_PATH], envPath[MAX_PATH], envExamplePath[MAX_PATH];
  snprintf(serverDir, MAX_PATH, "%s\\server", baseDir);
  snprintf(serverJs, MAX_PATH, "%s\\server.js", serverDir);
  snprintf(envPath, MAX_PATH, "%s\\.env.local", baseDir);
  snprintf(envExamplePath, MAX_PATH, "%s\\.env.local.example", baseDir);

  if (!path_exists(serverJs)) {
    printf("No se encuentra la carpeta 'server' junto a este programa.\n");
    printf("Vuelve a descargar el paquete completo (el .exe no funciona suelto).\n");
    press_enter_to_exit(1);
  }

  if (!path_exists(envPath)) {
    printf("Falta el archivo .env.local junto a este programa.\n");
    if (path_exists(envExamplePath)) {
      printf("Copia .env.local.example a .env.local y rellena tus claves de Supabase.\n");
    }
    press_enter_to_exit(1);
  }

  static char envBlock[65536];
  size_t envLen = 0;
  if (!load_env_file(envPath, envBlock, sizeof(envBlock), &envLen)) {
    printf("El archivo .env.local no tiene SUPABASE_SERVICE_ROLE_KEY. Revisa DEPLOYMENT.md.\n");
    press_enter_to_exit(1);
  }

  /* Combina el entorno heredado (para que PATH, etc. sigan disponibles)
   * con lo leido de .env.local, y añade PORT explicito. */
  char *parentEnv = GetEnvironmentStringsA();
  size_t parentLen = 0;
  {
    const char *p = parentEnv;
    while (*p) {
      size_t l = strlen(p) + 1;
      parentLen += l;
      p += l;
    }
    parentLen += 1;
  }

  static char portVar[] = "PORT=3000";
  size_t totalLen = parentLen + envLen + strlen(portVar) + 1 + 1;
  char *fullEnv = (char *)malloc(totalLen);
  size_t off = 0;
  memcpy(fullEnv + off, parentEnv, parentLen - 1);
  off += parentLen - 1;
  memcpy(fullEnv + off, envBlock, envLen);
  off += envLen;
  memcpy(fullEnv + off, portVar, strlen(portVar) + 1);
  off += strlen(portVar) + 1;
  fullEnv[off++] = '\0';
  FreeEnvironmentStringsA(parentEnv);

  char cmdLine[] = "node.exe server.js";
  STARTUPINFOA si;
  PROCESS_INFORMATION pi;
  ZeroMemory(&si, sizeof(si));
  si.cb = sizeof(si);
  ZeroMemory(&pi, sizeof(pi));

  BOOL created = CreateProcessA(NULL, cmdLine, NULL, NULL, TRUE, 0, fullEnv, serverDir, &si, &pi);
  free(fullEnv);

  if (!created) {
    printf("No se pudo arrancar el servidor. ¿Tienes Node.js instalado y en el PATH?\n");
    press_enter_to_exit(1);
  }

  if (wait_for_server()) {
    printf("\nListo. Abriendo http://localhost:%d en tu navegador...\n", PORT);
    printf("Deja esta ventana abierta mientras uses la aplicacion. Cierrala para apagar el servidor.\n\n");
    char url[64];
    snprintf(url, sizeof(url), "http://localhost:%d", PORT);
    ShellExecuteA(NULL, "open", url, NULL, NULL, SW_SHOWNORMAL);
  } else {
    printf("El servidor tardo demasiado en responder. Revisa los mensajes de arriba.\n");
  }

  WaitForSingleObject(pi.hProcess, INFINITE);
  DWORD exitCode = 0;
  GetExitCodeProcess(pi.hProcess, &exitCode);
  CloseHandle(pi.hProcess);
  CloseHandle(pi.hThread);

  if (exitCode != 0) {
    printf("\nEl servidor se detuvo con un error (codigo %lu).\n", exitCode);
    press_enter_to_exit((int)exitCode);
  }
  return 0;
}
