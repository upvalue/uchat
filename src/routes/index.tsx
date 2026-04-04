import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const lastRoom = localStorage.getItem("uchat-last-room");
    if (lastRoom) {
      navigate({ to: "/rooms/$room", params: { room: lastRoom }, replace: true });
    }
  }, [navigate]);
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 text-terminal-green text-4xl">$_</div>
        <h2 className="font-semibold tracking-tight">welcome to uchat</h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          select a channel from the <span className="hidden md:inline">sidebar</span><span className="md:hidden">menu</span> to start chatting,
          or send a message via CLI to create one.
        </p>
      </div>
    </div>
  );
}
