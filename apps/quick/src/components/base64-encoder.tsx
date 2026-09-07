import React, { useState } from "react";
import CalculationContainer from "./container";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const Base64Encoder = () => {
  const [plainText, setPlainText] = useState("");
  const [base64Text, setBase64Text] = useState("");
  const [error, setError] = useState("");

  const handlePlainChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPlainText(value);
    setError("");
    try {
      setBase64Text(btoa(value));
    } catch (err) {
      setError("Unable to encode: input contains invalid characters.");
    }
  };

  const handleBase64Change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setBase64Text(value);
    setError("");
    try {
      setPlainText(atob(value));
    } catch (err) {
      setError("Unable to decode: invalid Base64 string.");
    }
  };

  return (
    <CalculationContainer>
      <h4 className="w-full text-center mb-0 text-xl font-semibold">Base64 Encoder/Decoder</h4>
      <div className="w-full flex gap-4 flex-wrap mt-4">
        <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
          <Label>Plain Text</Label>
          <Textarea
            value={plainText}
            onChange={handlePlainChange}
            placeholder="Enter plain text..."
            className="w-full min-h-[120px]"
          />
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-[250px]">
          <Label>Base64</Label>
          <Textarea
            value={base64Text}
            onChange={handleBase64Change}
            placeholder="Enter base64..."
            className="w-full min-h-[120px]"
          />
        </div>
      </div>
      {error && <div className="w-full text-destructive text-center mt-2" role="alert">{error}</div>}
    </CalculationContainer>
  );
};

export default Base64Encoder;
