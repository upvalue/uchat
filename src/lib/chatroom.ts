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
}

/**
 * Generate a chatroom title from a date.
 *
 * Current granularity: **daily** (`YYYY-MM-DD`).
 * To restore hourly granularity, append the time components below.
 */
export function chatroomTitle(options: ChatroomTitleOptions = {}): string {
  const date = options.date ?? new Date();

  if (options.timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: options.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const p = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return `${p("year")}-${p("month")}-${p("day")}`;
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
