import React, { useState, useEffect } from "react";
import CalculationContainer from "./container";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

// Calculate relative luminance based on WCAG 2.0 standards
const getLuminance = (r: number, g: number, b: number) => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

// Convert hex string to RGB array
const hexToRgb = (hex: string) => {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) {
    h = h.split("").map(c => c + c).join("");
  }
  if (h.length !== 6) return null;
  const num = parseInt(h, 16);
  return [num >> 16, (num >> 8) & 255, num & 255];
};

const calculateContrastRatio = (color1: string, color2: string) => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return null;

  const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);

  const lightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (lightest + 0.05) / (darkest + 0.05);
};

const validateHex = (hex: string) => {
  return /^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex);
};

const ColorContrast = () => {
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#FFFFFF");
  const [ratio, setRatio] = useState<number | null>(21);

  useEffect(() => {
    if (validateHex(foreground) && validateHex(background)) {
      setRatio(calculateContrastRatio(foreground, background));
    } else {
      setRatio(null);
    }
  }, [foreground, background]);

  const handleForegroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForeground(e.target.value);
  };

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackground(e.target.value);
  };

  const getWcagStatus = (ratio: number | null) => {
    if (ratio === null) return { aaNormal: "Fail", aaLarge: "Fail", aaaNormal: "Fail", aaaLarge: "Fail" };
    return {
      aaNormal: ratio >= 4.5 ? "Pass" : "Fail",
      aaLarge: ratio >= 3.0 ? "Pass" : "Fail",
      aaaNormal: ratio >= 7.0 ? "Pass" : "Fail",
      aaaLarge: ratio >= 4.5 ? "Pass" : "Fail",
    };
  };

  const status = getWcagStatus(ratio);

  const getValidColorInputValue = (hex: string, defaultHex: string) => {
    if (!validateHex(hex)) return defaultHex;
    let h = hex.startsWith("#") ? hex : `#${hex}`;
    if (h.length === 4) {
      h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
    }
    return h;
  };

  return (
    <CalculationContainer>
      <h4 className="w-full text-center mb-0 text-xl font-semibold">Color Contrast Checker</h4>

      <div className="w-full flex flex-col gap-4 mt-4">
        <div className="flex gap-4 flex-col sm:flex-row">
          <div className="flex flex-col gap-2 flex-1">
            <Label>Foreground Color (Hex)</Label>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={getValidColorInputValue(foreground, "#000000")}
                    onChange={handleForegroundChange}
                    className="w-10 h-10 p-0 border border-border cursor-pointer bg-transparent rounded"
                />
                <Input
                  type="text"
                  value={foreground}
                  onChange={handleForegroundChange}
                  placeholder="#000000"
                  className="flex-1"
                />
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <Label>Background Color (Hex)</Label>
             <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={getValidColorInputValue(background, "#ffffff")}
                    onChange={handleBackgroundChange}
                    className="w-10 h-10 p-0 border border-border cursor-pointer bg-transparent rounded"
                />
                <Input
                  type="text"
                  value={background}
                  onChange={handleBackgroundChange}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: validateHex(background) ? (background.startsWith("#") ? background : `#${background}`) : "#fff",
            color: validateHex(foreground) ? (foreground.startsWith("#") ? foreground : `#${foreground}`) : "#000",
          }}
          className="p-8 mt-4 rounded-md text-center border border-border shadow-sm"
        >
          <div className="text-2xl font-bold">Preview Text</div>
          <div className="text-base">This is how normal text will look.</div>
        </div>

        {ratio !== null ? (
            <div className="mt-4">
                <h5 className="text-center font-semibold mb-4 text-lg">Contrast Ratio: {ratio.toFixed(2)}:1</h5>

                <div className="w-full overflow-auto">
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-muted">
                          <tr>
                              <th className="p-3 font-semibold border-b border-border">Standard</th>
                              <th className="p-3 font-semibold border-b border-border">Normal Text</th>
                              <th className="p-3 font-semibold border-b border-border">Large Text</th>
                          </tr>
                      </thead>
                      <tbody>
                          <tr className="border-b border-border">
                              <th className="p-3 font-medium">WCAG AA</th>
                              <td className="p-3">{status.aaNormal === "Pass" ? "✅ Pass" : "❌ Fail"}</td>
                              <td className="p-3">{status.aaLarge === "Pass" ? "✅ Pass" : "❌ Fail"}</td>
                          </tr>
                          <tr>
                              <th className="p-3 font-medium">WCAG AAA</th>
                              <td className="p-3">{status.aaaNormal === "Pass" ? "✅ Pass" : "❌ Fail"}</td>
                              <td className="p-3">{status.aaaLarge === "Pass" ? "✅ Pass" : "❌ Fail"}</td>
                          </tr>
                      </tbody>
                  </table>
                </div>
            </div>
        ) : (
            <div className="mt-4 text-center text-muted-foreground">
                Invalid hex color(s).
            </div>
        )}
      </div>
    </CalculationContainer>
  );
};

export default ColorContrast;
