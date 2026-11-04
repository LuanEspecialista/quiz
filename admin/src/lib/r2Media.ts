import { supabase } from "./supabase";

export const R2_PATH_PREFIX = "r2://";
export const R2_PUBLIC_ORIGIN = "https://media.luan-especialista.pro";

export type R2MediaKind = "cover" | "gallery" | "typology" | "plant" | "presentation" | "blog";

export function isR2Path(value?: string | null): value is string {
  return Boolean(value?.startsWith(R2_PATH_PREFIX));
}

export function r2Key(value?: string | null) {
  return isR2Path(value) ? value.slice(R2_PATH_PREFIX.length) : value || "";
}

export function r2PublicUrl(value?: string | null) {
  const key = r2Key(value);
  if (!key) return "";
  return `${R2_PUBLIC_ORIGIN}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function uploadR2Media(file: File, input: {
  kind: R2MediaKind;
  enterpriseId: string;
  enterpriseName: string;
  typologyId?: string;
}, onProgress?: (loaded: number, total: number) => void) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) throw new Error("A sessão administrativa expirou. Entre novamente para enviar o arquivo.");
  const body = new FormData();
  body.append("file", file);
  body.append("kind", input.kind);
  body.append("enterpriseId", input.enterpriseId);
  body.append("enterpriseName", input.enterpriseName);
  if (input.typologyId) body.append("typologyId", input.typologyId);
  if (onProgress) {
    return new Promise<{ ok: true; key: string; path: string; url: string; folder: string; kind: R2MediaKind }>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", "/api/media");
      request.timeout = 10 * 60_000;
      request.setRequestHeader("Authorization", `Bearer ${sessionData.session!.access_token}`);
      request.upload.onprogress = (event) => onProgress(event.loaded, event.lengthComputable && event.total > 0 ? event.total : file.size);
      request.onload = () => {
        let payload: Record<string, unknown> = {};
        try { payload = JSON.parse(request.responseText || "{}") as Record<string, unknown>; } catch { /* use the generic response below */ }
        if (request.status >= 200 && request.status < 300) {
          resolve(payload as { ok: true; key: string; path: string; url: string; folder: string; kind: R2MediaKind });
        } else {
          reject(new Error(typeof payload.error === "string" ? payload.error : "Não foi possível enviar o arquivo para o Cloudflare R2."));
        }
      };
      request.onerror = () => reject(new Error("Falha de rede durante o upload do arquivo."));
      request.ontimeout = () => reject(new Error("O upload excedeu o limite de 10 minutos. Tente novamente."));
      request.onabort = () => reject(new Error("O upload foi interrompido."));
      request.send(body);
    });
  }
  const response = await fetch("/api/media", { method: "POST", headers: { Authorization: `Bearer ${sessionData.session.access_token}` }, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Não foi possível enviar o arquivo para o Cloudflare R2.");
  return payload as { ok: true; key: string; path: string; url: string; folder: string; kind: R2MediaKind };
}

export async function deleteR2Media(path?: string | null) {
  const key = r2Key(path);
  if (!key) return;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) throw new Error("A sessão administrativa expirou.");
  const response = await fetch("/api/media", { method: "DELETE", headers: { Authorization: `Bearer ${sessionData.session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ key }) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Não foi possível remover o arquivo do Cloudflare R2.");
  }
}
