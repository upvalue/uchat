/**
 * AnsiMessage renders terminal output with ANSI escape codes as styled HTML.
 *
 * Uses ansi-to-pre (https://github.com/isaacs/ansi-to-pre) which handles the
 * full suite of escape sequences needed for programs like fastfetch: cursor
 * movement, erase sequences, 256/24-bit colors, OSC hyperlinks, and SGR
 * attributes. The library outputs a <pre> HTML string which we inject via
 * dangerouslySetInnerHTML inside a wrapper <div>.
 *
 * Sending ANSI output:
 *   uchat capture <room> -- <command>    # recommended: forces PTY via script(1)
 *   <cmd> | uchat send <room> --format ansi   # works if cmd outputs ANSI to pipes
 *
 * The optional `cols` prop is used to cap the rendered width to match the
 * terminal column count the content was produced at (stored in body.cols).
 */
import { useMemo } from "react";
import { ansiToPre } from "ansi-to-pre";

export function AnsiMessage({ text, cols }: { text: string; cols?: number }) {
  const html = useMemo(() => ansiToPre(text), [text]);
  return (
    <div
      className="ansi-message"
      style={cols ? { maxWidth: `${cols}ch` } : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
