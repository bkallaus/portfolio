import React from "react";
import { SharedBasicInfo } from "../types";

type FooterProps = {
  sharedBasicInfo?: SharedBasicInfo;
}

const Footer: React.FC<FooterProps> = ({ sharedBasicInfo }) => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4 text-center">
        <div className="mb-4">
          <h3 className="text-xl font-bold">Ben Kallaus</h3>
        </div>
        <div className="text-sm text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
