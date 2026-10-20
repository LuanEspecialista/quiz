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
}) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) throw new Error("A sessão administrativa expirou. Entre novamente para enviar o arquivo.");
  const body = new FormData();
  body.append("file", file);
  body.append("kind", input.kind);
  body.append("enterpriseId", input.enterpriseId);
  body.append("enterpriseName", input.enterpriseName);
  if (input.typologyId) body.append("typologyId", input.typologyId);
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
