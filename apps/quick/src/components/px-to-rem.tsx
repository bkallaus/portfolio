import React, { useState, ChangeEvent } from "react";
import CalculationContainer from "./container";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const PxToRem = () => {
  const [baseSize, setBaseSize] = useState<string>("16");
  const [pxValue, setPxValue] = useState<string>("16");
  const [remValue, setRemValue] = useState<string>("1");

  const handleBaseSizeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newBase = e.target.value;
    setBaseSize(newBase);

    // Attempt to keep px constant and update rem if possible
    const numBase = parseFloat(newBase);
    const numPx = parseFloat(pxValue);

    if (!isNaN(numBase) && numBase > 0 && !isNaN(numPx)) {
      setRemValue((numPx / numBase).toString());
    }
  };

  const handlePxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newPx = e.target.value;
    setPxValue(newPx);

    const numPx = parseFloat(newPx);
    const numBase = parseFloat(baseSize);

    if (!isNaN(numPx) && !isNaN(numBase) && numBase > 0) {
      setRemValue((numPx / numBase).toString());
    } else {
      setRemValue("");
    }
  };

  const handleRemChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newRem = e.target.value;
    setRemValue(newRem);

    const numRem = parseFloat(newRem);
    const numBase = parseFloat(baseSize);

    if (!isNaN(numRem) && !isNaN(numBase) && numBase > 0) {
      setPxValue((numRem * numBase).toString());
    } else {
      setPxValue("");
    }
  };

  return (
    <div className="w-full">
      <CalculationContainer>
        <h4 className="w-full text-center mb-0 text-xl font-semibold">Px to Rem Converter</h4>
        <div className="flex gap-4 items-end w-full flex-wrap mt-4">
          <div className="flex flex-col gap-2 flex-1 min-w-[100px]">
            <Label>Base Size (px)</Label>
            <Input
              type="number"
              value={baseSize}
              onChange={handleBaseSizeChange}
              placeholder="16"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
            <Label>Pixels (px)</Label>
            <Input
              type="number"
              value={pxValue}
              onChange={handlePxChange}
              placeholder="16"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[120px]">
            <Label>Rem (rem)</Label>
            <Input
              type="number"
              value={remValue}
              onChange={handleRemChange}
              placeholder="1"
            />
          </div>
        </div>
      </CalculationContainer>
    </div>
  );
};

export default PxToRem;
