import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { getGraphQLClient } from "../lib/graphql";
import { DeleteRoomMutation } from "../lib/queries";

interface Props {
  name: string;
  folder?: string | null;
  /** Whether the deleted channel is the one currently being viewed. */
  isActive?: boolean;
}

export function DeleteChannelButton({ name, folder, isActive }: Props) {
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!confirming) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirming(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirming]);

  const deleteMutation = useMutation({
    mutationFn: () =>
      getGraphQLClient().request(DeleteRoomMutation, {
        name,
        folder: folder || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setConfirming(false);
      if (isActive) navigate({ to: "/" });
    },
  });

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title="Delete channel"
        aria-label="Delete channel"
        className="flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 font-mono">
      <span className="text-destructive">delete #{name}?</span>
      <button
        type="button"
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        className="border border-destructive/50 bg-destructive/10 px-2 py-0.5 font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
      >
        {deleteMutation.isPending ? "deleting…" : "yes"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        no
      </button>
      {deleteMutation.error && (
        <span className="text-destructive">[err] {(deleteMutation.error as Error).message}</span>
      )}
    </div>
  );
}
