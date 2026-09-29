import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const goLive = vi.fn(() => ({ broadcast: vi.fn(), stop: vi.fn() }));
vi.mock("./live.ts", () => ({ goLive }));

const { App } = await import("./App.tsx");

describe("Shared Todo", () => {
  beforeEach(() => {
    localStorage.clear();
    goLive.mockClear();
    window.history.replaceState(null, "", "/todo/");
  });

  it("adds a dated todo and offers calendar links", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Todo"), "Pay rent");
    await user.type(screen.getByLabelText("Date"), "2026-10-31");
    await user.click(screen.getByRole("button", { name: "Add" }));

    const item = within(screen.getByRole("list", { name: "Todos" })).getByText("Pay rent").closest("li");
    if (!item) throw new Error("todo not rendered");
    await user.click(within(item).getByText("Add to calendar"));
    expect(within(item).getByRole("link", { name: "Google Calendar" })).toHaveAttribute(
      "href",
      expect.stringContaining("dates=20261031%2F20261101")
    );
    expect(within(item).getByRole("button", { name: "Apple / other (.ics)" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Export dated todos (.ics)" })).toBeEnabled();
    expect(goLive).not.toHaveBeenCalled();
  });

  it("leaves undated todos off the calendar and checks them off", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Todo"), "Someday");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.queryByText("Add to calendar")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export dated todos (.ics)" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: 'Mark "Someday" done' }));
    expect(screen.getByText(/Nothing left to do/)).toBeInTheDocument();
  });

  it("shares a link that carries the list and turns on live sync", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Todo"), "Buy milk");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Share" }));

    expect((screen.getByLabelText("Share link") as HTMLInputElement).value).toMatch(/#list=[a-z0-9]+&data=/);
    expect(goLive).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("checkbox", { name: /Live sync/ })).toBeChecked();
  });
});
