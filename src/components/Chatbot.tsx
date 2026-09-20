import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  X, 
  Send, 
  RefreshCw, 
  Sparkles, 
  Stethoscope, 
  Copy, 
  Check,
  Minimize2,
  BadgeCheck
} from "lucide-react";
import { PatientInfo } from "../types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeMarkdown } from "../utils/markdownUtils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  patient: PatientInfo;
  vals: Record<string, string>;
  customApiKey?: string;
}

export const Chatbot: React.FC<ChatbotProps> = ({ 
  isOpen, 
  onClose, 
  onOpen,
  patient, 
  vals, 
  customApiKey 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Position and dragging state for right-click drag-to-move
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const justDraggedRef = useRef(false);

  // Prevent context menu globally if we are currently dragging or just dragged
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isDragging || justDraggedRef.current || target.closest("#chat-box-draggable-wrapper")) {
        e.preventDefault();
      }
    };
    window.addEventListener("contextmenu", handleContextMenu, true);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [isDragging]);

  // Handle right-click pointer down for dragging on empty/contentless areas
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only target right click (button 2)
    if (e.button !== 2) return;

    const target = e.target as HTMLElement;

    // Detect if we clicked inside an interactive or text content element
    const isInteractive = target.closest("button") || 
                        target.closest("input") || 
                        target.closest("textarea") || 
                        target.closest("a") ||
                        target.closest(".chatbot-markdown") ||
                        (target.closest(".overflow-y-auto") && (
                          target.closest(".rounded-2xl") || 
                          target.tagName === "LI" || 
                          target.tagName === "P" || 
                          target.closest(".h-9.w-9") ||
                          target.closest("ol") ||
                          target.closest("ul")
                        ));

    if (isInteractive) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    setIsDragging(true);
    justDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    currentPosRef.current = { ...position };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      justDraggedRef.current = true;
    }

    let nextX = currentPosRef.current.x + deltaX;
    let nextY = currentPosRef.current.y + deltaY;

    const chatWidth = 420;
    const chatHeight = 620;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const maxMoveLeft = -(screenWidth - chatWidth - 24);
    const maxMoveRight = 24;
    const maxMoveUp = -(screenHeight - chatHeight - 96);
    const maxMoveDown = 96;

    nextX = Math.max(maxMoveLeft, Math.min(maxMoveRight, nextX));
    nextY = Math.max(maxMoveUp, Math.min(maxMoveDown, nextY));

    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);

    setTimeout(() => {
      justDraggedRef.current = false;
    }, 100);
  };

  // Quick prompt buttons list tailored to Ministry of Health guidelines
  const QUICK_QUESTIONS = [
    {
      id: "phac_do_byt",
      label: "🏛️ Phác đồ Bộ Y tế",
      text: "Dựa trên các chỉ số xét nghiệm hiện tại, tình trạng của tôi thuộc diện chẩn đoán gì theo Hướng dẫn chẩn đoán và điều trị của Bộ Y tế? Xin trả lời ngắn gọn, nêu rõ tên phác đồ liên quan."
    },
    {
      id: "xu_tri_thuoc",
      label: "💊 Hướng xử trí & Thuốc",
      text: "Theo phác đồ Bộ Y tế, các nhóm thuốc chính và nguyên tắc xử trí điều trị chuẩn đối với tình trạng này là gì? Xin tóm tắt ngắn gọn 3-4 gạch đầu dòng cốt lõi."
    },
    {
      id: "xet_nghiem_them",
      label: "🔬 Xét nghiệm cần làm thêm",
      text: "Theo Hướng dẫn của Bộ Y tế, tôi cần thực hiện thêm các xét nghiệm cận lâm sàng bổ sung nào để xác định chính xác bệnh và đánh giá biến chứng?"
    },
    {
      id: "canh_bao_nguy_hiem",
      label: "⚠️ Cảnh báo nguy hiểm",
      text: "Các dấu hiệu cảnh báo lâm sàng khẩn cấp nào tôi cần đi khám ngay hoặc nhập viện cấp cứu theo tiêu chuẩn phân tầng nguy cơ của Bộ Y tế?"
    },
    {
      id: "an_uong_sinh_hoat",
      label: "🥗 Ăn uống & Sinh hoạt",
      text: "Chế độ dinh dưỡng và kiêng cữ chuẩn y khoa dành cho tình trạng này là gì? Nêu trực tiếp 2-3 thực phẩm nên dùng và 2-3 điều cần kiêng khem nghiêm ngặt."
    },
    {
      id: "tom_tat_benh_an",
      label: "📋 Tóm tắt bệnh án",
      text: "Xin Bác sĩ tóm tắt siêu ngắn gọn tình trạng bệnh án hiện tại của tôi và 3 điều quan trọng nhất tôi cần làm ngay theo chuẩn Bộ Y tế."
    }
  ];

  // Count filled lab tests
  const filledMetricsCount = Object.values(vals).filter(v => v !== "").length;

  // Initialize with greeting message from Ministry of Health AI Doctor
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Xin chào ${patient.ten ? `**bệnh nhân ${patient.ten}**` : "anh/chị"}! Tôi là **Bác sĩ Trợ lý Tư Vấn (Bộ Y tế)**.

Tôi trả lời **ngắn gọn, cô đọng, đi thẳng vào trọng tâm**, dựa trên **Hướng dẫn chẩn đoán và điều trị của Bộ Y tế Việt Nam** kết hợp với kết quả xét nghiệm hiện có của anh/chị.

Anh/chị có thể bấm chọn nhanh câu hỏi bên dưới hoặc tự nhập câu hỏi cần giải đáp nhé!`,
          timestamp: new Date()
        }
      ]);
    }
  }, [patient.ten]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantMsgId = `msg-${Date.now()}-assistant`;
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMsg]);

    try {
      const chatPayload = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(customApiKey ? { "x-gemini-api-key": customApiKey } : {})
        },
        body: JSON.stringify({
          messages: chatPayload,
          patient,
          vals
        })
      });

      if (!res.ok) {
        throw new Error("Lỗi kết nối từ hệ thống máy chủ Bác sĩ AI.");
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("Không thể khởi tạo bộ đọc luồng dữ liệu.");
      }

      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setMessages(prev => prev.map(msg => {
          if (msg.id === assistantMsgId) {
            return {
              ...msg,
              content: accumulatedText
            };
          }
          return msg;
        }));
      }
    } catch (error: any) {
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== assistantMsgId);
        return [
          ...filtered,
          {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content: `🔴 **Lỗi kết nối:** Không thể liên lạc với Bác sĩ AI. Vui lòng kiểm tra kết nối mạng hoặc khóa API trong Cấu hình AI.\n\n*(Chi tiết: ${error.message || error})*`,
            timestamp: new Date()
          }
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-reset-${Date.now()}`,
        role: "assistant",
        content: `Xin chào ${patient.ten ? `**bệnh nhân ${patient.ten}**` : "anh/chị"}! Tôi đã sẵn sàng phiên tư vấn mới theo Hướng dẫn điều trị của Bộ Y tế. Hãy đặt câu hỏi hoặc bấm nút gợi ý bên dưới nhé!`,
        timestamp: new Date()
      }
    ]);
  };

  return (
    <>
      {/* 1. FLOATING CORNER LAUNCHER BUTTON (Zalo Style) - Prominently visible in bottom-right corner when chat is closed */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed bottom-20 right-4 sm:bottom-7 sm:right-7 z-40 pointer-events-auto select-none"
        >
          <button
            type="button"
            id="btn_floating_zalo_chatbot"
            onClick={onOpen || (() => {})}
            className="group relative flex items-center gap-2.5 sm:gap-3 bg-gradient-to-r from-[#0068ff] via-[#005deb] to-[#0050d4] hover:from-[#005ae0] hover:to-[#0042b3] text-white pl-3.5 pr-4 py-2.5 sm:py-3 rounded-full shadow-2xl shadow-blue-500/40 border-2 border-white/40 cursor-pointer transition-all duration-200 active:scale-95 hover:shadow-blue-600/60"
            title="Bác sĩ Trợ lý Tư vấn theo Hướng dẫn Bộ Y tế (Zalo UI)"
          >
            {/* Soft pulsing ring */}
            <span className="absolute -inset-1 rounded-full bg-blue-400/30 animate-ping pointer-events-none" />

            {/* Zalo Blue Doctor / Speech Icon */}
            <div className="relative flex items-center justify-center h-9 w-9 rounded-full bg-white text-[#0068ff] shrink-0 shadow-md font-bold">
              <Stethoscope className="h-5 w-5 text-[#0068ff]" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
              </span>
            </div>

            {/* Label and badges */}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-xs sm:text-[13px] font-black tracking-wide text-white font-title">
                  Trợ lý Bác sĩ BYT
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 bg-white/20 text-[9px] rounded-full font-bold uppercase tracking-wider text-blue-50">
                  Zalo UI
                </span>
              </div>
              <span className="text-[10px] text-blue-100 font-medium leading-tight mt-1 hidden xs:inline sm:inline">
                Tư vấn chuẩn Hướng dẫn Bộ Y tế
              </span>
            </div>
          </button>
        </motion.div>
      )}

      {/* 2. ZALO CHAT DIALOG WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs sm:hidden"
            />

            {/* Responsive Chat Box Dialog: Full bottom-sheet/modal on mobile, floating docked window on desktop */}
            <div
              id="chat-box-draggable-wrapper"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
              className="fixed inset-x-2 bottom-2 top-14 sm:inset-auto sm:bottom-6 sm:right-6 md:bottom-7 md:right-7 z-50 flex flex-col pointer-events-auto"
              style={{
                transform: typeof window !== "undefined" && window.innerWidth >= 640 
                  ? `translate3d(${position.x}px, ${position.y}px, 0)` 
                  : "none",
                cursor: isDragging ? "grabbing" : "default",
                userSelect: isDragging ? "none" : "auto",
                touchAction: "auto",
              }}
            >
              <motion.div
                id="chat-box-dialog"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 25, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="w-full sm:w-[420px] sm:max-w-[calc(100vw-2rem)] h-full sm:h-[630px] sm:max-h-[calc(100vh-6rem)] bg-[#f0f2f5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden border-glow-pulse"
              >
                {/* Header - Signature Zalo Blue (#0068ff) with verified badge */}
                <div className="bg-[#0068ff] px-4 py-3 sm:py-3.5 text-white flex items-center justify-between select-none shrink-0 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-full bg-white flex items-center justify-center text-[#0068ff] border-2 border-white/30 shrink-0 shadow-xs">
                      <Stethoscope className="h-5 w-5 text-[#0068ff]" />
                      <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-[13.5px] font-black tracking-wide uppercase text-white font-title flex items-center gap-1">
                          Trợ Lý Bác Sĩ BYT
                        </h3>
                        <span title="Đã xác thực theo chuẩn Bộ Y tế" className="inline-flex items-center">
                          <BadgeCheck className="h-4 w-4 text-white fill-white/20" />
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10.5px] text-blue-100 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Trực tuyến • Chuẩn phác đồ Bộ Y tế
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons on Header */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={handleResetChat}
                      className="p-1.5 hover:bg-white/15 active:scale-95 rounded-lg transition-colors cursor-pointer text-white"
                      title="Làm mới cuộc trò chuyện"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={onClose}
                      className="p-1.5 hover:bg-white/15 active:scale-95 rounded-lg transition-colors cursor-pointer text-white"
                      title="Thu nhỏ xuống góc"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={onClose}
                      className="p-1.5 hover:bg-white/20 active:scale-95 bg-white/10 rounded-lg transition-colors cursor-pointer text-white ml-0.5"
                      title="Đóng"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-header context badge */}
                <div className="bg-blue-50/90 dark:bg-slate-900/90 px-4 py-1.5 text-[11px] text-blue-900 dark:text-blue-300 flex items-center justify-between border-b border-blue-100/80 dark:border-slate-800 shrink-0">
                  <span className="font-semibold truncate">
                    👤 {patient.ten ? `Bệnh nhân: ${patient.ten}` : "Chưa nhập thông tin bệnh nhân"}
                  </span>
                  <span className="font-medium text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                    {filledMetricsCount > 0 ? `Đã nhập ${filledMetricsCount} chỉ số` : "Chưa có chỉ số"}
                  </span>
                </div>

                {/* Chat Body - Signature Zalo Light Blue-Grey Background */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f0f2f5] dark:bg-slate-950 overscroll-contain touch-pan-y mobile-touch-scroll scrollbar-thin">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-[#0068ff] dark:text-blue-400 shrink-0 shadow-xs select-none mt-1">
                          <Stethoscope className="h-4 w-4" />
                        </div>
                      )}
                      <div className="max-w-[85%] sm:max-w-[80%] space-y-1">
                        <div 
                          className={`px-4 py-2.5 text-[13.5px] leading-relaxed break-words font-medium shadow-xs ${
                            msg.role === "user"
                              ? "bg-[#0068ff] text-white rounded-2xl rounded-tr-xs border border-blue-600/30"
                              : "bg-white dark:bg-[#1e293b] text-[#081c36] dark:text-slate-100 rounded-2xl rounded-tl-xs border border-slate-200/80 dark:border-slate-800"
                          }`}
                        >
                          <div className={msg.role === "user" ? "text-white" : "chatbot-markdown text-[#081c36] dark:text-slate-100"}>
                            {msg.content ? (
                              msg.role === "user" ? (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                              ) : (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    table: ({ children }) => (
                                      <div className="my-2 w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70">
                                        <table className="w-full text-left border-collapse text-xs">
                                          {children}
                                        </table>
                                      </div>
                                    ),
                                    th: ({ children }) => (
                                      <th className="px-2.5 py-1.5 font-bold bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                        {children}
                                      </th>
                                    ),
                                    td: ({ children }) => (
                                      <td className="px-2.5 py-1.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                                        {children}
                                      </td>
                                    ),
                                  }}
                                >
                                  {normalizeMarkdown(msg.content)}
                                </ReactMarkdown>
                              )
                            ) : (
                              <div className="flex items-center gap-1.5 py-1 select-none">
                                <span className="h-2 w-2 bg-[#0068ff] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="h-2 w-2 bg-[#0068ff] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="h-2 w-2 bg-[#0068ff] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Assistant Copy Action */}
                        {msg.role === "assistant" && msg.content && (
                          <div className="flex items-center gap-2.5 px-1.5 py-0.5 text-[10px] text-slate-400 dark:text-slate-500 select-none">
                            <button
                              onClick={() => handleCopyText(msg.content, msg.id)}
                              className="flex items-center gap-1 hover:text-[#0068ff] dark:hover:text-blue-400 transition-all cursor-pointer active:scale-95"
                              title="Sao chép câu trả lời"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-500" />
                                  <span className="text-emerald-500 font-bold">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        <div className={`text-[9px] text-slate-400 dark:text-slate-500 px-1.5 select-none ${msg.role === "user" ? "text-right" : "text-left"}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Action Chips (Zalo Quick Tags) */}
                <div className="px-3.5 py-2.5 border-t border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-950 shrink-0 select-none space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[#0068ff] animate-pulse" />
                    Gợi ý câu hỏi nhanh theo phác đồ BYT:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[110px] overflow-y-auto pr-0.5 overscroll-contain touch-pan-y mobile-touch-scroll scrollbar-thin">
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => sendMessage(q.text)}
                        disabled={isLoading}
                        className="p-1.5 sm:p-2 text-left text-[10px] sm:text-[10.5px] font-bold text-slate-700 dark:text-slate-300 bg-[#f4f6f8] hover:bg-[#e6f0ff] hover:text-[#0068ff] dark:bg-slate-900 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 rounded-xl border border-slate-200/80 dark:border-slate-800 transition-all cursor-pointer truncate disabled:opacity-50 active:scale-98"
                        title={q.text}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Input Bar - Zalo Aesthetic */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Nhập câu hỏi cho Bác sĩ AI (Chuẩn BYT)..."
                      disabled={isLoading}
                      className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-150/60 dark:hover:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-[#0068ff] border border-slate-200 dark:border-slate-800 rounded-full text-xs font-semibold outline-none transition-all disabled:opacity-50"
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || isLoading}
                      className="h-9 w-9 bg-[#0068ff] hover:bg-blue-600 active:scale-95 disabled:opacity-35 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md shadow-blue-500/20"
                      title="Gửi tin nhắn"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 select-none">
                    💡 Trả lời ngắn gọn, căn cứ theo Hướng dẫn điều trị của Bộ Y tế Việt Nam
                  </p>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
