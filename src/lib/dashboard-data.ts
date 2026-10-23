export const filters = {
  geographyLevels: ["Nation", "Region", "Territory"],
  geographyNames: ["Nation", "East", "West", "Central"],
  timePeriods: ["Launch to Date", "QTD", "Monthly"],
} as const;

export const dataThrough = "Sep 30, 2026";

// Ex-factory economics: net sales = paid vials × WAC less assumed GTN %.
export const wacPerVial = 180_000;
export const assumedGtn = 0.15;

export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
export const pct = (part: number, whole: number) => Math.round((part / whole) * 100);
const round1 = (value: number) => Math.round(value * 10) / 10;

export function last<T>(rows: T[], offset = 1): T {
  const row = rows[rows.length - offset];
  if (row === undefined) throw new Error("Expected a populated series");
  return row;
}

function toNetSalesM(paidVials: number) {
  return Math.round(((paidVials * wacPerVial * (1 - assumedGtn)) / 1e6) * 100) / 100;
}

// Ex-factory shipments against the original budget and the latest estimate (LE).
export const monthlyVials = [
  { month: "Jan", paid: 6, free: 8, budget: 16, le: 14, forecastNetSales: 1.2 },
  { month: "Feb", paid: 12, free: 9, budget: 20, le: 21, forecastNetSales: 1.8 },
  { month: "Mar", paid: 13, free: 7, budget: 22, le: 20, forecastNetSales: 2.3 },
  { month: "Apr", paid: 13, free: 6, budget: 24, le: 19, forecastNetSales: 2.7 },
  { month: "May", paid: 17, free: 6, budget: 26, le: 23, forecastNetSales: 3.0 },
  { month: "Jun", paid: 21, free: 6, budget: 28, le: 27, forecastNetSales: 3.3 },
  { month: "Jul", paid: 23, free: 5, budget: 30, le: 29, forecastNetSales: 3.6 },
  { month: "Aug", paid: 26, free: 6, budget: 32, le: 31, forecastNetSales: 3.9 },
  { month: "Sep", paid: 29, free: 6, budget: 34, le: 33, forecastNetSales: 4.2 },
].map((row) => ({ ...row, total: row.paid + row.free }));

export const monthlyNetSales = monthlyVials.map((row) => ({
  month: row.month,
  actual: toNetSalesM(row.paid),
  forecast: row.forecastNetSales,
}));

export const activePatientsTrend = [
  { month: "Jan", loading: 9, maintenance: 0 },
  { month: "Feb", loading: 14, maintenance: 3 },
  { month: "Mar", loading: 11, maintenance: 12 },
  { month: "Apr", loading: 10, maintenance: 18 },
  { month: "May", loading: 10, maintenance: 24 },
  { month: "Jun", loading: 12, maintenance: 29 },
  { month: "Jul", loading: 11, maintenance: 36 },
  { month: "Aug", loading: 12, maintenance: 42 },
  { month: "Sep", loading: 11, maintenance: 51 },
];

// Commercial is paid drug; Quick Start, Bridge and PAP are free-goods programs.
export const activeByStatus = [
  { month: "Jan", commercial: 2, quickStart: 3, bridge: 1, pap: 3 },
  { month: "Feb", commercial: 6, quickStart: 5, bridge: 2, pap: 4 },
  { month: "Mar", commercial: 11, quickStart: 5, bridge: 3, pap: 4 },
  { month: "Apr", commercial: 16, quickStart: 5, bridge: 3, pap: 4 },
  { month: "May", commercial: 21, quickStart: 6, bridge: 3, pap: 4 },
  { month: "Jun", commercial: 26, quickStart: 7, bridge: 3, pap: 5 },
  { month: "Jul", commercial: 31, quickStart: 7, bridge: 4, pap: 5 },
  { month: "Aug", commercial: 37, quickStart: 7, bridge: 4, pap: 6 },
  { month: "Sep", commercial: 44, quickStart: 7, bridge: 5, pap: 6 },
];

export const newPatients = [
  { month: "Jan", eapTransition: 7, newToBrand: 2 },
  { month: "Feb", eapTransition: 5, newToBrand: 3 },
  { month: "Mar", eapTransition: 3, newToBrand: 4 },
  { month: "Apr", eapTransition: 2, newToBrand: 4 },
  { month: "May", eapTransition: 1, newToBrand: 6 },
  { month: "Jun", eapTransition: 1, newToBrand: 7 },
  { month: "Jul", eapTransition: 0, newToBrand: 7 },
  { month: "Aug", eapTransition: 0, newToBrand: 8 },
  { month: "Sep", eapTransition: 0, newToBrand: 9 },
];

// Cumulative since launch: patients who have ever reached each step.
export const funnel = {
  referred: 80,
  benefitsVerified: 77,
  paApproved: 73,
  firstDose: 69,
  secondDose: 64,
  maintenance: 54,
};

export const patientFunnel = [
  { stage: "Referred", patients: funnel.referred },
  { stage: "Benefits verified", patients: funnel.benefitsVerified },
  { stage: "PA approved", patients: funnel.paApproved },
  { stage: "First dose", patients: funnel.firstDose },
  { stage: "Second dose", patients: funnel.secondDose },
  { stage: "Maintenance (3+)", patients: funnel.maintenance },
];

export const pendingByStep = {
  benefitsVerification: { d0to14: 2, d15to30: 0, d31plus: 0 },
  priorAuthorization: { d0to14: 1, d15to30: 1, d31plus: 1 },
  lpScheduling: { d0to14: 1, d15to30: 1, d31plus: 2 },
};

const pendingTotal = (row: { d0to14: number; d15to30: number; d31plus: number }) => row.d0to14 + row.d15to30 + row.d31plus;

export const pendingPatients = [
  { stage: "Benefits verification", ...pendingByStep.benefitsVerification },
  { stage: "Prior authorization", ...pendingByStep.priorAuthorization },
  { stage: "LP scheduling", ...pendingByStep.lpScheduling },
].map((row) => ({ ...row, total: pendingTotal(row) }));

export const pendingAvgDays = 22;

// Referrals that left the funnel before a first dose, by the step where they stopped.
export const cancelledByStep = {
  benefitsVerification: funnel.referred - funnel.benefitsVerified - pendingTotal(pendingByStep.benefitsVerification),
  priorAuthorization: funnel.benefitsVerified - funnel.paApproved - pendingTotal(pendingByStep.priorAuthorization),
  lpScheduling: funnel.paApproved - funnel.firstDose - pendingTotal(pendingByStep.lpScheduling),
};

export const prescribers = [
  { month: "Jan", new: 7, repeat: 0 },
  { month: "Feb", new: 5, repeat: 5 },
  { month: "Mar", new: 4, repeat: 8 },
  { month: "Apr", new: 3, repeat: 10 },
  { month: "May", new: 4, repeat: 12 },
  { month: "Jun", new: 4, repeat: 14 },
  { month: "Jul", new: 3, repeat: 17 },
  { month: "Aug", new: 2, repeat: 19 },
  { month: "Sep", new: 6, repeat: 19 },
];

// Latest month is September; QTD is Q3 (Jul–Sep).
const q3Vials = monthlyVials.slice(-3);
const q3NetSales = monthlyNetSales.slice(-3);
const latestNetSales = last(monthlyNetSales);
const latestVials = last(monthlyVials);

export const attainment = {
  netSales: {
    month: { actual: latestNetSales.actual, target: latestNetSales.forecast },
    qtd: { actual: round1(sum(q3NetSales.map((row) => row.actual))), target: round1(sum(q3NetSales.map((row) => row.forecast))) },
    ltd: { actual: round1(sum(monthlyNetSales.map((row) => row.actual))), target: round1(sum(monthlyNetSales.map((row) => row.forecast))) },
  },
  vials: {
    month: { actual: latestVials.total, target: latestVials.budget },
    qtd: { actual: sum(q3Vials.map((row) => row.total)), target: sum(q3Vials.map((row) => row.budget)) },
    ltd: { actual: sum(monthlyVials.map((row) => row.total)), target: sum(monthlyVials.map((row) => row.budget)) },
  },
};

const latestStatus = last(activeByStatus);
const latestActive = last(activePatientsTrend);
const activeTotal = latestActive.loading + latestActive.maintenance;
const priorActive = last(activePatientsTrend, 2);
const priorActiveTotal = priorActive.loading + priorActive.maintenance;
const latestNew = last(newPatients);
const latestPrescribers = last(prescribers);
const vialsTotal = sum(monthlyVials.map((row) => row.total));
const vialsBudget = sum(monthlyVials.map((row) => row.budget));
const vialsLe = sum(monthlyVials.map((row) => row.le));

export const kpis = {
  netSales: {
    ltd: attainment.netSales.ltd.actual,
    forecast: attainment.netSales.ltd.target,
    attainmentPct: pct(attainment.netSales.ltd.actual, attainment.netSales.ltd.target),
    wac: wacPerVial,
    gtn: assumedGtn,
  },
  vials: {
    paid: sum(monthlyVials.map((row) => row.paid)),
    free: sum(monthlyVials.map((row) => row.free)),
    total: vialsTotal,
    budget: vialsBudget,
    le: vialsLe,
    budgetPct: pct(vialsTotal, vialsBudget),
    lePct: pct(vialsTotal, vialsLe),
  },
  activePatients: {
    total: activeTotal,
    paid: latestStatus.commercial,
    free: latestStatus.quickStart + latestStatus.bridge + latestStatus.pap,
    loading: latestActive.loading,
    maintenance: latestActive.maintenance,
    prior: priorActiveTotal,
    changePct: pct(activeTotal - priorActiveTotal, priorActiveTotal),
  },
  newPatients: {
    total: latestNew.eapTransition + latestNew.newToBrand,
    eapTransition: latestNew.eapTransition,
    newToBrand: latestNew.newToBrand,
    sinceLaunch: sum(newPatients.map((row) => row.eapTransition + row.newToBrand)),
    eapSinceLaunch: sum(newPatients.map((row) => row.eapTransition)),
    newToBrandSinceLaunch: sum(newPatients.map((row) => row.newToBrand)),
  },
  pending: {
    total: sum(pendingPatients.map((row) => row.total)),
    over30: sum(pendingPatients.map((row) => row.d31plus)),
    avgDays: pendingAvgDays,
  },
  prescribers: {
    new: latestPrescribers.new,
    ordering: latestPrescribers.new + latestPrescribers.repeat,
    sinceLaunch: sum(prescribers.map((row) => row.new)),
  },
};

export const panelLabels = [
  "Overview",
  "Market Access",
  "Marketing",
  "Site of Care",
  "Field Activity",
] as const;

export type PanelLabel = (typeof panelLabels)[number];

// Demo profiles simulating role-based access: each sees only its permitted tabs.
export const profiles: { id: string; name: string; role: string; avatar: string; panels: readonly PanelLabel[] }[] = [
  { id: "jenny", name: "Jenny", role: "Brand Director", avatar: "👩🏻‍💼", panels: panelLabels },
  { id: "bob", name: "Bob", role: "Market Access Lead", avatar: "👨🏽‍💼", panels: ["Market Access"] },
  { id: "jeff", name: "Jeff", role: "Marketing Manager", avatar: "🧑🏼‍💼", panels: ["Marketing"] },
];

export function accessSummary(panels: readonly PanelLabel[]) {
  return panels.length === panelLabels.length ? "All tabs" : `${panels.join(", ")} only`;
}

// `title` names what the reply's tables show; downloads are saved under it.
type DashboardAnswer = { title: string; response: string; suggestions: string[] };

const starterQuestionsByPanel: Partial<Record<PanelLabel, string[]>> = {
  Overview: [
    "How are we tracking against forecast?",
    "How many patients are active right now?",
    "Why are patients still pending?",
    "How many new prescribers did we add?",
    "Summarize the key insights from this dashboard.",
  ],
  "Market Access": [
    "What is our PA approval rate?",
    "How long does it take to get to first dose?",
    "What does the payer mix look like?",
    "Why are patients stopping therapy?",
    "How much inventory is in the channel?",
  ],
  Marketing: [
    "Which media channels drive the most impressions?",
    "What is our ad engagement rate?",
    "How is website traffic trending?",
    "How are our emails performing?",
    "Which region is performing best?",
  ],
};

export function starterQuestionsFor(panel: string) {
  return starterQuestionsByPanel[panel as PanelLabel] ?? starterQuestionsByPanel.Overview ?? [];
}

// Replies render as markdown in the chat: a headline sentence, then a compact table.
const lines = (...rows: string[]) => rows.join("\n");

export const dashboardAnswers = {
  forecast: {
    title: "Net sales and vials vs forecast",
    response: lines(
      "**Net sales are $24.5M launch to date, 94% of forecast**, after a slow Q1. Q3 is running ahead.",
      "",
      "| Metric | Actual | Target | Attainment |",
      "| --- | ---: | ---: | ---: |",
      "| Net sales, launch to date | $24.5M | $26.0M | 94% |",
      "| Net sales, Q3 QTD | $11.9M | $11.7M | 102% |",
      "| Net sales, September | $4.4M | $4.2M | 106% |",
      "| Vials vs original budget | 219 | 232 | 94% |",
      "| Vials vs LE | 219 | 217 | 101% |",
    ),
    suggestions: [
      "How many patients are active right now?",
      "Why are patients still pending?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  active: {
    title: "Active patients",
    response: lines(
      "**62 patients are active** (dosed in the last 16 weeks), up 15% from 54 in August.",
      "",
      "| Payment | Patients |",
      "| --- | ---: |",
      "| Commercial (paid) | 44 |",
      "| Quick Start (free) | 7 |",
      "| Bridge (free) | 5 |",
      "| PAP (free) | 6 |",
      "",
      "| Therapy phase | Patients |",
      "| --- | ---: |",
      "| Loading (doses 1–2) | 11 |",
      "| Maintenance (dose 3+) | 51 |",
    ),
    suggestions: [
      "How many new prescribers did we add?",
      "How are we tracking against forecast?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  pending: {
    title: "Pending patients",
    response: lines(
      "**9 patients are referred but not yet dosed**, pending an average of 22 days.",
      "",
      "| Stage | Patients |",
      "| --- | ---: |",
      "| LP scheduling | 4 |",
      "| Prior authorization | 3 |",
      "| Benefits verification | 2 |",
      "| **Total pending** | **9** |",
      "",
      "3 patients have waited over 30 days, 2 of them at LP scheduling.",
    ),
    suggestions: [
      "How many patients are active right now?",
      "How are we tracking against forecast?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  prescribers: {
    title: "Prescribers",
    response: lines(
      "**38 HCPs have prescribed since launch**, and September added the most new prescribers since February.",
      "",
      "| Prescribers | HCPs |",
      "| --- | ---: |",
      "| New in September | 6 |",
      "| Ordering in September | 25 |",
      "| Since launch | 38 |",
    ),
    suggestions: [
      "Why are patients still pending?",
      "How many patients are active right now?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  summary: {
    title: "Launch summary",
    response: lines(
      "**Sales are close to forecast and Q3 is running ahead.** Key numbers launch to date:",
      "",
      "| Area | Status |",
      "| --- | --- |",
      "| Net sales | $24.5M, 94% of forecast (Q3 at 102%) |",
      "| Active patients | 62 (44 paid, 18 free) |",
      "| New starts, September | 9, all new to brand |",
      "| Pending patients | 9, mostly at LP scheduling |",
      "| Prescribers | 38 HCPs since launch |",
    ),
    suggestions: [
      "How are we tracking against forecast?",
      "Why are patients still pending?",
      "How many new prescribers did we add?",
    ],
  },
  priorAuth: {
    title: "Prior authorization",
    response: lines(
      "**95% of decided PAs have been approved**, and approvals are getting faster.",
      "",
      "| PA status | Patients |",
      "| --- | ---: |",
      "| Submitted | 77 |",
      "| Approved | 73 |",
      "| Awaiting decision | 3 |",
      "| Denied | 1 |",
      "",
      "| Days from referral to first PA approval | Days |",
      "| --- | ---: |",
      "| Median (mean 18) | 15 |",
      "| January referrals | 21 |",
      "| August referrals | 11 |",
    ),
    suggestions: [
      "How long does it take to get to first dose?",
      "What does the payer mix look like?",
      "Why are patients stopping therapy?",
    ],
  },
  timeToDose: {
    title: "Time to first dose",
    response: lines(
      "**Non-EAP patients reach their first intrathecal dose a median of 29 days after referral** (mean 34, across 50 new-to-brand starts).",
      "",
      "| Referral month | Days to first dose |",
      "| --- | ---: |",
      "| January | 40 |",
      "| August | 23 |",
      "",
      "| Referral outcome | Patients | Share |",
      "| --- | ---: | ---: |",
      "| Started therapy, of all 80 referrals | 69 | 86% |",
      "| Started therapy, of 71 with a known outcome | 69 | 97% |",
    ),
    suggestions: [
      "What is our PA approval rate?",
      "What does the payer mix look like?",
      "How much inventory is in the channel?",
    ],
  },
  payerMix: {
    title: "Payer mix",
    response: lines(
      "**Medicare is the largest payer** across 80 referred patients and 143 paid doses.",
      "",
      "| Payer | Referred patients | Paid doses |",
      "| --- | ---: | ---: |",
      "| Medicare FFS | 22 | 52 |",
      "| Medicare Advantage | 14 | 31 |",
      "| Commercial | 24 | 47 |",
      "| Medicaid / CHIP | 9 | 13 |",
      "| Free drug | 6 | – |",
      "| Unmapped | 5 | – |",
      "| **Total** | **80** | **143** |",
      "",
      "Patients pay an average of $295 per dose after foundation and copay support.",
    ),
    suggestions: [
      "What is our PA approval rate?",
      "Why are patients stopping therapy?",
      "How long does it take to get to first dose?",
    ],
  },
  stops: {
    title: "Discontinuations",
    response: lines(
      "**11 patients have stopped or never started.**",
      "",
      "| Reason | Before first dose | After dosing |",
      "| --- | ---: | ---: |",
      "| Death | 1 | 3 |",
      "| Access denial | 1 | 2 |",
      "| Ventilation | – | 2 |",
      "| Hospice | – | 2 |",
      "| **Total** | **2** | **9** |",
      "",
      "Both access-denial discontinuations later restarted, so 7 patients are off therapy and 62 remain active.",
    ),
    suggestions: [
      "What is our PA approval rate?",
      "What does the payer mix look like?",
      "How much inventory is in the channel?",
    ],
  },
  inventory: {
    title: "Channel inventory",
    response: lines(
      "**23 vials are in the channel**, about 0.8 months of supply at the recent average of 29 doses a month.",
      "",
      "| Location | Vials |",
      "| --- | ---: |",
      "| Specialty distributor | 9 |",
      "| Treating sites | 14 |",
      "| **Total** (17 paid, 6 free) | **23** |",
      "",
      "This equals the 219 vials shipped less the 196 administered.",
    ),
    suggestions: [
      "What is our PA approval rate?",
      "Why are patients stopping therapy?",
      "What does the payer mix look like?",
    ],
  },
  mediaChannels: {
    title: "Paid media by channel",
    response: lines(
      "**Paid media has delivered 17.4M impressions since launch**, growing from 1.5M in M1 to 2.4M in M9.",
      "",
      "| Channel | Impressions | Share |",
      "| --- | ---: | ---: |",
      "| Display ads | 6.3M | 36% |",
      "| Social media | 4.5M | 26% |",
      "| Pre-roll video | 4.0M | 23% |",
      "| Paid search | 1.9M | 11% |",
      "| Other | 0.8M | 4% |",
      "| **Total** | **17.4M** | **100%** |",
    ),
    suggestions: [
      "What is our ad engagement rate?",
      "Which region is performing best?",
      "How is website traffic trending?",
    ],
  },
  adEngagement: {
    title: "Ad engagement",
    response: lines(
      "**The click & video engagement rate is 7.2%**, and it has risen every month, from 6.4% in M1 to 7.9% in M9.",
      "",
      "| Metric | Value |",
      "| --- | ---: |",
      "| Impressions | 17.4M |",
      "| Ad clicks | 78.2k |",
      "| Video views | 1.2M |",
      "| Engagement rate | 7.2% |",
    ),
    suggestions: [
      "Which media channels drive the most impressions?",
      "How is website traffic trending?",
      "Which region is performing best?",
    ],
  },
  websiteTraffic: {
    title: "Website traffic",
    response: lines(
      "**The brand websites have had 142.7k visits since launch**; monthly visits are up 7% on M8.",
      "",
      "| Site | Visits |",
      "| --- | ---: |",
      "| Patient site | 91.9k |",
      "| HCP site | 50.8k |",
      "| **Total** | **142.7k** |",
      "",
      "| Metric | Value |",
      "| --- | ---: |",
      "| Monthly visits, M1 | 11.5k |",
      "| Monthly visits, M9 | 20.1k (+75%) |",
      "| Visits with a high value action | 6.8k |",
      "| HVA rate | 4.7% |",
      "",
      "Most high value actions are resource downloads.",
    ),
    suggestions: [
      "How are our emails performing?",
      "What is our ad engagement rate?",
      "Which region is performing best?",
    ],
  },
  emailPerformance: {
    title: "Email performance",
    response: lines(
      "**67.4k emails were delivered**, with a 29.1% open rate and a 4.3% click rate.",
      "",
      "| Step | Emails | Rate |",
      "| --- | ---: | ---: |",
      "| Sent | 70.0k | |",
      "| Bounced | 2.6k | |",
      "| Delivered | 67.4k | |",
      "| Opened | 19.6k | 29.1% |",
      "| Clicked | 2.9k | 4.3% |",
      "| Converted to a high value action | 550 | |",
      "",
      "Patient campaigns open better than HCP campaigns: 36.0% vs 26.0%.",
    ),
    suggestions: [
      "How is website traffic trending?",
      "Which region is performing best?",
      "Which media channels drive the most impressions?",
    ],
  },
  regionalMarketing: {
    title: "Marketing by region",
    response: lines(
      "**Northeast leads on most measures**, with 7.3% engagement and a 29.8% email open rate. Midwest is smallest and trails on HVA and open rates.",
      "",
      "| Region | Impressions | Engagement | HVA rate | Open rate |",
      "| --- | ---: | ---: | ---: | ---: |",
      "| Northeast | 5.1M | 7.3% | 4.8% | 29.8% |",
      "| West | 4.5M | 7.3% | 4.8% | 29.6% |",
      "| Southeast | 4.4M | 7.0% | 4.7% | 28.3% |",
      "| Midwest | 3.5M | 7.0% | 4.6% | 28.2% |",
      "| **Total** | **17.4M** | **7.2%** | **4.7%** | **29.1%** |",
    ),
    suggestions: [
      "Which media channels drive the most impressions?",
      "How are our emails performing?",
      "What is our ad engagement rate?",
    ],
  },
  unrecognized: {
    title: "Dashboard Assistant",
    response: "I'm still learning! Please try one of the suggested questions.",
    suggestions: [
      "How are we tracking against forecast?",
      "What is our PA approval rate?",
      "Summarize the key insights from this dashboard.",
    ],
  },
} satisfies Record<string, DashboardAnswer>;

type Topic = keyof typeof dashboardAnswers;

// The tab whose data each answer draws on; the assistant only answers from permitted tabs.
const topicPanels: Record<Topic, PanelLabel | null> = {
  forecast: "Overview",
  active: "Overview",
  pending: "Overview",
  prescribers: "Overview",
  summary: "Overview",
  priorAuth: "Market Access",
  timeToDose: "Market Access",
  payerMix: "Market Access",
  stops: "Market Access",
  inventory: "Market Access",
  mediaChannels: "Marketing",
  adEngagement: "Marketing",
  websiteTraffic: "Marketing",
  emailPerformance: "Marketing",
  regionalMarketing: "Marketing",
  unrecognized: null,
};

function topicFor(question: string): Topic {
  const normalized = question.toLowerCase().trim();

  if (/impression|media/.test(normalized)) return "mediaChannels";
  if (/engagement|ad click|video view/.test(normalized)) return "adEngagement";
  if (/website|traffic|visit|\bhva\b|high value/.test(normalized)) return "websiteTraffic";
  if (/email|open rate|click rate/.test(normalized)) return "emailPerformance";
  if (/region/.test(normalized)) return "regionalMarketing";
  if (/\bpa\b|prior auth|approval/.test(normalized)) return "priorAuth";
  if (/first dose|how long|time to/.test(normalized)) return "timeToDose";
  if (/payer|insur|medicare|medicaid|out-of-pocket|oop/.test(normalized)) return "payerMix";
  if (/stopp|discontinu|cancel|restart/.test(normalized)) return "stops";
  if (/inventory|on hand|channel/.test(normalized)) return "inventory";
  if (/prescriber|hcp|writer|doctor/.test(normalized)) return "prescribers";
  if (/pending|waiting|referr|backlog/.test(normalized)) return "pending";
  if (/active|on treatment|paid|free|status/.test(normalized)) return "active";
  if (/forecast|sales|vial|revenue|track/.test(normalized)) return "forecast";
  if (/summar|key insight|dashboard insight/.test(normalized)) return "summary";

  return "unrecognized";
}

function canAsk(question: string, allowedPanels: readonly PanelLabel[]) {
  const panel = topicPanels[topicFor(question)];
  return panel === null || allowedPanels.includes(panel);
}

// Keeps follow-up suggestions inside the profile's access, topping up from its own tabs.
function permittedSuggestions(suggestions: string[], allowedPanels: readonly PanelLabel[]) {
  const starters = allowedPanels.flatMap((panel) => starterQuestionsByPanel[panel] ?? []);
  const pool = [...suggestions, ...starters].filter((question) => canAsk(question, allowedPanels));
  return [...new Set(pool)].slice(0, 3);
}

export function resolveDashboardAnswer(
  question: string,
  allowedPanels: readonly PanelLabel[] = panelLabels,
): DashboardAnswer {
  const topic = topicFor(question);
  const panel = topicPanels[topic];

  if (panel !== null && !allowedPanels.includes(panel)) {
    return {
      title: "Access restricted",
      response: `That question draws on ${panel} data, which isn't part of your access. You can ask about ${allowedPanels.filter((label) => starterQuestionsByPanel[label]).join(", ")}.`,
      suggestions: permittedSuggestions([], allowedPanels),
    };
  }

  const answer = dashboardAnswers[topic];
  return {
    title: answer.title,
    response: answer.response,
    suggestions: permittedSuggestions(answer.suggestions, allowedPanels),
  };
}
