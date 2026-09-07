import React, { useState } from "react";
import { NumericFormat } from "react-number-format";
import CalculationContainer from "./container";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const PourOver = () => {
  const [mililitersOfWater, setMiliLitersOfWater] = useState(500);
  const [gramsOfGrounds, setGramsOfGrounds] = useState(31);
  const [ratio, setRatio] = useState(16);

  const setWaterThenGrams = (miliLiters: number) => {
    setMiliLitersOfWater(miliLiters);
    setGramsOfGrounds(Math.round((1 / ratio) * miliLiters));
  };

  const setGramsthenWater = (grams: number) => {
    setGramsOfGrounds(grams);
    setMiliLitersOfWater(Math.round(grams / (1 / ratio)));
  };

  return (
    <CalculationContainer>
      <h4 className="w-full text-center mb-0 text-xl font-semibold">Pour Over/Drip</h4>
      <div className="w-full flex gap-4 mt-4 flex-col sm:flex-row">
        <div className="flex flex-col gap-2 flex-1">
          <Label>Ratio (mL/g)</Label>
          <NumericFormat
            value={ratio}
            allowNegative={false}
            thousandSeparator=","
            onValueChange={(e: { value: any }) => setRatio(Number(e.value))}
            customInput={Input}
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <Label>Water (mL)</Label>
          <NumericFormat
            value={mililitersOfWater}
            thousandSeparator=","
            allowNegative={false}
            onValueChange={(e: { value: any }) =>
              setWaterThenGrams(Number(e.value))
            }
            customInput={Input}
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <Label>Grounds (g)</Label>
          <NumericFormat
            value={gramsOfGrounds}
            allowNegative={false}
            thousandSeparator=","
            onValueChange={(e) => setGramsthenWater(Number(e.value))}
            customInput={Input}
          />
        </div>
      </div>
    </CalculationContainer>
  );
};

export default PourOver;
