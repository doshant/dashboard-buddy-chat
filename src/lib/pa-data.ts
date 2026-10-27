import type { RegionName } from "@/lib/scope";

// Prior authorization (PA) detail behind the Market Access story: first-pass PA approval held near
// 94% through H1, then fell in Q3 after two Medicare Advantage plans changed their PA criteria.
// Recorded per region (so regional views are exact) and as individual denials (so payer, reason,
// site and appeal breakdowns follow the region and period filters). Every PA submitted here is a
// patient who passed benefits verification; patients denied first time but overturned on appeal
// count as approved in the referral funnel, so its since-launch totals don't change.

export type PaDenialReason =
  | "Missing confirmatory test result"
  | "Baseline functional score not attached"
  | "Site of care not in network"
  | "Incomplete form"
  | "Not medically necessary";

export type PaDenial = {
  month: string;
  region: RegionName;
  payer: string;
  reason: PaDenialReason;
  site: string;
  appeal: "overturned" | "upheld" | "pending";
};

export type PaSite = {
  site: string;
  region: RegionName;
  hubPreReview: boolean;
  submitted: number;
  denied: number;
  awaiting: number;
};

export type PaRaw = {
  // PAs submitted and still awaiting a first decision, by submission month.
  months: { month: string; submitted: number; awaiting: number }[];
  denials: PaDenial[];
  // Q3 submissions by treating site (since the payer policy change on Jul 1).
  sites: PaSite[];
  policyNote: string;
  appealMedianDays: number;
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

const submittedByRegion: Record<RegionName, number[]> = {
  Northeast: [3, 3, 2, 2, 3, 2, 3, 3, 2],
  Southeast: [2, 2, 2, 1, 2, 2, 3, 3, 3],
  Midwest: [2, 1, 2, 1, 1, 2, 1, 2, 1],
  West: [4, 3, 2, 3, 2, 2, 2, 1, 2],
};

const awaitingByRegion: Record<RegionName, number[]> = {
  Northeast: [0, 0, 0, 0, 0, 0, 0, 0, 1],
  Southeast: [0, 0, 0, 0, 0, 0, 0, 0, 1],
  Midwest: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  West: [0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const denials: PaDenial[] = [
  // H1: the occasional denial, spread across payers and reasons.
  {
    month: "Jan",
    region: "Northeast",
    payer: "Commercial",
    reason: "Site of care not in network",
    site: "Northeast sites",
    appeal: "overturned",
  },
  {
    month: "Mar",
    region: "West",
    payer: "Medicare FFS",
    reason: "Incomplete form",
    site: "West sites",
    appeal: "overturned",
  },
  {
    month: "Jun",
    region: "Southeast",
    payer: "Medicare Advantage",
    reason: "Not medically necessary",
    site: "Southeast Center A",
    appeal: "overturned",
  },
  // Q3: after the Medicare Advantage policy change, mostly missing documentation.
  {
    month: "Jul",
    region: "Southeast",
    payer: "Medicare Advantage",
    reason: "Missing confirmatory test result",
    site: "Southeast Center A",
    appeal: "overturned",
  },
  {
    month: "Jul",
    region: "Southeast",
    payer: "Medicare Advantage",
    reason: "Baseline functional score not attached",
    site: "Southeast Center B",
    appeal: "overturned",
  },
  {
    month: "Jul",
    region: "Midwest",
    payer: "Medicare Advantage",
    reason: "Missing confirmatory test result",
    site: "Midwest Center A",
    appeal: "overturned",
  },
  {
    month: "Aug",
    region: "Southeast",
    payer: "Medicare Advantage",
    reason: "Missing confirmatory test result",
    site: "Southeast Center A",
    appeal: "upheld",
  },
  {
    month: "Aug",
    region: "Southeast",
    payer: "Medicare Advantage",
    reason: "Baseline functional score not attached",
    site: "Southeast Center B",
    appeal: "overturned",
  },
  {
    month: "Aug",
    region: "Midwest",
    payer: "Medicare Advantage",
    reason: "Missing confirmatory test result",
    site: "Midwest Center A",
    appeal: "overturned",
  },
  {
    month: "Aug",
    region: "Northeast",
    payer: "Commercial",
    reason: "Site of care not in network",
    site: "Northeast sites",
    appeal: "overturned",
  },
  {
    month: "Sep",
    region: "Southeast",
    payer: "Medicare Advantage",
    reason: "Missing confirmatory test result",
    site: "Southeast Center A",
    appeal: "overturned",
  },
  {
    month: "Sep",
    region: "Midwest",
    payer: "Medicaid / CHIP",
    reason: "Baseline functional score not attached",
    site: "Midwest Center A",
    appeal: "pending",
  },
  {
    month: "Sep",
    region: "West",
    payer: "Medicare Advantage",
    reason: "Missing confirmatory test result",
    site: "West sites",
    appeal: "overturned",
  },
];

const sites: PaSite[] = [
  {
    site: "Southeast Center A",
    region: "Southeast",
    hubPreReview: false,
    submitted: 4,
    denied: 3,
    awaiting: 0,
  },
  {
    site: "Southeast Center B",
    region: "Southeast",
    hubPreReview: false,
    submitted: 3,
    denied: 2,
    awaiting: 1,
  },
  {
    site: "Other Southeast sites",
    region: "Southeast",
    hubPreReview: true,
    submitted: 2,
    denied: 0,
    awaiting: 0,
  },
  {
    site: "Midwest Center A",
    region: "Midwest",
    hubPreReview: false,
    submitted: 3,
    denied: 3,
    awaiting: 0,
  },
  {
    site: "Other Midwest sites",
    region: "Midwest",
    hubPreReview: true,
    submitted: 1,
    denied: 0,
    awaiting: 0,
  },
  {
    site: "Northeast sites",
    region: "Northeast",
    hubPreReview: true,
    submitted: 8,
    denied: 1,
    awaiting: 1,
  },
  { site: "West sites", region: "West", hubPreReview: true, submitted: 5, denied: 1, awaiting: 0 },
];

const policyNote =
  "Effective Jul 1, 2026, two Medicare Advantage plans changed their PA criteria: a confirmatory test result and a baseline functional score must now be attached at submission. Sites using the hub's PA pre-review add both before submitting.";
const appealMedianDays = 19;

export function paRawFor(region: RegionName): PaRaw {
  return {
    months: monthNames.map((month, m) => ({
      month,
      submitted: submittedByRegion[region][m] ?? 0,
      awaiting: awaitingByRegion[region][m] ?? 0,
    })),
    denials: denials.filter((row) => row.region === region),
    sites: sites.filter((row) => row.region === region),
    policyNote,
    appealMedianDays,
  };
}

export const nationalPaRaw: PaRaw = {
  months: monthNames.map((month, m) => {
    const regions = Object.keys(submittedByRegion) as RegionName[];
    return {
      month,
      submitted: regions.reduce((total, region) => total + (submittedByRegion[region][m] ?? 0), 0),
      awaiting: regions.reduce((total, region) => total + (awaitingByRegion[region][m] ?? 0), 0),
    };
  }),
  denials,
  sites,
  policyNote,
  appealMedianDays,
};

// Funnel figures implied by a region's (or the nation's) PA record.
export function paFunnel(raw: PaRaw) {
  const submitted = raw.months.reduce((total, row) => total + row.submitted, 0);
  const awaiting = raw.months.reduce((total, row) => total + row.awaiting, 0);
  const denied = raw.denials.length;
  const overturned = raw.denials.filter((row) => row.appeal === "overturned").length;
  const upheld = raw.denials.filter((row) => row.appeal === "upheld").length;
  const appealPending = raw.denials.filter((row) => row.appeal === "pending").length;
  return {
    submitted,
    approved: submitted - denied - awaiting + overturned,
    pending: awaiting + appealPending,
    cancelled: upheld,
  };
}
