import React, { useState, useMemo } from 'react';
import { Copy } from 'lucide-react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import CalculationContainer from './container';

// Helper function to convert integer to IP string
const intToIp = (int: number): string => {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255
  ].join('.');
};

// Helper function to convert IP string to integer
const ipToInt = (ip: string): number => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return NaN;
  return (
    ((parts[0] << 24) |
    (parts[1] << 16) |
    (parts[2] << 8) |
    parts[3]) >>> 0
  );
};

export default function SubnetCalculator() {
  const [ipAddress, setIpAddress] = useState('192.168.1.0');
  const [cidr, setCidr] = useState(24);

  const calculateSubnet = (ip: string, prefix: number) => {
    const ipInt = ipToInt(ip);
    if (isNaN(ipInt)) return null;

    // A mask of 0 is a special case in JavaScript bitwise operations
    const maskInt = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

    const networkInt = (ipInt & maskInt) >>> 0;
    // Broadcast is network OR inverted mask
    const broadcastInt = (networkInt | (~maskInt)) >>> 0;

    let hosts = 0;
    let firstHost = '';
    let lastHost = '';

    if (prefix === 32) {
      hosts = 1;
      firstHost = intToIp(networkInt);
      lastHost = intToIp(networkInt);
    } else if (prefix === 31) {
      hosts = 2;
      firstHost = intToIp(networkInt);
      lastHost = intToIp(broadcastInt);
    } else {
      // 2^(32 - prefix) - 2
      hosts = Math.pow(2, 32 - prefix) - 2;
      firstHost = intToIp(networkInt + 1);
      lastHost = intToIp(broadcastInt - 1);
    }

    return {
      networkAddress: intToIp(networkInt),
      broadcastAddress: intToIp(broadcastInt),
      subnetMask: intToIp(maskInt),
      hosts: hosts.toLocaleString(),
      firstHost,
      lastHost
    };
  };

  const results = useMemo(() => calculateSubnet(ipAddress, cidr), [ipAddress, cidr]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <CalculationContainer>
      <div className="w-full flex flex-col gap-6 max-w-2xl mx-auto" id="subnet-calculator">
        <h2 className="text-2xl font-semibold tracking-tight text-center">Subnet Calculator</h2>

        <div className="grid gap-6 p-4 rounded-lg bg-muted/50">
          <div className="grid gap-2">
            <Label htmlFor="ip-address">IP Address</Label>
            <Input
              id="ip-address"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="e.g. 192.168.1.0"
              className="font-mono"
            />
          </div>

          <div className="grid gap-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="cidr-slider">CIDR Prefix (/{cidr})</Label>
              <Input
                type="number"
                value={cidr}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 0 && val <= 32) setCidr(val);
                }}
                className="w-20 font-mono text-center"
                min={0}
                max={32}
              />
            </div>
            <Slider
              id="cidr-slider"
              value={[cidr]}
              onValueChange={(vals) => setCidr(vals[0])}
              max={32}
              min={0}
              step={1}
            />
          </div>
        </div>

        {results ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Network Address', value: results.networkAddress },
              { label: 'Subnet Mask', value: results.subnetMask },
              { label: 'Usable Hosts', value: results.hosts },
              { label: 'Broadcast Address', value: results.broadcastAddress },
              { label: 'First Usable Host', value: results.firstHost },
              { label: 'Last Usable Host', value: results.lastHost },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-1 p-3 border rounded-md relative group bg-card">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="font-mono text-sm break-all">{item.value}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={() => copyToClipboard(item.value)}
                  title={`Copy ${item.label}`}
                  aria-label={`Copy ${item.label}`}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 text-destructive text-sm border border-destructive/20 rounded-md bg-destructive/10">
            Invalid IP Address format. Please enter a valid IPv4 address (e.g., 192.168.1.0).
          </div>
        )}
      </div>
    </CalculationContainer>
  );
}
