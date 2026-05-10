import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const uchatTheme = EditorView.theme({
  "&": {
    fontSize: "var(--text-base)",
    backgroundColor: "transparent",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-content": {
    caretColor: "var(--terminal-cyan)",
    color: "var(--foreground)",
    fontFamily: "'Iosevka', ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace",
    padding: "6px 0",
    minHeight: "20px",
    maxHeight: "160px",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--terminal-cyan)",
    borderLeftWidth: "0.55em",
    opacity: "0.5",
  },
  "&.cm-focused .cm-cursor": {
    opacity: "0.6",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--terminal-dim) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--terminal-dim) !important",
  },
  ".cm-placeholder": {
    color: "var(--muted-foreground)",
    fontStyle: "normal",
  },
  ".cm-scroller": {
    overflow: "auto",
    maxHeight: "160px",
  },
});

const uchatHighlight = HighlightStyle.define([
  { tag: tags.heading, fontWeight: "bold", color: "var(--terminal-green)" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.monospace, color: "var(--terminal-cyan)", fontSize: "0.9em" },
  { tag: tags.link, color: "var(--terminal-cyan)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--terminal-cyan)" },
  { tag: tags.processingInstruction, color: "var(--muted-foreground)" },
]);

export interface EditorHandle {
  clear: () => void;
  getText: () => string;
  focus: () => void;
}

interface EditorProps {
  placeholder?: string;
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { placeholder = "Write a message…", onSubmit, disabled },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const clear = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: "" },
    });
    requestAnimationFrame(() => view.focus());
  }, []);

  const getText = useCallback(() => {
    return viewRef.current?.state.doc.toString().trim() ?? "";
  }, []);

  const focus = useCallback(() => {
    viewRef.current?.focus();
  }, []);

  useImperativeHandle(ref, () => ({ clear, getText, focus }), [clear, getText, focus]);

  useEffect(() => {
    if (!containerRef.current) return;

    const submitKeymap = keymap.of([
      {
        key: "Enter",
        run: (view) => {
          const text = view.state.doc.toString().trim();
          if (text) {
            onSubmitRef.current(text);
          }
          return true;
        },
      },
      {
        key: "Shift-Enter",
        run: (view) => {
          const { from, to } = view.state.selection.main;
          view.dispatch({
            changes: { from, to, insert: "\n" },
            selection: { anchor: from + 1 },
            scrollIntoView: true,
          });
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: "",
      extensions: [
        submitKeymap,
        markdown(),
        syntaxHighlighting(uchatHighlight),
        uchatTheme,
        cmPlaceholder(placeholder),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    view.focus();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [placeholder]);

  useEffect(() => {
    if (disabled) {
      viewRef.current?.contentDOM.setAttribute("contenteditable", "false");
    } else {
      viewRef.current?.contentDOM.setAttribute("contenteditable", "true");
    }
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className="editor-wrap flex-1 px-3 py-1"
    />
  );
});
