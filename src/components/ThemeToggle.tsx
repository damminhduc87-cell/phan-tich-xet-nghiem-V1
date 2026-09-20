/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sun, Moon } from "lucide-react";
import { motion } from "motion/react";

interface ThemeToggleProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ darkMode, setDarkMode }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setDarkMode(!darkMode)}
      className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-amber-500 dark:text-indigo-400"
      title="Đổi giao diện Sáng/Tối"
      id="theme-toggle-btn"
    >
      <motion.div
        initial={false}
        animate={{ rotate: darkMode ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </motion.div>
    </motion.button>
  );
};
