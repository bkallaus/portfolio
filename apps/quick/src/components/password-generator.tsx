import CalculationContainer from "./container";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Trash2 } from "lucide-react";

interface PasswordHistoryItem {
  password: string;
  timestamp: number;
}

const HISTORY_KEY = "passwordHistory";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const PasswordGenerator = () => {
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [password, setPassword] = useState("");
  const [history, setHistory] = useState<PasswordHistoryItem[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed: PasswordHistoryItem[] = JSON.parse(stored);
        const now = Date.now();
        const validHistory = parsed.filter(
          (item) => now - item.timestamp < THIRTY_DAYS_MS
        );
        if (validHistory.length !== parsed.length) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));
        }
        setHistory(validHistory);
      }
    } catch (e) {
      console.error("Failed to load password history", e);
    }
  }, []);

  const saveToHistory = useCallback((newPassword: string) => {
    setHistory((prev) => {
      const now = Date.now();
      const newHistory = [{ password: newPassword, timestamp: now }, ...prev];
      // Keep only last 30 days
      const validHistory = newHistory.filter(
        (item) => now - item.timestamp < THIRTY_DAYS_MS
      );
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));
      } catch (e) {
        console.error("Failed to save password history", e);
      }
      return validHistory;
    });
  }, []);

  const removeFromHistory = useCallback((indexToRemove: number) => {
    setHistory((prev) => {
      const newHistory = prev.filter((_, index) => index !== indexToRemove);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      } catch (e) {
        console.error("Failed to update password history", e);
      }
      return newHistory;
    });
  }, []);

  const copyToClipboard = async (text: string, setCopiedState?: (val: boolean) => void) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (setCopiedState) {
        setCopiedState(true);
        setTimeout(() => setCopiedState(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const generatePassword = () => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

    let chars = "";
    if (includeUppercase) chars += uppercase;
    if (includeLowercase) chars += lowercase;
    if (includeNumbers) chars += numbers;
    if (includeSymbols) chars += symbols;

    if (chars === "") {
      setPassword("");
      return;
    }

    let generatedPassword = "";
    if (window.crypto && window.crypto.getRandomValues) {
      const randomValues = new Uint32Array(length);
      window.crypto.getRandomValues(randomValues);
      for (let i = 0; i < length; i++) {
        generatedPassword += chars[randomValues[i] % chars.length];
      }
    } else {
      for (let i = 0; i < length; i++) {
        generatedPassword += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    setPassword(generatedPassword);
    setCopied(false);
    if (generatedPassword) {
      saveToHistory(generatedPassword);
    }
  };

  return (
    <CalculationContainer>
      <h4 className="w-full text-center mb-0 text-xl font-semibold">Password Generator</h4>
      <div className="w-full flex flex-col gap-6 mt-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="length-input">Length</Label>
          <Input
            id="length-input"
            type="number"
            min={1}
            max={128}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="uppercase"
              checked={includeUppercase}
              onCheckedChange={(checked) => setIncludeUppercase(checked as boolean)}
            />
            <Label htmlFor="uppercase">Uppercase</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="lowercase"
              checked={includeLowercase}
              onCheckedChange={(checked) => setIncludeLowercase(checked as boolean)}
            />
            <Label htmlFor="lowercase">Lowercase</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="numbers"
              checked={includeNumbers}
              onCheckedChange={(checked) => setIncludeNumbers(checked as boolean)}
            />
            <Label htmlFor="numbers">Numbers</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="symbols"
              checked={includeSymbols}
              onCheckedChange={(checked) => setIncludeSymbols(checked as boolean)}
            />
            <Label htmlFor="symbols">Symbols</Label>
          </div>
        </div>

        <Button onClick={generatePassword} className="w-full">Generate Password</Button>

        <div className="flex flex-col gap-2">
          <Label htmlFor="generated-password">Generated Password</Label>
          <div className="flex gap-2 items-center w-full">
            <Input id="generated-password" type="text" readOnly value={password} className="flex-1" />
            <Button
              onClick={() => copyToClipboard(password, setCopied)}
              disabled={!password}
              variant="outline"
              className="w-auto"
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        {history.length > 0 && (
          <div className="mt-4">
            <h5 className="mb-4 text-lg font-semibold">History (Last 30 Days)</h5>
            <ul className="flex flex-col gap-2 p-0 m-0 list-none">
              {history.map((item, index) => (
                <li key={index} className="flex gap-2 items-center w-full">
                  <Input aria-label={`History password ${index + 1}`} type="text" readOnly value={item.password} className="flex-1" />
                  <Button
                    onClick={() => copyToClipboard(item.password)}
                    variant="ghost"
                    className="w-auto border border-border"
                  >
                    Copy
                  </Button>
                  <Button
                    onClick={() => removeFromHistory(index)}
                    variant="ghost"
                    className="w-auto border border-border text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Remove password"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CalculationContainer>
  );
};

export default PasswordGenerator;
