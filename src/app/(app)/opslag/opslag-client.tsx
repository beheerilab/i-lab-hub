"use client";

import { useMemo, useState, useTransition } from "react";
import { saveZoneContentAction } from "./actions";
import type { OpslagContent, OpslagHoofdlijn, OpslagItem, OpslagZone } from "./types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

function NaamToevoegen({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (naam: string) => void;
}) {
  const [waarde, setWaarde] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const naam = waarde.trim();
        if (!naam) return;
        onAdd(naam);
        setWaarde("");
      }}
      className="mt-3 flex gap-2"
    >
      <Input
        value={waarde}
        onChange={(e) => setWaarde(e.target.value)}
        placeholder={placeholder}
        className="py-1.5 text-sm"
      />
      <Button type="submit" className="shrink-0 px-3 py-1.5 text-sm">
        Toevoegen
      </Button>
    </form>
  );
}

function ItemToevoegen({ onAdd }: { onAdd: (item: OpslagItem) => void }) {
  const [naam, setNaam] = useState("");
  const [merk, setMerk] = useState("");
  const [model, setModel] = useState("");
  const [aantal, setAantal] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = naam.trim();
        if (!n) return;
        onAdd({ naam: n, merk: merk.trim(), model: model.trim(), aantal: Number(aantal) || 0 });
        setNaam("");
        setMerk("");
        setModel("");
        setAantal("");
      }}
      className="mt-3 flex flex-wrap gap-2"
    >
      <Input
        value={naam}
        onChange={(e) => setNaam(e.target.value)}
        placeholder="Itemnaam"
        className="min-w-32 flex-1 py-1.5 text-sm"
      />
      <Input
        value={merk}
        onChange={(e) => setMerk(e.target.value)}
        placeholder="Merk (optioneel)"
        className="w-28 py-1.5 text-sm"
      />
      <Input
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder="Model (optioneel)"
        className="w-28 py-1.5 text-sm"
      />
      <Input
        value={aantal}
        onChange={(e) => setAantal(e.target.value)}
        type="number"
        min={0}
        placeholder="Aantal"
        className="w-20 py-1.5 text-sm"
      />
      <Button type="submit" className="shrink-0 px-3 py-1.5 text-sm">
        Toevoegen
      </Button>
    </form>
  );
}

const CEL_INPUT_CLASSES =
  "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-border focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20";

function ItemRij({
  item,
  onWijzig,
  onDelete,
}: {
  item: OpslagItem;
  onWijzig: (item: OpslagItem) => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-border last:border-none">
      <td className="py-1 pr-2">{item.naam}</td>
      <td className="py-1 pr-2">
        <input
          defaultValue={item.merk}
          placeholder="—"
          onBlur={(e) => {
            if (e.target.value !== item.merk) onWijzig({ ...item, merk: e.target.value });
          }}
          className={CEL_INPUT_CLASSES}
        />
      </td>
      <td className="py-1 pr-2">
        <input
          defaultValue={item.model}
          placeholder="—"
          onBlur={(e) => {
            if (e.target.value !== item.model) onWijzig({ ...item, model: e.target.value });
          }}
          className={CEL_INPUT_CLASSES}
        />
      </td>
      <td className="py-1 pr-2">
        <input
          type="number"
          min={0}
          defaultValue={item.aantal}
          onBlur={(e) => {
            const nieuw = Number(e.target.value) || 0;
            if (nieuw !== item.aantal) onWijzig({ ...item, aantal: nieuw });
          }}
          className={`${CEL_INPUT_CLASSES} text-right`}
        />
      </td>
      <td className="py-1 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg px-1.5 py-0.5 text-sm text-danger hover:bg-danger/10"
          title="Verwijderen"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

function RijMetVerwijderen({
  label,
  aantal,
  onOpen,
  onDelete,
}: {
  label: string;
  aantal: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border py-2 last:border-none">
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 truncate text-left text-sm hover:text-accent-hover"
      >
        {label}
      </button>
      <span className="shrink-0 text-xs text-muted">{aantal} items</span>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 rounded-lg px-1.5 py-0.5 text-sm text-danger hover:bg-danger/10"
        title="Verwijderen"
      >
        ✕
      </button>
    </div>
  );
}

export function OpslagClient({
  zones,
  initialContent,
}: {
  zones: OpslagZone[];
  initialContent: OpslagContent;
}) {
  const [content, setContent] = useState<OpslagContent>(initialContent);
  const [, startTransition] = useTransition();
  const [zoekterm, setZoekterm] = useState("");
  const [openZoneNaam, setOpenZoneNaam] = useState<string | null>(null);
  const [navPath, setNavPath] = useState<number[]>([]);

  const zoektermLower = zoekterm.trim().toLowerCase();

  const treffers = useMemo(() => {
    if (!zoektermLower) return null;
    const resultaten: { zone: OpslagZone; via: string | null }[] = [];
    for (const zone of zones) {
      const naamMatcht = zone.naam.toLowerCase().includes(zoektermLower);
      if (naamMatcht) {
        resultaten.push({ zone, via: null });
        continue;
      }
      let via: string | null = null;
      outer: for (const h of content[zone.naam] ?? []) {
        if (h.naam.toLowerCase().includes(zoektermLower)) {
          via = h.naam;
          break outer;
        }
        for (const s of h.subs) {
          if (s.naam.toLowerCase().includes(zoektermLower)) {
            via = s.naam;
            break outer;
          }
          for (const it of s.items) {
            if (
              it.naam.toLowerCase().includes(zoektermLower) ||
              it.merk?.toLowerCase().includes(zoektermLower) ||
              it.model?.toLowerCase().includes(zoektermLower)
            ) {
              via = it.naam;
              break outer;
            }
          }
        }
      }
      if (via) resultaten.push({ zone, via });
    }
    return resultaten;
  }, [zoektermLower, zones, content]);

  const gematchteZoneNamen = treffers ? new Set(treffers.map((t) => t.zone.naam)) : null;
  const zichtbareZones = treffers ? treffers.map((t) => t.zone) : zones;
  const dropdownTreffers = treffers?.slice(0, 8) ?? [];

  function persist(zoneNaam: string, inhoud: OpslagHoofdlijn[]) {
    setContent((c) => ({ ...c, [zoneNaam]: inhoud }));
    startTransition(() => saveZoneContentAction(zoneNaam, inhoud));
  }

  function openZone(naam: string) {
    setOpenZoneNaam(naam);
    setNavPath([]);
  }

  const hoofdlijnen = openZoneNaam ? content[openZoneNaam] ?? [] : [];
  const huidigeHoofdlijn = navPath.length >= 1 ? hoofdlijnen[navPath[0]] : undefined;
  const huidigeSub = navPath.length >= 2 && huidigeHoofdlijn ? huidigeHoofdlijn.subs[navPath[1]] : undefined;

  function addHoofdlijn(naam: string) {
    if (!openZoneNaam) return;
    persist(openZoneNaam, [...hoofdlijnen, { naam, subs: [] }]);
  }
  function deleteHoofdlijn(index: number) {
    if (!openZoneNaam) return;
    if (!confirm(`"${hoofdlijnen[index].naam}" verwijderen?`)) return;
    persist(openZoneNaam, hoofdlijnen.filter((_, i) => i !== index));
    setNavPath([]);
  }
  function addSub(hIndex: number, naam: string) {
    if (!openZoneNaam) return;
    const nieuw = hoofdlijnen.map((h, i) =>
      i === hIndex ? { ...h, subs: [...h.subs, { naam, items: [] }] } : h,
    );
    persist(openZoneNaam, nieuw);
  }
  function deleteSub(hIndex: number, sIndex: number) {
    if (!openZoneNaam) return;
    if (!confirm(`"${hoofdlijnen[hIndex].subs[sIndex].naam}" verwijderen?`)) return;
    const nieuw = hoofdlijnen.map((h, i) =>
      i === hIndex ? { ...h, subs: h.subs.filter((_, si) => si !== sIndex) } : h,
    );
    persist(openZoneNaam, nieuw);
    setNavPath([hIndex]);
  }
  function addItem(hIndex: number, sIndex: number, item: OpslagItem) {
    if (!openZoneNaam) return;
    const nieuw = hoofdlijnen.map((h, i) =>
      i !== hIndex
        ? h
        : { ...h, subs: h.subs.map((s, si) => (si !== sIndex ? s : { ...s, items: [...s.items, item] })) },
    );
    persist(openZoneNaam, nieuw);
  }
  function wijzigItem(hIndex: number, sIndex: number, itemIndex: number, item: OpslagItem) {
    if (!openZoneNaam) return;
    const nieuw = hoofdlijnen.map((h, i) =>
      i !== hIndex
        ? h
        : {
            ...h,
            subs: h.subs.map((s, si) =>
              si !== sIndex ? s : { ...s, items: s.items.map((it, ii) => (ii === itemIndex ? item : it)) },
            ),
          },
    );
    persist(openZoneNaam, nieuw);
  }
  function deleteItem(hIndex: number, sIndex: number, itemIndex: number) {
    if (!openZoneNaam) return;
    const item = hoofdlijnen[hIndex].subs[sIndex].items[itemIndex];
    if (!confirm(`"${item.naam}" verwijderen?`)) return;
    const nieuw = hoofdlijnen.map((h, i) =>
      i !== hIndex
        ? h
        : {
            ...h,
            subs: h.subs.map((s, si) =>
              si !== sIndex ? s : { ...s, items: s.items.filter((_, ii) => ii !== itemIndex) },
            ),
          },
    );
    persist(openZoneNaam, nieuw);
  }

  const breadcrumbs = useMemo(() => {
    if (!openZoneNaam) return [];
    const crumbs = [{ label: openZoneNaam, path: [] as number[] }];
    if (huidigeHoofdlijn) crumbs.push({ label: huidigeHoofdlijn.naam, path: [navPath[0]] });
    if (huidigeSub) crumbs.push({ label: huidigeSub.naam, path: [navPath[0], navPath[1]] });
    return crumbs;
  }, [openZoneNaam, huidigeHoofdlijn, huidigeSub, navPath]);

  return (
    <>
      <div className="relative mx-auto mb-5 w-full max-w-md">
        <Input
          type="search"
          value={zoekterm}
          onChange={(e) => setZoekterm(e.target.value)}
          placeholder="Zoek op vaknaam of wat erin ligt, bijv. “pennen”…"
        />
        {zoektermLower && dropdownTreffers.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-72 overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-lg">
            {dropdownTreffers.map(({ zone, via }) => (
              <button
                key={zone.naam}
                type="button"
                onClick={() => {
                  openZone(zone.naam);
                  setZoekterm("");
                }}
                className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-black/[.04]"
              >
                <span>{zone.naam}</span>
                {via && <span className="ml-1.5 text-xs text-muted">— gevonden bij &ldquo;{via}&rdquo;</span>}
              </button>
            ))}
          </div>
        )}
        {zoektermLower && dropdownTreffers.length === 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 rounded-xl border border-border bg-white p-3 text-sm text-muted shadow-lg">
            Niets gevonden.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-white p-2">
          <div className="relative leading-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/opslag-plattegrond.png"
              alt="Plattegrond i-lab met opslagvakken"
              className="w-full rounded-lg"
            />
            {zones.map((zone) => {
              const heeftInhoud = (content[zone.naam]?.length ?? 0) > 0;
              const matched = Boolean(gematchteZoneNamen?.has(zone.naam));
              return (
                <button
                  key={zone.naam}
                  type="button"
                  title={zone.naam}
                  onClick={() => openZone(zone.naam)}
                  style={{
                    left: `${zone.xPct}%`,
                    top: `${zone.yPct}%`,
                    width: `${zone.wPct}%`,
                    height: `${zone.hPct}%`,
                  }}
                  className={`absolute rounded-sm border-2 transition-colors ${
                    matched
                      ? "z-10 border-danger bg-danger/25"
                      : heeftInhoud
                        ? "border-accent-dark bg-accent/25 hover:bg-accent/40"
                        : "border-accent/50 bg-accent/10 hover:bg-accent/25"
                  }`}
                />
              );
            })}
          </div>
        </div>

        <Card className="w-full lg:w-72 lg:shrink-0">
          <h2 className="mb-2 text-sm font-semibold text-muted">
            Vakken ({zichtbareZones.length}{treffers ? ` van ${zones.length}` : ""})
          </h2>
          {zichtbareZones.length === 0 ? (
            <p className="text-sm text-muted">Niets gevonden.</p>
          ) : (
            <ul className="max-h-[520px] space-y-1 overflow-y-auto">
              {zichtbareZones.map((zone) => {
                const heeftInhoud = (content[zone.naam]?.length ?? 0) > 0;
                return (
                  <li key={zone.naam}>
                    <button
                      type="button"
                      onClick={() => openZone(zone.naam)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-left text-sm hover:border-accent/40 hover:bg-accent/5"
                    >
                      <span className="truncate">{zone.naam}</span>
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${heeftInhoud ? "bg-accent" : "bg-border"}`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">
            Wijzigingen worden direct gedeeld opgeslagen — iedereen die deze pagina opent ziet
            hetzelfde.
          </p>
        </Card>
      </div>

      {openZoneNaam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpenZoneNaam(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-0.5 flex flex-wrap items-center gap-1 text-xs text-muted">
                  {breadcrumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="opacity-50">›</span>}
                      {i === breadcrumbs.length - 1 ? (
                        <span className="font-medium text-foreground">{crumb.label}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setNavPath(crumb.path)}
                          className="text-accent underline"
                        >
                          {crumb.label}
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <h2 className="text-lg font-semibold">
                  {huidigeSub?.naam ?? huidigeHoofdlijn?.naam ?? openZoneNaam}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenZoneNaam(null)}
                className="text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-1">
              {navPath.length === 0 && (
                <>
                  {hoofdlijnen.length === 0 ? (
                    <p className="text-sm text-muted">Nog geen inhoud toegevoegd voor dit vak.</p>
                  ) : (
                    hoofdlijnen.map((h, i) => (
                      <RijMetVerwijderen
                        key={i}
                        label={h.naam}
                        aantal={h.subs.reduce((n, s) => n + s.items.length, 0)}
                        onOpen={() => setNavPath([i])}
                        onDelete={() => deleteHoofdlijn(i)}
                      />
                    ))
                  )}
                  <NaamToevoegen placeholder='Nieuwe hoofdlijn, bijv. "Elektronica"' onAdd={addHoofdlijn} />
                </>
              )}

              {navPath.length === 1 && huidigeHoofdlijn && (
                <>
                  {huidigeHoofdlijn.subs.length === 0 ? (
                    <p className="text-sm text-muted">Nog geen subcategorieën.</p>
                  ) : (
                    huidigeHoofdlijn.subs.map((s, i) => (
                      <RijMetVerwijderen
                        key={i}
                        label={s.naam}
                        aantal={s.items.length}
                        onOpen={() => setNavPath([navPath[0], i])}
                        onDelete={() => deleteSub(navPath[0], i)}
                      />
                    ))
                  )}
                  <NaamToevoegen
                    placeholder='Nieuwe subcategorie, bijv. "Kabels"'
                    onAdd={(naam) => addSub(navPath[0], naam)}
                  />
                </>
              )}

              {navPath.length === 2 && huidigeSub && (
                <>
                  {huidigeSub.items.length === 0 ? (
                    <p className="text-sm text-muted">Nog geen items.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted">
                          <th className="py-1.5 pr-2 font-medium">Item</th>
                          <th className="py-1.5 pr-2 font-medium">Merk</th>
                          <th className="py-1.5 pr-2 font-medium">Model</th>
                          <th className="py-1.5 pr-2 font-medium">Aantal</th>
                          <th className="py-1.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {huidigeSub.items.map((item, i) => (
                          <ItemRij
                            key={i}
                            item={item}
                            onWijzig={(nieuw) => wijzigItem(navPath[0], navPath[1], i, nieuw)}
                            onDelete={() => deleteItem(navPath[0], navPath[1], i)}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                  <ItemToevoegen onAdd={(item) => addItem(navPath[0], navPath[1], item)} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
