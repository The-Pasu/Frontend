import { useState } from "react";
import "./App.css";

type Step = "permission" | "denied" | "category" | "conversation" | "purpose" | "analyzing";

interface FormData {
  hasPermission: boolean;
  category: string;
  conversationStart: string;
  conversationEnd: string;
  purpose: string;
}

function App() {
  const [step, setStep] = useState<Step>("permission");
  const [formData, setFormData] = useState<FormData>({
    hasPermission: false,
    category: "",
    conversationStart: "선택된 시작 메세지",
    conversationEnd: "선택된 마지막 메세지",
    purpose: "",
  });

  // 1단계: 권한 요청
  const handlePermissionYes = () => {
    setFormData({ ...formData, hasPermission: true });
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
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, category: e.target.value });
  };

  const handleCategoryNext = () => {
    if (formData.category) {
      setStep("conversation");
    }
  };

  // 3단계: 대화 영역 설정
  const handleConversationNext = () => {
    setStep("purpose");
  };

  // 4단계: 목적 입력
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

      {/* 3단계: 대화 영역 설정 */}
      {step === "conversation" && (
        <div className="step conversation-step">
          <div className="step-content">
            <h2>대화 영역 설정</h2>
            <p className="step-description">시간 단위, 날짜 단위로 대화를 선택할 수 있습니다</p>
            <div className="conversation-area">
              <div className="conversation-item">
                <span className="label">선택된 시작 메세지:</span>
                <span className="value">{formData.conversationStart}</span>
              </div>
              <div className="conversation-item">
                <span className="label">선택된 마지막 메세지:</span>
                <span className="value">{formData.conversationEnd}</span>
              </div>
            </div>
            <div className="button-group">
              <button className="btn btn-primary" onClick={handleConversationNext}>
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
    </div>
  );
}

export default App;
