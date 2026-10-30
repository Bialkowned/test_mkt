import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";

import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import TesterProfile from "./pages/TesterProfile";

/**
 * One behavioural test per routed page.
 *
 * Each page is mounted at the path App.tsx gives it, with axios stubbed per URL,
 * and the test asserts on what a user would see once the page's fetch resolves.
 * contract.test.tsx proves these modules import; this proves they render the
 * data they are handed.
 */
vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const get = vi.mocked(axios.get);

const builder = {
  email: "bea@example.com",
  first_name: "Bea",
  last_name: "Builder",
  role: "builder",
};
const tester = {
  email: "tom@example.com",
  first_name: "Tom",
  last_name: "Tester",
  role: "tester",
};

/** Answer GETs by URL; anything unlisted rejects so a stray call is visible. */
function respond(routes: Record<string, unknown>) {
  get.mockImplementation((url: string) =>
    url in routes
      ? Promise.resolve({ data: routes[url] })
      : Promise.reject(new Error(`unexpected GET ${url}`)),
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  get.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Mount `element` at `pattern`, visit `url`, and let mount-time fetches settle. */
async function visit(url: string, pattern: string, element: ReactElement) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={pattern} element={element} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return container;
}

function button(label: string) {
  const match = [...container.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === label,
  );
  if (!match) throw new Error(`no button "${label}"`);
  return match;
}

describe("/dashboard", () => {
  it("shows a builder their stats from /api/dashboard", async () => {
    respond({
      "/api/dashboard": {
        stats: { total_projects: 4, active_jobs: 2, total_spent: 125 },
      },
    });
    const page = await visit(
      "/dashboard",
      "/dashboard",
      <Dashboard user={builder} />,
    );

    expect(get).toHaveBeenCalledWith("/api/dashboard");
    expect(page.textContent).toContain("Welcome back, Bea");
    expect(page.textContent).toContain("$125.00");
    expect(page.querySelector('a[href="/jobs/create"]')).not.toBeNull();
  });

  it("prompts a tester without Stripe Connect to set up payouts", async () => {
    respond({
      "/api/dashboard": {
        stats: { earnings: 40 },
        stripe_connect_onboarded: false,
      },
    });
    const page = await visit(
      "/dashboard",
      "/dashboard",
      <Dashboard user={tester} />,
    );

    expect(page.textContent).toContain("Set up payouts to receive earnings");
    expect(page.querySelector('a[href="/settings"]')).not.toBeNull();
  });

  it("reports a failed load instead of rendering stats", async () => {
    respond({});
    const page = await visit(
      "/dashboard",
      "/dashboard",
      <Dashboard user={builder} />,
    );

    expect(page.textContent).toContain("Failed to load dashboard");
  });
});

describe("/jobs", () => {
  it("lists open jobs for a tester and splits them by tab", async () => {
    respond({
      "/api/jobs": [
        {
          id: "j1",
          title: "Checkout flow",
          status: "open",
          payout_amount: 20,
          max_testers: 3,
          assigned_testers: [],
        },
        {
          id: "j2",
          title: "Signup audit",
          status: "in_progress",
          payout_amount: 15,
          max_testers: 2,
          assigned_testers: [tester.email],
        },
      ],
      "/api/bids": [],
    });
    const page = await visit("/jobs", "/jobs", <Jobs user={tester} />);

    expect(get).toHaveBeenCalledWith("/api/jobs");
    expect(get).toHaveBeenCalledWith("/api/bids");
    expect(page.textContent).toContain("Checkout flow");
    expect(page.textContent).not.toContain("Signup audit");

    await act(async () => {
      button("Claimed1").click();
    });
    expect(page.textContent).toContain("Signup audit");
    expect(page.textContent).not.toContain("Checkout flow");
  });
});

describe("/pricing", () => {
  it("adds the 15% platform fee and recomputes when a role is added", async () => {
    const page = await visit("/pricing", "/pricing", <Pricing user={null} />);

    // One default item at $25: 25 + 3.75 fee.
    expect(page.textContent).toContain("Four ways to test your app");
    expect(page.textContent).toContain("Subtotal (1 items)");
    expect(page.textContent).toContain("$28.75");

    await act(async () => {
      button("+ Add Role").click();
    });
    expect(page.textContent).toContain("Subtotal (2 items)");
    expect(page.textContent).toContain("$57.50");
  });
});

describe("/projects", () => {
  it("renders the builder's projects from /api/projects", async () => {
    respond({
      "/api/projects": [
        {
          id: "p1",
          name: "Acme Storefront",
          category: "E-commerce",
          description: "Shop",
          hosted_url: "https://acme.example",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    const page = await visit(
      "/projects",
      "/projects",
      <Projects user={builder} />,
    );

    expect(get).toHaveBeenCalledWith("/api/projects");
    expect(page.textContent).toContain("My Projects");
    expect(page.textContent).toContain("Acme Storefront");
    expect(page.querySelector('a[href="https://acme.example"]')).not.toBeNull();
  });

  it("shows the empty state when there are none", async () => {
    respond({ "/api/projects": [] });
    const page = await visit(
      "/projects",
      "/projects",
      <Projects user={builder} />,
    );

    expect(page.textContent).toContain("You haven't created any projects yet.");
  });
});

describe("/settings", () => {
  it("gives a tester profile, payouts and account sections", async () => {
    respond({
      "/api/stripe/connect/status": { onboarded: false, account_id: null },
    });
    const page = await visit(
      "/settings",
      "/settings",
      <Settings user={tester} />,
    );

    expect(get).toHaveBeenCalledWith("/api/stripe/connect/status");
    expect(page.querySelector("h1")?.textContent).toBe("Settings");

    await act(async () => {
      button("Payouts").click();
    });
    expect(page.textContent).toContain("Stripe Connect");
    expect(page.textContent).toContain("Connect Stripe");
  });

  it("shows a connected Stripe account as connected", async () => {
    respond({
      "/api/stripe/connect/status": { onboarded: true, account_id: "acct_1" },
    });
    await visit("/settings", "/settings", <Settings user={tester} />);

    await act(async () => {
      button("Payouts").click();
    });
    expect(container.textContent).toContain("Connected");
    expect(container.textContent).not.toContain("Connect Stripe");
  });

  it("reports a failed payout-status load instead of offering to connect", async () => {
    respond({});
    await visit("/settings", "/settings", <Settings user={tester} />);

    await act(async () => {
      button("Payouts").click();
    });
    expect(container.textContent).toContain(
      "We couldn't load your payout status",
    );
    expect(container.textContent).not.toContain("Connect Stripe");
  });
});

describe("/testers/:slug", () => {
  it("loads the profile named by the slug", async () => {
    respond({
      "/api/testers/jane-doe": {
        first_name: "Jane",
        last_name: "Doe",
        bio: "Accessibility specialist",
        specialties: ["a11y"],
        completed_tests: 12,
        avg_rating: 4.5,
        reviews: [],
      },
    });
    const page = await visit(
      "/testers/jane-doe",
      "/testers/:slug",
      <TesterProfile />,
    );

    expect(get).toHaveBeenCalledWith("/api/testers/jane-doe");
    expect(page.querySelector("h1")?.textContent).toBe("Jane Doe");
    expect(page.textContent).toContain("Accessibility specialist");
    expect(page.textContent).toContain("4.5");
  });

  it("shows not-found for an unknown tester", async () => {
    respond({});
    const page = await visit(
      "/testers/nobody",
      "/testers/:slug",
      <TesterProfile />,
    );

    expect(page.textContent).toContain("Profile not found");
  });
});

describe("unknown route", () => {
  it("tells the user the page does not exist", async () => {
    const page = await visit("/qa-probe-no-such-route", "*", <NotFound />);

    expect(page.querySelector("h1")?.textContent).toBe("Page not found");
    expect(page.querySelector('a[href="/"]')).not.toBeNull();
  });
});
