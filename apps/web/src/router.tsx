import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from "@tanstack/react-router";
import { ComparisonPage } from "./comparison-page";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => <Navigate to="/zh" />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/zh" />,
});

const zhRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/zh",
  component: () => <ComparisonPage locale="zh" />,
});

const deRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/de",
  component: () => <ComparisonPage locale="de" />,
});

const enRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/en",
  component: () => <ComparisonPage locale="en" />,
});

const routeTree = rootRoute.addChildren([indexRoute, zhRoute, deRoute, enRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
