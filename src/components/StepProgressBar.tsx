import React from "react";
import { 
  User, 
  Activity, 
  CheckCircle2, 
  Stethoscope, 
  Sparkles, 
  AlertTriangle,
  Clock,
  Check,
  ShieldCheck,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { PatientInfo } from "../types";

export interface StepItem {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ElementType;
}

export const WIZARD_STEPS: StepItem[] = [
  {
    id: 1,
    title: "Thông tin ca phân tích",
    shortTitle: "Thông tin ca",
    description: "Hành chính & Khuyến nghị",
    icon: User,
  },
  {
    id: 2,
    title: "Kết quả xét nghiệm",
    shortTitle: "Xét nghiệm",
    description: "OCR ảnh & Bảng chỉ số",
    icon: Activity,
  },
  {
    id: 3,
    title: "Xác minh dữ liệu",
    shortTitle: "Xác minh",
    description: "Rà soát & Đối chiếu chuẩn",
    icon: CheckCircle2,
  },
  {
    id: 4,
    title: "Bối cảnh lâm sàng",
    shortTitle: "Lâm sàng",
    description: "Triệu chứng & Chẩn đoán",
    icon: Stethoscope,
  },
  {
    id: 5,
    title: "Phân tích báo cáo",
    shortTitle: "Báo cáo AI",
    description: "Biện luận & Đề xuất",
    icon: Sparkles,
  },
];

export interface StepStatusSummary {
  status: "not_started" | "in_progress" | "completed" | "needs_check" | "missing_data" | "blocked";
  label: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ElementType;
  nextHint: string;
}

interface StepProgressBarProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  patient: PatientInfo;
  vals: Record<string, string>;
  abnormalCount: number;
  hasReport: boolean;
  isDataVerified?: boolean;
}

export const StepProgressBar: React.FC<StepProgressBarProps> = ({
  currentStep,
  onSelectStep,
  patient,
  vals,
  abnormalCount,
  hasReport,
  isDataVerified = false,
}) => {
  const metricCount = Object.values(vals).filter((v) => v !== undefined && v !== "").length;
  
  // Missing recommended baselines check for step 1
  const missingBaselines: string[] = [];
  if (!patient.tuoi || patient.tuoi.trim() === "") missingBaselines.push("tuổi");
  if (!patient.gt) missingBaselines.push("giới tính");
  if (!patient.thoiDiemLayMau || patient.thoiDiemLayMau === "chua_ro") missingBaselines.push("thời điểm lấy mẫu");

  // Determine status and next action summary for each step
  const getStepStatus = (stepId: number): StepStatusSummary => {
    // Step 1: Thông tin ca phân tích
    if (stepId === 1) {
      if (currentStep === 1) {
        if (patient.ten || patient.tuoi || patient.gt) {
          if (missingBaselines.length > 0) {
            return {
              status: "missing_data",
              label: "Thiếu dữ liệu khuyến nghị",
              badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800",
              badgeText: "Thiếu dữ liệu khuyến nghị",
              icon: AlertCircle,
              nextHint: `Khuyến nghị bổ sung ${missingBaselines.join(", ")} để tăng độ chuẩn xác.`,
            };
          }
          return {
            status: "completed",
            label: "Đã hoàn tất",
            badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
            badgeText: "Đã hoàn tất",
            icon: Check,
            nextHint: "Hồ sơ đã sẵn sàng. Có thể bấm Tiếp tục sang Bước 2.",
          };
        }
        return {
          status: "in_progress",
          label: "Đang nhập hồ sơ",
          badgeBg: "bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300 border-violet-200 dark:border-violet-800",
          badgeText: "Đang thực hiện",
          icon: Clock,
          nextHint: "Điền thông tin hoặc chọn bệnh án mẫu. Không bắt buộc định danh.",
        };
      }
      // Finished step 1
      if (missingBaselines.length > 0) {
        return {
          status: "missing_data",
          label: "Thiếu dữ liệu khuyến nghị",
          badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          badgeText: "Dùng chuẩn chung",
          icon: AlertCircle,
          nextHint: "Đang dùng dải tham chiếu người lớn mặc định.",
        };
      }
      return {
        status: "completed",
        label: "Đã hoàn tất",
        badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        badgeText: "Đã hoàn tất",
        icon: Check,
        nextHint: "Thông tin hành chính & sinh lý đã được lưu.",
      };
    }

    // Step 2: Kết quả xét nghiệm
    if (stepId === 2) {
      if (metricCount === 0) {
        if (currentStep === 2) {
          return {
            status: "in_progress",
            label: "Chưa nhập chỉ số",
            badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800",
            badgeText: "Đang thực hiện",
            icon: Clock,
            nextHint: "Chọn Quét ảnh/PDF hoặc Nhập thủ công để điền chỉ số.",
          };
        }
        return {
          status: "not_started",
          label: "Chưa có chỉ số",
          badgeBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
          badgeText: "Chưa bắt đầu",
          icon: HelpCircle,
          nextHint: "Cần nhập ít nhất 1 chỉ số để phân tích.",
        };
      }
      return {
        status: "completed",
        label: `${metricCount} chỉ số đã nhập`,
        badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        badgeText: `${metricCount} chỉ số`,
        icon: Check,
        nextHint: currentStep === 2 ? "Có thể bổ sung thêm hoặc chuyển sang Bước 3 để rà soát." : `Đã lưu ${metricCount} chỉ số xét nghiệm.`,
      };
    }

    // Step 3: Xác minh dữ liệu
    if (stepId === 3) {
      if (metricCount === 0) {
        return {
          status: "blocked",
          label: "Chưa có dữ liệu",
          badgeBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
          badgeText: "Chưa bắt đầu",
          icon: HelpCircle,
          nextHint: "Quay lại Bước 2 nhập dữ liệu trước khi xác minh.",
        };
      }
      if (isDataVerified) {
        return {
          status: "completed",
          label: "Đã xác nhận dữ liệu",
          badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          badgeText: "Đã xác nhận",
          icon: ShieldCheck,
          nextHint: "Dữ liệu đã qua kiểm tra của nhân viên y tế.",
        };
      }
      if (abnormalCount > 0) {
        return {
          status: "needs_check",
          label: `Còn ${abnormalCount} chỉ số cần xem lại`,
          badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800",
          badgeText: `${abnormalCount} ngoài chuẩn`,
          icon: AlertTriangle,
          nextHint: "Kiểm tra chỉ số ngoài chuẩn và tick xác nhận an toàn.",
        };
      }
      return {
        status: "in_progress",
        label: "Chờ xác nhận an toàn",
        badgeBg: "bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300 border-violet-200 dark:border-violet-800",
        badgeText: "Chờ xác nhận",
        icon: Clock,
        nextHint: "Đọc lại các chỉ số và đánh dấu xác nhận để tiếp tục.",
      };
    }

    // Step 4: Bối cảnh lâm sàng
    if (stepId === 4) {
      const hasClinical = Boolean(patient.trieuChung?.trim() || patient.chanDoan?.trim());
      if (currentStep === 4) {
        if (!hasClinical) {
          return {
            status: "in_progress",
            label: "Chưa nhập triệu chứng",
            badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800",
            badgeText: "Chưa nhập triệu chứng",
            icon: AlertCircle,
            nextHint: "Nhập triệu chứng để AI biện luận sát với ca bệnh nhất.",
          };
        }
        return {
          status: "completed",
          label: "Đã có triệu chứng lâm sàng",
          badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          badgeText: "Đã có triệu chứng",
          icon: Check,
          nextHint: "Sẵn sàng chuyển sang Bước 5 để tạo báo cáo.",
        };
      }
      if (hasClinical) {
        return {
          status: "completed",
          label: "Đã có lâm sàng",
          badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          badgeText: "Đã hoàn tất",
          icon: Check,
          nextHint: "Triệu chứng và chẩn đoán sơ bộ đã ghi nhận.",
        };
      }
      return {
        status: "not_started",
        label: "Chưa bắt đầu",
        badgeBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
        badgeText: "Chưa bắt đầu",
        icon: HelpCircle,
        nextHint: "Bổ sung triệu chứng & diễn biến bệnh.",
      };
    }

    // Step 5: Phân tích báo cáo
    if (stepId === 5) {
      if (hasReport) {
        return {
          status: "completed",
          label: "Đã có báo cáo AI",
          badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          badgeText: "Đã tạo báo cáo",
          icon: Sparkles,
          nextHint: "Báo cáo tư vấn đã sẵn sàng để in hoặc xuất văn bản.",
        };
      }
      if (metricCount > 0 && isDataVerified) {
        return {
          status: "in_progress",
          label: "Sẵn sàng phân tích",
          badgeBg: "bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300 border-violet-200 dark:border-violet-800",
          badgeText: "Sẵn sàng",
          icon: Sparkles,
          nextHint: "Bấm 'Tạo báo cáo AI' để AI phân tích toàn diện.",
        };
      }
      return {
        status: "blocked",
        label: "Chưa sẵn sàng",
        badgeBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
        badgeText: "Chưa sẵn sàng",
        icon: HelpCircle,
        nextHint: "Cần hoàn tất nhập & xác minh dữ liệu trước.",
      };
    }

    return {
      status: "not_started",
      label: "Chưa bắt đầu",
      badgeBg: "bg-slate-100 text-slate-600",
      badgeText: "Chưa bắt đầu",
      icon: HelpCircle,
      nextHint: "",
    };
  };

  const currentStepSummary = getStepStatus(currentStep);

  return (
    <div className="w-full max-w-full overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg space-y-3 sm:space-y-4" id="wizard_stepper">
      {/* Top row: Active Step Overview + Quick Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-violet-600 text-white font-extrabold text-xs shadow-md shadow-violet-500/20 shrink-0">
            {currentStep}/5
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-title">
                {WIZARD_STEPS[currentStep - 1].title}
              </h2>
              {/* Active Step status badge with text & icon */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentStepSummary.badgeBg}`}>
                <currentStepSummary.icon className="h-3 w-3 shrink-0" />
                <span>{currentStepSummary.badgeText}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {currentStepSummary.nextHint}
            </p>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            Đã nhập: <strong className="text-violet-600 dark:text-violet-400">{metricCount}</strong>
          </span>
          {abnormalCount > 0 ? (
            <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Ngoài chuẩn: <strong>{abnormalCount}</strong>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              Chuẩn sinh lý
            </span>
          )}
        </div>
      </div>

      {/* Progress Track Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-rose-500 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${Math.round((currentStep / WIZARD_STEPS.length) * 100)}%` }}
        />
      </div>

      {/* 5-Step interactive cards grid: perfectly sized on mobile and desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 pt-1 w-full">
        {WIZARD_STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const statusInfo = getStepStatus(step.id);
          const StatusIcon = statusInfo.icon;

          return (
            <button
              key={step.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectStep(step.id);
              }}
              id={`step_tab_${step.id}`}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 relative group select-none min-w-0 w-full overflow-hidden ${
                step.id === 5 ? "col-span-2 sm:col-span-1" : ""
              } ${
                isActive
                  ? "bg-violet-50/90 dark:bg-violet-950/40 border-violet-500 dark:border-violet-500 shadow-md ring-2 ring-violet-500/25"
                  : statusInfo.status === "completed"
                  ? "bg-slate-50/80 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 opacity-85 hover:opacity-100 hover:border-slate-300"
              }`}
            >
              {/* Header: Step number / Status Icon & Main Icon */}
              <div className="flex items-center justify-between w-full pointer-events-none">
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center text-xs font-black transition-colors shrink-0 ${
                  isActive
                    ? "bg-violet-600 text-white shadow-sm"
                    : statusInfo.status === "completed"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : statusInfo.status === "needs_check" || statusInfo.status === "missing_data"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}>
                  {statusInfo.status === "completed" && !isActive ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors shrink-0 ${
                  isActive
                    ? "text-violet-600 dark:text-violet-400"
                    : statusInfo.status === "completed"
                    ? "text-emerald-500"
                    : "text-slate-400 dark:text-slate-500"
                }`} />
              </div>

              {/* Title & Short Text */}
              <div className="pointer-events-none min-w-0 w-full">
                <p className={`text-xs font-bold leading-snug transition-colors truncate ${
                  isActive
                    ? "text-violet-900 dark:text-violet-200"
                    : "text-slate-800 dark:text-slate-200"
                }`}>
                  {step.title}
                </p>
                
                {/* Step status label with Icon & Text */}
                <div className="mt-1 flex items-center gap-1 truncate">
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold border truncate max-w-full ${statusInfo.badgeBg}`}>
                    <StatusIcon className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{statusInfo.label}</span>
                  </span>
                </div>
              </div>

              {/* Current active step accent dot */}
              {isActive && (
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
