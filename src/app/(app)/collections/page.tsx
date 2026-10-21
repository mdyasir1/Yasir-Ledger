import { PageHeader } from "@/components/layout/page-header";
import { RoundSelector } from "@/components/round-selector";
import { CollectionsView } from "@/components/collections/collections-view";
import { getRoundCollection } from "@/lib/data/collection";
import { getRounds, resolveSelectedRound } from "@/lib/data/rounds";
import { formatPaise } from "@/lib/money";

export const metadata = { title: "Collections" };

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rounds = await getRounds();
  const selected = resolveSelectedRound(rounds, params.round as string | undefined);

  if (!selected) {
    return (
      <div className="space-y-6">
        <PageHeader title="Collections" />
        <p className="text-sm text-muted-foreground">
          No monthly rounds have been created yet.
        </p>
      </div>
    );
  }

  const collection = await getRoundCollection(selected.id);

  if (!collection) {
    return (
      <div className="space-y-6">
        <PageHeader title="Collections" />
        <p className="text-sm text-muted-foreground">
          That month could not be loaded.
        </p>
      </div>
    );
  }

  const { summary } = collection;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        description={`${selected.roundName} · ${formatPaise(
          summary.collectedTotal,
        )} collected of ${formatPaise(summary.expectedTotal)} expected`}
        actions={
          <RoundSelector
            rounds={rounds.map((round) => ({
              id: round.id,
              roundName: round.roundName,
            }))}
            selectedId={selected.id}
            searchParams={{ round: selected.id }}
          />
        }
      />

      <CollectionsView
        roundId={selected.id}
        roundName={selected.roundName}
        positions={collection.positions}
        payments={collection.payments}
      />
    </div>
  );
}
