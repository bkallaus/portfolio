import React, { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import CalculationContainer from "./container";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const QrCode = () => {
  const [text, setText] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const download = () => {
    if (!canvasRef.current) return;

    // Find the canvas element inside the wrapper
    const canvas = canvasRef.current.querySelector("canvas");
    if (!canvas) return;

    const downloadLink = document.createElement("a");
    downloadLink.href = canvas.toDataURL("image/png");
    downloadLink.download = "qrcode.png";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <CalculationContainer>
      <h4 className="w-full text-center mb-0 text-xl font-semibold">QR Code</h4>
      <div className="flex flex-col gap-6 items-center w-full mt-4">
        <div className="w-full flex gap-4 items-end">
          <div className="flex flex-col gap-2 flex-1">
            <Label>Content</Label>
            <Input
              type="text"
              value={text}
              onChange={handleChange}
              placeholder="Enter text to generate QR code"
              className="mb-0"
            />
          </div>
          <Button onClick={download} disabled={!text} className="w-auto mb-0">
            Download PNG
          </Button>
        </div>
        {text && (
          <div ref={canvasRef}>
            <QRCodeCanvas value={text} size={256} level="H" />
          </div>
        )}
      </div>
    </CalculationContainer>
  );
};

export default QrCode;
