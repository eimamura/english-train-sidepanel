"use client";

import { useState, useRef, useEffect } from "react";
import type { Feedback, AppState, HistoryItem } from "@/lib/types";
import { formatFeedbackAsMarkdown } from "@/lib/format";
import { getHistory, addToHistory } from "@/lib/history";

type ModelInfo = {
  stt_models: string[];
  llm_models: string[];
  current_stt_model: string;
  current_llm_model: string;
};

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "ok" | "error">("checking");
  const [copySuccess, setCopySuccess] = useState(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [selectedSttModel, setSelectedSttModel] = useState<string>("");
  const [selectedLlmModel, setSelectedLlmModel] = useState<string>("");
  const [changingModel, setChangingModel] = useState(false);
  const [recordingPrompts, setRecordingPrompts] = useState<{
    topics: string[];
    grammarPoints: string[];
    advice: string;
  } | null>(null);
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fetchPrompts = async () => {
    setLoadingPrompts(true);
    try {
      const response = await fetch("/api/prompts");
      if (response.ok) {
        const data = await response.json();
        setRecordingPrompts({
          topics: data.topics || [],
          grammarPoints: data.grammar_points || [],
          advice: data.advice || ""
        });
      } else {
        // Fallback to default prompts if API fails
        setRecordingPrompts({
          topics: [
            "Your favorite hobby",
            "A recent trip you took",
            "Your dream job"
          ],
          grammarPoints: [
            "Past tense (was/were, went, did)",
            "Present perfect (have/has + past participle)",
            "Future tense (will, going to)"
          ],
          advice: "Speak slowly and clearly. Take your time to form complete sentences."
        });
      }
    } catch (err) {
      console.error("Failed to fetch prompts:", err);
      // Fallback to default prompts
      setRecordingPrompts({
        topics: [
          "Your favorite hobby",
          "A recent trip you took",
          "Your dream job"
        ],
        grammarPoints: [
          "Past tense (was/were, went, did)",
          "Present perfect (have/has + past participle)",
          "Future tense (will, going to)"
        ],
        advice: "Speak slowly and clearly. Take your time to form complete sentences."
      });
    } finally {
      setLoadingPrompts(false);
    }
  };

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth();
    loadHistory();
    loadModels();
  }, []);

  // Keyboard shortcuts - Space and Esc only
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Space: Start/Stop recording (Push-to-talk style)
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        if (state === "idle") {
          startRecording();
        } else if (state === "done") {
          // Reset and start recording
          resetAndStartRecording();
        } else if (state === "recording") {
          stopRecording();
        }
      }

      // Escape: Stop recording or reset
      if (e.key === "Escape") {
        e.preventDefault();
        if (state === "recording") {
          stopRecording();
        } else if (state === "done" || state === "error") {
          reset();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const loadModels = async () => {
    try {
      const response = await fetch("/api/models");
      if (response.ok) {
        const data = await response.json();
        setModelInfo(data);
        setSelectedSttModel(data.current_stt_model);
        setSelectedLlmModel(data.current_llm_model);
      }
    } catch (err) {
      console.error("Failed to load models:", err);
    }
  };

  const changeModels = async () => {
    if (!modelInfo) return;
    
    setChangingModel(true);
    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stt_model: selectedSttModel !== modelInfo.current_stt_model ? selectedSttModel : undefined,
          llm_model: selectedLlmModel !== modelInfo.current_llm_model ? selectedLlmModel : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change models");
      }

      const data = await response.json();
      setModelInfo({
        ...modelInfo,
        current_stt_model: data.stt_model,
        current_llm_model: data.llm_model,
      });
      alert("Models changed successfully!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to change models");
    } finally {
      setChangingModel(false);
    }
  };

  const checkBackendHealth = async () => {
    try {
      const response = await fetch("/api/health");
      if (response.ok) {
        setBackendStatus("ok");
      } else {
        setBackendStatus("error");
      }
    } catch {
      setBackendStatus("error");
    }
  };

  const loadHistory = () => {
    const stored = getHistory();
    setHistory(stored);
  };

  const startRecording = async () => {
    try {
      setError(null);
      // Fetch prompts from LLM before starting recording
      await fetchPrompts();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        await processAudio();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setState("recording");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to access microphone. Please check permissions."
      );
      setState("error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.stop();
      setState("uploading");
    }
  };

  const processAudio = async () => {
    try {
      setState("processing");

      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || "audio/webm",
      });

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/feedback", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process audio");
      }

      const data: Feedback = await response.json();
      setFeedback(data);
      setState("done");

      // Add to history
      const historyItem: HistoryItem = {
        ...data,
        timestamp: Date.now(),
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      addToHistory(historyItem);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setState("error");
    }
  };

  const copyToClipboard = () => {
    if (!feedback) return;

    const markdown = formatFeedbackAsMarkdown(feedback);
    navigator.clipboard.writeText(markdown).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const reset = () => {
    setState("idle");
    setFeedback(null);
    setError(null);
    setRecordingPrompts(null);
  };

  const resetAndStartRecording = async () => {
    reset();
    // Wait a bit for state to update, then start recording
    await new Promise(resolve => setTimeout(resolve, 50));
    startRecording();
  };

  const toggleHistoryItem = (id: string) => {
    setExpandedHistoryId(expandedHistoryId === id ? null : id);
  };

  const copyHistoryItem = (item: HistoryItem) => {
    const markdown = formatFeedbackAsMarkdown(item);
    navigator.clipboard.writeText(markdown).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <main style={{ maxWidth: "900px", margin: "0 auto", animation: "fadeIn 0.5s ease" }}>
      {/* Header */}
      <div className="glass" style={{ 
        padding: "2rem", 
        borderRadius: "20px", 
        marginBottom: "2rem",
        textAlign: "center",
        animation: "fadeIn 0.6s ease"
      }}>
        <h1 style={{ 
          fontSize: "2.5rem", 
          fontWeight: "700",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "0.5rem",
          letterSpacing: "-0.02em"
        }}>
          🎯 English Learning Feedback
        </h1>
        <p style={{ 
          fontSize: "1rem", 
          opacity: 0.8,
          marginTop: "0.5rem"
        }}>
          Ultra-fast feedback loop for English learning
        </p>
      </div>

      {/* Backend Status and Model Selection */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "1rem", 
        marginBottom: "1.5rem",
        animation: "slideIn 0.5s ease"
      }}>
        {/* Backend Status */}
        <div className="glass" style={{ 
          padding: "0.75rem 1.5rem", 
          borderRadius: "12px",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.9rem",
          width: "fit-content"
        }}>
          <span style={{ opacity: 0.7 }}>Backend Status:</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              fontWeight: "600",
              color:
                backendStatus === "ok"
                  ? "#10b981"
                  : backendStatus === "error"
                  ? "#ef4444"
                  : "#f59e0b",
            }}
          >
            <span style={{ 
              width: "8px", 
              height: "8px", 
              borderRadius: "50%",
              backgroundColor: backendStatus === "ok" ? "#10b981" : backendStatus === "error" ? "#ef4444" : "#f59e0b",
              display: "inline-block",
              animation: backendStatus === "ok" ? "none" : "pulse 2s infinite"
            }}></span>
            {backendStatus === "ok"
              ? "Connected"
              : backendStatus === "error"
              ? "Disconnected"
              : "Checking..."}
          </span>
        </div>

        {/* Model Selection */}
        {modelInfo && (
          <div className="glass" style={{ 
            padding: "1.25rem", 
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            <div style={{ 
              fontSize: "1.1rem", 
              fontWeight: "700",
              marginBottom: "0.5rem",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              ⚙️ Model Selection
            </div>
            
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
              gap: "1rem" 
            }}>
              {/* STT Model */}
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: "0.5rem", 
                  fontSize: "0.9rem", 
                  fontWeight: "600",
                  opacity: 0.8
                }}>
                  STT Model (Whisper)
                </label>
                <select
                  value={selectedSttModel}
                  onChange={(e) => setSelectedSttModel(e.target.value)}
                  disabled={changingModel}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#e0e0e0",
                    fontSize: "0.95rem",
                    cursor: changingModel ? "not-allowed" : "pointer",
                    opacity: changingModel ? 0.6 : 1,
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23e0e0e0' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    paddingRight: "2.5rem"
                  }}
                >
                  {modelInfo.stt_models.map((model) => (
                    <option 
                      key={model} 
                      value={model}
                      style={{
                        background: "#1e1e2e",
                        color: "#e0e0e0"
                      }}
                    >
                      {model} {model === modelInfo.current_stt_model ? "(current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* LLM Model */}
              <div>
                <label style={{ 
                  display: "block", 
                  marginBottom: "0.5rem", 
                  fontSize: "0.9rem", 
                  fontWeight: "600",
                  opacity: 0.8
                }}>
                  LLM Model (Ollama)
                </label>
                <select
                  value={selectedLlmModel}
                  onChange={(e) => setSelectedLlmModel(e.target.value)}
                  disabled={changingModel}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#e0e0e0",
                    fontSize: "0.95rem",
                    cursor: changingModel ? "not-allowed" : "pointer",
                    opacity: changingModel ? 0.6 : 1,
                    appearance: "none",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23e0e0e0' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    paddingRight: "2.5rem"
                  }}
                >
                  {modelInfo.llm_models.length > 0 ? (
                    modelInfo.llm_models.map((model) => (
                      <option 
                        key={model} 
                        value={model}
                        style={{
                          background: "#1e1e2e",
                          color: "#e0e0e0"
                        }}
                      >
                        {model} {model === modelInfo.current_llm_model ? "(current)" : ""}
                      </option>
                    ))
                  ) : (
                    <option 
                      value=""
                      style={{
                        background: "#1e1e2e",
                        color: "#e0e0e0"
                      }}
                    >
                      No models available
                    </option>
                  )}
                </select>
              </div>
            </div>

            {(selectedSttModel !== modelInfo.current_stt_model || 
              selectedLlmModel !== modelInfo.current_llm_model) && (
              <button
                onClick={changeModels}
                disabled={changingModel}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  background: changingModel 
                    ? "rgba(107, 114, 128, 0.3)" 
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  cursor: changingModel ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  alignSelf: "flex-start",
                  opacity: changingModel ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!changingModel) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {changingModel ? "⏳ Changing..." : "🔄 Apply Changes"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="glass" style={{
        padding: "0.75rem 1rem",
        borderRadius: "10px",
        marginBottom: "1rem",
        fontSize: "0.85rem",
        opacity: 0.8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        flexWrap: "wrap"
      }}>
        <span>⌨️ Shortcuts:</span>
        <span><kbd style={{
          padding: "0.25rem 0.5rem",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "4px",
          fontSize: "0.8rem",
          fontFamily: "monospace"
        }}>Space</kbd> Start/Stop Recording</span>
        <span><kbd style={{
          padding: "0.25rem 0.5rem",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "4px",
          fontSize: "0.8rem",
          fontFamily: "monospace"
        }}>Esc</kbd> Cancel/Reset</span>
      </div>

      {/* Controls */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        {state === "idle" && (
          <button
            onClick={startRecording}
            className="glass"
            style={{
              padding: "1.25rem 3rem",
              fontSize: "1.25rem",
              fontWeight: "600",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "16px",
              cursor: "pointer",
              boxShadow: "0 10px 30px rgba(102, 126, 234, 0.4)",
              transition: "all 0.3s ease",
              animation: "fadeIn 0.7s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 15px 40px rgba(102, 126, 234, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 30px rgba(102, 126, 234, 0.4)";
            }}
          >
            🎤 Start Recording
          </button>
        )}

        {state === "recording" && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            <button
              onClick={stopRecording}
              style={{
                padding: "1.25rem 3rem",
                fontSize: "1.25rem",
                fontWeight: "600",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "white",
                border: "none",
                borderRadius: "16px",
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(239, 68, 68, 0.4)",
                animation: "pulse 1.5s infinite",
                position: "relative",
                overflow: "hidden",
                marginBottom: "2rem"
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>⏹ Stop Recording</span>
              <span style={{
                position: "absolute",
                top: 0,
                left: "-100%",
                width: "100%",
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                animation: "shimmer 2s infinite"
              }}></span>
            </button>
            <div style={{ 
              marginTop: "1rem", 
              fontSize: "0.9rem", 
              opacity: 0.8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              marginBottom: "2rem"
            }}>
              <span style={{ 
                width: "8px", 
                height: "8px", 
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                display: "inline-block",
                animation: "pulse 1s infinite"
              }}></span>
              Recording...
            </div>

            {/* Recording Prompts */}
            {loadingPrompts && (
              <div className="glass" style={{
                padding: "1.5rem",
                borderRadius: "16px",
                marginTop: "1rem",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                  ⏳ Generating practice prompts...
                </div>
              </div>
            )}

            {recordingPrompts && !loadingPrompts && (
              <div className="glass" style={{
                padding: "1.5rem",
                borderRadius: "16px",
                marginTop: "1rem",
                animation: "fadeIn 0.6s ease"
              }}>
                <div style={{
                  fontSize: "1.1rem",
                  fontWeight: "700",
                  marginBottom: "1.5rem",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>
                  💡 Practice Prompts
                </div>

                {/* Topics */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    marginBottom: "0.75rem",
                    opacity: 0.9,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <span>📝</span>
                    <span>Topics (choose one):</span>
                  </div>
                  <ul style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}>
                    {recordingPrompts.topics.map((topic, i) => (
                      <li key={i} style={{
                        padding: "0.75rem",
                        borderRadius: "10px",
                        background: "rgba(102, 126, 234, 0.15)",
                        borderLeft: "4px solid #667eea",
                        fontSize: "0.95rem",
                        lineHeight: "1.5"
                      }}>
                        {i + 1}. {topic}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Grammar Points */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    marginBottom: "0.75rem",
                    opacity: 0.9,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <span>📚</span>
                    <span>Grammar Points (try to use):</span>
                  </div>
                  <ul style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}>
                    {recordingPrompts.grammarPoints.map((grammar, i) => (
                      <li key={i} style={{
                        padding: "0.75rem",
                        borderRadius: "10px",
                        background: "rgba(16, 185, 129, 0.15)",
                        borderLeft: "4px solid #10b981",
                        fontSize: "0.95rem",
                        lineHeight: "1.5"
                      }}>
                        {i + 1}. {grammar}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Advice */}
                <div>
                  <div style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    marginBottom: "0.75rem",
                    opacity: 0.9,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <span>✨</span>
                    <span>Advice:</span>
                  </div>
                  <div style={{
                    padding: "1rem",
                    borderRadius: "10px",
                    background: "rgba(245, 158, 11, 0.15)",
                    borderLeft: "4px solid #f59e0b",
                    fontSize: "0.95rem",
                    lineHeight: "1.6",
                    fontStyle: "italic"
                  }}>
                    {recordingPrompts.advice}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {(state === "uploading" || state === "processing") && (
          <div className="glass" style={{ 
            padding: "2rem 3rem", 
            borderRadius: "16px",
            display: "inline-block",
            animation: "fadeIn 0.5s ease"
          }}>
            <div style={{ 
              fontSize: "1.1rem", 
              fontWeight: "600",
              marginBottom: "1rem"
            }}>
              {state === "uploading" ? "📤 Uploading..." : "⚙️ Processing..."}
            </div>
            <div style={{
              width: "200px",
              height: "4px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: "2px",
              overflow: "hidden"
            }}>
              <div style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(90deg, #667eea, #764ba2)",
                animation: "shimmer 1.5s infinite",
                backgroundSize: "200% 100%"
              }}></div>
            </div>
          </div>
        )}

        {state === "done" && feedback && (
          <button
            onClick={resetAndStartRecording}
            className="glass"
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: "600",
              background: "rgba(107, 114, 128, 0.3)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(107, 114, 128, 0.5)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(107, 114, 128, 0.3)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            🔄 Record Again
          </button>
        )}

        {state === "error" && (
          <div className="glass" style={{ 
            padding: "1.5rem", 
            borderRadius: "16px",
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            animation: "fadeIn 0.5s ease"
          }}>
            <div style={{ 
              color: "#ef4444", 
              marginBottom: "1rem",
              fontWeight: "600",
              fontSize: "1.1rem"
            }}>
              ⚠️ Error: {error}
            </div>
            <button
              onClick={reset}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "1rem",
                fontWeight: "600",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              🔄 Retry
            </button>
          </div>
        )}
      </div>

      {/* Feedback Display */}
      {feedback && state === "done" && (
        <div
          className="glass"
          style={{
            padding: "2rem",
            borderRadius: "20px",
            marginBottom: "2rem",
            animation: "fadeIn 0.6s ease"
          }}
        >
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            <h2 style={{ 
              fontSize: "1.75rem", 
              fontWeight: "700",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              ✨ Feedback
            </h2>
            <button
              onClick={copyToClipboard}
              style={{
                padding: "0.5rem 1rem",
                background: copySuccess ? "#10b981" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.9rem",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)"
              }}
              onMouseEnter={(e) => {
                if (!copySuccess) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!copySuccess) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.3)";
                }
              }}
            >
              {copySuccess ? "✓ Copied!" : "📋 Copy"}
            </button>
          </div>

          {/* Overall Score Badge */}
          <div style={{ 
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap"
          }}>
            <div style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "12px",
              background: `linear-gradient(135deg, ${getScoreColor(feedback.score)} 0%, ${getScoreColor(feedback.score)}dd 100%)`,
              color: "white",
              fontWeight: "700",
              fontSize: "1.1rem",
              boxShadow: `0 4px 15px ${getScoreColor(feedback.score)}40`
            }}>
              Overall Score: {feedback.score}/100
            </div>
            <div style={{
              flex: 1,
              height: "8px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: "4px",
              overflow: "hidden",
              maxWidth: "200px"
            }}>
              <div style={{
                width: `${feedback.score}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${getScoreColor(feedback.score)}, ${getScoreColor(feedback.score)}dd)`,
                transition: "width 0.5s ease"
              }}></div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div style={{
            marginBottom: "1.5rem",
            padding: "1.25rem",
            borderRadius: "12px",
            background: "rgba(102, 126, 234, 0.1)",
            border: "1px solid rgba(102, 126, 234, 0.2)"
          }}>
            <div style={{
              fontSize: "1rem",
              fontWeight: "700",
              marginBottom: "1rem",
              color: "#667eea"
            }}>
              📊 Detailed Score Breakdown
            </div>
            
            {/* Vocabulary */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem"
              }}>
                <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                  📚 Vocabulary: {feedback.score_breakdown.vocabulary}/100
                </span>
                <div style={{
                  width: "120px",
                  height: "6px",
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: "3px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: `${feedback.score_breakdown.vocabulary}%`,
                    height: "100%",
                    background: getScoreColor(feedback.score_breakdown.vocabulary),
                    transition: "width 0.5s ease"
                  }}></div>
                </div>
              </div>
              <div style={{
                fontSize: "0.85rem",
                opacity: 0.8,
                paddingLeft: "0.5rem",
                lineHeight: "1.5"
              }}>
                {feedback.score_breakdown.vocabulary_reason}
              </div>
            </div>

            {/* Grammar */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem"
              }}>
                <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                  ✏️ Grammar: {feedback.score_breakdown.grammar}/100
                </span>
                <div style={{
                  width: "120px",
                  height: "6px",
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: "3px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: `${feedback.score_breakdown.grammar}%`,
                    height: "100%",
                    background: getScoreColor(feedback.score_breakdown.grammar),
                    transition: "width 0.5s ease"
                  }}></div>
                </div>
              </div>
              <div style={{
                fontSize: "0.85rem",
                opacity: 0.8,
                paddingLeft: "0.5rem",
                lineHeight: "1.5"
              }}>
                {feedback.score_breakdown.grammar_reason}
              </div>
            </div>

            {/* Understandability */}
            <div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem"
              }}>
                <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                  🇺🇸 Understandability: {feedback.score_breakdown.understandability}/100
                </span>
                <div style={{
                  width: "120px",
                  height: "6px",
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: "3px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: `${feedback.score_breakdown.understandability}%`,
                    height: "100%",
                    background: getScoreColor(feedback.score_breakdown.understandability),
                    transition: "width 0.5s ease"
                  }}></div>
                </div>
              </div>
              <div style={{
                fontSize: "0.85rem",
                opacity: 0.8,
                paddingLeft: "0.5rem",
                lineHeight: "1.5"
              }}>
                {feedback.score_breakdown.understandability_reason}
              </div>
            </div>
          </div>

          <div style={{ 
            marginBottom: "1.25rem",
            padding: "1rem",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.1)",
            borderLeft: "4px solid #667eea"
          }}>
            <div style={{ 
              fontSize: "0.85rem", 
              opacity: 0.7, 
              marginBottom: "0.5rem",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>RAW Transcript</div>
            <div style={{ fontSize: "1.1rem", lineHeight: "1.6" }}>
              {feedback.raw_transcript}
            </div>
          </div>

          <div style={{ 
            marginBottom: "1.25rem",
            padding: "1rem",
            borderRadius: "12px",
            background: "rgba(16, 185, 129, 0.15)",
            borderLeft: "4px solid #10b981"
          }}>
            <div style={{ 
              fontSize: "0.85rem", 
              opacity: 0.7, 
              marginBottom: "0.5rem",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#10b981"
            }}>Corrected</div>
            <div style={{ fontSize: "1.1rem", lineHeight: "1.6", fontWeight: "500" }}>
              {feedback.corrected}
            </div>
          </div>

          {feedback.issues.length > 0 && (
            <div style={{ 
              marginBottom: "1.25rem",
              padding: "1rem",
              borderRadius: "12px",
              background: "rgba(239, 68, 68, 0.15)",
              borderLeft: "4px solid #ef4444"
            }}>
              <div style={{ 
                fontSize: "0.85rem", 
                opacity: 0.7, 
                marginBottom: "0.75rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#ef4444"
              }}>Issues ({feedback.issues.length})</div>
              <ul style={{ 
                marginLeft: "1.5rem", 
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}>
                {feedback.issues.map((issue, i) => (
                  <li key={i} style={{ 
                    fontSize: "1rem", 
                    lineHeight: "1.6",
                    position: "relative",
                    paddingLeft: "1.5rem"
                  }}>
                    <span style={{
                      position: "absolute",
                      left: 0,
                      top: "0.5rem",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#ef4444"
                    }}></span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.better_options.length > 0 && (
            <div style={{ 
              marginBottom: "1.25rem",
              padding: "1rem",
              borderRadius: "12px",
              background: "rgba(59, 130, 246, 0.15)",
              borderLeft: "4px solid #3b82f6"
            }}>
              <div style={{ 
                fontSize: "0.85rem", 
                opacity: 0.7, 
                marginBottom: "0.75rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#3b82f6"
              }}>Better Options ({feedback.better_options.length})</div>
              <ul style={{ 
                marginLeft: "1.5rem", 
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}>
                {feedback.better_options.map((option, i) => (
                  <li key={i} style={{ 
                    fontSize: "1rem", 
                    lineHeight: "1.6",
                    position: "relative",
                    paddingLeft: "1.5rem"
                  }}>
                    <span style={{
                      position: "absolute",
                      left: 0,
                      top: "0.5rem",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#3b82f6"
                    }}></span>
                    {option}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ 
            marginBottom: "1rem",
            padding: "1rem",
            borderRadius: "12px",
            background: "rgba(245, 158, 11, 0.15)",
            borderLeft: "4px solid #f59e0b"
          }}>
            <div style={{ 
              fontSize: "0.85rem", 
              opacity: 0.7, 
              marginBottom: "0.5rem",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#f59e0b"
            }}>Drill Practice</div>
            <div style={{ fontSize: "1.1rem", lineHeight: "1.6", fontWeight: "500" }}>
              {feedback.drill}
            </div>
          </div>

          {feedback.timings_ms && (
            <div style={{ 
              fontSize: "0.85rem", 
              opacity: 0.6,
              padding: "0.75rem",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.05)",
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap"
            }}>
              <span><strong>STT:</strong> {feedback.timings_ms.stt}ms</span>
              <span><strong>LLM:</strong> {feedback.timings_ms.llm}ms</span>
              <span><strong>Total:</strong> {feedback.timings_ms.total}ms</span>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ animation: "fadeIn 0.6s ease" }}>
          <h2 style={{ 
            marginBottom: "1.5rem",
            fontSize: "1.75rem",
            fontWeight: "700",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            📚 History
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {history.map((item, index) => (
              <div
                key={item.id}
                className="glass"
                style={{
                  padding: "1.25rem",
                  borderRadius: "16px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  animation: `slideIn 0.5s ease ${index * 0.1}s both`,
                  border: expandedHistoryId === item.id ? "2px solid rgba(102, 126, 234, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)"
                }}
                onClick={() => toggleHistoryItem(item.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(5px)";
                  e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.1)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem"
                  }}
                >
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ 
                      fontSize: "0.85rem", 
                      opacity: 0.7,
                      marginBottom: "0.5rem",
                      fontWeight: "500"
                    }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                    <div style={{ 
                      marginTop: "0.5rem",
                      fontSize: "1rem",
                      lineHeight: "1.5",
                      fontWeight: "500"
                    }}>
                      {item.raw_transcript.substring(0, 60)}
                      {item.raw_transcript.length > 60 ? "..." : ""}
                    </div>
                    <div style={{ 
                      marginTop: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem"
                    }}>
                      <span style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "8px",
                        background: `linear-gradient(135deg, ${getScoreColor(item.score)} 0%, ${getScoreColor(item.score)}dd 100%)`,
                        color: "white",
                        fontWeight: "700",
                        fontSize: "0.9rem"
                      }}>
                        {item.score}/100
                      </span>
                      <div style={{
                        width: "100px",
                        height: "6px",
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: "3px",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${item.score}%`,
                          height: "100%",
                          background: getScoreColor(item.score),
                          transition: "width 0.3s ease"
                        }}></div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyHistoryItem(item);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      transition: "all 0.3s ease",
                      boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.3)";
                    }}
                  >
                    📋 Copy
                  </button>
                </div>

                {expandedHistoryId === item.id && (
                  <div style={{ 
                    marginTop: "1.5rem", 
                    paddingTop: "1.5rem", 
                    borderTop: "1px solid rgba(255,255,255,0.2)",
                    animation: "fadeIn 0.3s ease"
                  }}>
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ 
                        fontSize: "0.85rem", 
                        opacity: 0.7, 
                        marginBottom: "0.5rem",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>Corrected</div>
                      <div style={{ fontSize: "1rem", lineHeight: "1.6", fontWeight: "500" }}>
                        {item.corrected}
                      </div>
                    </div>
                    {item.issues.length > 0 && (
                      <div style={{ marginBottom: "1rem" }}>
                        <div style={{ 
                          fontSize: "0.85rem", 
                          opacity: 0.7, 
                          marginBottom: "0.5rem",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em"
                        }}>Issues</div>
                        <ul style={{ marginLeft: "1.5rem", marginTop: "0.5rem" }}>
                          {item.issues.map((issue, i) => (
                            <li key={i} style={{ fontSize: "0.95rem", marginBottom: "0.25rem", lineHeight: "1.6" }}>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.better_options.length > 0 && (
                      <div style={{ marginBottom: "1rem" }}>
                        <div style={{ 
                          fontSize: "0.85rem", 
                          opacity: 0.7, 
                          marginBottom: "0.5rem",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em"
                        }}>Options</div>
                        <ul style={{ marginLeft: "1.5rem", marginTop: "0.5rem" }}>
                          {item.better_options.map((option, i) => (
                            <li key={i} style={{ fontSize: "0.95rem", marginBottom: "0.25rem", lineHeight: "1.6" }}>
                              {option}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <div style={{ 
                        fontSize: "0.85rem", 
                        opacity: 0.7, 
                        marginBottom: "0.5rem",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>Drill</div>
                      <div style={{ fontSize: "1rem", lineHeight: "1.6", fontWeight: "500" }}>
                        {item.drill}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
