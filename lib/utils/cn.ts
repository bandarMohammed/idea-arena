/** Tiny className joiner — avoids pulling in clsx for a handful of call sites. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
