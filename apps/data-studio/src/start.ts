import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

const csrfMiddleware = createCsrfMiddleware({
  filter: ({ request }) => !["GET", "HEAD", "OPTIONS"].includes(request.method),
  secFetchSite: "same-origin",
  allowRequestsWithoutOriginCheck: false,
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}));
