export type TowerStructure = "nao_informada" | "unica" | "multipla";

const plain = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toUpperCase()
  .trim();

export const normalizeUnitCode = (value: unknown) => plain(value).replace(/[^A-Z0-9]/g, "");

export const normalizeTower = (value: unknown, structure: TowerStructure) => {
  if (structure === "unica") return "UNICA";
  const normalized = plain(value)
    .replace(/^(TORRE|BLOCO|EDIFICIO|ED)\s*/g, "")
    .replace(/[^A-Z0-9]/g, "");
  return normalized.replace(/^0+(?=\d)/, "");
};

export const unitIdentity = (code: unknown, tower: unknown, structure: TowerStructure) => {
  const normalizedCode = normalizeUnitCode(code);
  const normalizedTower = normalizeTower(tower, structure);
  if (!normalizedCode || structure === "nao_informada" || (structure === "multipla" && !normalizedTower)) return "";
  return `${normalizedTower}:${normalizedCode}`;
};

export const canonicalSku = (enterpriseId: string, code: unknown, tower: unknown, structure: TowerStructure) =>
  `${enterpriseId}-${unitIdentity(code, tower, structure)}`;
