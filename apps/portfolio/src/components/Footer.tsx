import type React from "react";
import type { SharedBasicInfo } from "../types";

type FooterProps = {
  sharedBasicInfo?: SharedBasicInfo;
}

const Footer: React.FC<FooterProps> = ({ sharedBasicInfo }) => {
  const name = sharedBasicInfo?.name || "Ben Kallaus";

  return (
    <footer className="bg-ink text-pearl py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-lg font-semibold">{name}</p>
        <p className="text-sm text-[#c9bde6]">&copy; {new Date().getFullYear()} All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
