// Logic for bunching consecutive chat messages from the same user under a
// single header. A new bunch (with its own avatar + timestamp) starts when the
// author changes or when there's a gap of at least GROUP_GAP_MS since the
// previous message.

export const GROUP_GAP_MS = 10 * 60 * 1000;

interface GroupableMessage {
  user: string;
  timestamp: string;
}

export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** Whether `curr` should render a header rather than bunching under `prev`. */
export function startsNewBunch(
  prev: GroupableMessage | undefined,
  curr: GroupableMessage,
): boolean {
  if (!prev) return true;
  if (prev.user !== curr.user) return true;
  const gap = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
  return gap >= GROUP_GAP_MS;
}

export function formatHeaderTime(timestamp: string, withDate: boolean): string {
  const d = new Date(timestamp);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  if (!withDate) return time;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}
