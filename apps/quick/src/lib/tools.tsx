import type { ComponentType } from 'react';
import Base64Encoder from '../components/base64-encoder';
import ColorContrast from '../components/color-contrast';
import GenerateList from '../components/generate-list';
import IframeTester from '../components/iframe-tester';
import LoremIpsum from '../components/lorem-ipsum';
import MlToCups from '../components/ml-to-cups';
import PasswordGenerator from '../components/password-generator';
import PercentToHex from '../components/percent-to-hex';
import PourOver from '../components/pour-over';
import PxToRem from '../components/px-to-rem';
import QrCode from '../components/qr-code';
import ShareableList from '../components/shareable-list';
import SubnetCalculator from '../components/subnet-calculator';
import TimestampConverter from '../components/timestamp-converter';
import UnixPermissions from '../components/unix-permissions';
import UrlParser from '../components/url-parser';
import WordCounter from '../components/word-counter';

export type Tool = {
  /** Anchor id; also the nav href fragment. */
  id: string;
  label: string;
  Component: ComponentType;
};

export type ToolCategory = {
  id: string;
  label: string;
  tools: Tool[];
};

/**
 * Single source of truth for the tool list: both the side nav and the page
 * body render from this, so labels, order and anchor ids can't drift apart.
 */
export const toolCategories: ToolCategory[] = [
  {
    id: 'color-design',
    label: 'Color & Design',
    tools: [
      { id: 'percent-to-hex', label: 'Percent to Hex', Component: PercentToHex },
      { id: 'color-contrast', label: 'Color Contrast Checker', Component: ColorContrast },
      { id: 'px-to-rem', label: 'Px to Rem', Component: PxToRem },
    ],
  },
  {
    id: 'text-encoding',
    label: 'Text & Encoding',
    tools: [
      { id: 'base64-encoder', label: 'Base64 Encoder/Decoder', Component: Base64Encoder },
      { id: 'url-parser', label: 'URL Parser', Component: UrlParser },
      { id: 'word-counter', label: 'Word Counter', Component: WordCounter },
    ],
  },
  {
    id: 'generators',
    label: 'Generators',
    tools: [
      { id: 'qr-code', label: 'QR Code', Component: QrCode },
      { id: 'password-generator', label: 'Password Generator', Component: PasswordGenerator },
      { id: 'lorem-ipsum-generator', label: 'Lorem Ipsum Generator', Component: LoremIpsum },
      { id: 'generate-list', label: 'Generate List', Component: GenerateList },
      { id: 'shareable-list', label: 'Shareable List', Component: ShareableList },
    ],
  },
  {
    id: 'developer-tools',
    label: 'Developer Tools',
    tools: [
      { id: 'timestamp-converter', label: 'Timestamp Converter', Component: TimestampConverter },
      { id: 'unix-permissions', label: 'Unix Permissions', Component: UnixPermissions },
      { id: 'iframe-tester', label: 'Iframe Tester', Component: IframeTester },
      { id: 'subnet-calculator', label: 'Subnet Calculator', Component: SubnetCalculator },
    ],
  },
  {
    id: 'kitchen-coffee',
    label: 'Kitchen & Coffee',
    tools: [
      { id: 'ml-to-cups', label: 'Ml to Cups', Component: MlToCups },
      { id: 'pour-over', label: 'Pour Over', Component: PourOver },
    ],
  },
];
