import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useMatchRoute } from "@tanstack/react-router";
import { getGraphQLClient } from "../lib/graphql";
import { UpdateRoomMutation, DeleteRoomMutation } from "../lib/queries";
import { roomPath } from "@/lib/chatroom";

interface Room {
  name: string;
  folder?: string | null;
  description?: string | null;
}

export function ChannelSettingsDialog({ room, onClose }: { room: Room; onClose: () => void }) {
  const [description, setDescription] = useState(room.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const path = roomPath(room.folder, room.name);
  const isActive = matchRoute({ to: "/rooms/$room", params: { room: path } });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (confirmDelete) {
          setConfirmDelete(false);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, confirmDelete]);

  const updateMutation = useMutation({
    mutationFn: () =>
      getGraphQLClient().request(UpdateRoomMutation, {
        name: room.name,
        folder: room.folder || null,
        description: description.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message ?? "Failed to update channel");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      getGraphQLClient().request(DeleteRoomMutation, {
        name: room.name,
        folder: room.folder || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      if (isActive) {
        navigate({ to: "/" });
      }
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message ?? "Failed to delete channel");
    },
  });

  const descriptionChanged = (description.trim() || "") !== (room.description ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="fixed inset-0 bg-black/70 animate-in fade-in-0"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm overflow-hidden border border-border bg-popover animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-semibold text-terminal-green">
            $ channel-config{" "}
            <span className="text-foreground">#{room.name}</span>
          </h3>
          {room.folder && (
            <p className="mt-1 text-muted-foreground">
              folder: {room.folder}
            </p>
          )}
        </div>

        <div className="space-y-3 px-4 pb-3">
          {/* Description */}
          <div>
            <label className="mb-1 block text-muted-foreground">
              description
            </label>
            <div className="flex items-center border border-border bg-background px-3">
              <input
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setError("");
                }}
                placeholder="what's this channel about?"
                className="h-9 w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-mono"
              />
            </div>
          </div>

          {error && (
            <p className="text-destructive">[err] {error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                delete channel
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-destructive">are you sure?</span>
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
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  no
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              cancel
            </button>
            <button
              type="button"
              onClick={() => updateMutation.mutate()}
              disabled={!descriptionChanged || updateMutation.isPending}
              className="border border-terminal-green/50 bg-terminal-green/10 px-3 py-1 font-medium text-terminal-green transition-colors hover:bg-terminal-green/20 disabled:opacity-50"
            >
              {updateMutation.isPending ? "saving…" : "save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
