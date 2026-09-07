import React, { useState } from "react";
import { NumericFormat } from "react-number-format";
import CalculationContainer from "./container";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const MlToCups = () => {
  const [mililitersOfWater, setMiliLitersOfWater] = useState(236.6);
  const [cups, setCups] = useState(1);

  const updateMililiters = (miliLiters: number) => {
    setMiliLitersOfWater(miliLiters);
    setCups(Math.round(miliLiters / 236.588));
  };

  const updateCups = (grams: number) => {
    setCups(grams);
    setMiliLitersOfWater(Math.round(grams * 236.588));
  };

  return (
    <CalculationContainer>
      <h4 className="w-full text-center mb-0 text-xl font-semibold">Cups to mL</h4>

      <div className="w-full flex gap-4 mt-4">
        <div className="flex flex-col gap-2 flex-1">
          <Label>MiliLiters</Label>
          <NumericFormat
            value={mililitersOfWater}
            thousandSeparator=","
            allowNegative={false}
            onValueChange={(e: { value: any }) => updateMililiters(Number(e.value))}
            customInput={Input}
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <Label>Cups</Label>
          <NumericFormat
            value={cups}
            allowNegative={false}
            thousandSeparator=","
            onValueChange={(e) => updateCups(Number(e.value))}
            customInput={Input}
          />
        </div>
      </div>
    </CalculationContainer>
  );
};

export default MlToCups;
