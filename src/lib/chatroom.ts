/**
 * Central chatroom title generator and path utilities.
 *
 * Change the implementation here to adjust the naming granularity across the
 * entire application (frontend channel creation dialog, bot heartbeats, etc.).
 */

/**
 * Build a room path from folder and name.
 * Returns "folder/name" if folder is non-empty, otherwise just "name".
 */
export function roomPath(folder: string | null | undefined, name: string): string {
  return folder ? `${folder}/${name}` : name;
}

export interface ChatroomTitleOptions {
  /** IANA timezone (e.g. "America/Los_Angeles"). Omit for local time. */
  timeZone?: string;
  /** Date to generate the title for. Defaults to now. */
  date?: Date;
  /** Append `HHMMSS` for finer granularity (useful for one-off bot chats). */
  detailed?: boolean;
}

/**
 * Generate a chatroom title from a date.
 *
 * Default granularity: **daily** (`YYYY-MM-DD`).
 * With `detailed: true`: `YYYY-MM-DD HHMMSS`.
 */
export function chatroomTitle(options: ChatroomTitleOptions = {}): string {
  const date = options.date ?? new Date();

  if (options.timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: options.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const p = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    const day = `${p("year")}-${p("month")}-${p("day")}`;
    if (!options.detailed) return day;
    // Intl returns hour "24" at midnight in some locales; normalize to "00".
    const hh = p("hour") === "24" ? "00" : p("hour");
    return `${day} ${hh}${p("minute")}${p("second")}`;
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const day = `${yyyy}-${mm}-${dd}`;
  if (!options.detailed) return day;
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${day} ${hh}${mi}${ss}`;
}
