import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LogoutEverywhereButton from "@/components/LogoutEverywhereButton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { installProfileApi } from "./fixtures/profileApi";
import { creatorProfile } from "./fixtures/creatorProfile";
import { renderProfile } from "./renderProfile";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

let logoutAllCalls: RequestInit[];
let logoutAllResponse: () => Promise<Response>;

function UserProbe() {
  const { user } = useAuth();
  return <p data-testid="user">{user ? user.email : "signed out"}</p>;
}

async function mount() {
  const profileApi = installProfileApi(creatorProfile());
  const base = globalThis.fetch;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (new URL(String(input), window.location.origin).pathname === "/api/mavlit/auth/logout-all") {
      logoutAllCalls.push(init ?? {});
      return logoutAllResponse();
    }
    return base(input, init);
  }));
  const view = renderProfile(<><UserProbe /><LogoutEverywhereButton /></>);
  await waitFor(() => expect(screen.getByTestId("user")).not.toHaveTextContent("signed out"));
  view.queryClient.setQueryDefaults(["dashboard"], { gcTime: Infinity });   // the wrapper's gcTime 0 would drop an unobserved entry
  view.queryClient.setQueryData(["dashboard"], { cached: true });
  fireEvent.click(screen.getByTitle("Log out of all devices"));
  return { ...view, profileApi };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const confirmButton = () => screen.getByRole("button", { name: /Log out everywhere/ });

beforeEach(() => {
  logoutAllCalls = [];
  logoutAllResponse = async () => json({ status: "ok" });
  window.history.replaceState(null, "", "/profile");
});

describe("Log out of all devices", () => {
  it("shows the warning and does nothing on Cancel", async () => {
    await mount();
    expect(screen.getByText("This will sign you out on every device, including this one. You will need to log in again.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(logoutAllCalls).toHaveLength(0);
    expect(screen.getByTestId("user")).not.toHaveTextContent("signed out");
    expect(toast).not.toHaveBeenCalled();
  });

  it("calls the endpoint once, with credentials, then clears state, redirects and says so", async () => {
    let release!: () => void;
    logoutAllResponse = () => new Promise((resolve) => { release = () => resolve(json({ status: "ok" })); });
    const { queryClient } = await mount();
    fireEvent.click(confirmButton());
    await waitFor(() => expect(confirmButton()).toBeDisabled());   // loading state while the request runs
    fireEvent.click(confirmButton());                              // a second click does not send a second request
    expect(logoutAllCalls).toHaveLength(1);
    expect(logoutAllCalls[0]).toMatchObject({ method: "POST", credentials: "include" });
    release();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("signed out"));
    expect(window.location.pathname).toBe("/signin");
    expect(queryClient.getQueryData(["dashboard"])).toBeUndefined();
    expect(toast).toHaveBeenCalledWith({ title: "You have been signed out on all devices" });
  });

  it("treats a 401 (session already gone) as success", async () => {
    logoutAllResponse = async () => json({ detail: "Not authenticated" }, 401);
    await mount();
    fireEvent.click(confirmButton());
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("signed out"));
    expect(window.location.pathname).toBe("/signin");
    expect(toast).toHaveBeenCalledWith({ title: "You have been signed out on all devices" });
  });

  it("on a server error shows an error toast and stays signed in", async () => {
    logoutAllResponse = async () => json({ detail: "boom" }, 500);
    const { queryClient } = await mount();
    fireEvent.click(confirmButton());
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
    expect(screen.getByTestId("user")).not.toHaveTextContent("signed out");
    expect(window.location.pathname).toBe("/profile");
    expect(queryClient.getQueryData(["dashboard"])).toEqual({ cached: true });
  });

  it("on 429 says to try again later and stays signed in", async () => {
    logoutAllResponse = async () => json({ detail: "x" }, 429);
    await mount();
    fireEvent.click(confirmButton());
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive", description: "Too many attempts, try again later." })));
    expect(screen.getByTestId("user")).not.toHaveTextContent("signed out");
  });
});
