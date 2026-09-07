import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

const WordCounter: React.FC = () => {
  const [text, setText] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const clearText = () => {
    setText('');
  };

  const getStats = () => {
    const trimmedText = text.trim();

    const charCount = text.length;
    const charCountWithoutSpaces = text.replace(/\s/g, '').length;

    // Word count: split by whitespace, filter out empty strings
    const wordCount = trimmedText === '' ? 0 : trimmedText.split(/\s+/).filter(word => word.length > 0).length;

    // Sentence count: split by [.!?] followed by whitespace or end of string
    const sentenceCount = trimmedText === '' ? 0 : (text.match(/[.!?]+(?=\s|$)/g) || []).length;

    // Paragraph count: split by multiple newlines
    const paragraphCount = trimmedText === '' ? 0 : text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    return {
      charCount,
      charCountWithoutSpaces,
      wordCount,
      sentenceCount,
      paragraphCount
    };
  };

  const stats = getStats();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Word Counter</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Type or paste your text here..."
            value={text}
            onChange={handleChange}
            className="min-h-[200px]"
            aria-label="Text to count"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col bg-muted/50 p-4 rounded-lg items-center justify-center text-center">
            <span className="text-3xl font-bold">{stats.wordCount}</span>
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Words</span>
          </div>
          <div className="flex flex-col bg-muted/50 p-4 rounded-lg items-center justify-center text-center">
            <span className="text-3xl font-bold">{stats.charCount}</span>
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Characters</span>
          </div>
          <div className="flex flex-col bg-muted/50 p-4 rounded-lg items-center justify-center text-center">
            <span className="text-3xl font-bold">{stats.sentenceCount}</span>
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Sentences</span>
          </div>
          <div className="flex flex-col bg-muted/50 p-4 rounded-lg items-center justify-center text-center">
            <span className="text-3xl font-bold">{stats.paragraphCount}</span>
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Paragraphs</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm text-muted-foreground mt-2 border-t pt-4">
          <span>Characters (no spaces): {stats.charCountWithoutSpaces}</span>
          <Button variant="outline" size="sm" onClick={clearText} disabled={!text}>
            Clear Text
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WordCounter;
