import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ConfigForm } from "../components/ConfigForm";

export const Route = createFileRoute("/config")({
  component: ConfigPage,
});

function ConfigPage() {
  const navigate = useNavigate();
  return <ConfigForm onSave={() => navigate({ to: "/" })} />;
}
