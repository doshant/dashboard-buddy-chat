import { createContext, useContext } from "react";
import { buildDashboardData, type DashboardData } from "@/lib/scoped-data";
import { nationalScope } from "@/lib/scope";

// The dashboard tabs read their figures for the selected geography and time period from here.
const DashboardDataContext = createContext<DashboardData>(buildDashboardData(nationalScope));

export const DashboardDataProvider = DashboardDataContext.Provider;

export function useDashboardData() {
  return useContext(DashboardDataContext);
}
