import React, { useState } from "react";
import CalculationContainer from "./container";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const IframeTester = () => {
  const [url, setUrl] = useState("");
  const [src, setSrc] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleLoad = () => {
    setSrc(url);
  };

  return (
    <CalculationContainer>
      <h4 className="w-full text-center mb-0 text-xl font-semibold">Iframe Tester</h4>
      <div className="flex flex-col gap-6 items-center w-full mt-4">
        <div className="flex gap-4 w-full items-end">
          <div className="flex flex-col gap-2 flex-1">
            <Label>Iframe URL</Label>
            <Input
              type="text"
              value={url}
              onChange={handleChange}
              placeholder="https://example.com"
              className="mb-0"
            />
          </div>
          <Button onClick={handleLoad} className="w-auto mb-0">Load</Button>
        </div>
        {src && (
          <iframe
            src={src}
            title="Iframe Tester"
            width="100%"
            height="400"
            className="border border-border rounded-md"
          />
        )}
      </div>
    </CalculationContainer>
  );
};

export default IframeTester;
