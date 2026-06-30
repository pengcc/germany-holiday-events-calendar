import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from "@tanstack/react-router";
import { ComparisonPage } from "./comparison-page";
import { parseExplorerSearch } from "./explorer-search";

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
    <ComparisonPage
      locale="zh"
      search={search}
      onSearchChange={(next, options) => navigate({ search: next, replace: options?.replace })}
    />
  );
}

function DePage() {
  const search = deRoute.useSearch();
  const navigate = deRoute.useNavigate();
  return (
    <ComparisonPage
      locale="de"
      search={search}
      onSearchChange={(next, options) => navigate({ search: next, replace: options?.replace })}
    />
  );
}

function EnPage() {
  const search = enRoute.useSearch();
  const navigate = enRoute.useNavigate();
  return (
    <ComparisonPage
      locale="en"
      search={search}
      onSearchChange={(next, options) => navigate({ search: next, replace: options?.replace })}
    />
  );
}

const routeTree = rootRoute.addChildren([indexRoute, zhRoute, deRoute, enRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
