import type React from "react";
import type { SharedBasicInfo } from "../types";

type FooterProps = {
  sharedBasicInfo?: SharedBasicInfo;
}

const Footer: React.FC<FooterProps> = ({ sharedBasicInfo }) => {
  const name = sharedBasicInfo?.name || "Ben Kallaus";

  return (
    <footer className="relative bg-ink text-pearl py-10">
      <div className="absolute inset-x-0 top-0 h-1 bg-trace" />
      <div className="container mx-auto px-4 text-center">
        <div className="mb-4">
          <h3 className="text-xl font-bold">{name}</h3>
        </div>
        <div className="text-sm text-[#c9bde6]">
          <p>
            &copy; {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
