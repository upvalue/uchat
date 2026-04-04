import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { getGraphQLClient } from "../lib/graphql";
import { CreateRoomMutation, RoomsQuery } from "../lib/queries";
import { cn } from "@/lib/utils";
import { chatroomTitle, roomPath } from "@/lib/chatroom";

export function CreateChannelButton({ defaultFolder }: { defaultFolder?: string } = {}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground transition-colors hover:text-terminal-green"
        title="Create channel"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      {open && <CreateChannelDialog onClose={() => setOpen(false)} defaultFolder={defaultFolder} />}
    </>
  );
}

function CreateChannelDialog({ onClose, defaultFolder }: { onClose: () => void; defaultFolder?: string }) {
  const [folder, setFolder] = useState(defaultFolder ?? "");
  const [name, setName] = useState(defaultFolder ? chatroomTitle() : "");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: roomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getGraphQLClient().request(RoomsQuery, {}),
  });

  const existingFolders = useMemo(() => {
    const rooms = (roomsData?.rooms ?? []) as Array<{ folder?: string | null }>;
    const folders = new Set<string>();
    for (const r of rooms) {
      if (r.folder) folders.add(r.folder);
    }
    return [...folders].sort();
  }, [roomsData]);

  useEffect(() => {
    if (folder.trim() && !name) {
      setName(chatroomTitle());
    }
  }, [folder]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: (vars: { name: string; folder?: string; description?: string }) =>
      getGraphQLClient().request(CreateRoomMutation, {
        name: vars.name,
        folder: vars.folder || null,
        description: vars.description || null,
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      onClose();
      navigate({ to: "/rooms/$room", params: { room: roomPath(vars.folder, vars.name) } });
    },
    onError: (err: Error) => {
      setError(err.message ?? "Failed to create channel");
    },
  });

  const validate = useCallback((value: string): string => {
    if (!value) return "";
    if (!/^[a-zA-Z0-9]+([a-zA-Z0-9 -]*[a-zA-Z0-9]+)?$/.test(value)) {
      return "must be alphanumeric with hyphens and spaces";
    }
    return "";
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedFolder = folder.trim();
    const validationError = validate(trimmedName);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!trimmedName) return;
    mutation.mutate({
      name: trimmedName,
      folder: trimmedFolder || undefined,
      description: description.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="fixed inset-0 bg-black/70 animate-in fade-in-0"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm overflow-hidden border border-border bg-popover animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
        <form onSubmit={handleSubmit}>
          <div className="px-4 pt-4 pb-2">
            <h3 className="font-semibold text-terminal-green">$ create-channel</h3>
            <p className="mt-1 text-muted-foreground">
              alphanumeric, hyphens and spaces allowed
            </p>
          </div>
          <div className="space-y-2 px-4 pb-3">
            {/* Folder input */}
            <div>
              <label className="mb-1 block text-muted-foreground">
                folder (optional)
              </label>
              <div className="flex items-center gap-2 border border-border bg-background px-3">
                <span className="shrink-0 text-muted-foreground">~/</span>
                <input
                  value={folder}
                  onChange={(e) => {
                    setFolder(e.target.value);
                    setError("");
                  }}
                  placeholder="e.g. projects"
                  list="folder-suggestions"
                  className="h-9 w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-mono"
                />
                <datalist id="folder-suggestions">
                  {existingFolders.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>
            </div>
            {/* Name input */}
            <div>
              <label className="mb-1 block text-muted-foreground">
                channel name
              </label>
              <div className="flex items-center gap-2 border border-border bg-background px-3">
                <span className="shrink-0 text-muted-foreground">#</span>
                <input
                  ref={nameInputRef}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder="channel name"
                  className={cn(
                    "h-10 w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-mono",
                  )}
                />
              </div>
            </div>
            {/* Description input */}
            <div>
              <label className="mb-1 block text-muted-foreground">
                description (optional)
              </label>
              <div className="flex items-center border border-border bg-background px-3">
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="what's this channel about?"
                  className="h-9 w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-mono"
                />
              </div>
            </div>
            {error && (
              <p className="mt-1.5 text-destructive">[err] {error}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || mutation.isPending}
              className="border border-terminal-green/50 bg-terminal-green/10 px-3 py-1 font-medium text-terminal-green transition-colors hover:bg-terminal-green/20 disabled:opacity-50"
            >
              {mutation.isPending ? "creating…" : "create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
