import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud", "exercitation",
  "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo", "consequat", "duis",
  "aute", "irure", "in", "reprehenderit", "voluptate", "velit", "esse", "cillum",
  "fugiat", "nulla", "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "non",
  "proident", "sunt", "culpa", "qui", "officia", "deserunt", "mollit", "anim", "id", "est", "laborum"
];

const getRandomWord = () => LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];

const generateSentence = () => {
  const numWords = Math.floor(Math.random() * 10) + 5; // 5-15 words
  const words = Array.from({ length: numWords }, getRandomWord);
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(" ") + ".";
};

const generateParagraph = () => {
  const numSentences = Math.floor(Math.random() * 4) + 3; // 3-7 sentences
  return Array.from({ length: numSentences }, generateSentence).join(" ");
};

const LoremIpsum = () => {
  const [paragraphs, setParagraphs] = useState<number>(3);
  const [text, setText] = useState<string>("");

  const handleGenerate = () => {
    const newText = Array.from({ length: paragraphs }, generateParagraph).join("\n\n");
    setText(newText);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Lorem Ipsum Generator</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Label htmlFor="paragraphs-input" className="whitespace-nowrap">Paragraphs:</Label>
          <Input
            id="paragraphs-input"
            type="number"
            min="1"
            max="10"
            value={paragraphs}
            onChange={(e) => setParagraphs(Number(e.target.value))}
            className="w-20"
          />
          <Button onClick={handleGenerate}>Generate</Button>
        </div>

        {text && (
          <div className="relative">
            <Textarea
              readOnly
              value={text}
              rows={10}
              className="w-full resize-y pr-20"
              aria-label="Generated lorem ipsum text"
            />
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
            >
              Copy
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoremIpsum;
