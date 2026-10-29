import { Construction } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { SetupConfig } from "../types";

interface StartPlaceholderProps {
  config: SetupConfig | null;
  onBack: () => void;
}

export function StartPlaceholder({ config, onBack }: StartPlaceholderProps) {
  return (
    <div className="mx-auto max-w-xl pt-8">
      <Card className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/15 text-accent-300">
          <Construction size={22} />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-white">
          Interview room coming soon
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Your setup was captured. The question engine arrives in Phase 2 and
          the voice interview room in Phase 3.
        </p>
        {config && (
          <pre className="mt-5 overflow-x-auto rounded-xl bg-ink-950 p-4 text-left text-xs text-zinc-400">
            {JSON.stringify(config, null, 2)}
          </pre>
        )}
        <Button className="mt-6" variant="secondary" onClick={onBack}>
          Back to setup
        </Button>
      </Card>
    </div>
  );
}