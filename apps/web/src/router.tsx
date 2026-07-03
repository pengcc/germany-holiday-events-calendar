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

const routeTree = rootRoute.addChildren([indexRoute, zhRoute, deRoute, enRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
