export type CareTier = "PHC" | "CHC" | "SDH" | "DH" | "Medical College";
export type WorkerRole = "ASHA" | "ANM" | "MO";
export type FollowUpChannel = "SMS" | "VOICE";

export type Facility = {
  id: string;
  name: string;
  district: string;
  tier: CareTier;
  specialties: string[];
  totalBeds: number;
  occupiedBeds: number;
  oxygenBeds: number;
  occupiedOxygenBeds: number;
  emergencyQueue: number;
};

export type PatientReferral = {
  patientName: string;
  age: number;
  district: string;
  symptoms: string;
  severity: 1 | 2 | 3 | 4 | 5;
  needsSpecialty: string;
  currentTier: CareTier;
  preferredLanguage: string;
  abhaId: string;
};

export type TriageBand = "self-care" | "routine" | "urgent" | "critical";

export type TriageAssessment = {
  score: number;
  band: TriageBand;
  recommendedTier: CareTier;
  reasons: string[];
  followUpDays: number[];
  voiceCheckInPreferred: boolean;
};

export type FollowUpCheckIn = {
  day: number;
  channel: FollowUpChannel;
  prompt: string;
};

export type FollowUpReview = {
  improving: boolean;
  risk: boolean;
  severityDelta: -1 | 0 | 1;
};

export const TIER_ORDER: CareTier[] = [
  "PHC",
  "CHC",
  "SDH",
  "DH",
  "Medical College",
];

const TIER_INDEX: Record<CareTier, number> = {
  PHC: 0,
  CHC: 1,
  SDH: 2,
  DH: 3,
  "Medical College": 4,
};

const HIGH_RISK_TOKENS = [
  "chest pain",
  "breathless",
  "seizure",
  "bleeding",
  "stroke",
  "unconscious",
  "pregnancy complication",
  "trauma",
  "high fever",
];

const MODERATE_RISK_TOKENS = [
  "vomiting",
  "dehydration",
  "persistent fever",
  "fracture",
  "severe cough",
  "infection",
];

export const ROLE_WORKFLOW: Record<WorkerRole, string[]> = {
  ASHA: [
    "Capture household screening",
    "Record vitals and danger signs",
    "Create referral draft",
  ],
  ANM: [
    "Validate risk category",
    "Confirm immunization and maternal profile",
    "Escalate to MO when red flags present",
  ],
  MO: [
    "Clinical triage",
    "Issue referral recommendation",
    "Approve transport and receiving unit",
  ],
};

export const FACILITY_SEED: Facility[] = [
  {
    id: "f1",
    name: "Wai PHC",
    district: "Satara",
    tier: "PHC",
    specialties: ["General Medicine", "Maternal Care"],
    totalBeds: 20,
    occupiedBeds: 12,
    oxygenBeds: 4,
    occupiedOxygenBeds: 2,
    emergencyQueue: 3,
  },
  {
    id: "f2",
    name: "Karad CHC",
    district: "Satara",
    tier: "CHC",
    specialties: ["General Surgery", "Pediatrics", "Obstetrics"],
    totalBeds: 60,
    occupiedBeds: 44,
    oxygenBeds: 12,
    occupiedOxygenBeds: 7,
    emergencyQueue: 8,
  },
  {
    id: "f3",
    name: "Aundh SDH",
    district: "Pune",
    tier: "SDH",
    specialties: ["Cardiology", "Orthopedics", "Obstetrics"],
    totalBeds: 110,
    occupiedBeds: 96,
    oxygenBeds: 24,
    occupiedOxygenBeds: 20,
    emergencyQueue: 13,
  },
  {
    id: "f4",
    name: "Nashik DH",
    district: "Nashik",
    tier: "DH",
    specialties: ["Neurology", "Cardiology", "Trauma Care"],
    totalBeds: 220,
    occupiedBeds: 166,
    oxygenBeds: 48,
    occupiedOxygenBeds: 30,
    emergencyQueue: 16,
  },
  {
    id: "f5",
    name: "Sassoon Medical College",
    district: "Pune",
    tier: "Medical College",
    specialties: ["Oncology", "Neonatal ICU", "Cardio Thoracic"],
    totalBeds: 640,
    occupiedBeds: 522,
    oxygenBeds: 180,
    occupiedOxygenBeds: 120,
    emergencyQueue: 28,
  },
];

export function getNextTier(currentTier: CareTier): CareTier[] {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  return TIER_ORDER.slice(currentIndex + 1);
}

export function bedAvailability(facility: Facility): number {
  if (facility.totalBeds <= 0) {
    return 0;
  }
  return Math.max((facility.totalBeds - facility.occupiedBeds) / facility.totalBeds, 0);
}

function oxygenAvailability(facility: Facility): number {
  if (facility.oxygenBeds <= 0) {
    return 0;
  }
  return Math.max(
    (facility.oxygenBeds - facility.occupiedOxygenBeds) / facility.oxygenBeds,
    0,
  );
}

function districtFit(patientDistrict: string, facilityDistrict: string): number {
  return patientDistrict.toLowerCase() === facilityDistrict.toLowerCase() ? 1 : 0.6;
}

export function rankFacility(facility: Facility, referral: PatientReferral): number {
  const specialtyFit = facility.specialties.some(
    (item) => item.toLowerCase() === referral.needsSpecialty.toLowerCase(),
  )
    ? 1
    : 0.4;
  const severityWeight = referral.severity / 5;
  const queuePenalty = Math.min(facility.emergencyQueue / 30, 1);

  return (
    0.32 * bedAvailability(facility) +
    0.2 * oxygenAvailability(facility) +
    0.24 * specialtyFit +
    0.14 * districtFit(referral.district, facility.district) +
    0.1 * severityWeight -
    0.15 * queuePenalty
  );
}

export function suggestReferral(
  facilities: Facility[],
  referral: PatientReferral,
): Facility | null {
  const allowedTiers = getNextTier(referral.currentTier);
  const filtered = facilities.filter((facility) => allowedTiers.includes(facility.tier));
  if (filtered.length === 0) {
    return null;
  }

  const ranked = [...filtered].sort(
    (a, b) => rankFacility(b, referral) - rankFacility(a, referral),
  );

  return ranked[0] ?? null;
}

function inferSymptomScore(symptoms: string): { score: number; reasons: string[] } {
  const normalized = symptoms.toLowerCase();
  const reasons: string[] = [];

  let score = 0;
  for (const token of HIGH_RISK_TOKENS) {
    if (normalized.includes(token)) {
      score += 30;
      reasons.push(`High-risk symptom detected: ${token}`);
    }
  }

  for (const token of MODERATE_RISK_TOKENS) {
    if (normalized.includes(token)) {
      score += 14;
      reasons.push(`Moderate-risk symptom detected: ${token}`);
    }
  }

  if (reasons.length === 0) {
    reasons.push("No explicit high-risk keyword detected.");
  }

  return { score, reasons };
}

function mapScoreToTier(score: number): CareTier {
  if (score >= 90) {
    return "Medical College";
  }
  if (score >= 75) {
    return "DH";
  }
  if (score >= 60) {
    return "SDH";
  }
  if (score >= 40) {
    return "CHC";
  }
  return "PHC";
}

function mapScoreToBand(score: number): TriageBand {
  if (score >= 85) {
    return "critical";
  }
  if (score >= 60) {
    return "urgent";
  }
  if (score >= 35) {
    return "routine";
  }
  return "self-care";
}

export function assessPatientTriage(referral: PatientReferral): TriageAssessment {
  const symptomInference = inferSymptomScore(referral.symptoms);
  const baseSeverityScore = referral.severity * 12;
  const ageRiskScore = referral.age >= 60 ? 10 : referral.age <= 5 ? 8 : 0;
  const score = Math.min(baseSeverityScore + ageRiskScore + symptomInference.score, 100);
  const band = mapScoreToBand(score);
  const recommendedTier = mapScoreToTier(score);

  const followUpDays =
    band === "critical"
      ? [1, 2, 4, 7, 14]
      : band === "urgent"
        ? [1, 3, 7, 14]
        : band === "routine"
          ? [2, 7, 14]
          : [3, 14];

  return {
    score,
    band,
    recommendedTier,
    reasons: [
      `Severity contributed ${baseSeverityScore} points.`,
      ...(ageRiskScore > 0 ? [`Age risk contributed ${ageRiskScore} points.`] : []),
      ...symptomInference.reasons,
    ],
    followUpDays,
    voiceCheckInPreferred: band === "critical" || band === "urgent",
  };
}

function facilityOverloadPenalty(facility: Facility): number {
  const bedLoad = facility.occupiedBeds / Math.max(facility.totalBeds, 1);
  const oxygenLoad = facility.occupiedOxygenBeds / Math.max(facility.oxygenBeds, 1);
  const queueLoad = facility.emergencyQueue / 30;
  return 0.5 * bedLoad + 0.3 * oxygenLoad + 0.2 * queueLoad;
}

export function allocateReferralDestination(
  facilities: Facility[],
  referral: PatientReferral,
  triage: TriageAssessment,
): Facility | null {
  const minimumTierIndex = Math.max(
    TIER_INDEX[triage.recommendedTier],
    TIER_INDEX[referral.currentTier],
  );

  const candidates = facilities.filter((facility) => {
    const tierOk = TIER_INDEX[facility.tier] >= minimumTierIndex;
    if (!tierOk) {
      return false;
    }

    const bedLoad = facility.occupiedBeds / Math.max(facility.totalBeds, 1);
    const oxygenLoad = facility.occupiedOxygenBeds / Math.max(facility.oxygenBeds, 1);
    const hardOverload = bedLoad >= 0.96 || oxygenLoad >= 0.96;

    return triage.band === "critical" ? true : !hardOverload;
  });

  if (candidates.length === 0) {
    return null;
  }

  const sorted = [...candidates].sort((a, b) => {
    const aScore = rankFacility(a, referral) - facilityOverloadPenalty(a);
    const bScore = rankFacility(b, referral) - facilityOverloadPenalty(b);
    return bScore - aScore;
  });

  return sorted[0] ?? null;
}

export function reserveFacilityCapacity(
  facilities: Facility[],
  facilityId: string,
  triage: TriageAssessment,
): Facility[] {
  return facilities.map((facility) => {
    if (facility.id !== facilityId) {
      return facility;
    }

    const loadIncrement = triage.band === "critical" ? 2 : 1;
    const oxygenIncrement = triage.band === "critical" || triage.band === "urgent" ? 1 : 0;

    return {
      ...facility,
      occupiedBeds: Math.min(facility.totalBeds, facility.occupiedBeds + loadIncrement),
      occupiedOxygenBeds: Math.min(
        facility.oxygenBeds,
        facility.occupiedOxygenBeds + oxygenIncrement,
      ),
      emergencyQueue: facility.emergencyQueue + (triage.band === "critical" ? 2 : 1),
    };
  });
}

function buildFollowUpPrompt(day: number, channel: FollowUpChannel): string {
  if (channel === "VOICE") {
    return `Day ${day} voice check-in: Please confirm breathing, fever, pain level, and medicine adherence.`;
  }
  return `Day ${day} SMS check-in: Reply with BETTER / SAME / WORSE and mention key symptoms.`;
}

export function createFollowUpPlan(
  triage: TriageAssessment,
): FollowUpCheckIn[] {
  return triage.followUpDays.map((day, index) => {
    const channel: FollowUpChannel =
      triage.voiceCheckInPreferred && index % 2 === 0 ? "VOICE" : "SMS";
    return {
      day,
      channel,
      prompt: buildFollowUpPrompt(day, channel),
    };
  });
}

export function evaluateFollowUpResponse(response: string): FollowUpReview {
  const normalized = response.toLowerCase();
  const worseningTokens = ["worse", "breathless", "pain", "bleeding", "not improving"];
  const improvingTokens = ["better", "improving", "no fever", "stable", "recovered"];

  const hasWorsening = worseningTokens.some((token) => normalized.includes(token));
  const hasImproving = improvingTokens.some((token) => normalized.includes(token));

  if (hasWorsening) {
    return { improving: false, risk: true, severityDelta: 1 };
  }

  if (hasImproving) {
    return { improving: true, risk: false, severityDelta: -1 };
  }

  return { improving: false, risk: false, severityDelta: 0 };
}

export function simulateRealtimeCapacity(facilities: Facility[]): Facility[] {
  return facilities.map((facility) => {
    const occupiedChange = Math.floor(Math.random() * 7) - 3;
    const oxygenChange = Math.floor(Math.random() * 5) - 2;
    const queueChange = Math.floor(Math.random() * 5) - 2;

    const occupiedBeds = Math.min(
      facility.totalBeds,
      Math.max(0, facility.occupiedBeds + occupiedChange),
    );
    const occupiedOxygenBeds = Math.min(
      facility.oxygenBeds,
      Math.max(0, facility.occupiedOxygenBeds + oxygenChange),
    );

    return {
      ...facility,
      occupiedBeds,
      occupiedOxygenBeds,
      emergencyQueue: Math.max(0, facility.emergencyQueue + queueChange),
    };
  });
}

export function validateAbhaId(abhaId: string): boolean {
  // Mock ABHA format validation: 14 numeric digits.
  return /^\d{14}$/.test(abhaId.trim());
}

export function buildSmsFallbackMessage(
  referral: PatientReferral,
  facility: Facility | null,
): string {
  const destination = facility ? `${facility.name} (${facility.tier})` : "No destination available";
  return `MahaHealth REFERRAL | ${referral.patientName}, age ${referral.age}, severity ${referral.severity}/5, from ${referral.currentTier} -> ${destination}. ABHA:${referral.abhaId}.`;
}
