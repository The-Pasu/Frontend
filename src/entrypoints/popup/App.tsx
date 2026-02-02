import { useEffect, useRef, useState } from "react";
import { browser } from "wxt/browser";
import "./App.css";

type Step = "permission" | "denied" | "category" | "mode" | "conversation" | "purpose" | "analyzing" | "monitoring";

interface FormData {
  hasPermission: boolean;
  category: string;
  mode: "realtime" | "report" | "";
  conversationStart: string;
  conversationEnd: string;
  purpose: string;
}

interface SelectionUpdatedMessage {
  type: "SELECTION_UPDATED";
  conversationStart?: string;
  conversationEnd?: string;
}

function App() {
  const [step, setStep] = useState<Step>("permission");
  const [formData, setFormData] = useState<FormData>({
    hasPermission: false,
    category: "",
    mode: "",
    conversationStart: "시작 메세지를 선택해주세요",
    conversationEnd: "마지막 메세지를 선택해주세요",
    purpose: "",
  });
  const pinnedInitRef = useRef(false);

  useEffect(() => {
    if (!pinnedInitRef.current) {
      pinnedInitRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const isPinned = params.get("pinned") === "1";

      if (!isPinned) {
        void browser.runtime.sendMessage({ type: "OPEN_PINNED_POPUP" });
        window.close();
        return;
      }
    }

    const loadStoredSelections = async () => {
      const stored = (await browser.storage.local.get([
        "conversationStart",
        "conversationEnd",
        "category",
        "hasPermission",
      ])) as {
        conversationStart?: string;
        conversationEnd?: string;
        category?: string;
        hasPermission?: boolean;
      };

      setFormData((prev) => ({
        ...prev,
        conversationStart: stored.conversationStart || prev.conversationStart,
        conversationEnd: stored.conversationEnd || prev.conversationEnd,
        category: stored.category || prev.category,
        hasPermission: stored.hasPermission ?? prev.hasPermission,
      }));
    };

    const handleMessage = (message: SelectionUpdatedMessage) => {
      if (!message || message.type !== "SELECTION_UPDATED") return;
      setFormData((prev) => ({
        ...prev,
        conversationStart: message.conversationStart || prev.conversationStart,
        conversationEnd: message.conversationEnd || prev.conversationEnd,
      }));
    };

    void loadStoredSelections();
    browser.runtime.onMessage.addListener(handleMessage);

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // 1단계: 권한 요청
  const handlePermissionYes = () => {
    setFormData({ ...formData, hasPermission: true });
    void browser.runtime.sendMessage({ type: "PERMISSION_GRANTED" });
    setStep("category");
  };

  const handlePermissionNo = () => {
    setStep("denied");
  };

  // 권한 거부 단계
  const handleRetryPermission = () => {
    setStep("permission");
  };

  // 2단계: 카테고리 선택
  const handleCategoryBack = () => {
    setStep("permission");
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, category: e.target.value });
  };

  const handleCategoryNext = () => {
    if (formData.category) {
      void browser.runtime.sendMessage({
        type: "CATEGORY_SELECTED",
        category: formData.category,
      });
      setStep("mode");
    }
  };

  // 3단계: 모드 선택
  const handleModeBack = () => {
    setStep("category");
  };

  const handleModeSelect = (mode: "realtime" | "report") => {
    setFormData({ ...formData, mode });
    if (mode === "realtime") {
      setStep("monitoring");
    } else {
      setStep("conversation");
    }
  };

  // 4단계: 대화 영역 설정 (레포트 모드)
  const handleConversationBack = () => {
    setStep("mode");
  };

  const handleConversationNext = () => {
    const isStartSelected = formData.conversationStart !== "시작 메세지를 선택해주세요";
    const isEndSelected = formData.conversationEnd !== "마지막 메세지를 선택해주세요";
    
    if (isStartSelected && isEndSelected) {
      setStep("purpose");
    }
  };

  const handleClearConversationStart = () => {
    setFormData((prev) => ({
      ...prev,
      conversationStart: "시작 메세지를 선택해주세요",
    }));
    void browser.storage.local.remove("conversationStart");
  };

  const handleClearConversationEnd = () => {
    setFormData((prev) => ({
      ...prev,
      conversationEnd: "마지막 메세지를 선택해주세요",
    }));
    void browser.storage.local.remove("conversationEnd");
  };

  // 4단계: 목적 입력
  const handlePurposeBack = () => {
    setStep("conversation");
  };

  const handlePurposeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 50);
    setFormData({ ...formData, purpose: value });
  };

  const handleAnalyzeStart = () => {
    if (formData.purpose.trim()) {
      setStep("analyzing");
      // 분석 애니메이션이 진행된 후 다른 작업을 수행할 수 있음
    }
  };

  return (
    <div className="app-container">
      {/* 1단계: 권한 요청 */}
      {step === "permission" && (
        <div className="step permission-step">
          <div className="step-content">
            <h2>접근 권한 허락</h2>
            <p>이 확장 프로그램이 활성화되려면 접근 권한이 필요합니다.</p>
            <div className="button-group">
              <button className="btn btn-yes" onClick={handlePermissionYes}>
                예
              </button>
              <button className="btn btn-no" onClick={handlePermissionNo}>
                아니요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 권한 거부 단계 */}
      {step === "denied" && (
        <div className="step denied-step">
          <div className="step-content">
            <h2>아쉽습니다</h2>
            <p>접근 권한을 허락하셔야 이 기능을 사용할 수 있습니다.</p>
            <button className="btn btn-primary" onClick={handleRetryPermission}>
              허락하기
            </button>
          </div>
        </div>
      )}

      {/* 2단계: 카테고리 선택 */}
      {step === "category" && (
        <div className="step category-step">
          <div className="step-content">
            <h2>사용자 상황 입력</h2>
            <p className="step-description">카테고리를 선택해주세요</p>
            <select
              value={formData.category}
              onChange={handleCategoryChange}
              className="select-box"
            >
              <option value="">카테고리 선택</option>
              <option value="job">구직</option>
              <option value="trade">중고거래</option>
              <option value="romance">로맨스스캠</option>
              <option value="investment">재태크</option>
              <option value="sidebusiness">부업</option>
            </select>
            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={handleCategoryNext}
                disabled={!formData.category}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3단계: 모드 선택 */}
      {step === "mode" && (
        <div className="step category-step">
          <div className="step-content">
            <h2>분석 모드 선택</h2>
            <p className="step-description">원하는 분석 방식을 선택해주세요</p>
            <div className="mode-selection">
              <button
                className="mode-card"
                onClick={() => handleModeSelect("realtime")}
              >
                <div className="mode-icon">⚡</div>
                <h3>실시간 모니터링</h3>
                <p className="mode-desc">
                  대화 중 위험 신호를 실시간으로 감지하고<br />
                  답변 추천과 주의사항을 제공합니다
                </p>
              </button>
              <button
                className="mode-card"
                onClick={() => handleModeSelect("report")}
              >
                <div className="mode-icon">📊</div>
                <h3>대화 분석 레포트</h3>
                <p className="mode-desc">
                  지난 대화 내용을 선택하여<br />
                  종합적인 분석 레포트를 생성합니다
                </p>
              </button>
            </div>
            <div className="button-group">
              <button className="btn btn-no" onClick={handleModeBack}>
                이전
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4단계: 대화 영역 설정 (레포트 모드) */}
      {step === "conversation" && (
        <div className="step conversation-step">
          <div className="step-content">
            <h2>대화 영역 설정</h2>
            <p className="step-description">시간 단위, 날짜 단위로 대화를 선택할 수 있습니다</p>
            <div className="conversation-area">
              <div className="conversation-item">
                <span className="label">선택된 시작 메세지:</span>
                <div className="value-chip">
                  <span className="value">{formData.conversationStart}</span>
                  {formData.conversationStart !== "시작 메세지를 선택해주세요" && (
                    <button
                      type="button"
                      className="clear-btn"
                      onClick={handleClearConversationStart}
                      aria-label="선택된 시작 메세지 지우기"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="conversation-item">
                <span className="label">선택된 마지막 메세지:</span>
                <div className="value-chip">
                  <span className="value">{formData.conversationEnd}</span>
                  {formData.conversationEnd !== "마지막 메세지를 선택해주세요" && (
                    <button
                      type="button"
                      className="clear-btn"
                      onClick={handleClearConversationEnd}
                      aria-label="선택된 마지막 메세지 지우기"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="button-group">
              <button className="btn btn-no" onClick={handleConversationBack}>
                이전
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleConversationNext}
                disabled={
                  formData.conversationStart === "시작 메세지를 선택해주세요" ||
                  formData.conversationEnd === "마지막 메세지를 선택해주세요"
                }
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4단계: 목적 입력 */}
      {step === "purpose" && (
        <div className="step purpose-step">
          <div className="step-content">
            <h2>목적 입력</h2>
            <p className="step-description">예: 직업 구해서 출국, 물건 구매 등</p>
            <div className="input-group">
              <input
                type="text"
                value={formData.purpose}
                onChange={handlePurposeChange}
                placeholder="목적을 입력해주세요 (최대 50자)"
                className="text-input"
                maxLength={50}
              />
              <span className="char-count">{formData.purpose.length}/50</span>
            </div>
            <div className="button-group">
              <button className="btn btn-no" onClick={handlePurposeBack}>
                이전
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAnalyzeStart}
                disabled={!formData.purpose.trim()}
              >
                분석 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5단계: 분석 중 */}
      {step === "analyzing" && (
        <div className="step analyzing-step">
          <div className="step-content">
            <div className="spinner"></div>
            <h2>분석 중입니다</h2>
            <p>대화 내용을 분석하고 있습니다. 잠시만 기다려주세요...</p>
          </div>
        </div>
      )}

      {/* 실시간 모니터링 모드 */}
      {step === "monitoring" && (
        <div className="step monitoring-step">
          <div className="step-content">
            <div className="monitoring-header">
              <div className="status-badge active">실시간 모니터링 중</div>
              <h2>위험 신호 감지 시스템</h2>
              <p className="step-description">대화 내용을 실시간으로 분석하고 있습니다</p>
            </div>

            <div className="monitoring-alert">
              <div className="alert-icon">⚠️</div>
              <h3>답변 추천</h3>
              <div className="recommendation-box">
                <p className="recommendation-text">
                  상대방의 요청에 대해 신중하게 검토하세요.
                </p>
              </div>
            </div>

            <div className="warning-reasons">
              <h4>주의해야 할 이유</h4>
              <ul className="reason-list">
                <li>금전 요구가 포함된 메시지입니다</li>
                <li>개인정보를 요청하고 있습니다</li>
                <li>시간 압박을 주는 표현이 있습니다</li>
              </ul>
            </div>

            <div className="button-group">
              <button
                className="btn btn-no"
                onClick={() => setStep("mode")}
              >
                모드 변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
