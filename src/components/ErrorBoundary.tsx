import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHardReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = window.location.origin + window.location.pathname + "?t=" + Date.now();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 bg-slate-50 text-slate-900 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
              !
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Đã có sự cố hiển thị giao diện
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed">
              Trình duyệt vừa gặp gián đoạn khi nạp dữ liệu. Bạn vui lòng bấm tải lại trang hoặc mở bằng trình duyệt Safari/Chrome.
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-800 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                💡 Mẹo khi mở link từ Zalo:
              </div>
              <p>
                Bấm vào dấu <b>(···)</b> ở góc trên bên phải màn hình Zalo, rồi chọn <b>"Mở bằng trình duyệt"</b> (hoặc Mở bằng Safari/Chrome) để trải nghiệm mượt mà nhất.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md active:scale-95 transition-all text-sm"
              >
                🔄 Tải lại trang ngay
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs transition-all"
              >
                🧹 Xóa bộ nhớ đệm & tải lại mới
              </button>
            </div>

            {this.state.error && (
              <details className="text-left mt-4 text-xs text-slate-400 border-t border-slate-100 pt-3">
                <summary className="cursor-pointer hover:text-slate-600 font-mono">
                  Chi tiết kỹ thuật (dành cho quản trị viên)
                </summary>
                <pre className="mt-2 p-2 bg-slate-100 rounded text-[11px] text-red-600 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {"\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
