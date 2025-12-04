export function toTagArray(val: unknown): string[] {
  if (Array.isArray(val))
    return val.map((t) => String(t).trim()).filter(Boolean);
  if (typeof val === "string" && val.length) {
    return val
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export function toTagInput(tags: string[]): string {
  return tags.join(", ");
}
