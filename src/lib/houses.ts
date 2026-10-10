import type { GetSchHousesResponse } from "../types/house.types";

// A house usually carries a colour in its name ("Red House", "Ashoka Blue"); use it for accents.
const NAMED_COLORS: [string, string][] = [
  ["red", "#dc2626"],
  ["maroon", "#9f1239"],
  ["blue", "#2563eb"],
  ["sky", "#0ea5e9"],
  ["green", "#16a34a"],
  ["yellow", "#eab308"],
  ["gold", "#ca8a04"],
  ["orange", "#ea580c"],
  ["saffron", "#f59e0b"],
  ["purple", "#9333ea"],
  ["violet", "#7c3aed"],
  ["pink", "#ec4899"],
  ["black", "#1f2937"],
  ["white", "#64748b"],
  ["silver", "#64748b"],
];
const FALLBACK_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626", "#0ea5e9", "#ca8a04", "#ec4899"];

export function houseColor(name: string, index: number): string {
  const lower = name.toLowerCase();
  const hit = NAMED_COLORS.find(([word]) => lower.includes(word));
  return hit ? hit[1] : FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/** House names of one school from GET /school-settings/get-sch-house (which may return every school's). */
export function housesFromResponse(res: GetSchHousesResponse, schId: string): string[] {
  const docs = res.schHouse ?? res.schClasses ?? [];
  return docs
    .filter((doc) => (typeof doc.schId === "string" ? doc.schId : doc.schId?._id) === schId)
    .flatMap((doc) => doc.house ?? []);
}
