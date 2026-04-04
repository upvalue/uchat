import { useState } from "react";
import { getConfig, setConfig, clearConfig } from "../lib/config";

export function ConfigForm({ onSave }: { onSave: () => void }) {
  const existing = getConfig();
  const [serverUrl, setServerUrl] = useState(
    existing?.serverUrl ?? window.location.origin,
  );
  const [username, setUsername] = useState(existing?.username ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConfig({ serverUrl: serverUrl.replace(/\/$/, ""), username });
    onSave();
  }

  function handleClear() {
    clearConfig();
    setServerUrl(window.location.origin);
    setUsername("");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md border border-border bg-card p-6">
        <div className="mb-5">
          <h2 className="font-bold text-terminal-green">$ configure</h2>
          <p className="mt-1 text-muted-foreground">set up your uchat connection.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="server-url" className="block font-medium text-muted-foreground uppercase tracking-wider">
              server_url
            </label>
            <input
              id="server-url"
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="h-9 w-full border border-border bg-input/50 px-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-terminal-green/50 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="username" className="block font-medium text-muted-foreground uppercase tracking-wider">
              username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="enter your username"
              className="h-9 w-full border border-border bg-input/50 px-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-terminal-green/50 font-mono"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 border border-terminal-green/50 bg-terminal-green/10 px-4 py-2 font-medium text-terminal-green transition-colors hover:bg-terminal-green/20"
            >
              save
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="border border-border bg-secondary px-4 py-2 text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
