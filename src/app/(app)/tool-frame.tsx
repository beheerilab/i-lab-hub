/**
 * Toont een losse HTML-tool (zie /api/tools/[naam]) in een kader binnen de
 * hub. Breekt bewust uit de smalle paginabreedte: de tools (vooral de
 * facturatie-tabellen) hebben meer ruimte nodig.
 */
export function ToolFrame({ naam, titel }: { naam: string; titel: string }) {
  return (
    <div className="relative left-1/2 w-[min(100vw-2rem,1300px)] -translate-x-1/2">
      <iframe
        src={`/api/tools/${naam}`}
        title={titel}
        className="block h-[calc(100vh-13rem)] min-h-[640px] w-full rounded-2xl border border-border bg-white shadow-card"
      />
    </div>
  );
}
