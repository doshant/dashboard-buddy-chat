export const brand = "Ulefnersen";

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
  "Site of Care",
  "Field Activity",
  "Enrollment & Dispense Mix",
  "Marketing",
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

type DashboardAnswer = { response: string; suggestions: string[] };

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

export const dashboardAnswers = {
  forecast: {
    response:
      "Ulefnersen net sales are $24.5M launch to date, 94% of the $26.0M launch forecast, after a slow Q1. Q3 QTD is ahead at $11.9M vs $11.7M (102%), and September alone hit $4.4M vs $4.2M (106%). Vials are 219 launch to date: 94% of the 232 original budget and 101% of the 217 LE.",
    suggestions: [
      "How many patients are active right now?",
      "Why are patients still pending?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  active: {
    response:
      "62 patients are active (dosed in the last 16 weeks), up 15% from 54 in August. 44 are commercial (paid) and 18 are on free programs: 7 Quick Start, 5 Bridge and 6 PAP. 11 are still in loading (doses 1–2) and 51 are in maintenance (dose 3+).",
    suggestions: [
      "How many new prescribers did we add?",
      "How are we tracking against forecast?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  pending: {
    response:
      "9 patients are referred but not yet dosed, pending an average of 22 days. LP scheduling holds the most (4) and the oldest: 2 of those have waited over 30 days. Prior authorization has 3 and benefits verification 2. 3 patients in total are past 30 days.",
    suggestions: [
      "How many patients are active right now?",
      "How are we tracking against forecast?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  prescribers: {
    response:
      "6 HCPs ordered Ulefnersen for the first time in September, the most since February, out of 25 ordering prescribers that month. 38 HCPs have prescribed since launch.",
    suggestions: [
      "Why are patients still pending?",
      "How many patients are active right now?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  summary: {
    response:
      "Launch to date, Ulefnersen has $24.5M net sales (94% of forecast) with Q3 running ahead at 102%. 62 patients are active (44 paid, 18 free) and 9 started in September, all new to brand now that EAP transitions are complete. 9 patients are pending, mostly at LP scheduling, and 38 HCPs have prescribed since launch.",
    suggestions: [
      "How are we tracking against forecast?",
      "Why are patients still pending?",
      "How many new prescribers did we add?",
    ],
  },
  priorAuth: {
    response:
      "77 patients have had a PA submitted and 73 were approved: a 95% approval rate. 3 are still awaiting a decision and 1 was denied. First PA approval takes a median of 15 days from referral (mean 18), down from 21 days for January referrals to 11 for August.",
    suggestions: [
      "How long does it take to get to first dose?",
      "What does the payer mix look like?",
      "Why are patients stopping therapy?",
    ],
  },
  timeToDose: {
    response:
      "Non-EAP patients reach their first intrathecal dose a median of 29 days after referral (mean 34, across 50 new-to-brand starts). That has fallen from 40 days for January referrals to 23 for August. Of 80 referrals, 69 have started therapy: 86% overall, or 97% of the 71 with a known outcome.",
    suggestions: [
      "What is our PA approval rate?",
      "What does the payer mix look like?",
      "How much inventory is in the channel?",
    ],
  },
  payerMix: {
    response:
      "Of the 80 referred patients, Medicare is the largest group (22 FFS, 14 Medicare Advantage), followed by 24 commercial, 9 Medicaid / CHIP, 6 free-drug and 5 unmapped. Of the 143 paid doses, Medicare FFS covers 52, commercial 47, Medicare Advantage 31 and Medicaid / CHIP 13. Patients pay an average of $295 per dose after foundation and copay support.",
    suggestions: [
      "What is our PA approval rate?",
      "Why are patients stopping therapy?",
      "How long does it take to get to first dose?",
    ],
  },
  stops: {
    response:
      "11 patients have stopped or never started. 2 referrals were cancelled before a first dose (1 death, 1 access denial), and 9 patients discontinued after dosing: 3 deaths, 2 ventilation, 2 hospice and 2 access denials. Both access-denial discontinuations later restarted, so 7 patients are off therapy and 62 remain active.",
    suggestions: [
      "What is our PA approval rate?",
      "What does the payer mix look like?",
      "How much inventory is in the channel?",
    ],
  },
  inventory: {
    response:
      "23 vials are in the channel: 9 at the specialty distributor and 14 across treating sites (17 paid, 6 free). That equals the 219 vials shipped less the 196 administered, and covers about 0.8 months at the last three months' average of 29 doses.",
    suggestions: [
      "What is our PA approval rate?",
      "Why are patients stopping therapy?",
      "What does the payer mix look like?",
    ],
  },
  mediaChannels: {
    response:
      "Paid media has delivered 17.4M impressions since launch, growing from 1.5M in M1 to 2.4M in M9. Display ads lead with 6.3M (36%), followed by social media 4.5M (26%), pre-roll video 4.0M (23%), paid search 1.9M (11%) and other 0.8M (4%).",
    suggestions: [
      "What is our ad engagement rate?",
      "Which region is performing best?",
      "How is website traffic trending?",
    ],
  },
  adEngagement: {
    response:
      "The click & video engagement rate is 7.2%: 78.2k ad clicks plus 1.2M video views across 17.4M impressions. It has risen every month, from 6.4% in M1 to 7.9% in M9.",
    suggestions: [
      "Which media channels drive the most impressions?",
      "How is website traffic trending?",
      "Which region is performing best?",
    ],
  },
  websiteTraffic: {
    response:
      "The brand websites have had 142.7k visits since launch: 91.9k on the patient site and 50.8k on the HCP site. Monthly visits grew from 11.5k in M1 to 20.1k in M9 (+75%), up 7% on M8. 6.8k visits completed a high value action, a 4.7% HVA rate, mostly resource downloads.",
    suggestions: [
      "How are our emails performing?",
      "What is our ad engagement rate?",
      "Which region is performing best?",
    ],
  },
  emailPerformance: {
    response:
      "67.4k emails were delivered (70.0k sent less 2.6k bounces). 19.6k were opened (29.1% open rate) and 2.9k clicked (4.3% click rate), and 550 clicks converted to a high value action. Patient campaigns open better than HCP campaigns: 36.0% vs 26.0%.",
    suggestions: [
      "How is website traffic trending?",
      "Which region is performing best?",
      "Which media channels drive the most impressions?",
    ],
  },
  regionalMarketing: {
    response:
      "Northeast leads on most measures: 5.1M impressions, 7.3% engagement, a 4.8% HVA rate and a 29.8% email open rate. Midwest is smallest at 3.5M impressions and trails on HVA rate (4.6%) and open rate (28.2%). The four regions add up to the national totals on every measure.",
    suggestions: [
      "Which media channels drive the most impressions?",
      "How are our emails performing?",
      "What is our ad engagement rate?",
    ],
  },
  unrecognized: {
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
      response: `That question draws on ${panel} data, which isn't part of your access. You can ask about ${allowedPanels.filter((label) => starterQuestionsByPanel[label]).join(", ")}.`,
      suggestions: permittedSuggestions([], allowedPanels),
    };
  }

  const answer = dashboardAnswers[topic];
  return { response: answer.response, suggestions: permittedSuggestions(answer.suggestions, allowedPanels) };
}
