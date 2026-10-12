export const products = ["Rengene", "Staquala"] as const;

export const filters = {
  geographyLevels: ["Nation", "Region", "Territory"],
  geographyNames: ["Nation", "East", "West", "Central"],
  timePeriods: ["R13M", "R12M", "YTD"],
} as const;

export const monthlyShare = [
  { month: "Sep 2021", rengene: 18, staquala: 14 },
  { month: "Oct 2021", rengene: 31, staquala: 8 },
  { month: "Nov 2021", rengene: 28, staquala: 9 },
  { month: "Dec 2021", rengene: 33, staquala: 6 },
  { month: "Jan 2022", rengene: 33, staquala: 7 },
  { month: "Feb 2022", rengene: 32, staquala: 8 },
  { month: "Mar 2022", rengene: 32, staquala: 9 },
  { month: "Apr 2022", rengene: 28, staquala: 15 },
  { month: "May 2022", rengene: 22, staquala: 18 },
  { month: "Jun 2022", rengene: 18, staquala: 14 },
  { month: "Jul 2022", rengene: 12, staquala: 15 },
  { month: "Aug 2022", rengene: 10, staquala: 37 },
];

export const salesAttainment = [
  { product: "Rengene", forecast: 3.9, sales: 1.5 },
  { product: "Staquala", forecast: 3.4, sales: 3.4 },
];

export const callAttainment = [
  { product: "Rengene", attainment: 93 },
  { product: "Staquala", attainment: 108 },
];

export const engagement = {
  rengene: [
    { name: "F2F Calls", value: 43 },
    { name: "Remote Calls", value: 28 },
    { name: "RTE", value: 19 },
    { name: "Website", value: 10 },
  ],
  staquala: [
    { name: "F2F Calls", value: 49 },
    { name: "Remote Calls", value: 30 },
    { name: "RTE", value: 10 },
    { name: "Website", value: 12 },
  ],
};

export const claimStatus = [
  { product: "Rengene", approved: 60.43, rejected: 32.45, abandoned: 7.12 },
  { product: "Staquala", approved: 70.33, rejected: 21.97, abandoned: 7.7 },
];

export const starterQuestions = [
  "What is driving the decline in prescriptions?",
  "Compare unit sales across products.",
  "Which product has the highest growth in writers?",
  "How has patient market share changed?",
  "Summarize the key insights from this dashboard.",
];

export const dashboardAnswers: Record<
  string,
  { response: string; suggestions: string[] }
> = {
  prescriptions: {
    response:
      "Rengene is at 2,529 prescriptions, down 2% from 2,592. Its patient share has fallen from a 33% peak to 10%, while Staquala rises to 37%. That shift is the clearest pattern in the dashboard; these charts don't identify its cause.",
    suggestions: [
      "How has patient market share changed?",
      "Compare unit sales across products.",
      "Summarize the key insights from this dashboard.",
    ],
  },
  sales: {
    response:
      "Staquala leads unit sales at 9,961, up 71% versus 5,833. Rengene is at 3,100, down 29% versus 4,359. Sales versus forecast are $3.4M for Staquala and $1.5M for Rengene.",
    suggestions: [
      "Which product has the highest growth in writers?",
      "What is driving the decline in prescriptions?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  writers: {
    response:
      "Staquala has the highest writer growth at +30%, with 1,300 writers versus 997 previously. Rengene has 472 writers and is down 16% from 562.",
    suggestions: [
      "Compare unit sales across products.",
      "How has patient market share changed?",
      "Summarize the key insights from this dashboard.",
    ],
  },
  share: {
    response:
      "Rengene peaks at 33% and trends down to 10% at the end of the period. Staquala climbs from 6–9% early on to 37% at the latest point, passing Rengene mid-period.",
    suggestions: [
      "What is driving the decline in prescriptions?",
      "Compare unit sales across products.",
      "Summarize the key insights from this dashboard.",
    ],
  },
  summary: {
    response:
      "Staquala leads across the latest snapshot: prescriptions are 6,563 (+13%), writers are 1,300 (+30%), and unit sales are 9,961 (+71%). Rengene is lower across those measures and declines in patient share to 10%. Call attainment is 108% for Staquala and 93% for Rengene.",
    suggestions: [
      "How has patient market share changed?",
      "Compare unit sales across products.",
      "What is driving the decline in prescriptions?",
    ],
  },
  unrecognized: {
    response: "I'm still learning! Please try one of the suggested questions.",
    suggestions: [
      "What is driving the decline in prescriptions?",
      "Compare unit sales across products.",
      "Summarize the key insights from this dashboard.",
    ],
  },
};

export function resolveDashboardAnswer(question: string) {
  const normalized = question.toLowerCase().trim();

  if (/writer|hcp/.test(normalized)) return dashboardAnswers.writers;
  if (/market share|share changed|share change/.test(normalized)) {
    return dashboardAnswers.share;
  }
  if (/sales|unit sale/.test(normalized)) return dashboardAnswers.sales;
  if (/prescription|decline|driver/.test(normalized)) {
    return dashboardAnswers.prescriptions;
  }
  if (/summar|key insight|dashboard insight/.test(normalized)) {
    return dashboardAnswers.summary;
  }

  return dashboardAnswers.unrecognized;
}