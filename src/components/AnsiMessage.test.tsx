/**
 * Tests for the ANSI message rendering integration with ansi-to-pre.
 * Since AnsiMessage is a thin wrapper, we test ansiToPre directly to verify
 * it handles the escape sequences our use case (fastfetch, ls --color, etc.) produces.
 */
import { describe, it, expect } from "vitest";
import { ansiToPre } from "ansi-to-pre";

describe("ansi-to-pre integration", () => {
  it("wraps output in a <pre> tag", () => {
    const html = ansiToPre("hello");
    expect(html).toMatch(/^<pre/);
    expect(html).toMatch(/<\/pre>$/);
  });

  it("renders plain text without transformation", () => {
    const html = ansiToPre("hello world");
    expect(html).toContain("hello world");
  });

  it("does not leak raw ANSI codes into output", () => {
    const red = "\x1b[31mred\x1b[0m";
    const html = ansiToPre(red);
    expect(html).not.toContain("\x1b[");
    expect(html).toContain("red");
  });

  it("applies foreground color as inline style", () => {
    const red = "\x1b[31mred\x1b[0m";
    const html = ansiToPre(red);
    expect(html).toMatch(/color:/);
  });

  it("handles 256-color codes", () => {
    const colored = "\x1b[38;5;196mred256\x1b[0m";
    const html = ansiToPre(colored);
    expect(html).not.toContain("\x1b[");
    expect(html).toContain("red256");
  });

  it("handles 24-bit RGB truecolor", () => {
    const colored = "\x1b[38;2;255;128;0morange\x1b[0m";
    const html = ansiToPre(colored);
    expect(html).not.toContain("\x1b[");
    expect(html).toContain("orange");
    // ansi-to-pre converts truecolor to hex notation
    expect(html).toMatch(/color:#[0-9a-f]{6}/i);
  });

  it("handles bold text", () => {
    const bold = "\x1b[1mbold\x1b[0m";
    const html = ansiToPre(bold);
    expect(html).toMatch(/font-weight:\s*bold/);
    expect(html).toContain("bold");
  });

  it("handles carriage return overwriting", () => {
    // \r moves cursor to start of line; 'world' overwrites 'hello'
    const html = ansiToPre("hello\rworld");
    expect(html).toContain("world");
    expect(html).not.toContain("hello");
  });

  it("handles OSC sequences (window title becomes title attribute)", () => {
    // OSC 0 sets window title — ansi-to-pre uses it as the <pre title="..."> attribute
    const withTitle = "\x1b]0;My Terminal\x07hello";
    const html = ansiToPre(withTitle);
    expect(html).toContain("hello");
    expect(html).not.toContain("\x1b]");
    // Raw escape bytes must not appear in output
    expect(html).not.toMatch(/\x1b/);
  });

  it("handles cursor movement (fastfetch-style layout)", () => {
    // Write two chars, move back one column, overwrite with Z
    // Result: 'aZ' not 'ab'
    const html = ansiToPre("ab\x1b[1Dc"); // 'ab', move back 1, write 'c' → 'ac'
    expect(html).toContain("ac");
    expect(html).not.toContain("ab");
  });

  it("handles absolute cursor positioning (CUP)", () => {
    // ESC[1;1H moves to row 1, col 1 — write X over 'a'
    const html = ansiToPre("abc\x1b[1;1HX");
    expect(html).toContain("Xbc");
  });

  it("handles multiline colored output without throwing", () => {
    const multiline = [
      "\x1b[1;32m╭──────────────────╮\x1b[0m",
      "\x1b[1;32m│\x1b[0m \x1b[1;36mOS:\x1b[0m Linux",
      "\x1b[1;32m╰──────────────────╯\x1b[0m",
    ].join("\n");
    expect(() => ansiToPre(multiline)).not.toThrow();
    const html = ansiToPre(multiline);
    expect(html).toContain("OS:");
    expect(html).toContain("Linux");
  });
});
