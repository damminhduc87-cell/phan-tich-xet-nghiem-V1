import React from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { WIZARD_STEPS } from "./StepProgressBar";

interface StepNavigationButtonsProps {
  currentStep: number;
  totalSteps?: number;
  onPrev: () => void;
  onNext: () => void;
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
  onClearAll?: () => void;
  isDataVerified?: boolean;
  canAdvance?: boolean;
  blockedMessage?: string;
}

export const StepNavigationButtons: React.FC<StepNavigationButtonsProps> = ({
  currentStep,
  totalSteps = 5,
  onPrev,
  onNext,
  isAnalyzing = false,
  onAnalyze,
  onClearAll,
  isDataVerified = false,
  canAdvance = true,
  blockedMessage,
}) => {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  const prevStepInfo = currentStep > 1 ? WIZARD_STEPS[currentStep - 2] : null;
  const nextStepInfo = currentStep < totalSteps ? WIZARD_STEPS[currentStep] : null;

  return (
    <div 
      className="w-full max-w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 sticky bottom-1 sm:bottom-4 z-30 pointer-events-auto select-none" 
      id="step_navigation_bar"
    >
      {/* MOBILE COMPACT TOP ROW: Step indicator + Discreet reset button */}
      <div className="flex sm:hidden items-center justify-between w-full px-1">
        {/* Step dots & indicator */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const stepNum = idx + 1;
            const isCurrent = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;

            return (
              <div
                key={stepNum}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? "w-6 bg-violet-600 dark:bg-violet-400"
                    : isCompleted
                    ? "w-2.5 bg-emerald-500"
                    : "w-2 bg-slate-200 dark:bg-slate-700"
                }`}
              />
            );
          })}
          <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 ml-1.5">
            Bước {currentStep}/{totalSteps}: {WIZARD_STEPS[currentStep - 1].shortTitle}
          </span>
        </div>

        {/* Safe secondary position for Reset button - away from Next button */}
        {onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[10px] text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-red-50/60 dark:hover:bg-red-950/30"
            title="Làm mới ca khám"
          >
            <RotateCcw className="h-3 w-3 pointer-events-none" />
            <span>Làm mới</span>
          </button>
        )}
      </div>

      {/* DESKTOP LEFT SECTION */}
      <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        {!isFirstStep ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            id="btn_prev_step"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 select-none min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-violet-500 pointer-events-none" />
            <span className="pointer-events-none">Quay lại{prevStepInfo ? `: ${prevStepInfo.shortTitle}` : ""}</span>
          </button>
        ) : (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Bước 1: Thông tin ca phân tích</span>
          </div>
        )}

        {/* Secondary discrete clear button on desktop */}
        {onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="px-3 py-2 text-[11px] text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer rounded-xl hover:bg-red-50/50 dark:hover:bg-red-950/20"
            title="Xóa dữ liệu để lập ca mới"
          >
            <RotateCcw className="h-3 w-3 pointer-events-none" />
            <span className="hidden md:inline pointer-events-none">Làm mới ca khám</span>
          </button>
        )}
      </div>

      {/* DESKTOP CENTER STEP INDICATORS */}
      <div className="hidden sm:flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const stepNum = idx + 1;
          const isCurrent = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div
              key={stepNum}
              className={`h-2 rounded-full transition-all duration-300 ${
                isCurrent
                  ? "w-8 bg-violet-600 dark:bg-violet-400"
                  : isCompleted
                  ? "w-2.5 bg-emerald-500"
                  : "w-2.5 bg-slate-200 dark:bg-slate-700"
              }`}
            />
          );
        })}
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1.5">
          Bước {currentStep}/{totalSteps}
        </span>
      </div>

      {/* ACTION BUTTONS: On Mobile, Back is small left, Continue/Analyze is prominent wide right */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end relative z-10">
        {/* Mobile Prev Button */}
        {!isFirstStep && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            id="btn_prev_step_mobile"
            className="flex sm:hidden items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 min-h-[48px] touch-manipulation"
            title="Quay lại bước trước"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-violet-500 pointer-events-none" />
            <span className="pointer-events-none">Quay lại</span>
          </button>
        )}

        {/* Step 5 AI Analysis Action Button */}
        {isLastStep ? (
          onAnalyze && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze();
              }}
              disabled={isAnalyzing}
              id="btn_analyze_action"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-rose-600 hover:from-violet-700 hover:to-rose-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-violet-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 select-none min-h-[48px] touch-manipulation"
            >
              <Sparkles className={`h-4 w-4 shrink-0 pointer-events-none ${isAnalyzing ? "animate-spin" : ""}`} />
              <span className="pointer-events-none truncate">
                {isAnalyzing ? "Đang phân tích chuyên sâu..." : "Tạo Báo Cáo Phân Tích AI"}
              </span>
            </button>
          )
        ) : (
          /* Steps 1-4 Next Button: prominent, wide on mobile */
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            id="btn_next_step"
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 sm:px-7 py-3 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-violet-500/20 transition-all cursor-pointer active:scale-98 select-none min-h-[48px] touch-manipulation ${
              canAdvance 
                ? "bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500" 
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            <span className="pointer-events-none truncate">
              {currentStep === 1 ? "Tiếp tục: Kết quả xét nghiệm" :
               currentStep === 2 ? "Tiếp tục: Xác minh dữ liệu" :
               currentStep === 3 ? "Tiếp tục: Bối cảnh lâm sàng" :
               "Tiếp tục: Phân tích báo cáo"}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 pointer-events-none" />
          </button>
        )}
      </div>
    </div>
  );
};
