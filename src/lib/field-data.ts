import { buildLaunchData, nationalLaunchRaw, sum, type LaunchData } from "@/lib/launch-data";

// Field figures are stored as raw counts and every total, rate and average is derived, so the
// cards, charts and regional table always agree. Prescriber counts come from the launch data.
// Launch month M1 is January 2026. `start` limits call totals and averages to the period.

const share = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const round1 = (value: number) => Math.round(value * 10) / 10;

export const callTypes = [
  { key: "faceToFace", label: "Face-to-face" },
  { key: "virtual", label: "Virtual" },
  { key: "phone", label: "Phone" },
] as const;

export type FieldRaw = {
  // Calls by month and type. `sellingDays` counts weekdays; target and reached HCPs are cumulative.
  months: {
    month: string;
    calendar: string;
    sellingDays: number;
    faceToFace: number;
    virtual: number;
    phone: number;
    targeted: number;
    reached: number;
  }[];
  // Champions are prescribers with three or more patients started.
  repeatPrescribers: number;
  champions: number;
};

export const nationalFieldRaw: FieldRaw = {
  months: [
    {
      month: "M1",
      calendar: "Jan",
      sellingDays: 22,
      faceToFace: 38,
      virtual: 16,
      phone: 10,
      targeted: 120,
      reached: 41,
    },
    {
      month: "M2",
      calendar: "Feb",
      sellingDays: 20,
      faceToFace: 44,
      virtual: 18,
      phone: 11,
      targeted: 126,
      reached: 62,
    },
    {
      month: "M3",
      calendar: "Mar",
      sellingDays: 22,
      faceToFace: 49,
      virtual: 21,
      phone: 12,
      targeted: 132,
      reached: 78,
    },
    {
      month: "M4",
      calendar: "Apr",
      sellingDays: 22,
      faceToFace: 53,
      virtual: 23,
      phone: 14,
      targeted: 138,
      reached: 91,
    },
    {
      month: "M5",
      calendar: "May",
      sellingDays: 21,
      faceToFace: 57,
      virtual: 25,
      phone: 15,
      targeted: 142,
      reached: 101,
    },
    {
      month: "M6",
      calendar: "Jun",
      sellingDays: 22,
      faceToFace: 62,
      virtual: 27,
      phone: 16,
      targeted: 146,
      reached: 110,
    },
    {
      month: "M7",
      calendar: "Jul",
      sellingDays: 23,
      faceToFace: 66,
      virtual: 29,
      phone: 18,
      targeted: 148,
      reached: 117,
    },
    {
      month: "M8",
      calendar: "Aug",
      sellingDays: 21,
      faceToFace: 70,
      virtual: 31,
      phone: 19,
      targeted: 150,
      reached: 122,
    },
    {
      month: "M9",
      calendar: "Sep",
      sellingDays: 22,
      faceToFace: 75,
      virtual: 33,
      phone: 20,
      targeted: 150,
      reached: 126,
    },
  ],
  repeatPrescribers: 24,
  champions: 9,
};

// Regional field totals since launch; regional views split the national months to match these.
export const fieldRegions = [
  { region: "Northeast", targeted: 44, reached: 38, calls: 262, prescribers: 12 },
  { region: "Southeast", targeted: 34, reached: 28, calls: 196, prescribers: 8 },
  { region: "Midwest", targeted: 30, reached: 24, calls: 166, prescribers: 7 },
  { region: "West", targeted: 42, reached: 36, calls: 248, prescribers: 11 },
];

export type FieldRegionRow = {
  region: string;
  targeted: number;
  reached: number;
  calls: number;
  prescribers: number;
};

export function withFieldRates(row: FieldRegionRow) {
  return { ...row, reachPct: share(row.reached, row.targeted) };
}

export function buildFieldData(launch: LaunchData, raw: FieldRaw, start = 0) {
  const prescribers = launch.trend.prescribers;
  const allMonths = raw.months.map((row, i) => {
    const total = row.faceToFace + row.virtual + row.phone;
    const ordering = (prescribers[i]?.new ?? 0) + (prescribers[i]?.repeat ?? 0);
    return {
      ...row,
      total,
      ordering,
      reachPct: share(row.reached, row.targeted),
      callsPerDay: round1(total / row.sellingDays),
      faceToFacePct: share(row.faceToFace, total),
    };
  });
  const fieldByMonth = allMonths.slice(start);
  const latest = allMonths[allMonths.length - 1]!;
  const totalCalls = sum(fieldByMonth.map((row) => row.total));

  const callMix = callTypes.map(({ key, label }) => {
    const calls = sum(fieldByMonth.map((row) => row[key]));
    return { key, label, calls, pct: totalCalls ? Math.round((calls / totalCalls) * 100) : 0 };
  });

  const engagementFunnel = [
    { stage: "Targeted", hcps: latest.targeted },
    { stage: "Reached", hcps: latest.reached },
    { stage: "Prescribers", hcps: launch.kpis.prescribers.sinceLaunch },
    { stage: "Repeat prescribers", hcps: raw.repeatPrescribers },
    { stage: "Champions", hcps: raw.champions },
  ];

  const sellingDays = sum(fieldByMonth.map((row) => row.sellingDays));
  const faceToFaceCalls = callMix.find((row) => row.key === "faceToFace")?.calls ?? 0;

  const fieldKpis = {
    targeted: latest.targeted,
    reached: latest.reached,
    reachPct: Math.round((latest.reached / latest.targeted) * 100),
    activePrescribers: launch.kpis.prescribers.ordering,
    prescribersSinceLaunch: launch.kpis.prescribers.sinceLaunch,
    calls: totalCalls,
    latestCalls: latest.total,
    firstCalls: fieldByMonth[0]?.total ?? 0,
    firstMonth: fieldByMonth[0]?.month ?? latest.month,
    callsPerHcp: round1(totalCalls / latest.reached),
    callsPerDay: round1(totalCalls / sellingDays),
    latestCallsPerDay: latest.callsPerDay,
    sellingDays,
    faceToFacePct: totalCalls ? Math.round((faceToFaceCalls / totalCalls) * 100) : 0,
  };

  return { fieldByMonth, callMix, engagementFunnel, fieldKpis, trend: { fieldByMonth: allMonths } };
}

export type FieldData = ReturnType<typeof buildFieldData>;

export const { fieldByMonth, callMix, engagementFunnel, fieldKpis } = buildFieldData(
  buildLaunchData(nationalLaunchRaw),
  nationalFieldRaw,
);

export const fieldRegionalSummary = fieldRegions.map(withFieldRates);
export const fieldRegionalTotal = withFieldRates({
  region: "Total",
  targeted: sum(fieldRegions.map((row) => row.targeted)),
  reached: sum(fieldRegions.map((row) => row.reached)),
  calls: sum(fieldRegions.map((row) => row.calls)),
  prescribers: sum(fieldRegions.map((row) => row.prescribers)),
});
