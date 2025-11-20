import React from "react";

import shortLogo from "../assets/short-logo.png";

const Footer: React.FC = () => {
  return (
    <footer className="bg-dark-lighter border-t border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={shortLogo} alt="MonkeyPost" className="h-8 w-auto" />
            <span className="text-gray-400 text-sm">Powered by MonkeyPost</span>
          </div>
          <div className="text-gray-400 text-sm text-center md:text-right">
            <p>© {new Date().getFullYear()} MonkeyPost. All rights reserved.</p>
            <p className="mt-1">Connecting football communities across Nigeria</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

