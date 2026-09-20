import React, { useState, useMemo } from "react";
import { GROUPS } from "../data/groupsData";
import { MetricItem } from "../types";
import { 
  RotateCcw, 
  HelpCircle, 
  Activity, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  Info
} from "lucide-react";
import {
  calculateWbcMetricsForInput,
  evaluateMetricStatus,
  isQualitativeNegative,
  isQualitativeTrace,
  isQualitativePositive,
} from "../utils/wbcCalculator";
import { getDetailedHctConversion, evaluateClinicalAlert } from "../utils/clinicalAlerts";

export type MetricFilterOption = "all" | "unentered" | "entered" | "abnormal" | "needs_check";

interface MetricsPanelProps {
  vals: Record<string, string>;
  setVals: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onClearAll: () => void;
  filterType?: MetricFilterOption;
  setFilterType?: (filter: MetricFilterOption) => void;
  onlyUnentered?: boolean;
  setOnlyUnentered?: (val: boolean) => void;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ 
  vals, 
  setVals, 
  onClearAll,
  filterType: externalFilterType,
  setFilterType: externalSetFilterType,
  onlyUnentered: externalOnlyUnentered,
  setOnlyUnentered: externalSetOnlyUnentered,
}) => {
  // Internal filter states if not passed from parent
  const [internalFilterType, setInternalFilterType] = useState<MetricFilterOption>("all");
  const [internalOnlyUnentered, setInternalOnlyUnentered] = useState<boolean>(false);

  const filterType = externalFilterType ?? internalFilterType;
  const setFilterType = externalSetFilterType ?? setInternalFilterType;
  const onlyUnentered = externalOnlyUnentered ?? internalOnlyUnentered;
  const setOnlyUnentered = externalSetOnlyUnentered ?? setInternalOnlyUnentered;

  const [activeTab, setActiveTab] = useState<string>("hematology");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchAllGroups, setSearchAllGroups] = useState<boolean>(true);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [activeInterpretation, setActiveInterpretation] = useState<MetricItem | null>(null);
  
  // State for collapsible test groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSelectedMetric(null);
  };

  const handleInputChange = (id: string, value: string) => {
    setVals((prev) => calculateWbcMetricsForInput(id, value, prev));
  };

  const activeGroup = GROUPS.find((g) => g.id === activeTab) || GROUPS[0];

  // Helper to determine if a metric matches current filter criteria
  const isMetricMatchingFilter = (metric: MetricItem, val: string | undefined): boolean => {
    const hasValue = val !== undefined && val.trim() !== "";

    if (onlyUnentered) {
      return !hasValue;
    }

    if (filterType === "unentered") {
      return !hasValue;
    }
    if (filterType === "entered") {
      return hasValue;
    }

    if (filterType === "abnormal" || filterType === "needs_check") {
      if (!hasValue) return false;
      const status = evaluateMetricStatus(metric.min, metric.max, val, metric.id);
      return status === "high" || status === "low" || status === "positive" || status === "trace";
    }

    return true;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col h-full select-none" id="metrics_panel">
      
      {/* 1. Header Row */}
      <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl shrink-0">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-title truncate">
              Bảng Nhập Chỉ Số Xét Nghiệm
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              Chạm vào từng ô để điền giá trị. Tự động đồng bộ công thức WBC, tiểu cầu & HCT.
            </p>
          </div>
        </div>

        {/* Action Button: Xóa hết */}
        <button
          onClick={onClearAll}
          id="btn_clear_all_metrics"
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl border border-red-200 dark:border-red-950/60 bg-red-50/40 hover:bg-red-50 dark:bg-red-950/10 text-red-500 hover:text-red-600 transition-all font-bold text-xs shrink-0 cursor-pointer self-end sm:self-auto min-h-[36px]"
          title="Xóa toàn bộ chỉ số đã nhập"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Xóa hết</span>
        </button>
      </div>

      {/* 2. Filter Bar & Prominent "Chỉ hiển thị chỉ số chưa nhập" Button */}
      <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Filter categories pills */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-200/60 dark:bg-slate-800 rounded-xl overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => {
              setFilterType("all");
              setOnlyUnentered(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              filterType === "all" && !onlyUnentered
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType("entered");
              setOnlyUnentered(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              filterType === "entered" && !onlyUnentered
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Đã nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType("unentered");
              setOnlyUnentered(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              filterType === "unentered" && !onlyUnentered
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Chưa nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType("abnormal");
              setOnlyUnentered(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              filterType === "abnormal" && !onlyUnentered
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-600 dark:text-amber-400 hover:text-amber-700"
            }`}
          >
            Bất thường
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterType("needs_check");
              setOnlyUnentered(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              filterType === "needs_check" && !onlyUnentered
                ? "bg-orange-500 text-white shadow-xs"
                : "text-orange-600 dark:text-orange-400 hover:text-orange-700"
            }`}
          >
            Cần xác minh
          </button>
        </div>

        {/* Prominent Button: Chỉ hiển thị chỉ số chưa nhập */}
        <button
          type="button"
          onClick={() => {
            setOnlyUnentered(!onlyUnentered);
            if (!onlyUnentered) setFilterType("unentered");
          }}
          id="btn_filter_only_unentered"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shadow-xs min-h-[36px] ${
            onlyUnentered
              ? "bg-violet-600 text-white border-violet-600 ring-2 ring-violet-500/20"
              : "bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700 hover:bg-violet-50"
          }`}
        >
          <Filter className="h-3.5 w-3.5 shrink-0" />
          <span>Chỉ hiển thị chỉ số chưa nhập</span>
          {onlyUnentered && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
          )}
        </button>
      </div>

      {/* 3. Group Dropdown & Search Bar */}
      <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        {/* Group Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300 font-extrabold text-xs transition-all border border-violet-500/20 active:scale-95 cursor-pointer max-w-full sm:max-w-[280px] truncate"
          >
            <Layers className="h-4 w-4 shrink-0 text-violet-500" />
            <span className="truncate">{activeGroup.name}</span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden w-[280px] p-2 space-y-1">
              {GROUPS.map((group) => {
                const filled = group.metrics.filter((m) => vals[m.id] !== undefined && vals[m.id].trim() !== "").length;
                const isCurrent = activeTab === group.id;

                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      handleTabChange(group.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isCurrent
                        ? "bg-violet-600 text-white shadow-sm"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="truncate">{group.name.split("(")[0]}</span>
                    {filled > 0 && (
                      <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full ${
                        isCurrent ? "bg-white/20 text-white" : "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300"
                      }`}>
                        {filled}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã chỉ số..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-7 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 font-semibold"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Main Metric Items List (Responsive: Single-Column Cards on < 768px, Grid on >= 768px) */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 force-scroll">
        {(() => {
          const q = searchQuery.toLowerCase().trim();

          // Get metrics list based on search or active tab
          const metricsToDisplay = (() => {
            if (q) {
              const matches: Array<MetricItem & { groupName: string }> = [];
              GROUPS.forEach((group) => {
                group.metrics.forEach((metric) => {
                  if (
                    metric.id.toLowerCase().includes(q) ||
                    metric.name.toLowerCase().includes(q) ||
                    (metric.desc && metric.desc.toLowerCase().includes(q))
                  ) {
                    matches.push({ ...metric, groupName: group.name });
                  }
                });
              });
              return matches;
            } else {
              return activeGroup.metrics.map((m) => ({ ...m, groupName: activeGroup.name }));
            }
          })();

          // Filter according to current active filter
          const filteredMetrics = metricsToDisplay.filter((metric) =>
            isMetricMatchingFilter(metric, vals[metric.id])
          );

          if (filteredMetrics.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 text-slate-400 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800">
                  <Activity className="h-6 w-6 text-violet-500 animate-pulse" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Không có chỉ số nào khớp với bộ lọc
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  {onlyUnentered 
                    ? "Tất cả các chỉ số trong danh mục này đã được nhập đầy đủ!"
                    : "Vui lòng thử đổi bộ lọc hoặc từ khóa tìm kiếm."}
                </p>
                {onlyUnentered && (
                  <button
                    type="button"
                    onClick={() => setOnlyUnentered(false)}
                    className="mt-3 px-3 py-1.5 bg-violet-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-violet-700 cursor-pointer"
                  >
                    Xem lại toàn bộ danh mục
                  </button>
                )}
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {filteredMetrics.map((metric) => {
                const val = vals[metric.id] || "";
                const alertInfo = evaluateClinicalAlert(metric, val);
                const isSelected = focusedId === metric.id;
                const hasValue = val.trim() !== "";

                // Detailed HCT info
                const isHct = metric.id === "HCT";
                const hctDetails = isHct ? getDetailedHctConversion(val) : null;

                return (
                  <div
                    key={metric.id}
                    onClick={() => setSelectedMetric(metric)}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 shadow-sm ${
                      isSelected
                        ? "border-violet-500 ring-2 ring-violet-500/20 bg-violet-50/20 dark:bg-violet-950/20"
                        : hasValue
                        ? alertInfo?.severity === "urgent"
                          ? "border-red-300 dark:border-red-900 bg-red-50/20 dark:bg-red-950/20"
                          : alertInfo?.severity === "notable"
                          ? "border-orange-200 dark:border-orange-900 bg-orange-50/20 dark:bg-orange-950/20"
                          : alertInfo?.severity === "clinical_correlation"
                          ? "border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/20"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30"
                        : "border-slate-150 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-slate-300"
                    }`}
                  >
                    {/* SECTION 1: TÊN CHỈ SỐ Ở PHÍA TRÊN */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white font-title">
                            {metric.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                            {metric.id}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {metric.desc}
                        </p>
                      </div>

                      <div className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {metric.unit}
                      </div>
                    </div>

                    {/* SECTION 2: Ô NHẬP GIÁ TRỊ Ở GIỮA */}
                    <div className="space-y-1">
                      <div className="relative flex items-center">
                        <input
                          id={`input-${metric.id}`}
                          type="text"
                          value={val}
                          onFocus={() => {
                            setFocusedId(metric.id);
                            setSelectedMetric(metric);
                          }}
                          onBlur={() => setFocusedId(null)}
                          onChange={(e) => handleInputChange(metric.id, e.target.value)}
                          placeholder={`Nhập kết quả (${metric.refRangeText || `${metric.min} – ${metric.max}`})`}
                          className={`w-full text-sm font-bold px-3.5 py-2.5 sm:py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-slate-950 min-h-[44px] touch-manipulation input-interactive ${
                            hasValue && alertInfo
                              ? alertInfo.severity === "urgent"
                                ? "border-red-400 text-red-700 dark:text-red-300"
                                : alertInfo.severity === "notable"
                                ? "border-orange-400 text-orange-700 dark:text-orange-300"
                                : alertInfo.severity === "clinical_correlation"
                                ? "border-amber-400 text-amber-700 dark:text-amber-300"
                                : "border-emerald-400 text-emerald-700 dark:text-emerald-300"
                              : "border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          }`}
                        />

                        {/* Quick clear value inside input */}
                        {hasValue && (
                          <button
                            type="button"
                            onClick={() => handleInputChange(metric.id, "")}
                            className="absolute right-2.5 text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                            title="Xóa giá trị này"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Specialized HCT Multi-Unit Breakdown Display */}
                      {isHct && hctDetails && hasValue && (
                        <div className="p-2.5 bg-violet-50/80 dark:bg-violet-950/40 rounded-xl border border-violet-200/80 dark:border-violet-900/60 text-[10.5px] space-y-1 mt-1.5">
                          <div className="flex items-center justify-between text-violet-900 dark:text-violet-200 font-bold">
                            <span>Chuẩn hóa đơn vị HCT:</span>
                            <span className="px-1.5 py-0.5 rounded bg-violet-200/60 dark:bg-violet-900/80 text-[9.5px]">
                              {hctDetails.status === "normalized" ? "Đồng nhất đơn vị %" : "Cần xác minh"}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                            <div>• Nhập vào: <strong className="text-slate-900 dark:text-white">{hctDetails.originalValue}</strong></div>
                            <div>• Hiển thị chuẩn: <strong className="text-violet-700 dark:text-violet-300">{hctDetails.normalizedValue}</strong></div>
                          </div>
                          <div className="text-[9.5px] text-slate-500 dark:text-slate-400">
                            Khoảng chuẩn: <span className="font-semibold text-slate-700 dark:text-slate-200">{hctDetails.referenceRange}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: ĐƠN VỊ VÀ KHOẢNG THAM CHIẾU Ở PHÍA DƯỚI */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Khoảng tham chiếu:
                      </span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-right">
                        {metric.refRangeText ? metric.refRangeText : `${metric.min} – ${metric.max} ${metric.unit}`}
                      </span>
                    </div>

                    {/* SECTION 4: TRẠNG THÁI NẰM RÕ RÀNG Ở CUỐI THẺ (Icon + Chữ + Màu có ý nghĩa) */}
                    <div className="pt-0.5">
                      {hasValue && alertInfo ? (
                        <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold ${alertInfo.badgeBg}`}>
                          <div className="flex items-center gap-1.5 truncate">
                            {alertInfo.severity === "urgent" ? (
                              <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                            ) : alertInfo.severity === "notable" ? (
                              <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                            ) : alertInfo.severity === "clinical_correlation" ? (
                              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            )}
                            <span className="truncate">{alertInfo.badgeText}</span>
                          </div>
                          <span className="text-[10px] font-semibold shrink-0 uppercase tracking-wider opacity-85">
                            {alertInfo.severityLabel}
                          </span>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                            Chưa nhập kết quả
                          </span>
                          <span className="text-[10px]">Chờ nhập</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
