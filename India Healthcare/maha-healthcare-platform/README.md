# MahaHealth Referral Grid

Next.js platform prototype for Maharashtra Government Health Department to manage tiered referrals and frontline workflows.

## Core Features

- Intelligent referral engine for PHC -> CHC -> SDH -> DH -> Medical College routing.
- ASHA/ANM/MO workflow cards mapped to field operations.
- Real-time capacity simulation with bed, oxygen, and emergency queue metrics.
- ABHA format verification (mock integration-ready validation layer).
- Multimodal AI utilities:
	- Voice capture for symptoms (SpeechRecognition API)
	- Voice output for referral summary (SpeechSynthesis API)
- Offline-first behavior:
	- Referral queue in local storage
	- Service-worker caching and later sync behavior
- SMS fallback payload generation for low-connectivity escalation.

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Validation

```bash
npm run lint
npm run build
```

## Tech

- Next.js 16 App Router + TypeScript
- Tailwind CSS v4
- Browser APIs for voice and offline features
