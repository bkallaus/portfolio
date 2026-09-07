import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ColorContrast from "./color-contrast";

describe("Color Contrast Checker", () => {
  it("renders the default contrast ratio", () => {
    render(<ColorContrast />);
    expect(screen.getByText("Contrast Ratio: 21.00:1")).toBeInTheDocument();
  });

  it("calculates contrast ratio for specific colors", () => {
    render(<ColorContrast />);
    const inputs = screen.getAllByRole("textbox");
    // The first is foreground text input, second is background text input

    // Grey on White
    fireEvent.change(inputs[0], { target: { value: "#767676" } });
    fireEvent.change(inputs[1], { target: { value: "#ffffff" } });
    expect(screen.getByText("Contrast Ratio: 4.54:1")).toBeInTheDocument();
  });

  it("handles invalid hex input", () => {
    render(<ColorContrast />);
    const inputs = screen.getAllByRole("textbox");

    fireEvent.change(inputs[0], { target: { value: "invalid" } });
    expect(screen.getByText("Invalid hex color(s).")).toBeInTheDocument();
  });

  it("updates pass/fail status based on contrast", () => {
    render(<ColorContrast />);
    const inputs = screen.getAllByRole("textbox");

    // Very low contrast (Fail everything)
    fireEvent.change(inputs[0], { target: { value: "#eeeeee" } });
    fireEvent.change(inputs[1], { target: { value: "#ffffff" } });

    expect(screen.getByText("Contrast Ratio: 1.16:1")).toBeInTheDocument();

    // All 4 cells should fail
    const fails = screen.getAllByText("❌ Fail");
    expect(fails.length).toBe(4);
  });
});
