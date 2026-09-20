/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { User, Calendar, Users, FileSpreadsheet, Bed, Building } from "lucide-react";
import { PatientInfo } from "../types";
import { PRESETS } from "../data/presetsData";
import { motion } from "motion/react";

interface PatientInfoFormProps {
  patient: PatientInfo;
  setPatient: React.Dispatch<React.SetStateAction<PatientInfo>>;
  activePreset: string;
  onApplyPreset: (presetName: string) => void;
}

export const PatientInfoForm: React.FC<PatientInfoFormProps> = ({
  patient,
  setPatient,
  activePreset,
  onApplyPreset,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-md flex flex-col gap-4"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400 font-title flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-500" />
          <span>Thông tin bệnh nhân</span>
        </h3>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          <select
            value={activePreset}
            onChange={(e) => onApplyPreset(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-lg py-1 px-2.5 font-medium text-slate-700 dark:text-slate-200 cursor-pointer outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all max-w-[200px]"
            id="preset-select"
          >
            <option value="">-- Chọn bệnh án mẫu --</option>
            {PRESETS.map((p, idx) => (
              <option key={idx} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Name input */}
        <div className="md:col-span-4 flex flex-col gap-1.5" id="patient-name-container">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <User className="h-3 w-3" />
            Họ và tên bệnh nhân
          </label>
          <input
            type="text"
            placeholder="Nguyễn Văn A..."
            value={patient.ten}
            onChange={(e) => setPatient(prev => ({ ...prev, ten: e.target.value }))}
            className="w-full text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3.5 py-2.5 focus:border-violet-400 dark:focus:border-violet-500 outline-none transition-all focus:ring-4 focus:ring-violet-500/5 dark:focus:ring-violet-500/10"
            id="patient-name-input"
          />
        </div>

        {/* Age input */}
        <div className="md:col-span-2 flex flex-col gap-1.5" id="patient-age-container">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Tuổi
          </label>
          <input
            type="number"
            placeholder="Tuổi"
            value={patient.tuoi}
            onChange={(e) => setPatient(prev => ({ ...prev, tuoi: e.target.value }))}
            className="w-full text-sm font-semibold text-center text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2.5 focus:border-violet-400 dark:focus:border-violet-500 outline-none transition-all focus:ring-4 focus:ring-violet-500/5 dark:focus:ring-violet-500/10"
            id="patient-age-input"
          />
        </div>

        {/* Gender input */}
        <div className="md:col-span-2 flex flex-col gap-1.5" id="patient-gender-container">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            Giới tính
          </label>
          <select
            value={patient.gt}
            onChange={(e) => setPatient(prev => ({ ...prev, gt: e.target.value as "nam" | "nu" }))}
            className="w-full text-sm font-semibold text-center text-slate-800 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2.5 focus:border-violet-400 dark:focus:border-violet-500 outline-none transition-all cursor-pointer focus:ring-4 focus:ring-violet-500/5 dark:focus:ring-violet-500/10"
            id="patient-gender-select"
          >
            <option value="nam">Nam</option>
            <option value="nu">Nữ</option>
          </select>
        </div>

        {/* Department/Room input */}
        <div className="md:col-span-2 flex flex-col gap-1.5" id="patient-department-container">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Building className="h-3 w-3" />
            Khoa/Phòng
          </label>
          <input
            type="text"
            placeholder="Khoa nội..."
            value={patient.khoa || ""}
            onChange={(e) => setPatient(prev => ({ ...prev, khoa: e.target.value }))}
            className="w-full text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2.5 focus:border-violet-400 dark:focus:border-violet-500 outline-none transition-all focus:ring-4 focus:ring-violet-500/5 dark:focus:ring-violet-500/10"
            id="patient-department-input"
          />
        </div>

        {/* Bed input */}
        <div className="md:col-span-2 flex flex-col gap-1.5" id="patient-bed-container">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Bed className="h-3 w-3" />
            Giường bệnh
          </label>
          <input
            type="text"
            placeholder="G.05..."
            value={patient.giuong || ""}
            onChange={(e) => setPatient(prev => ({ ...prev, giuong: e.target.value }))}
            className="w-full text-sm font-semibold text-center text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2.5 focus:border-violet-400 dark:focus:border-violet-500 outline-none transition-all focus:ring-4 focus:ring-violet-500/5 dark:focus:ring-violet-500/10"
            id="patient-bed-input"
          />
        </div>
      </div>
    </motion.div>
  );
};
