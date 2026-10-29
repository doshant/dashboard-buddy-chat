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
  "Performance Snapshot",
  "Overview",
  "Market Access",
  "Marketing",
  "Field Activity",
  "What-If Simulator",
] as const;

export type PanelLabel = (typeof panelLabels)[number];

// Demo profiles simulating role-based access: each sees only its permitted tabs.
// Every profile gets the Performance Snapshot alongside its own tabs.
export const profiles: {
  id: string;
  name: string;
  role: string;
  avatar: string;
  panels: readonly PanelLabel[];
}[] = [
  { id: "jenny", name: "Jenny", role: "Brand Director", avatar: "👩🏻‍💼", panels: panelLabels },
  {
    id: "jeff",
    name: "Jeff",
    role: "Marketing Manager",
    avatar: "🧑🏼‍💼",
    panels: ["Performance Snapshot", "Marketing", "What-If Simulator"],
  },
  {
    id: "bob",
    name: "Bob",
    role: "Market Access Lead",
    avatar: "👨🏽‍💼",
    panels: ["Performance Snapshot", "Market Access", "What-If Simulator"],
  },
];

export function accessSummary(panels: readonly PanelLabel[]) {
  return panels.length === panelLabels.length ? "All tabs" : `${panels.join(", ")} only`;
}

// `title` names what the reply's tables show; downloads are saved under it.
type DashboardAnswer = { title: string; response: string; suggestions: string[] };

const starterQuestionsByPanel: Partial<Record<PanelLabel, string[]>> = {
  "Performance Snapshot": [
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
    "How much have we spent on marketing?",
    "Which channels drive our impressions?",
    "How is website traffic trending?",
    "How are our HCP emails performing?",
    "Which region is performing best?",
  ],
  "Field Activity": [
    "How many target HCPs have we reached?",
    "How many calls has the field team made?",
    "What is our call type mix?",
    "How are HCPs moving through the engagement funnel?",
    "Which region has the best HCP reach?",
  ],
  // What-if questions set the simulator's Market Access sliders (see whatIfFor in simulator-data).
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
  // Paid search story (Marketing): diagnose the visit drop, find the cause, size it, fix it.
  visitsDrop: { kind: "Prescriptive", question: "Why did website visits drop in September?" },
  searchDrop: { kind: "Prescriptive", question: "What happened to paid search?" },
  searchCost: { kind: "Predictive", question: "What is the paid search drop costing us?" },
  searchActions: { kind: "Prescriptive", question: "How do we win back paid search?" },
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

// What-if questions that set the simulator's Marketing sliders (see marketingWhatIfFor in
// marketing-simulator-data).
export const marketingWhatIfQuestions = [
  "What if paid search clicks go back to 6,020?",
  "What if social impressions rise 20%?",
  "What if the HCP email click rate rises to 4.5%?",
  "What if social impressions fall 10% and search clicks rise to 5,000?",
];

// The What-If Simulator's questions follow the levers on screen (`scenario`), so Marketing and
// Market Access questions never mix; without one, they follow the profile's levers.
export function starterQuestionsFor(
  panel: string,
  panels: readonly PanelLabel[] = panelLabels,
  scenario?: string,
) {
  if (panel === "What-If Simulator") {
    const marketing = panels.includes("Marketing") ? marketingWhatIfQuestions : [];
    const access = panels.includes("Market Access")
      ? (starterQuestionsByPanel["What-If Simulator"] ?? [])
      : [];
    if (scenario === "Marketing" && marketing.length) return marketing;
    if (scenario === "Market Access" && access.length) return access;
    // Preview scenarios (Sales, Patient Services, Medical) have no questions yet.
    if (scenario) return [];
    return marketing.length && access.length
      ? [...marketing.slice(0, 2), ...access.slice(0, 2)]
      : [...marketing, ...access];
  }
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
  socialMedia: {
    title: "Social media",
    response: lines(
      "- **Paid social has delivered 5.7M impressions since launch**, growing from 470k in Jan to 770k in Sep.",
      "- Engagement has risen every month, from 4.0% in Jan to 4.8% in Sep.",
      "",
      "| Metric | Value |",
      "| --- | ---: |",
      "| Impressions | 5.7M |",
      "| Engagements | 250.8k |",
      "| Engagement rate | 4.4% |",
      "| Clicks to site | 37.2k |",
      "| Click-through rate | 0.66% |",
      "| Spend | $141.3k |",
      "| Cost per site visit | $3.80 |",
      "",
      "Engagements are reactions, comments, shares and video views; spend is $25.00 per 1,000 impressions.",
    ),
    suggestions: [
      "How is paid search performing?",
      "How much have we spent on marketing?",
      "Which region is performing best?",
    ],
  },
  paidSearch: {
    title: "Paid search",
    response: lines(
      "- **Paid search has sent 43.5k clicks to the brand websites since launch**, but monthly clicks fell from 6.0k in Jul to 3.4k in Sep.",
      "- Spend held at about $12k a month while cost per click rose from $2.00 to $3.55.",
      "",
      "| Metric | Value |",
      "| --- | ---: |",
      "| Impressions | 2.1M |",
      "| Clicks to site | 43.5k |",
      "| Click-through rate | 2.1% |",
      "| Spend | $94.4k |",
      "| Average cost per click | $2.17 |",
      "| Cost per click, Sep | $3.55 |",
    ),
    suggestions: [
      "What happened to paid search?",
      "How is social media performing?",
      "How much have we spent on marketing?",
    ],
  },
  mediaImpressions: {
    title: "Impressions by channel",
    response: lines(
      "- **Social media and paid search have delivered 7.7M impressions since launch**, growing from 660k in Jan to 940k in Sep.",
      "- Paid search impressions fell from 280k in Jul to 170k in Sep; HCP email is bought per send, so it has no impressions.",
      "",
      "| Channel | Impressions | Share | Clicks to site |",
      "| --- | ---: | ---: | ---: |",
      "| Social media | 5.7M | 73% | 37.2k |",
      "| Paid search | 2.1M | 27% | 43.5k |",
      "| **Total** | **7.7M** | **100%** | **80.7k** |",
      "",
      "Together they cost $30.49 per 1,000 impressions; paid search turns 2.1% of impressions into site visits against 0.66% for social.",
    ),
    suggestions: [
      "What happened to paid search?",
      "How much have we spent on marketing?",
      "How is social media performing?",
    ],
  },
  marketingSpend: {
    title: "Marketing spend",
    response: lines(
      "- **We have spent $308.6k on marketing since launch**: $141.3k on social media, $94.4k on paid search and $72.9k on HCP email.",
      "- Monthly spend has grown from $25.4k in Jan to $41.6k in Sep.",
      "- Paid search spend has held at about $12k a month, but since August each click costs more.",
      "",
      "| Channel | Bought | Spend | Share |",
      "| --- | --- | ---: | ---: |",
      "| Social media | 5.7M impressions at $25.00 per 1,000 | $141.3k | 46% |",
      "| Paid search | 43.5k clicks at $2.17 on average | $94.4k | 31% |",
      "| HCP email | 48.6k emails at $1.50 | $72.9k | 24% |",
      "| **Total** | | **$308.6k** | **100%** |",
      "",
      "Social and search cost $2.92 per site visit; all marketing works out to $47.21 per high value action.",
    ),
    suggestions: [
      "What happened to paid search?",
      "Which channels drive our impressions?",
      "How are our HCP emails performing?",
    ],
  },
  websiteTraffic: {
    title: "Website traffic",
    response: lines(
      "- **The brand websites have had 137.8k visits since launch**, and monthly visits are up +45% on Jan, but they peaked at 17.7k in Jul and fell to 16.6k in Sep.",
      "- Paid search sent 2,620 fewer visits in Sep than in Jul; social, HCP email and other sources all grew.",
      "",
      "| Source | Visits | Share |",
      "| --- | ---: | ---: |",
      "| Paid search | 43.5k | 32% |",
      "| Social media | 37.2k | 27% |",
      "| HCP email | 1.6k | 1% |",
      "| Other sources | 55.5k | 40% |",
      "| **Total** | **137.8k** | **100%** |",
      "",
      "Other sources are unpaid search, direct visits and referrals.",
      "",
      "| Metric | Value |",
      "| --- | ---: |",
      "| HCP site visits | 88.4k |",
      "| Patient site visits | 49.3k |",
      "| Visits with a high value action | 6.5k |",
      "| HVA rate | 4.7% |",
    ),
    suggestions: [
      "What happened to paid search?",
      "How are our HCP emails performing?",
      "Which region is performing best?",
    ],
  },
  emailPerformance: {
    title: "HCP email performance",
    response: lines(
      "- **46.7k HCP emails were delivered**, with a 26.0% open rate and a 3.5% click rate.",
      "",
      "| Step | HCP emails | Rate |",
      "| --- | ---: | ---: |",
      "| Sent | 48.6k | |",
      "| Bounced | 1.9k | |",
      "| Delivered | 46.7k | |",
      "| Opened | 12.1k | 26.0% |",
      "| Clicked | 1.6k | 3.5% |",
      "| Converted to a high value action | 240 | |",
      "",
      "HCP email has cost $72.9k at $1.50 per email sent, or $303.75 per converted high value action. Each click is a site visit.",
    ),
    suggestions: [
      "How is website traffic trending?",
      "Which region is performing best?",
      "How much have we spent on marketing?",
    ],
  },
  regionalMarketing: {
    title: "Marketing by region",
    response: lines(
      "- **Northeast leads**, with the highest HCP email open rate (26.9%) and a 4.8% HVA rate.",
      "- Midwest trails on HVA rate (4.6%) and HCP open rate (24.9%).",
      "",
      "| Region | Visits | HVA rate | HCP open rate | Search CTR | Spend |",
      "| --- | ---: | ---: | ---: | ---: | ---: |",
      "| Northeast | 41.6k | 4.8% | 26.9% | 2.1% | $92.2k |",
      "| West | 35.9k | 4.8% | 26.2% | 2.1% | $79.7k |",
      "| Southeast | 33.6k | 4.7% | 25.5% | 2.1% | $76.6k |",
      "| Midwest | 26.6k | 4.6% | 24.9% | 2.1% | $60.0k |",
      "| **Total** | **137.8k** | **4.7%** | **26.0%** | **2.1%** | **$308.6k** |",
    ),
    suggestions: [
      "How is website traffic trending?",
      "How much have we spent on marketing?",
      "How are our HCP emails performing?",
    ],
  },
  fieldReach: {
    title: "HCP reach",
    response: lines(
      "- **126 of 150 targeted HCPs have been reached (84%)**, up from 34% in Jan as the call plan grew from 120 to 150 HCPs.",
      "",
      "| Month | Targeted | Reached | Reach % |",
      "| --- | ---: | ---: | ---: |",
      "| Jan | 120 | 41 | 34% |",
      "| Feb | 126 | 62 | 49% |",
      "| Mar | 132 | 78 | 59% |",
      "| Apr | 138 | 91 | 66% |",
      "| May | 142 | 101 | 71% |",
      "| Jun | 146 | 110 | 75% |",
      "| Jul | 148 | 117 | 79% |",
      "| Aug | 150 | 122 | 81% |",
      "| Sep | 150 | 126 | 84% |",
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
      "- **The field team has made 872 calls since launch**, rising from 64 in Jan to 128 in Sep.",
      "",
      "| Metric | Value |",
      "| --- | ---: |",
      "| Total calls | 872 |",
      "| Avg calls per reached HCP | 6.9 |",
      "| Avg calls per selling day | 4.5 |",
      "| Calls per selling day, Sep | 5.8 |",
      "",
      "| Month | Calls | Per day |",
      "| --- | ---: | ---: |",
      "| Jan | 64 | 2.9 |",
      "| Feb | 73 | 3.7 |",
      "| Mar | 82 | 3.7 |",
      "| Apr | 90 | 4.1 |",
      "| May | 97 | 4.6 |",
      "| Jun | 105 | 4.8 |",
      "| Jul | 113 | 4.9 |",
      "| Aug | 120 | 5.7 |",
      "| Sep | 128 | 5.8 |",
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
      "- **If nothing changes, website visits are projected at 49.4k in Q4**, 4% below Q3's 51.7k, slipping by about 90 a month.",
      "",
      "| Month | Projected visits |",
      "| --- | ---: |",
      "| Oct | 16.6k |",
      "| Nov | 16.5k |",
      "| Dec | 16.4k |",
      "| **Q4** | **49.4k** |",
      "",
      "At today's 4.7% HVA rate, that is about 2.3k high value actions. Winning back paid search would add about 2,620 visits a month.",
      "",
      "Method: straight-line trend of the last three months (Jun → Sep). A demo estimate, not a forecast.",
    ),
    suggestions: [
      "How do we win back paid search?",
      "Why did website visits drop in September?",
      "How is website traffic trending?",
    ],
  },
  visitsDrop: {
    title: "Why website visits dropped",
    response: lines(
      "- **Visits fell 6% from Jul to Sep (17.7k → 16.6k), and paid search explains all of it**",
      "  - Paid search sent 2,620 fewer visits (6,020 → 3,400, -44%)",
      "  - Social (+600), HCP email (+27) and other sources (+933) all grew",
      "",
      "| Source | Jul | Sep | Change |",
      "| --- | ---: | ---: | ---: |",
      "| Paid search | 6,020 | 3,400 | -2,620 |",
      "| Social media | 4,600 | 5,200 | +600 |",
      "| HCP email | 202 | 229 | +27 |",
      "| Other sources | 6,878 | 7,811 | +933 |",
      "| **Total** | **17,700** | **16,640** | **-1,060** |",
      "",
      "> Look at paid search next: its clicks fell while every other source grew.",
    ),
    suggestions: [],
  },
  searchDrop: {
    title: "What happened to paid search",
    response: lines(
      "- **Our search budget now buys far less: cost per click is up 77% since Jul**",
      "  - Cost per click: $2.00 → $3.55",
      "  - Impressions: 280k → 170k (-39%)",
      "  - Clicks: 6,020 → 3,400 (-44%)",
      "- **Spend held at about $12k a month**, so the cap, not the ads, now limits reach",
      "- **Search ROI fell from 11.0x in Jul to 6.2x in Sep**: each dollar now buys fewer visits",
      "- Rising cost per click at flat spend from mid-August is the pattern of a competitor bidding on the same branded and condition terms",
      "",
      "| Month | Impressions | Clicks | Cost per click | Spend |",
      "| --- | ---: | ---: | ---: | ---: |",
      "| Jul | 280k | 6,020 | $2.00 | $12.0k |",
      "| Aug | 240k | 4,900 | $2.45 | $12.0k |",
      "| Sep | 170k | 3,400 | $3.55 | $12.1k |",
      "",
      "> Check the auction insights report to confirm who is bidding against us.",
    ),
    suggestions: ["What if paid search clicks go back to 6,020?"],
  },
  searchCost: {
    title: "Cost of the paid search drop",
    response: lines(
      "- **Since Jul the drop has cost about 3,740 site visits, 176 high value actions and 11 rep requests**, worth about $82k in net sales",
      "  - At September's pace it loses about 2,620 visits a month",
      "- **Winning it back costs about $9.3k more a month** at today's $3.55 per click: monthly spend goes from $41.6k to $50.9k, or $55.8k more over the next six months",
      "  - The What-If Simulator projects about $346k more net sales over the same six months: about 6.2x the added spend",
      "",
      "| Lost since Jul | Count |",
      "| --- | ---: |",
      "| Site visits | 3,740 |",
      "| High value actions | 176 |",
      "| Rep requests | 11 |",
      "",
      "> Try it in the What-If Simulator: what if paid search clicks go back to 6,020?",
    ),
    suggestions: [
      "What if paid search clicks go back to 6,020?",
      "What will website traffic be next quarter?",
    ],
  },
  searchActions: {
    title: "Winning back paid search",
    response: lines(
      "- **Raise the search budget by about $9.3k a month to buy back the 2,620 lost visits at today's $3.55 per click**",
      "  - Even at $3.55, a search visit costs less than one from social ($3.80)",
      "- **Defend our branded terms** to bring cost per click back toward $2.00: the same $12.1k would then buy 6,035 clicks",
      "",
      "| Action | Evidence | Expected effect |",
      "| --- | --- | --- |",
      "| Lift the search cap by $9.3k a month | 2,620 fewer clicks a month at $3.55 | Back to Jul's 6,020 clicks |",
      "| Bid on branded terms and improve ad relevance | Cost per click $2.00 → $3.55 | Lower cost per click |",
      "| Fund it from social if the budget is fixed | Social costs $3.80 per visit | Same spend, slightly more visits |",
      "| Lean on HCP email while search recovers | Each +1 pt of click rate ≈ 467 site visits | Covers part of the gap |",
      "",
      "> See the impact and ROI: what if paid search clicks go back to 6,020?",
    ),
    suggestions: [
      "What if paid search clicks go back to 6,020?",
      "What will website traffic be next quarter?",
      "Where should we focus marketing next?",
    ],
  },
  marketingActions: {
    title: "Marketing priorities",
    response: lines(
      "- **Win back paid search first**: clicks fell 44% since Jul as cost per click rose to $3.55, costing about 176 high value actions so far.",
      "",
      "| Priority | Evidence | Expected effect |",
      "| --- | --- | --- |",
      "| Win back paid search | 2,620 fewer search visits a month than in Jul | About $9.3k a month restores Jul's clicks |",
      "| Test HCP subject lines and send times | HCP open rate 26.0% | Each +1 pt ≈ 467 more HCP opens |",
      "| Close the Midwest gap | HVA rate 4.6% and HCP open rate 24.9%, lowest of the four regions | Bring to national 4.7% and 26.0% |",
    ),
    suggestions: [
      "How do we win back paid search?",
      "What will website traffic be next quarter?",
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
      "- **Social and paid search are projected to deliver about 2.8M impressions in Q4**, 2% less than Q3's 2.9M, and about 22.7k site visits as search keeps losing clicks.",
      "",
      "| Month | Impressions | Site visits |",
      "| --- | ---: | ---: |",
      "| Oct | 940.0k | 8.1k |",
      "| Nov | 940.0k | 7.6k |",
      "| Dec | 940.0k | 7.1k |",
      "| **Q4** | **2.8M** | **22.7k** |",
      "",
      "Method: straight-line trend of the last three months (Jun → Sep) at today's 0.9% click-through rate. A demo estimate, not a forecast.",
    ),
    suggestions: [
      "What happened to paid search?",
      "How do we win back paid search?",
      "How much have we spent on marketing?",
    ],
  },
  hvaActions: {
    title: "Website to rep requests",
    response: lines(
      "- **Only 396 of 6.5k high value actions (6%) are rep requests**, about 4.5 for every 1,000 HCP site visits.",
      "- Most HCP visitors download a resource and leave.",
      "",
      "| Action | Evidence | Expected effect |",
      "| --- | --- | --- |",
      "| Add a request-a-rep prompt to resource downloads | 6.0k downloads vs 396 rep requests | More downloads become rep conversations |",
      "| Route rep requests to the field team within a day | 396 requests since launch | Faster first calls with interested HCPs |",
      "| Retarget HCP site visitors who downloaded | 88.4k HCP site visits | More return visits from engaged HCPs |",
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
      "- **First-pass PA approval fell from 94% to 58%**",
      "  - H1: 3 of 51 decided PAs denied first time",
      "  - Q3: 10 denials; September down to 50%",
      "- **Cause: a Medicare Advantage policy change on Jul 1**",
      "  - Two MA plans now require a confirmatory test result and a baseline functional score",
      "  - 9 of 10 Q3 denials cite one of those two documents",
      "- **Denials concentrate in MA and at 3 sites**",
      "  - Medicare Advantage: 8 of 10 Q3 denials, but 18% of referrals",
      "  - 3 sites without hub pre-review: 8 of 10 Q3 denials",
      "  - 11 of 12 decided appeals are overturned, but each adds about 19 days",
      "",
      "| Q3 driver | Denials | Share of Q3 denials |",
      "| --- | ---: | ---: |",
      "| Missing documentation | 9 | 90% |",
      "| Medicare Advantage | 8 | 80% |",
      "| 3 sites without pre-review | 8 | 80% |",
      "| Southeast region | 5 | 50% |",
      "| **Total Q3 denials** | **10** | **100%** |",
      "",
      "> Put Southeast Center A, Southeast Center B and Midwest Center A on hub PA pre-review, so both documents are attached before submission.",
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
      "- **Fixing documentation at 3 sites removes most denials**",
      "  - They had 8 of 10 Q3 denials",
      "  - First-pass approval: 11% there vs 87% at sites with hub pre-review",
      "- **Each avoided denial saves about 19 days**",
      "  - 11 of 12 decided appeals are overturned",
      "  - So the cost is delay to first dose, not lost patients",
      "",
      "| Action | Target | Evidence |",
      "| --- | --- | --- |",
      "| Enrol in hub PA pre-review | 3 sites | 11% vs 87% first-pass |",
      "| PA checklist: test result + baseline score | All MA submissions | 9 of 10 Q3 denials |",
      "| Reimbursement manager visits | Southeast, Midwest | 8 of 10 Q3 denials |",
      "| Engage the two MA plans | Medicare Advantage | Criteria changed Jul 1 |",
      "| Keep appealing documentation denials | All denials | 11 of 12 overturned |",
      "",
      "> Start with hub pre-review at the 3 sites. Back at H1's 94% first-pass rate, Q3 would have had 1 or 2 denials instead of 10.",
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
      "- **3 sites without hub pre-review drive 8 of 10 Q3 denials**",
      "  - Southeast Center A (3), Midwest Center A (3), Southeast Center B (2)",
      "- **Pre-review makes the difference**",
      "  - Without it: 11% first-pass approval (1 of 9 decided)",
      "  - With it: 87% (13 of 15 decided)",
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
      "",
      "> Enrol Southeast Center A, Southeast Center B and Midwest Center A in hub PA pre-review.",
    ),
    suggestions: [
      "What can we do about PA denials?",
      "Why is our PA approval rate dropping?",
      "What is our PA approval rate?",
    ],
  },
  unrecognized: {
    title: "Clara",
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
// Questions about figures shown on the Performance Snapshot are open to everyone who has that tab.
const topicPanels: Record<Topic, readonly PanelLabel[] | null> = {
  forecast: ["Overview", "Performance Snapshot"],
  fillRate: ["Performance Snapshot"],
  abandonment: ["Performance Snapshot"],
  active: ["Overview", "Performance Snapshot"],
  pending: ["Overview", "Performance Snapshot"],
  prescribers: ["Overview", "Performance Snapshot"],
  summary: ["Overview", "Performance Snapshot"],
  priorAuth: ["Market Access"],
  paDenials: ["Market Access"],
  paDenialActions: ["Market Access"],
  paSites: ["Market Access"],
  timeToDose: ["Market Access"],
  payerMix: ["Market Access"],
  stops: ["Market Access"],
  inventory: ["Market Access"],
  socialMedia: ["Marketing"],
  paidSearch: ["Marketing"],
  mediaImpressions: ["Marketing"],
  visitsDrop: ["Marketing"],
  searchDrop: ["Marketing"],
  searchCost: ["Marketing"],
  searchActions: ["Marketing"],
  marketingSpend: ["Marketing"],
  websiteTraffic: ["Marketing"],
  emailPerformance: ["Marketing"],
  regionalMarketing: ["Marketing"],
  fieldReach: ["Field Activity"],
  fieldCalls: ["Field Activity"],
  fieldCallMix: ["Field Activity"],
  fieldFunnel: ["Field Activity"],
  fieldRegional: ["Field Activity"],
  salesOutlook: ["Performance Snapshot", "Overview"],
  salesActions: ["Performance Snapshot", "Overview"],
  supplyOutlook: ["Market Access"],
  timeToDoseActions: ["Market Access"],
  trafficOutlook: ["Marketing"],
  marketingActions: ["Marketing"],
  reachOutlook: ["Field Activity"],
  fieldActions: ["Field Activity"],
  salesMilestone: ["Performance Snapshot", "Overview"],
  activeOutlook: ["Performance Snapshot", "Overview"],
  freeToPaidActions: ["Performance Snapshot", "Overview"],
  over30Actions: ["Performance Snapshot", "Overview"],
  inventoryRisk: ["Market Access"],
  timeOutlook: ["Market Access"],
  stopActions: ["Market Access"],
  mediaOutlook: ["Marketing"],
  hvaActions: ["Marketing"],
  prescriberOutlook: ["Field Activity"],
  repeatActions: ["Field Activity"],
  unrecognized: null,
};

// The topic a question is answered from, so other modules (such as the chat charts) can follow it.
export function answerTopicFor(question: string): string {
  return topicFor(question);
}

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
  // Paid search story: the visit drop, its cause, what it costs and how to win it back.
  if (/search|\bppc\b|\bcpc\b/.test(normalized) && !/how is|perform/.test(normalized)) {
    if (/win back|recover|defend|how do we|how can we|should|fix/.test(normalized))
      return "searchActions";
    if (/costing|cost us|impact|losing|\blost\b/.test(normalized)) return "searchCost";
    if (/happen|drop|fall|fell|declin|competitor|why/.test(normalized)) return "searchDrop";
  }
  if (/visit|traffic/.test(normalized) && /drop|fall|fell|declin|\bwhy\b/.test(normalized))
    return "visitsDrop";
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
  // Performance Snapshot measures.
  if (/fill rate|\bfilled\b/.test(normalized)) return "fillRate";
  if (/abandon/.test(normalized)) return "abandonment";
  // Field questions first: "region", "engagement" and "HCP" also appear in other topics.
  if (/region/.test(normalized) && /hcp|reach|call|field/.test(normalized)) return "fieldRegional";
  if (/engagement funnel|champion|repeat prescriber/.test(normalized)) return "fieldFunnel";
  if (/call (type|mix)|face-to-face|face to face|virtual|phone/.test(normalized))
    return "fieldCallMix";
  if (/\bcalls?\b|field|selling day/.test(normalized)) return "fieldCalls";
  if (/\breach|targeted|target hcp/.test(normalized)) return "fieldReach";
  if (/\bspen[dt]|marketing cost/.test(normalized)) return "marketingSpend";
  if (/social|engagement|video view/.test(normalized)) return "socialMedia";
  if (/search|\bppc\b|\bcpc\b|cost per click/.test(normalized)) return "paidSearch";
  if (/impression|media|channel/.test(normalized) && !/inventory/.test(normalized))
    return "mediaImpressions";
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
  payerMix: ["supplyOutlook", "paDenialActions"],
  stops: ["timeOutlook", "stopActions"],
  inventory: ["inventoryRisk", "timeToDoseActions"],
  socialMedia: ["mediaOutlook", "marketingActions"],
  paidSearch: ["searchDrop", "searchCost", "searchActions"],
  mediaImpressions: ["searchDrop", "mediaOutlook"],
  marketingSpend: ["searchDrop", "searchCost"],
  websiteTraffic: ["visitsDrop", "trafficOutlook", "hvaActions"],
  visitsDrop: ["searchDrop", "searchCost", "searchActions"],
  searchDrop: ["searchCost", "searchActions"],
  searchCost: ["searchActions"],
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

// Keeps follow-up suggestions inside the profile's access and, for answers from a single tab such
// as Marketing or Market Access, inside that tab so their questions don't mix. Performance Snapshot
// answers span the launch, so they can lead into other tabs. Tops up from the tab's own starters.
function permittedSuggestions(
  suggestions: string[],
  allowedPanels: readonly PanelLabel[],
  home: readonly PanelLabel[] | null = null,
) {
  const tabSpecific = home && !home.includes("Performance Snapshot");
  const homePanels = tabSpecific ? allowedPanels.filter((panel) => home.includes(panel)) : [];
  const sameTab = (question: string) =>
    !homePanels.length ||
    (topicPanels[topicFor(question)] ?? []).some((panel) => homePanels.includes(panel));
  const starters = (homePanels.length ? homePanels : allowedPanels).flatMap(
    (panel) => starterQuestionsByPanel[panel] ?? [],
  );
  const pool = [...suggestions, ...starters].filter(
    (question) => canAsk(question, allowedPanels) && sameTab(question),
  );
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
    suggestions: permittedSuggestions(
      [...forward, ...answer.suggestions],
      allowedPanels,
      topicPanels[topic],
    ),
  };
}
