// Cliente HTTP de baixo nível pra loja pública (ASP.NET MVC, sem API
// JSON/GraphQL — confirmado por inspeção: sem generator tag, scripts jQuery
// clássicos, robots.txt/sitemap.xml redirecionando pra "/"). Sem "server-only"
// de propósito, mesmo motivo de src/modules/guide/ingest.ts (usado por
// scripts/sync-store.ts, standalone fora do bundler do Next).
//
// Preço só aparece com sessão autenticada (sem login, todo produto mostra
// "R$ 0,00" — confirmado ao vivo), então toda a sincronização depende de um
// login bem-sucedido antes de ler qualquer página.

const BASE_URL = "https://loja.atlanticanatural.com.br";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 800;
// Delay entre requests sequenciais — não sobrecarregar o site do cliente
// (o mesmo site que os clientes finais usam pra comprar).
const THROTTLE_DELAY_MS = 350;

export class StoreAuthError extends Error {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Cookie jar mínimo em memória: só precisa sobreviver durante uma execução de
// sync, nunca é persistido. `.ASPXAUTH` (forms auth do ASP.NET) e `CartCode`
// são os cookies relevantes — confirmado inspecionando a resposta de login.
class CookieJar {
  private cookies = new Map<string, string>();

  applyResponse(response: Response) {
    for (const setCookie of response.headers.getSetCookie()) {
      const [pair] = setCookie.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      this.cookies.set(name, value);
    }
  }

  get header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }
}

export class StoreSession {
  private jar = new CookieJar();
  private loggedIn = false;

  // `redirect: "manual"` de propósito: com "follow" (o padrão), o fetch do
  // Node/undici segue o redirect internamente e só expõe os headers da
  // resposta FINAL — o Set-Cookie do 302 de login (onde o `.ASPXAUTH` é
  // setado) se perde no meio do caminho. Com "manual" a gente vê o 302 em si,
  // aplica o cookie, e segue o Location manualmente quando precisar do
  // conteúdo da página redirecionada (não precisa pra login).
  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        let response = await fetch(`${BASE_URL}${path}`, {
          ...init,
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            Cookie: this.jar.header,
            ...init.headers,
          },
        });
        this.jar.applyResponse(response);

        // Segue redirects manualmente (GET, sem reenviar o body do POST
        // original) pra devolver a página final quando o chamador precisar
        // do HTML — aplicando o cookie jar a cada salto da cadeia.
        let redirectCount = 0;
        while (response.status >= 300 && response.status < 400 && redirectCount < 5) {
          const location = response.headers.get("location");
          if (!location) break;
          response = await fetch(new URL(location, `${BASE_URL}${path}`), {
            redirect: "manual",
            signal: controller.signal,
            headers: { "User-Agent": USER_AGENT, Cookie: this.jar.header },
          });
          this.jar.applyResponse(response);
          redirectCount++;
        }

        return response;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_DELAY_MS * attempt);
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Falha ao buscar ${path}`);
  }

  // Autentica com a conta de consultor. Credenciais nunca são logadas — só o
  // resultado (sucesso/falha). Sem login, todos os preços vêm zerados.
  async login(): Promise<void> {
    const username = process.env.LOJA_ATLANTICA_USERNAME;
    const password = process.env.LOJA_ATLANTICA_PASSWORD;
    if (!username || !password) {
      throw new StoreAuthError(
        "LOJA_ATLANTICA_USERNAME/LOJA_ATLANTICA_PASSWORD não configuradas no ambiente."
      );
    }

    // Visita a página de login primeiro pra pegar cookies de sessão iniciais
    // (o form não tem CSRF token, mas a sessão em si é iniciada aqui).
    await this.request("/clientes/login");

    const body = new URLSearchParams({ Username: username, Password: password, Remember: "false" });
    await this.request("/clientes/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    // `.ASPXAUTH` é o cookie de forms authentication do ASP.NET — só existe
    // depois de um login aceito (confirmado inspecionando a troca real).
    if (!this.jar.has(".ASPXAUTH")) {
      throw new StoreAuthError("Login na loja falhou — confira LOJA_ATLANTICA_USERNAME/PASSWORD.");
    }

    this.loggedIn = true;
  }

  async fetchHtml(path: string): Promise<string> {
    if (!this.loggedIn) {
      throw new StoreAuthError("fetchHtml chamado antes de login() — preço/estoque exigem sessão autenticada.");
    }
    await sleep(THROTTLE_DELAY_MS);
    const response = await this.request(path);
    if (!response.ok) {
      throw new Error(`GET ${path} retornou HTTP ${response.status}`);
    }
    return response.text();
  }
}
