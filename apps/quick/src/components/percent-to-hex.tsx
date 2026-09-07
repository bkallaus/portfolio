import CalculationContainer from "./container";
import { PatternFormat } from "react-number-format";
import React from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const PercentToHex = () => {
  const [baseTenValue, setBaseTenValue] = React.useState(0);
  const [hexValue, setHexValue] = React.useState("");
  const [percentValue, setPercentValue] = React.useState(0);

  const onPercentChange = (percent: number) => {
    const base10 = Math.round((percent * 255) / 100);
    setPercentValue(percent);
    setBaseTenValue(base10);

    let hex = "";
    if (base10 < 16) {
      hex = "0" + base10.toString(16).toUpperCase();
    } else {
      hex = base10.toString(16).toUpperCase();
    }

    setHexValue(hex);
  };

  const onBaseTenChange = (base10: number) => {
    const percent = Math.round((base10 / 255) * 100);
    setPercentValue(percent);
    setBaseTenValue(base10);

    let hex = "";
    if (base10 < 16) {
      hex = "0" + percent.toString(16).toUpperCase();
    } else {
      hex = percent.toString(16).toUpperCase();
    }

    setHexValue(hex);
  };

  const onHexChange = (hex: string) => {
    const base10 = Number.parseInt(hex, 16);
    setPercentValue((base10 / 255) * 100);
    setBaseTenValue(base10);
    setHexValue(hex);
  };

  return (
    <CalculationContainer>
      <h4 className="w-full text-center mb-0 text-xl font-semibold">Percent to Hex</h4>
      <div className="w-full flex gap-4 mt-4 flex-col sm:flex-row">
        <div className="flex flex-col gap-2 flex-1">
          <Label>Percent</Label>
          <PatternFormat
            value={percentValue}
            format={"###%"}
            type="text"
            onValueChange={({ value }: { value: string }) =>
              onPercentChange(Number(value))
            }
            customInput={Input}
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <Label>Hex</Label>
          <Input
            onChange={(e) => onHexChange(e.target.value)}
            value={hexValue}
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <Label>Base 10</Label>
          <Input
            type="number"
            onChange={(e) => onBaseTenChange(Number(e.target.value))}
            value={baseTenValue}
          />
        </div>
      </div>
    </CalculationContainer>
  );
};

export default PercentToHex;
