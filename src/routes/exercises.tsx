import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { PublicFrame } from "@/components/gym/PublicFrame";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InstructionText } from "@/components/gym/InstructionText";
import { getPublicCatalogue } from "@/lib/public-catalogue.functions";
import { publicHead } from "@/lib/public-head";
export const Route = createFileRoute("/exercises")({
  head: () =>
    publicHead(
      "Exercise bank",
      "Browse RappGym exercises, equipment and instructions without signing in.",
    ),
  loader: () => getPublicCatalogue(),
  staleTime: 300000,
  component: Catalogue,
});
function Catalogue() {
  const rows = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState("");
  const [category, setCategory] = useState("");
  const filtered = rows.filter(
    (r) =>
      (!equipment || r.equipment === equipment) &&
      (!category || r.category === category) &&
      [r.name, r.code, r.category, r.equipment]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  const categories = [...new Set(rows.map((r) => r.category))];
  return (
    <PublicFrame subtitle="Exercises">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Exercise bank</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/exercise-bank">My exercises</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {rows.length} exercises. Choose a movement, check the equipment, train at your own level.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Search exercises"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, code or equipment"
          />
        </label>
        <select
          aria-label="Category"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Equipment"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
        >
          <option value="">All equipment</option>
          {[...new Set(rows.map((r) => r.equipment).filter(Boolean))].sort().map((q) => (
            <option key={q}>{q}</option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} matching exercises</p>
      <div className="divide-y">
        {categories.map((c) => {
          const group = filtered.filter((r) => r.category === c);
          return (
            group.length > 0 && (
              <details key={c} open={query.trim() ? true : undefined} className="py-3">
                <summary className="cursor-pointer font-display text-xl font-bold">
                  {c}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{group.length}</span>
                </summary>
                <div className="divide-y">
                  {group.map((r) => (
                    <details key={r.id} className="py-3">
                      <summary className="cursor-pointer text-sm">
                        <span className="mr-3 font-mono text-muted-foreground">{r.code}</span>
                        <strong>{r.name}</strong>
                        <span className="mt-1 block pl-5 text-xs text-muted-foreground">
                          {r.equipment || "No equipment"} · {r.reps_unit}
                        </span>
                      </summary>
                      <div className="mt-3 space-y-3 pl-5">
                        <InstructionText
                          text={r.instructions}
                          className="text-sm leading-relaxed"
                        />
                        {r.image_urls.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                            {r.image_urls.map((url) => (
                              <img
                                key={url}
                                src={url}
                                alt={r.name}
                                loading="lazy"
                                className="h-48 max-w-full rounded-md object-contain"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            )
          );
        })}
      </div>
      {!filtered.length && <p>No matching exercises.</p>}
      <p className="border-t pt-4 text-xs text-muted-foreground">
        General exercise descriptions, not individual medical advice. Stop if an exercise causes
        pain and seek qualified advice when needed.
      </p>
    </PublicFrame>
  );
}
