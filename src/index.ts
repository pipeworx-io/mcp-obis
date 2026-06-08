interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * OBIS (Ocean Biodiversity Information System) MCP.
 *
 * OBIS is the global database of marine-species occurrence records: resolve a
 * marine taxon, find georeferenced occurrence records (lat/lng/date/depth), and
 * get aggregate statistics. Complements GBIF with an ocean focus. Keyless.
 */


const BASE = 'https://api.obis.org/v3';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'get_taxon',
    description:
      'Resolve a marine species/genus/family name against OBIS to its taxon record (taxon ID, rank, accepted name, kingdom/phylum/family/genus, and total occurrence-record count). OBIS = global ocean biodiversity occurrence database; complements GBIF with a marine focus. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Scientific name, e.g. "Orcinus orca" or "Delphinidae".' },
      },
      required: ['name'],
    },
  },
  {
    name: 'find_occurrences',
    description:
      'Find georeferenced marine occurrence records (latitude, longitude, date, depth, country, locality, basis of record) for a scientific name from OBIS. Optionally filter by date range. Returns the total match count plus a sample of records.',
    inputSchema: {
      type: 'object',
      properties: {
        scientificname: { type: 'string', description: 'Scientific name to search occurrences for, e.g. "Orcinus orca".' },
        limit: { type: 'number', description: 'Max records to return (default 20, max 100).' },
        startdate: { type: 'string', description: 'Earliest event date, YYYY-MM-DD (optional).' },
        enddate: { type: 'string', description: 'Latest event date, YYYY-MM-DD (optional).' },
      },
      required: ['scientificname'],
    },
  },
  {
    name: 'get_statistics',
    description:
      'Get aggregate OBIS statistics for a marine taxon: total occurrence records, distinct species/taxa, contributing datasets, and the observed year range.',
    inputSchema: {
      type: 'object',
      properties: {
        scientificname: { type: 'string', description: 'Scientific name to summarize, e.g. "Orcinus orca".' },
      },
      required: ['scientificname'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'get_taxon':
        return await getTaxon(args);
      case 'find_occurrences':
        return await findOccurrences(args);
      case 'get_statistics':
        return await getStatistics(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function getTaxon(args: Record<string, unknown>): Promise<unknown> {
  const name = reqStr(args, 'name');
  const body = (await obisGet(`/taxon/${encodeURIComponent(name)}`)) as { results?: TaxonResult[] };
  const first = body.results?.[0];
  if (!first) return { error: 'taxon not found', name };
  return {
    scientific_name: first.scientificName,
    taxon_id: first.taxonID,
    rank: first.taxonRank,
    accepted_name: first.acceptedNameUsage,
    kingdom: first.kingdom,
    phylum: first.phylum,
    family: first.family,
    genus: first.genus,
    occurrence_records: first.records ?? null,
  };
}

async function findOccurrences(args: Record<string, unknown>): Promise<unknown> {
  const scientificname = reqStr(args, 'scientificname');
  const limit = clampLimit(args.limit);
  const params = new URLSearchParams({ scientificname, size: String(limit) });
  const startdate = optStr(args.startdate);
  const enddate = optStr(args.enddate);
  if (startdate) params.set('startdate', startdate);
  if (enddate) params.set('enddate', enddate);
  const body = (await obisGet(`/occurrence?${params.toString()}`)) as { total?: number; results?: OccurrenceResult[] };
  const results = body.results ?? [];
  return {
    total: body.total ?? 0,
    count: results.length,
    occurrences: results.map((r) => ({
      scientific_name: r.scientificName,
      lat: r.decimalLatitude,
      lng: r.decimalLongitude,
      date: r.eventDate,
      depth_m: r.depth ?? r.minimumDepthInMeters,
      country: r.country,
      locality: r.locality,
      basis: r.basisOfRecord,
    })),
  };
}

async function getStatistics(args: Record<string, unknown>): Promise<unknown> {
  const scientificname = reqStr(args, 'scientificname');
  const body = await obisGet(`/statistics?scientificname=${encodeURIComponent(scientificname)}`);
  return { scientificname, statistics: body };
}

async function obisGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) throw new Error(`OBIS: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing.`);
  return v.trim();
}

function optStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function clampLimit(v: unknown): number {
  const n = typeof v === 'number' ? Math.floor(v) : NaN;
  if (!Number.isFinite(n) || n <= 0) return 20;
  return Math.min(n, 100);
}

interface TaxonResult {
  scientificName?: string;
  taxonID?: number;
  taxonRank?: string;
  acceptedNameUsage?: string;
  kingdom?: string;
  phylum?: string;
  family?: string;
  genus?: string;
  records?: number | null;
}

interface OccurrenceResult {
  scientificName?: string;
  decimalLatitude?: number;
  decimalLongitude?: number;
  eventDate?: string;
  depth?: number;
  minimumDepthInMeters?: number;
  maximumDepthInMeters?: number;
  country?: string;
  locality?: string;
  basisOfRecord?: string;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
