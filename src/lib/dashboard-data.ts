import { buildLaunchData, nationalLaunchRaw } from "@/lib/launch-data";
import { regionNames, timePeriods } from "@/lib/scope";

export { assumedGtn, last, pct, sum, wacPerVial } from "@/lib/launch-data";

export const filters = {
  geographyLevels: ["Nation", "Region"],
  regionNames,
  timePeriods,
} as const;

export const dataThrough = "Sep 30, 2026";

// National launch figures. The assistant and the national dashboard view both read these;
// regional and period views are built from the same rules in scoped-data.
export const {
  monthlyVials,
  monthlyNetSales,
  activePatientsTrend,
  activeByStatus,
  newPatients,
  funnel,
  patientFunnel,
  pendingByStep,
  pendingPatients,
  pendingAvgDays,
  cancelledByStep,
  prescribers,
  attainment,
  kpis,
} = buildLaunchData(nationalLaunchRaw);

export const panelLabels = [
  "Executive Summary",
  "Overview",
  "Market Access",
  "Marketing",
  "Field Activity",
  "What-If Simulator",
] as const;

export type PanelLabel = (typeof panelLabels)[number];

// Demo profiles simulating role-based access: each sees only its permitted tabs.
// Every profile gets the Executive Summary alongside its own tabs.
export const profiles: {
  id: string;
  name: string;
  role: string;
  avatar: string;
  panels: readonly PanelLabel[];
}[] = [
  { id: "jenny", name: "Jenny", role: "Brand Director", avatar: "👩🏻‍💼", panels: panelLabels },
  {
    id: "bob",
    name: "Bob",
    role: "Market Access Lead",
    avatar: "👨🏽‍💼",
    panels: ["Executive Summary", "Market Access", "What-If Simulator"],
  },
  {
    id: "jeff",
    name: "Jeff",
    role: "Marketing Manager",
    avatar: "🧑🏼‍💼",
    panels: ["Executive Summary", "Marketing"],
  },
];

export function accessSummary(panels: readonly PanelLabel[]) {
  return panels.length === panelLabels.length ? "All tabs" : `${panels.join(", ")} only`;
}

// `title` names what the reply's tables show; downloads are saved under it.
type DashboardAnswer = { title: string; response: string; suggestions: string[] };

const starterQuestionsByPanel: Partial<Record<PanelLabel, string[]>> = {
  "Executive Summary": [
    "Summarize the key insights from this dashboard.",
    "What is our fill rate?",
    "What is our abandonment rate?",
    "How are we tracking against forecast?",
    "How many patients are active right now?",
  ],
  Overview: [
    "How are we tracking against forecast?",
    "How many patients are active right now?",
    "Why are patients still pending?",
    "How many new prescribers did we add?",
    "Summarize the key insights from this dashboard.",
  ],
  "Market Access": [
    "What is our PA approval rate?",
    "Which sites are driving PA denials?",
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
  "Field Activity": [
    "How many target HCPs have we reached?",
    "How many calls has the field team made?",
    "What is our call type mix?",
    "How are HCPs moving through the engagement funnel?",
    "Which region has the best HCP reach?",
  ],
  // What-if questions set the simulator's sliders (see whatIfFor in simulator-data).
  "What-If Simulator": [
    "What if out-of-pocket cost is 20% lower?",
    "What if PA approval is 5 days faster?",
    "What if Referral → Paid rises to 65%?",
    "What if we cut out-of-pocket by 10% and PA is 3 days faster?",
  ],
};

export type QuestionKind = "Descriptive" | "Predictive" | "Prescriptive";

// Forward-looking questions: what is likely to happen (predictive) and what to do about it
// (prescriptive). They aren't offered up front; they follow the descriptive answers they build on.
const forwardQuestions = {
  paDenials: { kind: "Prescriptive", question: "Why is our PA approval rate dropping?" },
  paDenialActions: { kind: "Prescriptive", question: "What can we do about PA denials?" },
  salesOutlook: { kind: "Predictive", question: "What will net sales be by year end?" },
  salesActions: { kind: "Prescriptive", question: "What should we do to close the sales gap?" },
  salesMilestone: { kind: "Predictive", question: "When will monthly net sales pass $5M?" },
  activeOutlook: { kind: "Predictive", question: "How many patients will be active by December?" },
  freeToPaidActions: {
    kind: "Prescriptive",
    question: "How can we move free-goods patients to paid?",
  },
  over30Actions: {
    kind: "Prescriptive",
    question: "What should we do about patients waiting over 30 days?",
  },
  supplyOutlook: { kind: "Predictive", question: "How many vials will we need next quarter?" },
  timeToDoseActions: { kind: "Prescriptive", question: "How can we speed up time to first dose?" },
  inventoryRisk: { kind: "Predictive", question: "Will channel inventory run short?" },
  timeOutlook: { kind: "Predictive", question: "How fast will time to first dose improve?" },
  stopActions: { kind: "Prescriptive", question: "How can we reduce discontinuations?" },
  trafficOutlook: { kind: "Predictive", question: "What will website traffic be next quarter?" },
  marketingActions: { kind: "Prescriptive", question: "Where should we focus marketing next?" },
  mediaOutlook: {
    kind: "Predictive",
    question: "How many impressions will we deliver next quarter?",
  },
  hvaActions: {
    kind: "Prescriptive",
    question: "How do we turn website visits into rep requests?",
  },
  reachOutlook: { kind: "Predictive", question: "How many HCPs will we reach by year end?" },
  fieldActions: { kind: "Prescriptive", question: "Which HCPs should the field team prioritize?" },
  prescriberOutlook: {
    kind: "Predictive",
    question: "How many new prescribers can we expect next quarter?",
  },
  repeatActions: {
    kind: "Prescriptive",
    question: "How do we turn one-time prescribers into repeat prescribers?",
  },
} as const satisfies Record<string, { kind: QuestionKind; question: string }>;

type ForwardTopic = keyof typeof forwardQuestions;

export const forwardQuestionList = Object.values(forwardQuestions).map((item) => item.question);

export function forwardQuestion(key: ForwardTopic) {
  return forwardQuestions[key].question;
}

export function questionKind(question: string): QuestionKind {
  return (
    Object.values(forwardQuestions).find((item) => item.question === question)?.kind ??
    "Descriptive"
  );
}

export function starterQuestionsFor(panel: string) {
  return starterQuestionsByPanel[panel as PanelLabel] ?? starterQuestionsByPanel.Overview ?? [];
}

// Replies render as markdown in the chat: a headline sentence, then a compact table.
const lines = (...rows: string[]) => rows.join("\n");

export const dashboardAnswers = {
  forecast: {
    title: "Net sales and vials vs forecast",
    response: lines(
      "- **Net sales are $24.5M launch to date, 94% of forecast**, after a slow Q1.",
      "- Q3 is running ahead.",
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
      "- **62 patients are active** (dosed in the last 16 weeks), up 15% from 54 in August.",
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
      "- **9 patients are referred but not yet dosed**, pending an average of 22 days.",
      "",
      "| Stage | Patients |",
      "| --- | ---: |",
      "| Procedure scheduling | 4 |",
      "| Prior authorization | 3 |",
      "| Benefits verification | 2 |",
      "| **Total pending** | **9** |",
      "",
      "3 patients have waited over 30 days, 2 of them at procedure scheduling.",
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
      "- **38 HCPs have prescribed since launch**, and September added the most new prescribers since February.",
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
      "- **Sales are close to forecast and Q3 is running ahead.** Key numbers launch to date:",
      "",
      "| Area | Status |",
      "| --- | --- |",
      "| Net sales | $24.5M, 94% of forecast (Q3 at 102%) |",
      "| Active patients | 62 (44 paid, 18 free) |",
      "| New starts, September | 9, all new to brand |",
      "| Pending patients | 9, mostly at procedure scheduling |",
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
      "- **First-pass PA approval fell to 58% in Q3**, from 94% in H1: 13 PAs have been denied first time since launch, 10 of them in Q3.",
      "- 11 of the 12 decided appeals were overturned, so 73 of 77 patients (95%) were approved in the end.",
      "- Appeals add about 19 days: days to approval rose from 13 for June referrals to 18 for August.",
      "",
      "| PA status | PAs |",
      "| --- | ---: |",
      "| Submitted | 77 |",
      "| Approved first time | 62 |",
      "| Denied first time | 13 |",
      "| Awaiting decision | 2 |",
      "",
      "| After appeal | Patients |",
      "| --- | ---: |",
      "| Approved in the end | 73 |",
      "| Appeal pending | 1 |",
      "| Denied (upheld) | 1 |",
    ),
    suggestions: [
      "Why is our PA approval rate dropping?",
      "How long does it take to get to first dose?",
      "What does the payer mix look like?",
    ],
  },
  timeToDose: {
    title: "Time to first dose",
    response: lines(
      "- **Non-EAP patients reach their first dose a median of 29 days after referral** (mean 34, across 50 new-to-brand starts).",
      "- It fell from 40 days for January referrals to 26 for June, then rose again to 29 for August as PA denials added appeal time.",
      "",
      "| Referral month | Days to first dose |",
      "| --- | ---: |",
      "| January | 40 |",
      "| June | 26 |",
      "| August | 29 |",
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
      "- **Medicare is the largest payer** across 80 referred patients and 143 paid doses.",
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
      "- **11 patients have stopped or never started.**",
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
      "- **23 vials are in the channel**, about 0.8 months of supply at the recent average of 29 doses a month.",
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
      "- **Paid media has delivered 17.4M impressions since launch**, growing from 1.5M in M1 to 2.4M in M9.",
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
      "- **The click & video engagement rate is 7.2%**, and it has risen every month, from 6.4% in M1 to 7.9% in M9.",
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
      "- **The brand websites have had 142.7k visits since launch**; monthly visits are up 7% on M8.",
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
      "- **67.4k emails were delivered**, with a 29.1% open rate and a 4.3% click rate.",
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
      "- **Northeast leads on most measures**, with 7.3% engagement and a 29.8% email open rate.",
      "- Midwest is smallest and trails on HVA and open rates.",
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
  fieldReach: {
    title: "HCP reach",
    response: lines(
      "- **126 of 150 targeted HCPs have been reached (84%)**, up from 34% in M1 as the call plan grew from 120 to 150 HCPs.",
      "",
      "| Month | Targeted | Reached | Reach % |",
      "| --- | ---: | ---: | ---: |",
      "| M1 | 120 | 41 | 34% |",
      "| M2 | 126 | 62 | 49% |",
      "| M3 | 132 | 78 | 59% |",
      "| M4 | 138 | 91 | 66% |",
      "| M5 | 142 | 101 | 71% |",
      "| M6 | 146 | 110 | 75% |",
      "| M7 | 148 | 117 | 79% |",
      "| M8 | 150 | 122 | 81% |",
      "| M9 | 150 | 126 | 84% |",
    ),
    suggestions: [
      "Which region has the best HCP reach?",
      "How many calls has the field team made?",
      "How are HCPs moving through the engagement funnel?",
    ],
  },
  fieldCalls: {
    title: "Field calls",
    response: lines(
      "- **The field team has made 872 calls since launch**, rising from 64 in M1 to 128 in M9.",
      "",
      "| Metric | Value |",
      "| --- | ---: |",
      "| Total calls | 872 |",
      "| Avg calls per reached HCP | 6.9 |",
      "| Avg calls per selling day | 4.5 |",
      "| Calls per selling day, M9 | 5.8 |",
      "",
      "| Month | Calls | Per day |",
      "| --- | ---: | ---: |",
      "| M1 | 64 | 2.9 |",
      "| M2 | 73 | 3.7 |",
      "| M3 | 82 | 3.7 |",
      "| M4 | 90 | 4.1 |",
      "| M5 | 97 | 4.6 |",
      "| M6 | 105 | 4.8 |",
      "| M7 | 113 | 4.9 |",
      "| M8 | 120 | 5.7 |",
      "| M9 | 128 | 5.8 |",
    ),
    suggestions: [
      "What is our call type mix?",
      "How many target HCPs have we reached?",
      "Which region has the best HCP reach?",
    ],
  },
  fieldCallMix: {
    title: "Call type mix",
    response: lines(
      "- **59% of calls are face-to-face**, and the split has held between 58% and 60% every month.",
      "",
      "| Call type | Calls | Share |",
      "| --- | ---: | ---: |",
      "| Face-to-face | 514 | 59% |",
      "| Virtual | 223 | 26% |",
      "| Phone | 135 | 15% |",
      "| **Total** | **872** | **100%** |",
    ),
    suggestions: [
      "How many calls has the field team made?",
      "How many target HCPs have we reached?",
      "How are HCPs moving through the engagement funnel?",
    ],
  },
  fieldFunnel: {
    title: "HCP engagement funnel",
    response: lines(
      "- **38 of 150 targeted HCPs have prescribed (25%)**, and 9 are champions with 3+ patients started.",
      "",
      "| Stage | HCPs | % of targeted |",
      "| --- | ---: | ---: |",
      "| Targeted | 150 | 100% |",
      "| Reached | 126 | 84% |",
      "| Prescribers | 38 | 25% |",
      "| Repeat prescribers | 24 | 16% |",
      "| Champions | 9 | 6% |",
      "",
      "25 of the 38 prescribers ordered in September.",
    ),
    suggestions: [
      "How many target HCPs have we reached?",
      "Which region has the best HCP reach?",
      "How many calls has the field team made?",
    ],
  },
  fieldRegional: {
    title: "Field reach by region",
    response: lines(
      "- **Northeast has the best HCP reach at 86.4%**, just ahead of West (85.7%).",
      "- Midwest trails at 80%.",
      "",
      "| Region | Targeted | Reached | Reach % | Calls | Prescribers |",
      "| --- | ---: | ---: | ---: | ---: | ---: |",
      "| Northeast | 44 | 38 | 86% | 262 | 12 |",
      "| West | 42 | 36 | 86% | 248 | 11 |",
      "| Southeast | 34 | 28 | 82% | 196 | 8 |",
      "| Midwest | 30 | 24 | 80% | 166 | 7 |",
      "| **Total** | **150** | **126** | **84%** | **872** | **38** |",
    ),
    suggestions: [
      "How many target HCPs have we reached?",
      "How are HCPs moving through the engagement funnel?",
      "What is our call type mix?",
    ],
  },
  fillRate: {
    title: "Fill rate",
    response: lines(
      "- **86% of referrals have filled (reached a first dose)**, just above the 85% target.",
      "- 97% of referrals with a known outcome have started.",
      "",
      "| Measure | Patients | Rate |",
      "| --- | ---: | ---: |",
      "| Referrals | 80 | |",
      "| Filled (first dose) | 69 | 86% |",
      "| Known outcome (excl. pending) | 71 | |",
      "| Filled, of known outcomes | 69 | 97% |",
      "| Still pending | 9 | 11% |",
      "",
      "PA approval runs at 95%, and the median time from referral to first dose is 29 days.",
    ),
    suggestions: [
      "What is our abandonment rate?",
      "Why are patients still pending?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  abandonment: {
    title: "Abandonment rate",
    response: lines(
      "- **2.5% of referrals were abandoned before a first dose** (2 of 80), within the 5% target.",
      "",
      "| Measure | Patients | Rate |",
      "| --- | ---: | ---: |",
      "| Cancelled before first dose | 2 | 2.5% of referrals |",
      "| Pending over 30 days (at risk) | 3 | 3.8% of referrals |",
      "| Discontinued after dosing | 9 | 13% of starts |",
      "| Restarted | 2 | |",
      "| Off therapy | 7 | |",
      "",
      "The two cancellations were 1 death and 1 access denial.",
    ),
    suggestions: [
      "What is our fill rate?",
      "Why are patients stopping therapy?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  salesOutlook: {
    title: "Net sales outlook",
    response: lines(
      "- **Net sales are projected at $15.8M in Q4, taking launch-to-date sales to about $40.3M by year end.** That is 33% above Q3's $11.9M, if paid vials keep growing by about 2.7 a month.",
      "",
      "| Month | Paid vials | Net sales |",
      "| --- | ---: | ---: |",
      "| Oct | 31.7 | $4.85M |",
      "| Nov | 34.3 | $5.25M |",
      "| Dec | 37.0 | $5.66M |",
      "| **Q4** | **103** | **$15.8M** |",
      "",
      "Method: straight-line trend of the last three months (Jun → Sep), at $153k net per paid vial. A demo estimate, not a forecast.",
    ),
    suggestions: [
      "What should we do to close the sales gap?",
      "How are we tracking against forecast?",
      "What is our fill rate?",
    ],
  },
  salesActions: {
    title: "Actions to close the sales gap",
    response: lines(
      "- **Moving the 12 patients on Quick Start and Bridge to commercial coverage would close the $1.5M launch-to-date gap in about 1.6 months.** Together, the three actions below add about $1.61M a month.",
      "",
      "| Action | Patients | Net sales / month |",
      "| --- | ---: | ---: |",
      "| Move Quick Start and Bridge patients to commercial coverage | 12 | $0.92M |",
      "| Clear the procedure scheduling backlog | 4 | $0.31M |",
      "| Resolve pending benefits checks and PAs | 5 | $0.38M |",
      "| **Total** | **21** | **$1.61M** |",
      "",
      "Sized at 0.5 doses per patient a month (September doses ÷ active patients) and $153k net per paid vial, assuming commercial coverage.",
    ),
    suggestions: [
      "What will net sales be by year end?",
      "Why are patients still pending?",
      "What is our abandonment rate?",
    ],
  },
  supplyOutlook: {
    title: "Vial supply outlook",
    response: lines(
      "- **About 122 vials need to ship in Q4**: 107 projected doses plus one month of cover for December, less the 23 on hand.",
      "- That is 28% more than the 95 shipped in Q3.",
      "",
      "| Month | Projected doses |",
      "| --- | ---: |",
      "| Oct | 33 |",
      "| Nov | 36 |",
      "| Dec | 38 |",
      "| **Q4 doses** | **107** |",
      "| + December cover | 38 |",
      "| − On hand today | 23 |",
      "| **Shipments needed** | **122** |",
      "",
      "Method: straight-line trend of the last three months (Jun → Sep). A demo estimate, not a forecast.",
    ),
    suggestions: [
      "How can we speed up time to first dose?",
      "How much inventory is in the channel?",
      "What does the payer mix look like?",
    ],
  },
  timeToDoseActions: {
    title: "Actions to speed up first dose",
    response: lines(
      "- **PA is now the biggest delay**: approval takes 18 of the 29 days from referral to first dose for August referrals, up from 11 days in May.",
      "- Procedure scheduling takes the other 11 of the 29 days (38%) and holds 4 of the 9 pending patients, 2 of them waiting over 30 days.",
      "",
      "| Step | Median days (Aug) | Pending | Over 30 days | Action |",
      "| --- | ---: | ---: | ---: | --- |",
      "| Referral → PA approval | 18 | 5 | 1 | Cut first-pass denials |",
      "| PA approval → first dose | 11 | 4 | 2 | Book procedure at PA approval |",
      "",
      "Most of the PA delay comes from appeals after first-pass denials; see what can be done about PA denials.",
    ),
    suggestions: [
      "What can we do about PA denials?",
      "How many vials will we need next quarter?",
      "What is our PA approval rate?",
    ],
  },
  trafficOutlook: {
    title: "Website traffic outlook",
    response: lines(
      "- **Website visits are projected at 66.7k in Q4**, 18% above Q3's 56.6k, if monthly visits keep growing by about 1.1k.",
      "",
      "| Month | Projected visits |",
      "| --- | ---: |",
      "| Oct | 21.2k |",
      "| Nov | 22.2k |",
      "| Dec | 23.3k |",
      "| **Q4** | **66.7k** |",
      "",
      "At today's 4.7% HVA rate, that is about 3.1k high value actions.",
      "",
      "Method: straight-line trend of the last three months (Jun → Sep). A demo estimate, not a forecast.",
    ),
    suggestions: [
      "Where should we focus marketing next?",
      "How is website traffic trending?",
      "How are our emails performing?",
    ],
  },
  marketingActions: {
    title: "Marketing priorities",
    response: lines(
      "- **Lift HCP email engagement first**: HCP emails open at 26.0% against 36.0% for patients, and convert a third as often (0.5% vs 1.5%).",
      "",
      "| Priority | Evidence | Expected effect |",
      "| --- | --- | --- |",
      "| Test HCP subject lines and send times | HCP open rate 26.0% vs patient 36.0% | Each +1 pt ≈ 467 more HCP opens |",
      "| Shift email volume toward patient campaigns | Patient emails convert 1.5% vs HCP 0.5% | More HVAs per email sent |",
      "| Close the Midwest gap | HVA rate 4.6% and open rate 28.2%, lowest of the four regions | Bring to national 4.7% and 29.1% |",
    ),
    suggestions: [
      "What will website traffic be next quarter?",
      "How are our emails performing?",
      "Which region is performing best?",
    ],
  },
  reachOutlook: {
    title: "HCP reach outlook",
    response: lines(
      "- **Field reach is projected at 142 of 150 targeted HCPs (95%) by December**, if the team keeps adding about 5 HCPs a month.",
      "",
      "| Month | HCPs reached | Calls |",
      "| --- | ---: | ---: |",
      "| Oct | 131 | 136 |",
      "| Nov | 137 | 143 |",
      "| Dec | 142 | 151 |",
      "",
      "That is 430 calls in Q4, up from 361 in Q3.",
      "",
      "Method: straight-line trend of the last three months (Jun → Sep). A demo estimate, not a forecast.",
    ),
    suggestions: [
      "Which HCPs should the field team prioritize?",
      "How many target HCPs have we reached?",
      "How many calls has the field team made?",
    ],
  },
  fieldActions: {
    title: "Field priorities",
    response: lines(
      "- **Start with the 24 targeted HCPs not yet reached, 6 in each region, beginning with Midwest (80% reach) and Southeast (82%).** Then work the 88 reached HCPs who have not prescribed: 30% of reached HCPs prescribe today.",
      "",
      "| Region | Not yet reached | Reach % | Reached → prescriber |",
      "| --- | ---: | ---: | ---: |",
      "| Midwest | 6 | 80% | 29% |",
      "| Southeast | 6 | 82% | 29% |",
      "| West | 6 | 86% | 31% |",
      "| Northeast | 6 | 86% | 32% |",
    ),
    suggestions: [
      "How many HCPs will we reach by year end?",
      "Which region has the best HCP reach?",
      "How are HCPs moving through the engagement funnel?",
    ],
  },
  salesMilestone: {
    title: "Net sales milestone",
    response: lines(
      "- **Monthly net sales are projected to pass $5M in November**, up from $4.44M in September.",
      "",
      "| Month | Projected net sales |",
      "| --- | ---: |",
      "| Oct | $4.85M |",
      "| Nov | $5.25M |",
      "| Dec | $5.66M |",
      "",
      "Method: straight-line trend of the last three months (Jun → Sep). A demo estimate, not a forecast.",
    ),
    suggestions: [
      "What will net sales be by year end?",
      "How can we move free-goods patients to paid?",
      "How are we tracking against forecast?",
    ],
  },
  activeOutlook: {
    title: "Active patient outlook",
    response: lines(
      "- **About 83 patients are projected to be active by December**, up from 62 today, if the base keeps growing by about 7 a month.",
      "",
      "| Month | Active patients |",
      "| --- | ---: |",
      "| Sep (actual) | 62 |",
      "| Oct | 69 |",
      "| Nov | 76 |",
      "| Dec | 83 |",
      "",
      "Method: straight-line trend of the last three months (Jun → Sep). A demo estimate, not a forecast.",
    ),
    suggestions: [
      "How can we move free-goods patients to paid?",
      "What will net sales be by year end?",
      "How many patients are active right now?",
    ],
  },
  freeToPaidActions: {
    title: "Free goods to paid",
    response: lines(
      "- **18 active patients (29%) are on free goods.** Moving the 12 on Quick Start and Bridge to commercial coverage is worth about $0.92M a month.",
      "- PAP patients usually stay free, so re-screen them for public coverage.",
      "",
      "| Program | Patients | Action | Net sales / month if paid |",
      "| --- | ---: | --- | ---: |",
      "| Quick Start | 7 | Complete benefits checks and move to commercial | $0.54M |",
      "| Bridge | 5 | Resolve the coverage gap or appeal | $0.38M |",
      "| PAP | 6 | Re-screen for Medicare or Medicaid eligibility | $0.46M |",
      "",
      "Sized at 0.5 doses per patient a month and $153k net per paid vial.",
    ),
    suggestions: [
      "What should we do to close the sales gap?",
      "How many patients will be active by December?",
      "What does the payer mix look like?",
    ],
  },
  over30Actions: {
    title: "Patients waiting over 30 days",
    response: lines(
      "- **3 patients have waited more than 30 days: 2 at procedure scheduling and 1 at prior authorization.** If all three were lost, abandonment would rise from 2.5% to 6.3%, above the 5% target.",
      "",
      "| Stage | Over 30 days | Action |",
      "| --- | ---: | --- |",
      "| Prior authorization | 1 | Escalate to peer-to-peer review or appeal |",
      "| Procedure scheduling | 2 | Book at an alternate site or add scheduling support |",
      "",
      "Starting all three is worth about $0.23M in net sales a month.",
    ),
    suggestions: [
      "How can we speed up time to first dose?",
      "What is our abandonment rate?",
      "Why are patients still pending?",
    ],
  },
  inventoryRisk: {
    title: "Inventory risk",
    response: lines(
      "- **Yes, without new shipments: the 23 vials on hand cover about 21 days of October's projected 33 doses.** Ship about 46 vials in October to cover the month and start November with a month of cover.",
      "",
      "| Measure | Vials |",
      "| --- | ---: |",
      "| On hand today | 23 |",
      "| Projected October doses | 33 |",
      "| Projected November doses | 36 |",
      "| **October shipment needed** | **46** |",
      "",
      "Method: straight-line trend of the last three months (Jun → Sep). A demo estimate, not a forecast.",
    ),
    suggestions: [
      "How many vials will we need next quarter?",
      "How much inventory is in the channel?",
      "How can we speed up time to first dose?",
    ],
  },
  timeOutlook: {
    title: "Time to first dose outlook",
    response: lines(
      "- **Time to first dose is projected to edge up from 29 days (August referrals) to about 30 by December**, reversing the gains made in H1.",
      "- The driver is PA: days to approval are projected to rise from 18 to about 23 while first-pass denials stay high.",
      "",
      "| Referral month | Days to first dose | Days to PA approval |",
      "| --- | ---: | ---: |",
      "| Aug (actual) | 29 | 18 |",
      "| Sep | 29 | 19 |",
      "| Oct | 30 | 21 |",
      "| Nov | 30 | 22 |",
      "| Dec | 30 | 23 |",
      "",
      "Fixing first-pass PA denials would remove most of the added time.",
      "",
      "Method: straight-line trend of the last three months (Jun → Sep). A demo estimate, not a forecast.",
    ),
    suggestions: [
      "How can we speed up time to first dose?",
      "Why is our PA approval rate dropping?",
      "What is our PA approval rate?",
    ],
  },
  stopActions: {
    title: "Reducing discontinuations",
    response: lines(
      "- **8 of the 11 patients who stopped or never started did so because of disease progression (death, ventilation or hospice).** The 3 access denials are the part we can act on directly, and 2 of those patients have already restarted.",
      "",
      "| Reason | Before first dose | After dosing | Lever |",
      "| --- | ---: | ---: | --- |",
      "| Death | 1 | 3 | Earlier diagnosis and faster starts |",
      "| Ventilation | 0 | 2 | Earlier diagnosis and faster starts |",
      "| Hospice | 0 | 2 | Earlier diagnosis and faster starts |",
      "| Access denial | 1 | 2 | Appeals support and payer escalation |",
    ),
    suggestions: [
      "How fast will time to first dose improve?",
      "Why are patients stopping therapy?",
      "How can we speed up time to first dose?",
    ],
  },
  mediaOutlook: {
    title: "Media outlook",
    response: lines(
      "- **Paid media is projected to deliver about 7.8M impressions in Q4**, 15% more than Q3's 6.8M, with engagement rising to about 8.5% by December.",
      "",
      "| Month | Impressions | Engagement rate |",
      "| --- | ---: | ---: |",
      "| Oct | 2.5M | 8.1% |",
      "| Nov | 2.6M | 8.3% |",
      "| Dec | 2.7M | 8.5% |",
      "",
      "Method: straight-line trend of the last three months (Jun → Sep). A demo estimate, not a forecast.",
    ),
    suggestions: [
      "Where should we focus marketing next?",
      "Which media channels drive the most impressions?",
      "What is our ad engagement rate?",
    ],
  },
  hvaActions: {
    title: "Website to rep requests",
    response: lines(
      "- **Only 410 of 6.8k high value actions (6%) are rep requests**, about 8.1 for every 1,000 HCP site visits.",
      "- Most HCP visitors download a resource and leave.",
      "",
      "| Action | Evidence | Expected effect |",
      "| --- | --- | --- |",
      "| Add a request-a-rep prompt to resource downloads | 6.2k downloads vs 410 rep requests | More downloads become rep conversations |",
      "| Route rep requests to the field team within a day | 410 requests since launch | Faster first calls with interested HCPs |",
      "| Retarget HCP site visitors who downloaded | 50.8k HCP site visits | More return visits from engaged HCPs |",
    ),
    suggestions: [
      "What will website traffic be next quarter?",
      "Where should we focus marketing next?",
      "How is website traffic trending?",
    ],
  },
  prescriberOutlook: {
    title: "New prescriber outlook",
    response: lines(
      "- **About 11 new prescribers are expected in Q4, taking the total to about 49 by December**, based on the last three months' average of 3.7 a month.",
      "",
      "| Month | New prescribers |",
      "| --- | ---: |",
      "| Jul | 3 |",
      "| Aug | 2 |",
      "| Sep | 6 |",
      "| **Q4 projected** | **11** |",
      "",
      "Method: average of the last three months, because new prescribers vary month to month. A demo estimate, not a forecast.",
    ),
    suggestions: [
      "How do we turn one-time prescribers into repeat prescribers?",
      "How many HCPs will we reach by year end?",
      "How are HCPs moving through the engagement funnel?",
    ],
  },
  repeatActions: {
    title: "Growing repeat prescribers",
    response: lines(
      "- **14 of the 38 prescribers have prescribed only once.** Helping them find a second eligible patient is the biggest lever, and the 9 champions with 3+ patients can share their experience with peers.",
      "",
      "| Segment | HCPs | Action |",
      "| --- | ---: | --- |",
      "| One-time prescribers | 14 | Follow-up visit to identify a second eligible patient |",
      "| Repeat prescribers (2 patients) | 15 | Share patient support and scheduling resources |",
      "| Champions (3+ patients) | 9 | Peer-to-peer programs and referral networks |",
    ),
    suggestions: [
      "How many new prescribers can we expect next quarter?",
      "Which HCPs should the field team prioritize?",
      "How many new prescribers did we add?",
    ],
  },
  paDenials: {
    title: "PA first-pass denials",
    response: lines(
      "- **First-pass PA approval fell from 94% in H1 to 58% in Q3** (50% in September): 10 denials in Q3, against 3 in all of H1.",
      "- **It's a documentation problem, not medical need**: 9 of 10 Q3 denials cite a missing confirmatory test result or baseline functional score, after two Medicare Advantage plans changed their PA criteria on Jul 1.",
      "- **It's concentrated**: Medicare Advantage accounts for 8 of 10 Q3 denials but only 18% of referrals, and 3 centres without hub pre-review account for 8 of 10.",
      "",
      "| Q3 driver | Denials | Share of Q3 denials |",
      "| --- | ---: | ---: |",
      "| Missing documentation | 9 | 90% |",
      "| Medicare Advantage | 8 | 80% |",
      "| 3 centres without pre-review | 8 | 80% |",
      "| Southeast region | 5 | 50% |",
      "| **Total Q3 denials** | **10** | **100%** |",
      "",
      "11 of 12 decided appeals are overturned, so patients still get approved, but each appeal adds about 19 days to time to first dose.",
    ),
    suggestions: [
      "What can we do about PA denials?",
      "Which sites are driving PA denials?",
      "How fast will time to first dose improve?",
    ],
  },
  paDenialActions: {
    title: "Actions to reduce PA denials",
    response: lines(
      "- **Fixing documentation at 3 centres would remove most denials**: they account for 8 of 10 Q3 denials and approve only 11% of PAs first time, against 87% at sites using hub pre-review.",
      "- Each avoided denial saves about 19 days of appeal time, and most denied patients are approved on appeal anyway.",
      "",
      "| Action | Target | Evidence |",
      "| --- | --- | --- |",
      "| Enrol in hub PA pre-review | 3 centres | 11% vs 87% first-pass |",
      "| PA checklist: test result + baseline score | All MA submissions | 9 of 10 Q3 denials |",
      "| Reimbursement manager visits | Southeast, Midwest | 8 of 10 Q3 denials |",
      "| Engage the two MA plans | Medicare Advantage | Criteria changed Jul 1 |",
      "| Keep appealing documentation denials | All denials | 11 of 12 overturned |",
      "",
      "Back at the H1 first-pass rate of 94%, Q3 would have seen 1 or 2 denials instead of 10.",
    ),
    suggestions: [
      "Which sites are driving PA denials?",
      "Why is our PA approval rate dropping?",
      "How can we speed up time to first dose?",
    ],
  },
  paSites: {
    title: "PA denials by site",
    response: lines(
      "- **Three centres without hub pre-review account for 8 of 10 Q3 denials**: Southeast Center A, Southeast Center B and Midwest Center A.",
      "- Sites using hub pre-review approve 87% of PAs first time, against 11% at those three.",
      "",
      "| Q3 site | Submitted | Approved | Denied | Awaiting | First-pass |",
      "| --- | ---: | ---: | ---: | ---: | ---: |",
      "| Southeast Center A | 4 | 1 | 3 | 0 | 25% |",
      "| Southeast Center B | 3 | 0 | 2 | 1 | 0% |",
      "| Midwest Center A | 3 | 0 | 3 | 0 | 0% |",
      "| Northeast sites | 8 | 6 | 1 | 1 | 86% |",
      "| West sites | 5 | 4 | 1 | 0 | 80% |",
      "| Other Southeast sites | 2 | 2 | 0 | 0 | 100% |",
      "| Other Midwest sites | 1 | 1 | 0 | 0 | 100% |",
      "| **Total** | **26** | **14** | **10** | **2** | **58%** |",
      "",
      "First-pass approval is approved ÷ (approved + denied); PAs awaiting a decision aren't counted yet.",
    ),
    suggestions: [
      "What can we do about PA denials?",
      "Why is our PA approval rate dropping?",
      "What is our PA approval rate?",
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

// The tabs whose data each answer draws on; the assistant answers when any of them is permitted.
// Questions about figures shown on the Executive Summary are open to everyone who has that tab.
const topicPanels: Record<Topic, readonly PanelLabel[] | null> = {
  forecast: ["Overview", "Executive Summary"],
  fillRate: ["Executive Summary"],
  abandonment: ["Executive Summary"],
  active: ["Overview", "Executive Summary"],
  pending: ["Overview", "Executive Summary"],
  prescribers: ["Overview", "Executive Summary"],
  summary: ["Overview", "Executive Summary"],
  priorAuth: ["Market Access"],
  paDenials: ["Market Access"],
  paDenialActions: ["Market Access"],
  paSites: ["Market Access"],
  timeToDose: ["Market Access"],
  payerMix: ["Market Access"],
  stops: ["Market Access"],
  inventory: ["Market Access"],
  mediaChannels: ["Marketing"],
  adEngagement: ["Marketing"],
  websiteTraffic: ["Marketing"],
  emailPerformance: ["Marketing"],
  regionalMarketing: ["Marketing"],
  fieldReach: ["Field Activity"],
  fieldCalls: ["Field Activity"],
  fieldCallMix: ["Field Activity"],
  fieldFunnel: ["Field Activity"],
  fieldRegional: ["Field Activity"],
  salesOutlook: ["Executive Summary", "Overview"],
  salesActions: ["Executive Summary", "Overview"],
  supplyOutlook: ["Market Access"],
  timeToDoseActions: ["Market Access"],
  trafficOutlook: ["Marketing"],
  marketingActions: ["Marketing"],
  reachOutlook: ["Field Activity"],
  fieldActions: ["Field Activity"],
  salesMilestone: ["Executive Summary", "Overview"],
  activeOutlook: ["Executive Summary", "Overview"],
  freeToPaidActions: ["Executive Summary", "Overview"],
  over30Actions: ["Executive Summary", "Overview"],
  inventoryRisk: ["Market Access"],
  timeOutlook: ["Market Access"],
  stopActions: ["Market Access"],
  mediaOutlook: ["Marketing"],
  hvaActions: ["Marketing"],
  prescriberOutlook: ["Field Activity"],
  repeatActions: ["Field Activity"],
  unrecognized: null,
};

function topicFor(question: string): Topic {
  const normalized = question.toLowerCase().trim();

  // PA denial story: the diagnosis, the actions and the site breakdown.
  if (
    /deni|reject|first.pass/.test(normalized) ||
    (/\bwhy\b/.test(normalized) && /\bpa\b|prior auth|approval/.test(normalized))
  ) {
    if (/site|center|centre|clinic|account/.test(normalized)) return "paSites";
    if (/\bshould\b|how can we|how do we|what can we|reduce|fix|improve/.test(normalized))
      return "paDenialActions";
    return "paDenials";
  }
  // Prescriptive ("should", "how can we") and predictive ("will", "next quarter") questions
  // come first, so their subject words don't route them to a descriptive answer.
  if (
    /\bshould\b|recommend|how can we|how do we|what can we|focus|speed up|close the/.test(
      normalized,
    )
  ) {
    if (/free.goods|to paid/.test(normalized)) return "freeToPaidActions";
    if (/over 30|waiting/.test(normalized)) return "over30Actions";
    if (/discontinu|stopping/.test(normalized)) return "stopActions";
    if (/rep request/.test(normalized)) return "hvaActions";
    if (/one-time|repeat prescriber/.test(normalized)) return "repeatActions";
    if (/sales|gap|revenue|forecast/.test(normalized)) return "salesActions";
    if (/first dose|time to|speed up|\bpa\b|access/.test(normalized)) return "timeToDoseActions";
    if (/marketing|email|website|campaign/.test(normalized)) return "marketingActions";
    if (/hcp|field|\brep|call|prioriti/.test(normalized)) return "fieldActions";
  }
  if (/\bwill\b|next quarter|year end|predict|project|expect/.test(normalized)) {
    if (/pass|milestone|\$5m/.test(normalized)) return "salesMilestone";
    if (/run short|run out/.test(normalized)) return "inventoryRisk";
    if (/first dose|time to/.test(normalized)) return "timeOutlook";
    if (/active/.test(normalized)) return "activeOutlook";
    if (/impression|media/.test(normalized)) return "mediaOutlook";
    if (/prescriber/.test(normalized)) return "prescriberOutlook";
    if (/vial|inventory|supply|ship/.test(normalized)) return "supplyOutlook";
    if (/website|traffic|visit/.test(normalized)) return "trafficOutlook";
    if (/reach|hcp/.test(normalized)) return "reachOutlook";
    if (/sales|revenue/.test(normalized)) return "salesOutlook";
  }
  // Executive Summary measures.
  if (/fill rate|\bfilled\b/.test(normalized)) return "fillRate";
  if (/abandon/.test(normalized)) return "abandonment";
  // Field questions first: "region", "engagement" and "HCP" also appear in other topics.
  if (/region/.test(normalized) && /hcp|reach|call|field/.test(normalized)) return "fieldRegional";
  if (/engagement funnel|champion|repeat prescriber/.test(normalized)) return "fieldFunnel";
  if (/call (type|mix)|face-to-face|face to face|virtual|phone/.test(normalized))
    return "fieldCallMix";
  if (/\bcalls?\b|field|selling day/.test(normalized)) return "fieldCalls";
  if (/\breach|targeted|target hcp/.test(normalized)) return "fieldReach";
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

// After a descriptive answer, offer the predictive and prescriptive questions that build on it.
const forwardFollowUps: Partial<Record<Topic, ForwardTopic[]>> = {
  summary: ["salesOutlook", "salesActions"],
  forecast: ["salesOutlook", "salesMilestone", "salesActions"],
  active: ["activeOutlook", "freeToPaidActions"],
  pending: ["over30Actions", "timeOutlook", "timeToDoseActions"],
  prescribers: ["prescriberOutlook", "repeatActions", "salesActions"],
  fillRate: ["timeOutlook", "timeToDoseActions", "salesActions"],
  abandonment: ["over30Actions", "timeOutlook", "stopActions"],
  priorAuth: ["paDenials", "timeOutlook", "paDenialActions"],
  paSites: ["paDenialActions", "timeOutlook"],
  timeToDose: ["timeOutlook", "timeToDoseActions"],
  payerMix: ["supplyOutlook", "freeToPaidActions"],
  stops: ["timeOutlook", "stopActions"],
  inventory: ["inventoryRisk", "timeToDoseActions"],
  mediaChannels: ["mediaOutlook", "marketingActions"],
  adEngagement: ["mediaOutlook", "marketingActions"],
  websiteTraffic: ["trafficOutlook", "hvaActions"],
  emailPerformance: ["trafficOutlook", "marketingActions"],
  regionalMarketing: ["trafficOutlook", "marketingActions"],
  fieldReach: ["reachOutlook", "fieldActions"],
  fieldCalls: ["reachOutlook", "fieldActions"],
  fieldCallMix: ["reachOutlook", "fieldActions"],
  fieldFunnel: ["prescriberOutlook", "repeatActions"],
  fieldRegional: ["reachOutlook", "fieldActions"],
};

function canAnswer(topic: Topic, allowedPanels: readonly PanelLabel[]) {
  const panels = topicPanels[topic];
  return panels === null || panels.some((panel) => allowedPanels.includes(panel));
}

export function canAsk(question: string, allowedPanels: readonly PanelLabel[]) {
  return canAnswer(topicFor(question), allowedPanels);
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

  if (!canAnswer(topic, allowedPanels)) {
    return {
      title: "Access restricted",
      response: `That question draws on ${topicPanels[topic]?.[0]} data, which isn't part of your access. You can ask about ${allowedPanels.filter((label) => starterQuestionsByPanel[label]).join(", ")}.`,
      suggestions: permittedSuggestions([], allowedPanels),
    };
  }

  const answer = dashboardAnswers[topic];
  const forward = (forwardFollowUps[topic] ?? []).map((key) => forwardQuestions[key].question);
  return {
    title: answer.title,
    response: answer.response,
    suggestions: permittedSuggestions([...forward, ...answer.suggestions], allowedPanels),
  };
}
