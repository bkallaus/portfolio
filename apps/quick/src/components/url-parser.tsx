import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const UrlParser: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [parsedUrl, setParsedUrl] = useState<URL | null>(null);
  const [error, setError] = useState('');

  const handleParse = (value: string) => {
    setInputUrl(value);
    if (!value.trim()) {
      setParsedUrl(null);
      setError('');
      return;
    }

    // Add protocol if missing so we can still parse it as a URL if they just type "google.com"
    let urlToParse = value;
    if (!/^https?:\/\//i.test(value)) {
        urlToParse = 'http://' + value;
    }

    try {
      const url = new URL(urlToParse);
      setParsedUrl(url);
      setError('');
    } catch (e) {
      setParsedUrl(null);
      setError('Invalid URL format');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">URL Parser</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="url-input">
            Enter URL
          </Label>
          <Input
            id="url-input"
            type="text"
            placeholder="https://example.com/path?query=1"
            value={inputUrl}
            onChange={(e) => handleParse(e.target.value)}
          />
        </div>

        {error && <p className="text-destructive font-medium">{error}</p>}

        {parsedUrl && (
          <div className="flex flex-col gap-6 mt-2">
            <div className="w-full overflow-auto">
              <table className="w-full text-sm text-left border-collapse">
                <tbody>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 font-medium text-muted-foreground w-1/4">Protocol</th>
                    <td className="py-2 break-all">{parsedUrl.protocol}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 font-medium text-muted-foreground w-1/4">Host</th>
                    <td className="py-2 break-all">{parsedUrl.host}</td>
                  </tr>
                  {parsedUrl.port && (
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4 font-medium text-muted-foreground w-1/4">Port</th>
                      <td className="py-2 break-all">{parsedUrl.port}</td>
                    </tr>
                  )}
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 font-medium text-muted-foreground w-1/4">Pathname</th>
                    <td className="py-2 break-all">{parsedUrl.pathname}</td>
                  </tr>
                  {parsedUrl.search && (
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4 font-medium text-muted-foreground w-1/4">Query String</th>
                      <td className="py-2 break-all">{parsedUrl.search}</td>
                    </tr>
                  )}
                  {parsedUrl.hash && (
                    <tr>
                      <th className="py-2 pr-4 font-medium text-muted-foreground w-1/4">Hash</th>
                      <td className="py-2 break-all">{parsedUrl.hash}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {parsedUrl.searchParams.toString() && (
               <div className="flex flex-col gap-2">
                   <strong className="text-sm font-semibold">Query Parameters</strong>
                   <div className="w-full overflow-auto border border-border rounded-md">
                     <table className="w-full text-sm text-left border-collapse">
                         <thead className="bg-muted">
                             <tr>
                                 <th className="p-2 font-medium border-b border-border border-r">Key</th>
                                 <th className="p-2 font-medium border-b border-border">Value</th>
                             </tr>
                         </thead>
                         <tbody>
                            {Array.from(parsedUrl.searchParams.entries()).map(([key, value], index) => (
                               <tr key={index} className="border-b border-border last:border-0">
                                   <td className="p-2 border-r border-border break-all">{key}</td>
                                   <td className="p-2 break-all">{value}</td>
                               </tr>
                            ))}
                         </tbody>
                     </table>
                   </div>
               </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UrlParser;
