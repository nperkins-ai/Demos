"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  MessageCircle,
  Stethoscope,
  Brain,
  RouteIcon,
  LogOut,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  MapPin,
  Bed,
  Users,
  Mic,
  MicOff,
  Volume2,
} from "lucide-react";

type TabType = "triage" | "consult" | "support" | "pathways" | "hospitals";
type ChatMessageType = {
  role: "user" | "ai";
  text: string;
};

type Hospital = {
  id: string;
  name: string;
  city: string;
  waitTime: number;
  occupancy: number;
  doctors: { name: string; specialty: string }[];
};

const getMockResponses = (language: string) => {
  const isEnglish = language === "en";
  
  return {
    triage: {
      "fever cough": isEnglish
        ? "Urgency: Urgent | Recommendation: Visit Puskesmas within 24 hours. COVID/Dengue test required. | JKN: Book online via app."
        : "Urgency: Urgent | Recommendation: Puskesmas dalam 24 jam. Tes COVID/Dengue. | JKN Next: Book online via app.",
      "chest pain": isEnglish
        ? "Urgency: EMERGENCY | Go to nearest hospital NOW! Call 119. Possible cardiac event."
        : "Urgency: Emergency | Go to RS now! Call 119.",
      default: isEnglish
        ? "Urgency: Routine | Self-care: Rest, drink plenty of water. Monitor for 48 hours. See doctor if symptoms persist."
        : "Urgency: Routine | Self-care: Istirahat, minum air. Monitor 48 jam.",
    },
    support: {
      default: isEnglish
        ? "Possible causes: Infection vs Chronic condition. Recommend: Blood test, EKG. Follow JKN guidelines."
        : "Differentials: Infeksi vs Kronik. Saran: Tes darah, EKG. Ikuti pedoman JKN.",
    },
    pathway: {
      Diabetes: isEnglish
        ? "Week 1: Low sugar diet, 30 min daily exercise, monitor blood glucose. Remote check-in via app."
        : "Minggu 1: Diet rendah gula, olahraga 30min/hari, monitor gula darah. Remote check-in via app.",
      Hypertension: isEnglish
        ? "Pathway: Daily medication, reduce salt intake, daily BP monitoring. Alert if >160."
        : "Pathway: Obat rutin, kurangi garam, tekanan harian. Alert jika >160.",
      Asthma: isEnglish
        ? "Pathway: Daily inhaler, avoid triggers, peak flow monitoring. Monthly review."
        : "Pathway: Inhaler harian, hindari pemicu, monitoring puncak aliran. Review bulanan.",
    },
    consult: isEnglish
      ? [
          "Hello, how are your symptoms? Any chronic conditions?",
          "Based on JKN coverage, we recommend remote monitoring for remote areas.",
          "OK, let me check your medical history in SATUSEHAT.",
        ]
      : [
          "Halo, bagaimana gejala Anda? Fokus kronis?",
          "Berdasarkan JKN, saran remote monitor untuk pulau terpencil.",
          "OK, mari periksa riwayat Anda di SATUSEHAT.",
        ],
  };
};

const HOSPITALS: Hospital[] = [
  {
    id: "1",
    name: "Rumah Sakit Pusat Jantung Nasional Harapan Kita",
    city: "Jakarta",
    waitTime: 45,
    occupancy: 85,
    doctors: [
      { name: "Dr. Budi Santoso", specialty: "Cardiology" },
      { name: "Dr. Siti Nurhaliza", specialty: "Cardiac Surgery" },
      { name: "Dr. Ahmad Rahman", specialty: "Emergency Medicine" },
    ],
  },
  {
    id: "2",
    name: "Rumah Sakit Cipto Mangunkusumo",
    city: "Jakarta",
    waitTime: 60,
    occupancy: 90,
    doctors: [
      { name: "Dr. Hendro Wijaya", specialty: "General Medicine" },
      { name: "Dr. Ratna Dewi", specialty: "Internal Medicine" },
      { name: "Dr. Bambang Iskandar", specialty: "Surgery" },
    ],
  },
  {
    id: "3",
    name: "Rumah Sakit Dr. Sardjito",
    city: "Yogyakarta",
    waitTime: 30,
    occupancy: 72,
    doctors: [
      { name: "Dr. Adi Priyanto", specialty: "General Medicine" },
      { name: "Dr. Nurul Qomariah", specialty: "Pediatrics" },
      { name: "Dr. Cahyo Hendro", specialty: "Emergency Medicine" },
    ],
  },
  {
    id: "4",
    name: "Rumah Sakit Kariadi",
    city: "Semarang",
    waitTime: 35,
    occupancy: 75,
    doctors: [
      { name: "Dr. Fajar Kusuma", specialty: "General Medicine" },
      { name: "Dr. Eka Putri", specialty: "Cardiology" },
      { name: "Dr. Willy Santoso", specialty: "Orthopedics" },
    ],
  },
  {
    id: "5",
    name: "Rumah Sakit Universitas Airlangga",
    city: "Surabaya",
    waitTime: 40,
    occupancy: 80,
    doctors: [
      { name: "Dr. Hendra Wijaya", specialty: "General Medicine" },
      { name: "Dr. Maya Kusuma", specialty: "Gastroenterology" },
      { name: "Dr. Ripto Wibowo", specialty: "Nephrology" },
    ],
  },
  {
    id: "6",
    name: "Rumah Sakit Persahabatan",
    city: "Jakarta",
    waitTime: 50,
    occupancy: 82,
    doctors: [
      { name: "Dr. Sutrisno", specialty: "Pulmonology" },
      { name: "Dr. Dewi Lestari", specialty: "General Medicine" },
      { name: "Dr. Gunawan Setiawan", specialty: "Emergency Medicine" },
    ],
  },
];

// Voice utility functions
const getLanguageCode = (lang: string) => {
  const langMap: Record<string, string> = {
    "en": "en-US",
    "id": "id-ID",
    "jw": "id-ID",
    "su": "id-ID",
    "mak": "id-ID",
    "mad": "id-ID",
  };
  return langMap[lang] || "en-US";
};

const startVoiceRecognition = (
  callback: (transcript: string) => void,
  language: string
): (() => void) => {
  if (typeof window === "undefined") return () => {};
  
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech Recognition not supported in this browser");
    return () => {};
  }

  const recognition = new SpeechRecognition();
  recognition.language = getLanguageCode(language);
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalTranscript = "";

  recognition.onresult = (event: any) => {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
      } else {
        interimTranscript += transcript;
      }
    }
    callback(finalTranscript + interimTranscript);
  };

  recognition.onerror = (event: any) => {
    console.log("Voice error:", event.error);
  };

  recognition.start();
  return () => recognition.stop();
};

const selectProfessionalHealthcareVoice = (language: string): SpeechSynthesisVoice | undefined => {
  const voices = window.speechSynthesis.getVoices();
  const langCode = getLanguageCode(language);
  
  // First, try to find a female voice in the target language
  let selectedVoice = voices.find(voice => 
    voice.lang.startsWith(langCode.split('-')[0]) && 
    voice.name.toLowerCase().includes('female')
  );
  
  // If no female voice found, try to find any voice with "female" or "woman" in name
  if (!selectedVoice) {
    selectedVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.toLowerCase().includes('woman')
    );
  }
  
  // Fallback to first available voice in language
  if (!selectedVoice) {
    selectedVoice = voices.find(voice => voice.lang.startsWith(langCode.split('-')[0]));
  }
  
  // Final fallback to any voice
  if (!selectedVoice) {
    selectedVoice = voices[0];
  }
  
  return selectedVoice;
};

const speakText = (text: string, language: string) => {
  if (typeof window === "undefined") return;
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getLanguageCode(language);
  
  // Select professional healthcare female voice
  const voice = selectProfessionalHealthcareVoice(language);
  if (voice) {
    utterance.voice = voice;
  }
  
  // Professional healthcare voice settings
  utterance.rate = 0.85; // Slightly slower for clarity and professionalism
  utterance.pitch = 1.3; // Higher pitch for female voice with caring tone
  utterance.volume = 0.9; // Good volume projection
  
  window.speechSynthesis.speak(utterance);
};

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "jw", name: "Basa Jawa" },
  { code: "su", name: "Basa Sunda" },
  { code: "mak", name: "Basa Minangkabau" },
  { code: "mad", name: "Basa Madurang" },
];

export function HealthcareDemo() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("triage");
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Triage state
  const [bpjsId, setBpjsId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [symptoms, setSymptoms] = useState("");
  const [triageOutput, setTriageOutput] = useState("");
  const [triageUrgency, setTriageUrgency] = useState<
    "emergency" | "urgent" | "routine" | null
  >(null);

  // Consult state
  const [chatHistory, setChatHistory] = useState<ChatMessageType[]>([]);
  const [userMsg, setUserMsg] = useState("");

  // Support state
  const [age, setAge] = useState("");
  const [vitals, setVitals] = useState("");
  const [supportSymptoms, setSupportSymptoms] = useState("");
  const [supportOutput, setSupportOutput] = useState("");

  // Pathway state
  const [condition, setCondition] = useState("Diabetes");
  const [history, setHistory] = useState("");
  const [pathwayOutput, setPathwayOutput] = useState("");

  // Hospital state
  const [urgencyLevel, setUrgencyLevel] = useState<"emergency" | "urgent" | "routine">("routine");
  const [recommendedHospitals, setRecommendedHospitals] = useState<Hospital[]>([]);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const recordingStopRef = useRef<(() => void) | null>(null);
  const [recordingTab, setRecordingTab] = useState<string | null>(null);

  const [patient] = useState({
    name: "Dr. Joni Santoso",
    jknId: "JKN-2024-001",
    status: "Aktif",
  });

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  const mockLogin = () => {
    if (bpjsId.trim()) {
      setIsLoggedIn(true);
      setShowOnboarding(false);
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setBpjsId("");
  };

  const getTriage = () => {
    const mockResponses = getMockResponses(i18n.language);
    const symptomsLower = symptoms.toLowerCase();
    const matchedKey = Object.keys(mockResponses.triage).find((k) =>
      symptomsLower.includes(k)
    );

    let response = mockResponses.triage[
      matchedKey as keyof typeof mockResponses.triage
    ] || mockResponses.triage.default;

    let urgency: "emergency" | "urgent" | "routine" = "routine";
    if (matchedKey === "chest pain") urgency = "emergency";
    else if (matchedKey === "fever cough") urgency = "urgent";

    setTriageUrgency(urgency);
    setTriageOutput(response);
    
    // Get recommended hospitals based on urgency
    getHospitalRecommendations(urgency);
  };

  const getHospitalRecommendations = (urgency: "emergency" | "urgent" | "routine") => {
    setUrgencyLevel(urgency);
    
    let hospitals = [...HOSPITALS];
    
    // Sort by occupancy (lower is better) for urgent/routine, by wait time for emergency
    if (urgency === "emergency") {
      hospitals.sort((a, b) => a.waitTime - b.waitTime);
    } else {
      hospitals.sort((a, b) => a.occupancy - b.occupancy);
    }
    
    setRecommendedHospitals(hospitals.slice(0, 3));
  };

  const getSupport = () => {
    const mockResponses = getMockResponses(i18n.language);
    setSupportOutput(mockResponses.support.default);
  };

  const getPathway = () => {
    const mockResponses = getMockResponses(i18n.language);
    const pathway =
      mockResponses.pathway[condition as keyof typeof mockResponses.pathway] ||
      (i18n.language === "en" ? "Custom pathway generated." : "Pathway kustom dihasilkan.");
    setPathwayOutput(pathway);
  };

  const sendMsg = () => {
    if (!userMsg.trim()) return;

    const mockResponses = getMockResponses(i18n.language);
    const newHistory: ChatMessageType[] = [...chatHistory];
    newHistory.push({ role: "user", text: userMsg });
    setChatHistory(newHistory);
    setUserMsg("");

    setTimeout(() => {
      const reply =
        mockResponses.consult[
          Math.floor(Math.random() * mockResponses.consult.length)
        ];
      newHistory.push({ role: "ai", text: reply });
      setChatHistory([...newHistory]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      sendMsg();
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "emergency":
        return "bg-[#FFF3CD] border-l-4 border-[#DC3545] text-[#721C24]";
      case "urgent":
        return "bg-[#FFE5E5] border-l-4 border-[#FFA500] text-[#856404]";
      default:
        return "bg-[#D4EDDA] border-l-4 border-[#28A745] text-[#155724]";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "emergency":
        return <AlertCircle className="w-5 h-5" />;
      case "urgent":
        return <Clock className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  // Voice handlers
  const toggleVoiceRecord = (fieldSetter: (value: string) => void, tabName: string) => {
    if (isRecording && recordingTab === tabName) {
      // Stop recording
      if (recordingStopRef.current) {
        recordingStopRef.current();
      }
      setIsRecording(false);
      setRecordingTab(null);
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingTab(tabName);
      const stop = startVoiceRecognition((transcript) => {
        fieldSetter(transcript);
      }, i18n.language);
      recordingStopRef.current = stop;
    }
  };

  const speakResponse = (text: string) => {
    speakText(text, i18n.language);
  };

  return (
    <div
      className="min-h-screen bg-[#F5F5F5]"
      style={{
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', 'Roboto', sans-serif",
      }}
    >
      {/* Header with Ministry Branding */}
      <header className="bg-white border-b border-[#E0E0E0] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-[#003D7A]">
                {t("header.title")}
              </h1>
              <p className="text-xs text-[#333] font-medium">
                {t("header.subtitle")}
              </p>
            </div>
            <div className="hidden sm:block h-12 w-px bg-[#E0E0E0] ml-4"></div>
            <div className="hidden sm:flex flex-col text-sm">
              <p className="font-semibold text-[#003D7A]">
                {t("header.plus")}
              </p>
              <p className="text-xs text-[#333]">
                {t("header.clinicalIntelligence")}
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#E8F4F8] rounded-lg p-1">
              <Globe size={16} className="text-[#003D7A] ml-2" />
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="px-2 py-2 bg-transparent text-[#003D7A] font-semibold text-sm focus:outline-none cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-t border-[#E0E0E0]">
          <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
            {(["triage", "consult", "support", "pathways", "hospitals"] as TabType[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setShowOnboarding(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-4 font-semibold text-sm border-b-4 transition whitespace-nowrap ${
                    activeTab === tab
                      ? "border-[#0D7377] text-[#003D7A]"
                      : "border-transparent text-[#333] hover:text-[#003D7A]"
                  }`}
                >
                  {tab === "triage" && <Stethoscope size={18} />}
                  {tab === "consult" && <MessageCircle size={18} />}
                  {tab === "support" && <Brain size={18} />}
                  {tab === "pathways" && <RouteIcon size={18} />}
                  {tab === "hospitals" && <MapPin size={18} />}
                  <span className="hidden sm:inline">
                    {t(`nav.${tab}`)}
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Onboarding / Login Section */}
        {showOnboarding && !isLoggedIn && (
          <div className="mb-8 bg-gradient-to-r from-[#003D7A] to-[#0D7377] rounded-lg p-8 text-white">
            <h2 className="text-3xl font-bold mb-3">
              {t("onboarding.title")}
            </h2>
            <p className="text-lg mb-6 opacity-90">
              {t("onboarding.subtitle")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <Stethoscope className="w-8 h-8 mb-2 text-[#003D7A]" />
                <p className="font-semibold text-[#003D7A]">
                  {t("onboarding.smartTriage")}
                </p>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <MessageCircle className="w-8 h-8 mb-2 text-[#003D7A]" />
                <p className="font-semibold text-[#003D7A]">
                  {t("onboarding.remoteCare")}
                </p>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-4">
                <Brain className="w-8 h-8 mb-2 text-[#003D7A]" />
                <p className="font-semibold text-[#003D7A]">
                  {t("onboarding.aiSupport")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Triage Tab */}
          {activeTab === "triage" && (
            <div className="p-8">
              <h2 className="text-3xl font-bold text-[#003D7A] mb-2">
                {t("triage.title")}
              </h2>
              <p className="text-[#333] mb-8">{t("triage.subtitle")}</p>

              {!isLoggedIn ? (
                <div className="bg-[#E8F4F8] border-2 border-[#0D7377] rounded-lg p-8 max-w-md">
                  <h3 className="text-xl font-bold text-[#003D7A] mb-4">
                    {t("triage.loginTitle")}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#003D7A] mb-2">
                        {t("triage.jknIdLabel")}
                      </label>
                      <input
                        type="text"
                        value={bpjsId}
                        onChange={(e) => setBpjsId(e.target.value)}
                        placeholder={t("triage.jknIdPlaceholder")}
                        className="w-full px-4 py-3 border-2 border-[#0D7377] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003D7A] focus:border-transparent text-[#003D7A] placeholder-[#555]"
                      />
                    </div>
                    <button
                      onClick={mockLogin}
                      className="w-full bg-[#003D7A] text-white py-3 rounded-lg font-bold hover:bg-[#00264D] transition"
                    >
                      {t("triage.loginButton")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Patient Info Card */}
                  <div className="bg-[#E8F4F8] border-l-4 border-[#0D7377] rounded-lg p-6 mb-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-[#333] font-semibold">
                          {t("triage.patientInfo")}
                        </p>
                        <p className="text-2xl font-bold text-[#003D7A]">
                          {patient.name}
                        </p>
                        <p className="text-sm text-[#333] mt-1">
                          {t("triage.jknId")} {patient.jknId}
                        </p>
                        <span className="inline-block mt-3 bg-[#28A745] text-white px-3 py-1 rounded-full text-xs font-semibold">
                          {patient.status}
                        </span>
                      </div>
                      <button
                        onClick={logout}
                        className="flex items-center gap-2 bg-[#DC3545] text-white px-4 py-2 rounded-lg hover:bg-[#C82333] transition font-semibold"
                      >
                        <LogOut size={18} />
                        {t("triage.logout")}
                      </button>
                    </div>
                  </div>

                  {/* Triage Form */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-[#003D7A]">
                          {t("triage.symptomsLabel")}
                        </label>
                        <button
                          onClick={() => toggleVoiceRecord(setSymptoms, "triage-symptoms")}
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold transition ${
                            isRecording && recordingTab === "triage-symptoms"
                              ? "bg-[#DC3545] text-white"
                              : "bg-[#E8F4F8] text-[#003D7A] hover:bg-[#D0E8F0]"
                          }`}
                        >
                          {isRecording && recordingTab === "triage-symptoms" ? (
                            <>
                              <MicOff size={16} />
                              Stop
                            </>
                          ) : (
                            <>
                              <Mic size={16} />
                              Voice
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder={t("triage.symptomsPlaceholder")}
                        className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003D7A] focus:border-transparent h-24 text-[#003D7A] placeholder-[#555]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={getTriage}
                        className="flex-1 bg-[#0D7377] text-white py-3 rounded-lg font-bold hover:bg-[#056064] transition flex items-center justify-center gap-2"
                      >
                        <Plus size={20} />
                        {t("triage.getTriageButton")}
                      </button>
                      {triageOutput && (
                        <button
                          onClick={() => speakResponse(triageOutput)}
                          className="bg-[#003D7A] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#00264D] transition flex items-center gap-2"
                          title="Speak response"
                        >
                          <Volume2 size={20} />
                        </button>
                      )}
                    </div>

                    {/* Triage Result */}
                    {triageOutput && (
                      <div
                        className={`mt-6 rounded-lg p-6 flex gap-4 ${getUrgencyColor(
                          triageUrgency || ""
                        )}`}
                      >
                        <div className="flex-shrink-0">
                          {getUrgencyIcon(triageUrgency || "")}
                        </div>
                        <div>
                          <p className="font-bold mb-2">{triageOutput}</p>
                          <p className="text-xs opacity-75">
                            {t("triage.mockAssessment")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Consult Tab */}
          {activeTab === "consult" && (
            <div className="p-8">
              <h2 className="text-3xl font-bold text-[#003D7A] mb-2">
                {t("consult.title")}
              </h2>
              <p className="text-[#333] mb-8">{t("consult.subtitle")}</p>

              {isLoggedIn ? (
                <div className="space-y-4">
                  <div className="bg-[#F5F5F5] border-2 border-[#E0E0E0] rounded-lg p-0 h-96 overflow-y-auto flex flex-col">
                    {chatHistory.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-[#333] text-center">
                          {t("consult.startConsult")}
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 p-4 space-y-4">
                        {chatHistory.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${
                              msg.role === "user"
                                ? "justify-end"
                                : "justify-start"
                            } gap-2`}
                          >
                            <div
                              className={`max-w-xs px-4 py-3 rounded-lg ${
                                msg.role === "user"
                                  ? "bg-[#003D7A] text-white rounded-br-none"
                                  : "bg-[#E8F4F8] text-[#003D7A] rounded-bl-none"
                              }`}
                            >
                              <p className="text-sm">{msg.text}</p>
                            </div>
                            {msg.role === "ai" && (
                              <button
                                onClick={() => speakResponse(msg.text)}
                                className="self-start mt-1 p-2 rounded-lg bg-[#0D7377] text-white hover:bg-[#056064] transition"
                                title="Listen to AI response"
                              >
                                <Volume2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userMsg}
                      onChange={(e) => setUserMsg(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={t("consult.messageLabel")}
                      className="flex-1 px-4 py-3 border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003D7A] focus:border-transparent text-[#003D7A] placeholder-[#555]"
                    />
                    <button
                      onClick={() => toggleVoiceRecord(setUserMsg, "consult-msg")}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition ${
                        isRecording && recordingTab === "consult-msg"
                          ? "bg-[#DC3545] text-white"
                          : "bg-[#E8F4F8] text-[#003D7A] hover:bg-[#D0E8F0]"
                      }`}
                      title="Voice input"
                    >
                      {isRecording && recordingTab === "consult-msg" ? (
                        <MicOff size={20} />
                      ) : (
                        <Mic size={20} />
                      )}
                    </button>
                    <button
                      onClick={sendMsg}
                      className="bg-[#0D7377] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#056064] transition"
                    >
                      {t("consult.sendButton")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#FFE5E5] border-l-4 border-[#DC3545] rounded-lg p-6">
                  <p className="text-[#721C24] font-semibold">
                    {t("consult.loginRequired")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Support Tab */}
          {activeTab === "support" && (
            <div className="p-8">
              <h2 className="text-3xl font-bold text-[#003D7A] mb-2">
                {t("support.title")}
              </h2>
              <p className="text-[#333] mb-8">{t("support.subtitle")}</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#003D7A] mb-2">
                      {t("support.ageLabel")}
                    </label>
                    <input
                      type="text"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder={t("support.agePlaceholder")}
                      className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003D7A] focus:border-transparent text-[#003D7A] placeholder-[#555]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#003D7A] mb-2">
                      {t("support.vitalsLabel")}
                    </label>
                    <input
                      type="text"
                      value={vitals}
                      onChange={(e) => setVitals(e.target.value)}
                      placeholder={t("support.vitalsPlaceholder")}
                      className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003D7A] focus:border-transparent text-[#003D7A] placeholder-[#555]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-[#003D7A]">
                      {t("support.symptomsLabel")}
                    </label>
                    <button
                      onClick={() => toggleVoiceRecord(setSupportSymptoms, "support-symptoms")}
                      className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold transition ${
                        isRecording && recordingTab === "support-symptoms"
                          ? "bg-[#DC3545] text-white"
                          : "bg-[#E8F4F8] text-[#003D7A] hover:bg-[#D0E8F0]"
                      }`}
                    >
                      {isRecording && recordingTab === "support-symptoms" ? (
                        <>
                          <MicOff size={16} />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic size={16} />
                          Voice
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={supportSymptoms}
                    onChange={(e) => setSupportSymptoms(e.target.value)}
                    placeholder={t("support.symptomsPlaceholder")}
                    className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003D7A] focus:border-transparent h-24 text-[#003D7A] placeholder-[#555]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={getSupport}
                    className="flex-1 bg-[#0D7377] text-white py-3 rounded-lg font-bold hover:bg-[#056064] transition flex items-center justify-center gap-2"
                  >
                    <Brain size={20} />
                    {t("support.getButton")}
                  </button>
                  {supportOutput && (
                    <button
                      onClick={() => speakResponse(supportOutput)}
                      className="bg-[#003D7A] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#00264D] transition flex items-center gap-2"
                      title="Speak response"
                    >
                      <Volume2 size={20} />
                    </button>
                  )}
                </div>

                {supportOutput && (
                  <div className="bg-[#E8F4F8] border-l-4 border-[#0D7377] rounded-lg p-6">
                    <p className="font-semibold text-[#003D7A] mb-2">
                      {t("support.recommendation")}
                    </p>
                    <p className="text-[#333] mb-2">{supportOutput}</p>
                    <p className="text-xs text-[#333]">
                      {t("support.disclaimer")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pathways Tab */}
          {activeTab === "pathways" && (
            <div className="p-8">
              <h2 className="text-3xl font-bold text-[#003D7A] mb-2">
                {t("pathways.title")}
              </h2>
              <p className="text-[#333] mb-8">{t("pathways.subtitle")}</p>

              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-semibold text-[#003D7A] mb-2">
                    {t("pathways.conditionLabel")}
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003D7A] focus:border-transparent text-[#003D7A]"
                  >
                    <option>Diabetes</option>
                    <option>Hipertensi</option>
                    <option>Asma</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-[#003D7A]">
                      {t("pathways.historyLabel")}
                    </label>
                    <button
                      onClick={() => toggleVoiceRecord(setHistory, "pathways-history")}
                      className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold transition ${
                        isRecording && recordingTab === "pathways-history"
                          ? "bg-[#DC3545] text-white"
                          : "bg-[#E8F4F8] text-[#003D7A] hover:bg-[#D0E8F0]"
                      }`}
                    >
                      {isRecording && recordingTab === "pathways-history" ? (
                        <>
                          <MicOff size={16} />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic size={16} />
                          Voice
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={history}
                    onChange={(e) => setHistory(e.target.value)}
                    placeholder={t("pathways.historyPlaceholder")}
                    className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003D7A] focus:border-transparent h-24 text-[#003D7A] placeholder-[#555]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={getPathway}
                    className="flex-1 bg-[#0D7377] text-white py-3 rounded-lg font-bold hover:bg-[#056064] transition flex items-center justify-center gap-2"
                  >
                    <RouteIcon size={20} />
                    {t("pathways.generateButton")}
                  </button>
                  {pathwayOutput && (
                    <button
                      onClick={() => speakResponse(pathwayOutput)}
                      className="bg-[#003D7A] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#00264D] transition flex items-center gap-2"
                      title="Speak response"
                    >
                      <Volume2 size={20} />
                    </button>
                  )}
                </div>

                {pathwayOutput && (
                  <div className="bg-[#D4EDDA] border-l-4 border-[#28A745] rounded-lg p-6">
                    <p className="font-semibold text-[#155724] mb-2">
                      {t("pathways.recommended")}
                    </p>
                    <p className="text-[#333] mb-3 whitespace-pre-wrap">
                      {pathwayOutput}
                    </p>
                    <div className="flex gap-2 text-xs">
                      <CheckCircle className="w-4 h-4 text-[#28A745] flex-shrink-0" />
                      <p className="text-[#155724]">
                        {t("pathways.followUp")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hospitals Tab */}
          {activeTab === "hospitals" && (
            <div className="p-8">
              <h2 className="text-3xl font-bold text-[#003D7A] mb-2">
                {t("nav.hospitals")}
              </h2>
              <p className="text-[#333] mb-8">
                {i18n.language === "en" 
                  ? "Find nearby hospitals with live wait times and available doctors to help manage patient flow."
                  : "Temukan rumah sakit terdekat dengan waktu tunggu aktif dan dokter yang tersedia untuk membantu mengelola aliran pasien."}
              </p>

              {recommendedHospitals.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {recommendedHospitals.map((hospital) => (
                    <div key={hospital.id} className="border-2 border-[#E0E0E0] rounded-lg p-6 hover:shadow-lg transition">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-[#003D7A] mb-1">
                            {hospital.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-[#333]">
                            <MapPin size={16} />
                            {hospital.city}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-[#E8F4F8] rounded-lg px-3 py-2 mb-2">
                            <p className="text-xs text-[#333]">
                              {i18n.language === "en" ? "Wait Time" : "Waktu Tunggu"}
                            </p>
                            <p className="text-2xl font-bold text-[#0D7377]">
                              {hospital.waitTime}m
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-[#F0F8FF] rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Bed size={16} className="text-[#003D7A]" />
                            <p className="text-xs text-[#333] font-semibold">
                              {i18n.language === "en" ? "Occupancy" : "Okupansi"}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-[#003D7A]">
                            {hospital.occupancy}%
                          </p>
                        </div>
                        <div className="bg-[#F0F8FF] rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Users size={16} className="text-[#003D7A]" />
                            <p className="text-xs text-[#333] font-semibold">
                              {i18n.language === "en" ? "Doctors" : "Dokter"}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-[#003D7A]">
                            {hospital.doctors.length}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-semibold text-[#003D7A] mb-2">
                          {i18n.language === "en" ? "Available Doctors" : "Dokter Tersedia"}
                        </p>
                        <div className="space-y-2">
                          {hospital.doctors.map((doctor, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-[#0D7377] rounded-full"></div>
                              <span className="text-[#333]">{doctor.name}</span>
                              <span className="text-[#666] text-xs">({doctor.specialty})</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button className="w-full bg-[#0D7377] text-white py-3 rounded-lg font-bold hover:bg-[#056064] transition">
                        {i18n.language === "en" ? "Book Appointment" : "Pesan Jadwal"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#E8F4F8] border-2 border-[#0D7377] rounded-lg p-8 text-center">
                  <MapPin className="w-12 h-12 text-[#0D7377] mx-auto mb-4 opacity-50" />
                  <p className="text-[#333] mb-2">
                    {i18n.language === "en" 
                      ? "Get a triage assessment first to see hospital recommendations"
                      : "Lakukan penilaian triase terlebih dahulu untuk melihat rekomendasi rumah sakit"}
                  </p>
                  <p className="text-sm text-[#666]">
                    {i18n.language === "en"
                      ? "Recommendations will appear based on your urgency level"
                      : "Rekomendasi akan ditampilkan berdasarkan tingkat urgensi Anda"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#003D7A] text-white mt-16 py-8 border-t border-[#00264D]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="font-bold mb-3">{t("footer.satusehat")}</p>
              <p className="text-sm opacity-90">{t("footer.description")}</p>
            </div>
            <div>
              <p className="font-bold mb-3">{t("footer.quickLinks")}</p>
              <ul className="text-sm space-y-2 opacity-90">
                <li>
                  <a href="#" className="hover:opacity-100">
                    {t("footer.about")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:opacity-100">
                    {t("footer.help")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-3">{t("footer.services")}</p>
              <ul className="text-sm space-y-2 opacity-90">
                <li>
                  <a href="#" className="hover:opacity-100">
                    {t("footer.providerLogin")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:opacity-100">
                    {t("footer.patientPortal")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-3">{t("footer.contact")}</p>
              <p className="text-sm opacity-90">{t("footer.email")}</p>
              <p className="text-sm opacity-90">{t("footer.hotline")}</p>
            </div>
          </div>

          <div className="border-t border-[#00264D] pt-6 text-center text-sm opacity-90">
            <p>{t("footer.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
