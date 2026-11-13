import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import AuthLayout from "./(auth)/layout";
import GameLayout from "./(game)/layout";

vi.mock("./providers", () => ({ Providers: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => null }));
vi.mock("@/features/account", () => ({
  WelcomeGate: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/shared/street-backdrop", () => ({
  StreetBackdrop: () => <div data-testid="street" />,
}));

const params = Promise.resolve({});

describe("the street along the bottom", () => {
  it("runs under every game screen: the welcome, the lobby and every table", () => {
    const { getByTestId } = render(<GameLayout params={params}>screen</GameLayout>);
    expect(getByTestId("street")).toBeInTheDocument();
  });

  it("stays off the sign-in screens, which have their own scene", () => {
    const { queryByTestId } = render(<AuthLayout params={params}>screen</AuthLayout>);
    expect(queryByTestId("street")).not.toBeInTheDocument();
  });
});
