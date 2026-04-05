"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  assessPatientTriage,
  allocateReferralDestination,
  createFollowUpPlan,
  evaluateFollowUpResponse,
  FACILITY_SEED,
  FollowUpChannel,
  ROLE_WORKFLOW,
  TIER_ORDER,
  WorkerRole,
  buildSmsFallbackMessage,
  bedAvailability,
  reserveFacilityCapacity,
  simulateRealtimeCapacity,
  suggestReferral,
  validateAbhaId,
  type FollowUpCheckIn,
  type Facility,
  type PatientReferral,
  type TriageAssessment,
} from "@/lib/healthcare";

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const EMPTY_REFERRAL: PatientReferral = {
  patientName: "",
  age: 0,
  district: "Pune",
  symptoms: "",
  severity: 3,
  needsSpecialty: "General Medicine",
  currentTier: "PHC",
  preferredLanguage: "English",
  abhaId: "",
};

const ADDITIONAL_LINKS = [
  "Home",
  "Documents",
  "Policies and Guidelines",
  "Community Processes: CPHC",
];

type ServiceNeed = "book" | "advice" | "emergency" | "followup";
type JourneyStage = "triage" | "booking" | "advice" | "complete";

type ChatMessage = {
  sender: "citizen" | "assistant";
  text: string;
  offline?: boolean;
};

type SupportedLanguage =
  | "English"
  | "Marathi"
  | "Hindi"
  | "Urdu"
  | "Gujarati"
  | "Kannada"
  | "Telugu"
  | "Tamil"
  | "Konkani";

const LANGUAGE_OPTIONS: SupportedLanguage[] = [
  "English",
  "Marathi",
  "Hindi",
  "Urdu",
  "Gujarati",
  "Kannada",
  "Telugu",
  "Tamil",
  "Konkani",
];

const SPEECH_LOCALE: Record<SupportedLanguage, string> = {
  English: "en-IN",
  Marathi: "mr-IN",
  Hindi: "hi-IN",
  Urdu: "ur-IN",
  Gujarati: "gu-IN",
  Kannada: "kn-IN",
  Telugu: "te-IN",
  Tamil: "ta-IN",
  Konkani: "kok-IN",
};

type FollowUpLog = {
  day: number;
  channel: FollowUpChannel;
  response: string;
  improving: boolean;
  risk: boolean;
};

const TRACKING_STEPS = ["Referred", "Arrived", "Treated", "Back-referred"];

export default function Home() {
  const [role, setRole] = useState<WorkerRole>("ASHA");
  const [facilities, setFacilities] = useState<Facility[]>(FACILITY_SEED);
  const [referral, setReferral] = useState<PatientReferral>(EMPTY_REFERRAL);
  const [abhaVerified, setAbhaVerified] = useState(false);
  const [online, setOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<PatientReferral[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const saved = window.localStorage.getItem("maha-offline-referrals");
    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved) as PatientReferral[];
    } catch {
      return [];
    }
  });
  const [voiceActive, setVoiceActive] = useState(false);
  const [uiLanguage, setUiLanguage] = useState<SupportedLanguage>("English");
  const [serviceNeed, setServiceNeed] = useState<ServiceNeed>("book");
  const [journeyStage, setJourneyStage] = useState<JourneyStage>("triage");
  const [trackingIndex, setTrackingIndex] = useState(0);
  const [triageAssessment, setTriageAssessment] = useState<TriageAssessment | null>(null);
  const [assignedFacilityId, setAssignedFacilityId] = useState<string | null>(null);
  const [followUpPlan, setFollowUpPlan] = useState<FollowUpCheckIn[]>([]);
  const [nextFollowUpIndex, setNextFollowUpIndex] = useState(0);
  const [followUpResponse, setFollowUpResponse] = useState("");
  const [followUpLogs, setFollowUpLogs] = useState<FollowUpLog[]>([]);
  const [uniqueReferralId] = useState(
    () => `MH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  );
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentSlot, setAppointmentSlot] = useState("10:00-10:15");
  const [appointmentMode, setAppointmentMode] = useState("In-person");
  const [diagnosticFile, setDiagnosticFile] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") {
      return [
        {
          sender: "assistant",
          text: "Namaste. I can help with appointment booking, symptoms triage, or follow-up advice.",
        },
      ];
    }

    const saved = window.localStorage.getItem("maha-citizen-chat");
    if (!saved) {
      return [
        {
          sender: "assistant",
          text: "Namaste. I can help with appointment booking, symptoms triage, or follow-up advice.",
        },
      ];
    }

    try {
      return JSON.parse(saved) as ChatMessage[];
    } catch {
      return [
        {
          sender: "assistant",
          text: "Namaste. I can help with appointment booking, symptoms triage, or follow-up advice.",
        },
      ];
    }
  });
  const [statusMessage, setStatusMessage] = useState(
    "Start with How can we help? to continue.",
  );

  const voiceSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const assignedFacility = useMemo(
    () => facilities.find((facility) => facility.id === assignedFacilityId) ?? null,
    [assignedFacilityId, facilities],
  );

  const recommendation = useMemo(
    () => assignedFacility ?? suggestReferral(facilities, referral),
    [assignedFacility, facilities, referral],
  );

  const smsFallback = useMemo(
    () => buildSmsFallbackMessage(referral, recommendation),
    [referral, recommendation],
  );

  useEffect(() => {
    const syncOnline = () => setOnline(navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        setStatusMessage("Service worker unavailable; running in network mode.");
      });
    }

    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFacilities((previous) => simulateRealtimeCapacity(previous));
    }, 2500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "maha-offline-referrals",
      JSON.stringify(offlineQueue),
    );
  }, [offlineQueue]);

  useEffect(() => {
    window.localStorage.setItem("maha-citizen-chat", JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    if (online && offlineQueue.length > 0) {
      const timer = window.setTimeout(() => {
        setStatusMessage(
          `Synced ${offlineQueue.length} offline referrals to district hub.`,
        );
        setOfflineQueue([]);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [offlineQueue.length, online]);

  const onLanguageChange = (chosen: SupportedLanguage) => {
    setUiLanguage(chosen);
    onReferralChange("preferredLanguage", chosen);
  };

  const onReferralChange = <K extends keyof PatientReferral>(
    key: K,
    value: PatientReferral[K],
  ) => {
    setReferral((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const verifyAbha = () => {
    const valid = validateAbhaId(referral.abhaId);
    setAbhaVerified(valid);
    setStatusMessage(
      valid
        ? "ABHA verified. Patient longitudinal record linked."
        : "ABHA validation failed. Use 14-digit ABHA ID.",
    );
  };

  const clampSeverity = (value: number): 1 | 2 | 3 | 4 | 5 => {
    if (value <= 1) {
      return 1;
    }
    if (value === 2) {
      return 2;
    }
    if (value === 3) {
      return 3;
    }
    if (value === 4) {
      return 4;
    }
    return 5;
  };

  const processReferral = () => {
    const triage = assessPatientTriage(referral);
    setTriageAssessment(triage);

    const plannedFollowUps = createFollowUpPlan(triage);
    setFollowUpPlan(plannedFollowUps);
    setNextFollowUpIndex(0);

    if (!online) {
      setOfflineQueue((current) => [...current, referral]);
      setStatusMessage(
        `Offline mode enabled. Triage ${triage.band.toUpperCase()} queued for sync.`,
      );
      return;
    }

    const destination = allocateReferralDestination(facilities, referral, triage);
    if (!destination) {
      setStatusMessage("No eligible destination found in higher tiers.");
      return;
    }

    setAssignedFacilityId(destination.id);
    setFacilities((current) => reserveFacilityCapacity(current, destination.id, triage));
    setTrackingIndex(0);
    setFollowUpLogs([]);

    setStatusMessage(
      `Triage ${triage.band.toUpperCase()} (${triage.score}/100): allocated to ${destination.name} (${destination.tier}) while balancing hospital load.`,
    );
  };

  const startJourney = () => {
    const triage = assessPatientTriage(referral);
    setTriageAssessment(triage);

    if (serviceNeed === "emergency" || triage.band === "critical") {
      setJourneyStage("complete");
      setStatusMessage("Emergency identified. Ambulance and nearest advanced center notified.");
      return;
    }

    if (serviceNeed === "book") {
      setJourneyStage("booking");
      setStatusMessage("Triage complete. Please select appointment date and slot.");
      return;
    }

    setJourneyStage("advice");
    setStatusMessage(`Triage ${triage.band.toUpperCase()} complete. Continue with guided medical advice.`);
  };

  const confirmAppointment = () => {
    if (!appointmentDate) {
      setStatusMessage("Please select an appointment date.");
      return;
    }

    setJourneyStage("complete");
    setStatusMessage(
      `Appointment booked for ${appointmentDate} (${appointmentSlot}) in ${appointmentMode} mode.`,
    );
  };

  const sendAdviceMessage = () => {
    if (!chatInput.trim()) {
      return;
    }

    const citizenMessage: ChatMessage = {
      sender: "citizen",
      text: chatInput.trim(),
      offline: !online,
    };

    const assistantMessage: ChatMessage = {
      sender: "assistant",
      text: online
        ? "Based on current symptoms, hydrate, monitor fever, and seek in-person consult if condition worsens."
        : "Message saved offline. You will receive SMS-based advice sync when network returns.",
      offline: !online,
    };

    setChatMessages((current) => [...current, citizenMessage, assistantMessage]);
    setChatInput("");

    if (!online) {
      setStatusMessage("Offline mode: advice request queued and SMS fallback prepared.");
    }
  };

  const runFollowUpCheckIn = (channel: FollowUpChannel) => {
    const checkIn = followUpPlan[nextFollowUpIndex];
    if (!checkIn) {
      setStatusMessage("All scheduled follow-up check-ins have been completed.");
      return;
    }

    const message = checkIn.prompt.replace(checkIn.channel, channel);
    setChatMessages((current) => [
      ...current,
      {
        sender: "assistant",
        text: `${channel} Check-in (Day ${checkIn.day}): ${message}`,
        offline: !online,
      },
    ]);

    if (channel === "VOICE" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
    }

    setStatusMessage(
      `Follow-up check-in sent via ${channel} for day ${checkIn.day}. Await patient response.`,
    );
  };

  const submitFollowUpResponse = () => {
    if (!followUpResponse.trim()) {
      return;
    }

    const activeCheckIn = followUpPlan[nextFollowUpIndex] ?? {
      day: 0,
      channel: "SMS" as FollowUpChannel,
      prompt: "",
    };
    const review = evaluateFollowUpResponse(followUpResponse);

    setFollowUpLogs((current) => [
      ...current,
      {
        day: activeCheckIn.day,
        channel: activeCheckIn.channel,
        response: followUpResponse,
        improving: review.improving,
        risk: review.risk,
      },
    ]);

    if (review.improving) {
      setTrackingIndex((current) => Math.min(current + 1, TRACKING_STEPS.length - 1));
    }

    if (review.risk) {
      const escalatedSeverity = clampSeverity(referral.severity + review.severityDelta);
      const escalatedReferral = {
        ...referral,
        severity: escalatedSeverity,
      };
      setReferral(escalatedReferral);

      const escalatedTriage = assessPatientTriage(escalatedReferral);
      setTriageAssessment(escalatedTriage);

      const escalatedDestination = allocateReferralDestination(
        facilities,
        escalatedReferral,
        escalatedTriage,
      );

      if (escalatedDestination) {
        setAssignedFacilityId(escalatedDestination.id);
        setFacilities((current) =>
          reserveFacilityCapacity(current, escalatedDestination.id, escalatedTriage),
        );
      }

      setStatusMessage(
        "Follow-up indicates risk of deterioration. Escalation alert generated and referral reprioritized.",
      );
    } else if (review.improving) {
      setStatusMessage("Follow-up indicates improvement. Continue scheduled monitoring.");
    } else {
      setStatusMessage("Follow-up received. Monitoring remains active.");
    }

    setFollowUpResponse("");
    setNextFollowUpIndex((current) => Math.min(current + 1, followUpPlan.length));
  };

  const triggerTrackingStep = () => {
    setTrackingIndex((current) => {
      const next = Math.min(current + 1, TRACKING_STEPS.length - 1);
      if (next !== current) {
        setStatusMessage(`Tracking updated: ${TRACKING_STEPS[next]}.`);
      }
      return next;
    });
  };

  const speakSummary = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatusMessage("Speech synthesis is unavailable in this browser.");
      return;
    }

    const text = recommendation
      ? `Referral for ${referral.patientName || "patient"} is recommended to ${recommendation.name}, ${recommendation.tier}.`
      : "No recommendation available currently.";

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    setStatusMessage("Voice summary played.");
  };

  const startVoiceInput = () => {
    if (!voiceSupported || typeof window === "undefined") {
      setStatusMessage("Voice capture not supported on this browser.");
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechRecognitionClass =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setStatusMessage("Speech recognition API unavailable.");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    const selectedLanguage =
      LANGUAGE_OPTIONS.find((item) => item === referral.preferredLanguage) ?? "English";
    recognition.lang = SPEECH_LOCALE[selectedLanguage];
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setVoiceActive(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      onReferralChange("symptoms", transcript);
      setStatusMessage("Voice notes captured into symptoms field.");
      setVoiceActive(false);
    };

    recognition.onerror = () => {
      setStatusMessage("Could not capture voice note. Retry in stable network.");
      setVoiceActive(false);
    };

    recognition.onend = () => {
      setVoiceActive(false);
    };
  };

  return (
    <div className="portal-shell min-h-screen text-slate-900">
      <div className="gov-top-strip" />
      <header className="bg-white border-b border-[#dddddd]">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-[12px] text-[#5f5f5f]">
            <p>Brihanmumbai Municipal Corporation Healthcare Services</p>
            <label className="flex items-center gap-2 text-[12px]">
              <span>Language</span>
              <select
                value={uiLanguage}
                onChange={(event) => onLanguageChange(event.target.value as SupportedLanguage)}
                className="rounded border border-[#bfcfe3] bg-white px-2 py-1 text-[12px] text-[#36506d]"
              >
                {LANGUAGE_OPTIONS.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#3f3f3f]">बृहन्मुंबई महानगरपालिका | GOVERNMENT OF MAHARASHTRA</p>
              <p className="text-xl font-semibold text-[#0b4f88]">Maharashat Health Mission</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="india-badge">MyBMC</span>
              <span className="india-badge">ABDM Linked</span>
              <span className="india-badge">24x7 Helpline 1916</span>
            </div>
          </div>
        </div>
        <nav className="bg-[#0b4f88] text-white">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap gap-5 px-4 py-2 text-sm sm:px-6">
            <span>Home</span>
            <span>Health Facilities</span>
            <span>Book Appointment</span>
            <span>Medical Advice</span>
            <span>Emergency Helpline</span>
          </div>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <section className="hero-banner rounded-md border border-[#d9e3f0] bg-[linear-gradient(100deg,#eff6ff,#ffffff)] p-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs text-[#6a7d95]">Your health, your city - search and access healthcare services across Mumbai</p>
              <h1 className="mt-1 text-4xl text-[#123f70]">How Can We Help?</h1>
              <p className="mt-2 max-w-3xl text-sm text-[#4e5d70]">
                Start here for triage. We route you to the next best stage: appointment booking, medical advice, emergency assistance, or follow-up care.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={`service-card ${serviceNeed === "book" ? "active" : ""}`}
                  onClick={() => setServiceNeed("book")}
                >
                  Book Appointment
                </button>
                <button
                  type="button"
                  className={`service-card ${serviceNeed === "advice" ? "active" : ""}`}
                  onClick={() => setServiceNeed("advice")}
                >
                  Get Medical Advice
                </button>
                <button
                  type="button"
                  className={`service-card ${serviceNeed === "emergency" ? "active" : ""}`}
                  onClick={() => setServiceNeed("emergency")}
                >
                  Emergency Help
                </button>
                <button
                  type="button"
                  className={`service-card ${serviceNeed === "followup" ? "active" : ""}`}
                  onClick={() => setServiceNeed("followup")}
                >
                  Follow-up Monitoring
                </button>
              </div>
            </div>

            <div className="mumbai-visual-card">
              <Image
                src="/maharashtra-hero.jpg"
                alt="Maharashtra hero visual"
                width={960}
                height={560}
                className="w-full rounded-md border border-[#bfd6ec]"
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="quick-mini-link">
                  <p className="title">Bed Availability</p>
                  <p className="caption">Live public hospital beds</p>
                </div>
                <div className="quick-mini-link">
                  <p className="title">MyBMC Style Access</p>
                  <p className="caption">Book, reports, reminders</p>
                </div>
                <div className="quick-mini-link">
                  <p className="title">Emergency Routing</p>
                  <p className="caption">108 | 112 quick escalation</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="metric-card">
            <p>4.4 L+</p>
            <span>Indoor Patients Treated Yearly</span>
          </article>
          <article className="metric-card">
            <p>1.8 Cr+</p>
            <span>Out Patients Treated Yearly</span>
          </article>
          <article className="metric-card">
            <p>1.3 L+</p>
            <span>Surgeries Completed Yearly</span>
          </article>
          <article className="metric-card">
            <p>500+</p>
            <span>Healthcare Facilities</span>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="glass-panel p-6">
            <h2 className="section-title">Citizen Triage Intake</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="field">
                Patient Name
                <input
                  value={referral.patientName}
                  onChange={(event) => onReferralChange("patientName", event.target.value)}
                  placeholder="Enter patient name"
                />
              </label>
              <label className="field">
                Age
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={referral.age || ""}
                  onChange={(event) => onReferralChange("age", Number(event.target.value))}
                  placeholder="Years"
                />
              </label>
              <label className="field">
                District
                <input
                  value={referral.district}
                  onChange={(event) => onReferralChange("district", event.target.value)}
                />
              </label>
              <label className="field">
                Required Specialty
                <input
                  value={referral.needsSpecialty}
                  onChange={(event) => onReferralChange("needsSpecialty", event.target.value)}
                  placeholder="Cardiology, Pediatrics..."
                />
              </label>
              <label className="field">
                Severity (1-5)
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={referral.severity}
                  onChange={(event) =>
                    onReferralChange("severity", Number(event.target.value) as 1 | 2 | 3 | 4 | 5)
                  }
                />
                <span className="text-xs text-[#54667c]">{referral.severity} / 5</span>
              </label>
              <label className="field">
                Preferred Language
                <select
                  value={referral.preferredLanguage}
                  onChange={(event) => onLanguageChange(event.target.value as SupportedLanguage)}
                >
                  {LANGUAGE_OPTIONS.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field sm:col-span-2">
                Symptoms and Notes
                <textarea
                  rows={3}
                  value={referral.symptoms}
                  onChange={(event) => onReferralChange("symptoms", event.target.value)}
                  placeholder="Observed symptoms, vitals, and risk indicators"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={startJourney} className="btn-primary">
                Continue from Triage
              </button>
              <button type="button" onClick={processReferral} className="btn-secondary">
                Get Referral Destination
              </button>
              <button type="button" onClick={startVoiceInput} className="btn-secondary">
                {voiceActive ? "Listening..." : "Voice Capture"}
              </button>
              <button type="button" onClick={speakSummary} className="btn-secondary">
                Speak Summary
              </button>
            </div>
          </article>

          <article className="glass-panel p-6">
            <h2 className="section-title">Triage Outcome</h2>
            <div className="recommendation-card mt-4">
              <p className="text-xs uppercase tracking-[0.15em] text-[#7b4f21]">Suggested next stage</p>
              <h3 className="mt-1 text-2xl text-[#163f6c]">{journeyStage.toUpperCase()}</h3>
              <p className="mt-2 text-sm text-slate-700">
                {journeyStage === "triage" && "Complete triage inputs to continue."}
                {journeyStage === "booking" && "Citizen can now choose date/slot for appointment booking."}
                {journeyStage === "advice" && "Citizen can proceed with digital medical advice conversation."}
                {journeyStage === "complete" && "Journey closed for this episode. Notifications and follow-up enabled."}
              </p>
              {triageAssessment && (
                <div className="mt-3 rounded-md border border-[#dce6f1] bg-[#f7fbff] p-2 text-xs text-[#365b80]">
                  <p>Triage score: {triageAssessment.score}/100</p>
                  <p>Band: {triageAssessment.band.toUpperCase()}</p>
                  <p>Recommended tier: {triageAssessment.recommendedTier}</p>
                </div>
              )}
            </div>

            <div className="recommendation-card mt-4">
              <p className="text-xs uppercase tracking-[0.15em] text-[#7b4f21]">Intelligent Referral Destination</p>
              {recommendation ? (
                <>
                  <h3 className="mt-1 text-xl text-[#163f6c]">{recommendation.name}</h3>
                  <p className="text-sm text-slate-700">
                    {recommendation.tier} | {recommendation.district} | Bed availability {Math.round(bedAvailability(recommendation) * 100)}%
                  </p>
                  <ul className="mt-2 list-disc pl-4 text-xs text-slate-600">
                    <li>Reasoning: proximity, service match, and live capacity weighting.</li>
                    <li>Registry check: statewide specialty and bed registry queried.</li>
                  </ul>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-700">No suitable higher-tier facility found yet.</p>
              )}
            </div>

            <div className="mt-4 rounded-md border border-[#d8d8d8] bg-[#f8fbff] p-3">
              <p className="text-xs uppercase tracking-[0.15em] text-[#4b6d90]">Unique Tracking ID</p>
              <p className="mt-1 text-base font-semibold text-[#163f6c]">{uniqueReferralId}</p>
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <article className="glass-panel p-6">
            <h2 className="section-title">Book Appointment</h2>
            <p className="text-sm text-slate-600">Citizen self-booking flow activated after triage.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="field">
                Date
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(event) => setAppointmentDate(event.target.value)}
                />
              </label>
              <label className="field">
                Slot
                <select
                  value={appointmentSlot}
                  onChange={(event) => setAppointmentSlot(event.target.value)}
                >
                  <option value="10:00-10:15">10:00-10:15</option>
                  <option value="10:15-10:30">10:15-10:30</option>
                  <option value="11:00-11:15">11:00-11:15</option>
                </select>
              </label>
              <label className="field sm:col-span-2">
                Mode
                <select
                  value={appointmentMode}
                  onChange={(event) => setAppointmentMode(event.target.value)}
                >
                  <option value="In-person">In-person</option>
                  <option value="Teleconsultation">Teleconsultation</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="btn-primary" onClick={confirmAppointment}>
                Confirm Appointment
              </button>
              <button type="button" className="btn-secondary" onClick={verifyAbha}>
                Verify ABHA
              </button>
            </div>
          </article>

          <article className="glass-panel p-6">
            <h2 className="section-title">Medical Advice (Stateful + Offline)</h2>
            <div className="chat-box mt-3">
              {chatMessages.slice(-6).map((message, index) => (
                <div
                  key={`${message.sender}-${index}`}
                  className={`chat-bubble ${message.sender === "assistant" ? "assistant" : "citizen"}`}
                >
                  <p>{message.text}</p>
                  {message.offline && <span className="chat-tag">offline queued</span>}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-md border border-[#c9c9c9] px-3 py-2 text-sm"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Ask for medical advice"
              />
              <button type="button" className="btn-primary" onClick={sendAdviceMessage}>
                Send
              </button>
            </div>
            <div className="mt-3 rounded-md border border-[#d7cec0] bg-[#fff8eb] p-3">
              <p className="text-xs uppercase tracking-[0.15em] text-[#7b4f21]">SMS fallback message</p>
              <p className="mt-1 text-sm text-slate-700">{smsFallback}</p>
            </div>
          </article>
        </section>

        <section className="glass-panel p-6">
          <h2 className="section-title">Use Case Dashboard</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="use-case-card">
              <h3>1. Intelligent Referral Allocation</h3>
              <p>
                Reasoning over statewide registry of services, capacity, and proximity for destination assignment.
              </p>
              <div className="mt-2 text-xs text-slate-600">Current top tier path: {TIER_ORDER.join(" -> ")}</div>
            </article>

            <article className="use-case-card">
              <h3>2. Agentic Tracking and Delay Alerts</h3>
              <p>Track unique episode ID from referral to back-referral with real-time checkpoints.</p>
              <div className="mt-3 grid gap-2">
                {TRACKING_STEPS.map((step, idx) => (
                  <div key={step} className={`track-step ${idx <= trackingIndex ? "active" : ""}`}>
                    {step}
                  </div>
                ))}
              </div>
              <button type="button" className="btn-secondary mt-3" onClick={triggerTrackingStep}>
                Advance Tracking
              </button>
            </article>

            <article className="use-case-card">
              <h3>3. Offline Conversations + SMS Fallback</h3>
              <p>
                Stateful citizen conversations continue in rural PHCs; messages queue locally and sync once network returns.
              </p>
              <div className="mt-2 text-xs text-slate-600">
                Queue size: {offlineQueue.length} | Connectivity: {online ? "Online" : "Offline"}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary" onClick={() => runFollowUpCheckIn("SMS")}>
                  Send SMS Check-in
                </button>
                <button type="button" className="btn-secondary" onClick={() => runFollowUpCheckIn("VOICE")}>
                  Send Voice Check-in
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Patient follow-up response"
                  value={followUpResponse}
                  onChange={(event) => setFollowUpResponse(event.target.value)}
                  className="flex-1 rounded-md border border-[#c9c9c9] px-3 py-2 text-sm"
                />
                <button type="button" className="btn-primary" onClick={submitFollowUpResponse}>
                  Record
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-600">
                Next follow-up slot: {followUpPlan[nextFollowUpIndex]?.day ? `Day ${followUpPlan[nextFollowUpIndex]?.day}` : "Completed"}
              </div>
              {followUpLogs.length > 0 && (
                <div className="mt-2 rounded-md border border-[#dce6f1] bg-[#f7fbff] p-2 text-xs text-[#365b80]">
                  Last follow-up: Day {followUpLogs[followUpLogs.length - 1]?.day} | {followUpLogs[followUpLogs.length - 1]?.channel} | {followUpLogs[followUpLogs.length - 1]?.improving ? "Improving" : "Not improving"}
                </div>
              )}
            </article>

            <article className="use-case-card">
              <h3>4. Multimodal Diagnostics and ABHA Follow-up</h3>
              <p>
                Vision input plus structured outputs for ABHA-linked diagnostics and follow-up monitoring workflows.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Upload marker (image/report name)"
                  value={diagnosticFile}
                  onChange={(event) => setDiagnosticFile(event.target.value)}
                  className="flex-1 rounded-md border border-[#c9c9c9] px-3 py-2 text-sm"
                />
                <button type="button" className="btn-secondary" onClick={verifyAbha}>
                  Link to ABHA
                </button>
              </div>
              <div className="mt-2 rounded-md border border-[#dce6f1] bg-[#f7fbff] p-2 text-xs text-[#365b80]">
                Structured Output: {JSON.stringify({
                  abhaVerified,
                  diagnosticInput: diagnosticFile || "pending",
                  followupRisk: triageAssessment?.band === "critical" || triageAssessment?.band === "urgent" ? "high" : "moderate",
                  followUpScheduled: followUpPlan.length,
                })}
              </div>
            </article>
          </div>
        </section>

        <section className="glass-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">Real-Time Capacity Board</h2>
            <p className="text-xs uppercase tracking-[0.2em] text-[#7b4f21]">
              District and Facility Live Utilization
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {facilities.map((facility) => {
              const availability = Math.round(bedAvailability(facility) * 100);
              return (
                <article key={facility.id} className="capacity-card">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7b4f21]">{facility.tier}</p>
                  <h3 className="mt-1 text-base font-semibold text-[#1f3553]">{facility.name}</h3>
                  <p className="text-sm text-slate-600">{facility.district}</p>
                  <p className="mt-3 text-sm text-slate-700">
                    Beds: {facility.occupiedBeds}/{facility.totalBeds}
                  </p>
                  <p className="text-sm text-slate-700">
                    Oxygen: {facility.occupiedOxygenBeds}/{facility.oxygenBeds}
                  </p>
                  <p className="text-sm text-slate-700">Queue: {facility.emergencyQueue}</p>
                  <div className="mt-3 h-2 rounded-full bg-[#e4d9cb]">
                    <div className="h-full rounded-full bg-[#1f7694]" style={{ width: `${availability}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">Availability {availability}%</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <article className="glass-panel p-5">
            <h2 className="section-title">Additional Links</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              {ADDITIONAL_LINKS.map((item) => (
                <li key={item} className="quick-link-item">
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="glass-panel p-5 text-sm text-slate-700">
            <p className="font-semibold text-[#1f3553]">Live Status</p>
            <p className="mt-2">{statusMessage}</p>
            <p className="mt-2 text-xs text-slate-500">Role workflow currently configured for: {role}</p>
            <label className="field mt-2">
              Care Team Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as WorkerRole)}
              >
                <option value="ASHA">ASHA</option>
                <option value="ANM">ANM</option>
                <option value="MO">MO</option>
              </select>
            </label>
            <ul className="mt-3 grid gap-2 text-xs">
              {ROLE_WORKFLOW[role].map((step, index) => (
                <li key={step} className="workflow-step">
                  <span>{index + 1}</span>
                  {step}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <footer className="rounded-md border border-[#dfdfdf] bg-white p-4 text-xs text-[#666666]">
          <p>Content Owned by National Health Mission</p>
          <p className="mt-1">Developed and hosted by National Informatics Centre, Ministry of Electronics and Information Technology, Government of India</p>
        </footer>
      </main>
    </div>
  );
}
