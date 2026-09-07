import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom';
import PxToRem from "./px-to-rem";

describe("PxToRem Component", () => {
  it("renders correctly with default values", () => {
    render(<PxToRem />);

    expect(screen.getByText("Px to Rem Converter")).toBeInTheDocument();

    const baseSizeInput = screen.getByLabelText("Base Size (px)");
    const pxInput = screen.getByLabelText("Pixels (px)");
    const remInput = screen.getByLabelText("Rem (rem)");

    expect(baseSizeInput).toHaveValue(16);
    expect(pxInput).toHaveValue(16);
    expect(remInput).toHaveValue(1);
  });

  it("converts px to rem correctly based on default base size", () => {
    render(<PxToRem />);

    const pxInput = screen.getByLabelText("Pixels (px)");
    const remInput = screen.getByLabelText("Rem (rem)");

    fireEvent.change(pxInput, { target: { value: '32' } });
    expect(remInput).toHaveValue(2);

    fireEvent.change(pxInput, { target: { value: '8' } });
    expect(remInput).toHaveValue(0.5);
  });

  it("converts rem to px correctly based on default base size", () => {
    render(<PxToRem />);

    const pxInput = screen.getByLabelText("Pixels (px)");
    const remInput = screen.getByLabelText("Rem (rem)");

    fireEvent.change(remInput, { target: { value: '3' } });
    expect(pxInput).toHaveValue(48);
  });

  it("updates rem when base size changes while keeping px constant", () => {
    render(<PxToRem />);

    const baseSizeInput = screen.getByLabelText("Base Size (px)");
    const pxInput = screen.getByLabelText("Pixels (px)");
    const remInput = screen.getByLabelText("Rem (rem)");

    // Default is px: 16, rem: 1
    fireEvent.change(baseSizeInput, { target: { value: '10' } });

    expect(pxInput).toHaveValue(16);
    expect(remInput).toHaveValue(1.6);
  });

  it("handles empty inputs gracefully", () => {
    render(<PxToRem />);

    const pxInput = screen.getByLabelText("Pixels (px)");
    const remInput = screen.getByLabelText("Rem (rem)");

    fireEvent.change(pxInput, { target: { value: '' } });
    expect(remInput).toHaveValue(null);

    fireEvent.change(pxInput, { target: { value: '16' } }); // reset

    fireEvent.change(remInput, { target: { value: '' } });
    expect(pxInput).toHaveValue(null);
  });
});
