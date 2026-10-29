// Insights & Recommendations: for each persona and tab, the signals in the data that matter to
// that role, why they matter, what to do, and the questions to ask Clara next. The point is that
// users who don't know what to ask still get a starting point. Every figure is derived from the
// same data as the dashboard and Clara's answers; questions are ones Clara can answer for the
// persona.

import { forwardQuestion, kpis, type PanelLabel } from "@/lib/dashboard-data";
import { executiveTargets } from "@/lib/executive-data";
import { fieldKpis } from "@/lib/field-data";
import { paAnalysis } from "@/lib/market-access-data";
import {
  fieldActions,
  hvaActions,
  inventoryRisk,
  marketingActions,
  monthsToCloseGapWithFirstAction,
  over30Actions,
  repeatActions,
  salesActions,
  searchStory,
  timeToDoseActions,
} from "@/lib/outlook-data";

export type InsightKind = "Risk" | "Watch" | "Opportunity";

export type Insight = {
  kind: InsightKind;
  signal: string;
  evidence: string;
  recommendation: string;
  questions: string[];
};

const count = (value: number) => value.toLocaleString("en-US");
const dollars = (value: number) => `$${value.toFixed(2)}`;
const firstPass = paAnalysis;
const quickStartAndBridge = salesActions.actions[0]!;

// --- The insights, one per signal -----------------------------------------------------------

const salesGap: Insight = {
  kind: "Risk",
  signal: `Net sales at ${kpis.netSales.attainmentPct}% of forecast, $${salesActions.gapM}M behind`,
  evidence: "The gap comes from the first half; Q3 is running ahead of forecast.",
  recommendation: `Move the ${quickStartAndBridge.patients} Quick Start and Bridge patients to commercial coverage: that closes the gap in about ${monthsToCloseGapWithFirstAction} months.`,
  questions: [forwardQuestion("salesActions"), forwardQuestion("salesOutlook")],
};

const paDrop: Insight = {
  kind: "Risk",
  signal: `First-pass PA approval fell from ${firstPass.firstPassH1}% to ${firstPass.firstPassQ3}%`,
  evidence:
    "Denials jumped after a Medicare Advantage policy change on Jul 1 and cluster at three sites.",
  recommendation:
    "Put the three sites with most denials on hub PA pre-review so both required documents go in first time.",
  questions: [forwardQuestion("paDenials"), forwardQuestion("paDenialActions")],
};

const visitsDrop: Insight = {
  kind: "Risk",
  signal: `Website visits down ${Math.abs(searchStory.visitsChangePct)}% since ${searchStory.peakMonth}`,
  evidence: `Paid search clicks fell ${Math.abs(searchStory.clicksChangePct)}% while social, HCP email and other sources grew.`,
  recommendation: "Investigate paid search first: the same budget is buying far fewer clicks.",
  questions: [forwardQuestion("visitsDrop"), forwardQuestion("searchDrop")],
};

const searchSqueeze: Insight = {
  kind: "Risk",
  signal: `Paid search clicks down ${Math.abs(searchStory.clicksChangePct)}% since ${searchStory.peakMonth}`,
  evidence: `Cost per click is up ${searchStory.cpcChangePct}% (${dollars(searchStory.peakCpc)} → ${dollars(searchStory.latestCpc)}) at a flat ~$12k budget, and search ROI fell from ${searchStory.peakRoi.toFixed(1)}x to ${searchStory.latestRoi.toFixed(1)}x.`,
  recommendation:
    "Defend branded terms and review the search budget cap; check who is bidding against us.",
  questions: [forwardQuestion("visitsDrop"), forwardQuestion("searchActions")],
};

// Lower-than-expected HCP engagement in the weakest region: worth a look at the drivers.
const regionalLag: Insight = {
  kind: "Watch",
  signal: `HCP engagement is lagging in the ${marketingActions.weakestRegion}`,
  evidence: `HCP email open rate ${marketingActions.weakestOpenRate.toFixed(1)}% and HVA rate ${marketingActions.weakestHvaRate.toFixed(1)}%, the lowest of the four regions (national ${marketingActions.nationalOpenRate.toFixed(1)}% and ${marketingActions.nationalHvaRate.toFixed(1)}%).`,
  recommendation: `Investigate the drivers (send times, content, list quality) and target ${marketingActions.weakestRegion} HCPs with tailored email.`,
  questions: ["Which region is performing best?", forwardQuestion("marketingActions")],
};

const repRequests: Insight = {
  kind: "Opportunity",
  signal: `Only ${hvaActions.repRequestSharePct}% of high value actions are rep requests`,
  evidence: `${count(hvaActions.repRequests)} rep requests from ${count(hvaActions.hcpVisits)} HCP site visits; most HCPs download a resource and leave.`,
  recommendation:
    "Add a request-a-rep prompt to resource downloads and route requests to the field within a day.",
  questions: [forwardQuestion("hvaActions")],
};

const over30: Insight = {
  kind: "Risk",
  signal: `${over30Actions.patients} patients waiting more than 30 days to start`,
  evidence: `If they were lost, abandonment would rise from ${over30Actions.abandonmentNowPct}% to ${over30Actions.abandonmentIfLostPct}%, above the 5% target.`,
  recommendation:
    "Escalate the PA cases to peer-to-peer review and book alternate procedure sites.",
  questions: [forwardQuestion("over30Actions"), forwardQuestion("timeToDoseActions")],
};

const scheduling: Insight = {
  kind: "Watch",
  signal: `Procedure scheduling holds ${timeToDoseActions.lpPending} of ${timeToDoseActions.totalPending} pending patients`,
  evidence: `It takes ${timeToDoseActions.lpDays} of the ${timeToDoseActions.firstDoseDays} days from referral to first dose; ${timeToDoseActions.lpOver30} patients have waited over 30 days.`,
  recommendation: "Book the procedure as soon as PA is approved, not after.",
  questions: [forwardQuestion("timeToDoseActions"), forwardQuestion("timeOutlook")],
};

const inventory: Insight = {
  kind: "Watch",
  signal: `Only about ${inventoryRisk.daysOfCover} days of vials on hand`,
  evidence: `${inventoryRisk.onHand} vials against about ${inventoryRisk.octoberDoses} projected October doses.`,
  recommendation: `Ship about ${inventoryRisk.octoberShipment} vials in October to start November with a month of cover.`,
  questions: [forwardQuestion("inventoryRisk"), "How many vials will we need next quarter?"],
};

const fieldReach: Insight = {
  kind: "Risk",
  signal: `HCP reach at ${fieldKpis.reachPct}%, below the ${executiveTargets.hcpReachPct}% target`,
  evidence: `${fieldActions.unreached} targeted HCPs not yet reached; ${fieldActions.lowestReach.join(" and ")} have the lowest reach.`,
  recommendation: `Prioritise the unreached HCPs in ${fieldActions.lowestReach.join(" and ")}.`,
  questions: [forwardQuestion("fieldActions"), "How many HCPs will we reach by year end?"],
};

const oneTimePrescribers: Insight = {
  kind: "Opportunity",
  signal: `${repeatActions.oneTime} of ${repeatActions.sinceLaunch} prescribers have prescribed only once`,
  evidence: `${repeatActions.champions} champions have started three or more patients.`,
  recommendation:
    "Follow-up visits to find a second eligible patient; use champions in peer programs.",
  questions: [forwardQuestion("repeatActions")],
};

// --- Who sees what --------------------------------------------------------------------------

type Persona = "jenny" | "jeff" | "bob";

const byPersona: Record<Persona, Partial<Record<PanelLabel, Insight[]>>> = {
  // Brand Director: the whole launch.
  jenny: {
    "Performance Snapshot": [salesGap, paDrop, visitsDrop],
    Marketing: [searchSqueeze, regionalLag, repRequests],
    "Market Access": [paDrop, over30, inventory],
    "Field Activity": [fieldReach, oneTimePrescribers],
  },
  // Marketing Manager: demand generation and channel performance.
  jeff: {
    "Performance Snapshot": [visitsDrop, regionalLag, repRequests],
    Marketing: [searchSqueeze, regionalLag, repRequests],
  },
  // Market Access Lead: getting patients approved and on therapy.
  bob: {
    "Performance Snapshot": [paDrop, over30, inventory],
    "Market Access": [paDrop, scheduling, inventory],
  },
};

// The insights for a persona on a tab. The What-If Simulator has none: its levers are the prompt.
export function insightsFor(profileId: string, panel: string): Insight[] {
  return byPersona[profileId as Persona]?.[panel as PanelLabel] ?? [];
}
