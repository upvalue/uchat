import { useRef, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getGraphQLClient } from "../lib/graphql";
import { SendMessageMutation } from "../lib/queries";
import { getConfig } from "../lib/config";
import { Editor, EditorHandle } from "./Editor";

export function SendForm({ room, onSent }: { room: string; onSent?: () => void }) {
  const queryClient = useQueryClient();
  const config = getConfig();
  const editorRef = useRef<EditorHandle>(null);

  const mutation = useMutation({
    mutationKey: ["sendMessage", room],
    mutationFn: (body: string) =>
      getGraphQLClient().request(SendMessageMutation, {
        room,
        user: config?.username ?? "anonymous",
        body: { body },
        source: "web",
      }),
    onSuccess: () => {
      editorRef.current?.clear();
      queryClient.invalidateQueries({ queryKey: ["messages", room] });
      onSent?.();
    },
  });

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text.trim() || mutation.isPending) return;
      mutation.mutate(text.trim());
    },
    [mutation],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        // Don't capture if already inside the editor
        if ((e.target as HTMLElement)?.closest?.(".editor-wrap")) return;
        e.preventDefault();
        editorRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="send-form-wrap shrink-0 bg-muted px-2 py-2 md:px-4 transition-colors">
      <div className="flex items-end px-1 md:px-2">
        <div className="hidden md:block w-7 shrink-0" />
        <div className="flex-1">
          <Editor
            ref={editorRef}
            placeholder={`msg #${room} — press / to focus`}
            onSubmit={handleSubmit}
            disabled={mutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
