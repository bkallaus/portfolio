import React, { useState } from "react";
import CalculationContainer from "./container";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const TimestampConverter = () => {
  const [timestamp, setTimestamp] = useState<string>("");
  const [localTime, setLocalTime] = useState<string>("");
  const [utcTime, setUtcTime] = useState<string>("");

  const updateTimes = (tsStr: string) => {
    setTimestamp(tsStr);

    if (!tsStr.trim()) {
      setLocalTime("");
      setUtcTime("");
      return;
    }

    const tsNum = Number(tsStr);
    if (isNaN(tsNum)) {
      setLocalTime("Invalid timestamp");
      setUtcTime("Invalid timestamp");
      return;
    }

    // Auto-detect seconds vs milliseconds.
    // If the value is less than 10000000000 (Nov 20 2286), assume seconds
    let ms = tsNum;
    if (tsNum < 10000000000) {
      ms = tsNum * 1000;
    }

    const date = new Date(ms);

    if (isNaN(date.getTime())) {
      setLocalTime("Invalid date");
      setUtcTime("Invalid date");
      return;
    }

    setLocalTime(date.toString());
    setUtcTime(date.toUTCString());
  };

  const handleNowClick = () => {
    updateTimes(Date.now().toString());
  };

  return (
    <CalculationContainer>
      <h4 className="w-full text-center mb-0 text-xl font-semibold">
        Timestamp Converter
      </h4>
      <div className="w-full flex gap-4 items-end mt-4">
        <div className="flex flex-col gap-2 flex-1">
          <Label>Unix Timestamp (ms or s)</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={timestamp}
              onChange={(e) => updateTimes(e.target.value)}
              placeholder="e.g. 1672531200"
              className="flex-1"
            />
            <Button onClick={handleNowClick} variant="outline">Now</Button>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col gap-4 mt-4">
        <div className="flex flex-col gap-2">
          <Label>Local Time</Label>
          <Input type="text" readOnly value={localTime} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>UTC Time</Label>
          <Input type="text" readOnly value={utcTime} />
        </div>
      </div>
    </CalculationContainer>
  );
};

export default TimestampConverter;
