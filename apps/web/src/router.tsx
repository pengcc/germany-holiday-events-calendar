import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { parseExplorerSearch } from "./explorer-search";

const ComparisonPage = lazy(async () => {
  const module = await import("./comparison-page");
  return { default: module.ComparisonPage };
});

const CityEventsPage = lazy(async () => {
  const module = await import("./city-events-page");
  return { default: module.CityEventsPage };
});

const MesseEventsPage = lazy(async () => {
  const module = await import("./messe-events-page");
  return { default: module.MesseEventsPage };
});

const defaultExplorerSearch = parseExplorerSearch({});

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => <Navigate search={defaultExplorerSearch} to="/zh" />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate search={defaultExplorerSearch} to="/zh" />,
});

const zhRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/zh",
  validateSearch: parseExplorerSearch,
  component: ZhPage,
});

const deRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/de",
  validateSearch: parseExplorerSearch,
  component: DePage,
});

const enRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/en",
  validateSearch: parseExplorerSearch,
  component: EnPage,
});

const zhCityEventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/zh/city-events",
  component: () => (
    <Suspense fallback={<PageLoadingFallback label="正在加载" />}>
      <CityEventsPage locale="zh" />
    </Suspense>
  ),
});

const deCityEventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/de/city-events",
  component: () => (
    <Suspense fallback={<PageLoadingFallback label="Wird geladen" />}>
      <CityEventsPage locale="de" />
    </Suspense>
  ),
});

const enCityEventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/en/city-events",
  component: () => (
    <Suspense fallback={<PageLoadingFallback label="Loading" />}>
      <CityEventsPage locale="en" />
    </Suspense>
  ),
});

const zhMesseEventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/zh/messe-events",
  component: () => (
    <Suspense fallback={<PageLoadingFallback label="正在加载" />}>
      <MesseEventsPage locale="zh" />
    </Suspense>
  ),
});

const deMesseEventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/de/messe-events",
  component: () => (
    <Suspense fallback={<PageLoadingFallback label="Wird geladen" />}>
      <MesseEventsPage locale="de" />
    </Suspense>
  ),
});

const enMesseEventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/en/messe-events",
  component: () => (
    <Suspense fallback={<PageLoadingFallback label="Loading" />}>
      <MesseEventsPage locale="en" />
    </Suspense>
  ),
});

function ZhPage() {
  const search = zhRoute.useSearch();
  const navigate = zhRoute.useNavigate();
  return (
    <Suspense fallback={<PageLoadingFallback label="正在加载" />}>
      <ComparisonPage
        locale="zh"
        search={search}
        onSearchChange={(next, options) =>
          navigate({
            search: next,
            replace: options?.replace,
            resetScroll: options?.resetScroll,
          })
        }
      />
    </Suspense>
  );
}

function DePage() {
  const search = deRoute.useSearch();
  const navigate = deRoute.useNavigate();
  return (
    <Suspense fallback={<PageLoadingFallback label="Wird geladen" />}>
      <ComparisonPage
        locale="de"
        search={search}
        onSearchChange={(next, options) =>
          navigate({
            search: next,
            replace: options?.replace,
            resetScroll: options?.resetScroll,
          })
        }
      />
    </Suspense>
  );
}

function EnPage() {
  const search = enRoute.useSearch();
  const navigate = enRoute.useNavigate();
  return (
    <Suspense fallback={<PageLoadingFallback label="Loading" />}>
      <ComparisonPage
        locale="en"
        search={search}
        onSearchChange={(next, options) =>
          navigate({
            search: next,
            replace: options?.replace,
            resetScroll: options?.resetScroll,
          })
        }
      />
    </Suspense>
  );
}

function PageLoadingFallback({ label }: { label: string }) {
  return (
    <main aria-busy="true" className="min-h-screen">
      <p className="sr-only" role="status">
        {label}
      </p>
    </main>
  );
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  zhRoute,
  deRoute,
  enRoute,
  zhCityEventsRoute,
  deCityEventsRoute,
  enCityEventsRoute,
  zhMesseEventsRoute,
  deMesseEventsRoute,
  enMesseEventsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
