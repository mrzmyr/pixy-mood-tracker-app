import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { useAnalytics } from "@/state/analytics";

const getScreenName = (pathname: string): string | null => {
  if (pathname === "/") {
    return "Calendar";
  }
  if (pathname === "/calendar") {
    return "Calendar";
  }
  if (pathname === "/statistics") {
    return "Statistics";
  }
  if (pathname === "/settings") {
    return "Settings";
  }
  if (pathname === "/onboarding") {
    return "Onboarding";
  }
  if (pathname === "/tags") {
    return "Tags";
  }
  if (pathname === "/tags/create") {
    return "TagCreate";
  }
  if (pathname.startsWith("/tags/")) {
    return "TagEdit";
  }
  if (pathname.startsWith("/days/")) {
    return "LogList";
  }
  if (pathname.startsWith("/logs/create/")) {
    return "LogCreate";
  }
  if (pathname.startsWith("/logs/") && pathname.endsWith("/edit")) {
    return "LogEdit";
  }
  if (pathname === "/statistics/highlights") {
    return "StatisticsHighlights";
  }
  if (pathname.startsWith("/statistics/month/")) {
    return "StatisticsMonth";
  }
  if (pathname.startsWith("/statistics/year/")) {
    return "StatisticsYear";
  }
  const settingsRoutes = new Map<string, string>(
    Object.entries({
      "/settings/colors": "Colors",
      "/settings/licenses": "Licenses",
      "/settings/steps": "Steps",
      "/settings/data": "Data",
      "/settings/reminder": "Reminder",
      "/settings/privacy": "Privacy",
      "/settings/development-tools": "DevelopmentTools",
      "/settings/tags": "SettingsTags",
      "/settings/tags/archive": "SettingsTagsArchive",
      "/dev/fixtures": "DevFixtures",
      "/dev/fixture": "DevFixture",
      "/dev/fake-files": "DevFakeFiles",
    })
  );
  return settingsRoutes.get(pathname) ?? null;
};

/** Track focused routes without sending dynamic route params to analytics. */
export const useScreenTracking = () => {
  const pathname = usePathname();
  const analytics = useAnalytics();
  const lastRouteName = useRef<string | null>(null);
  useEffect(() => {
    const name = getScreenName(pathname);
    if (!analytics.isEnabled || !name || name === lastRouteName.current) {
      return;
    }
    lastRouteName.current = name;
    analytics.screen(name);
  }, [pathname, analytics]);
};
