# 🕵️‍♂️ ML Inspector Suite

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Nvidia NIM](https://img.shields.io/badge/AI-Nvidia_NIM-76B900?logo=nvidia)
![TanStack](https://img.shields.io/badge/TanStack-Start-FF4154)

ML Inspector Suite is a comprehensive toolkit for AI/ML engineers to audit, evaluate, and debug modern LLM and RAG pipelines. Built with TanStack Start, Vercel AI SDK, and powered by Nvidia NIM (Llama 3.1 70B), this suite provides a unified dashboard for responsible AI development.

---

## 🏗️ System Architecture

The application is built on a modern server-side rendered architecture using TanStack Start and Supabase for persistence. The AI workloads are routed through a unified AI Gateway to Nvidia NIM using strict JSON Schemas for predictable structured outputs.

```mermaid
graph TD
    %% Styling
    classDef frontend fill:#3178c6,stroke:#fff,stroke-width:2px,color:#fff;
    classDef backend fill:#e0234e,stroke:#fff,stroke-width:2px,color:#fff;
    classDef ai fill:#76b900,stroke:#fff,stroke-width:2px,color:#fff;
    classDef db fill:#3ecf8e,stroke:#fff,stroke-width:2px,color:#fff;

    %% Nodes
    UI[Client Browser UI]:::frontend
    TS[TanStack Server Functions]:::backend
    Supabase[(Supabase PostgreSQL)]:::db
    Auth[Supabase Auth]:::db
    Gateway[AI Gateway Provider]:::backend
    NIM[Nvidia NIM Llama 3.1 70B]:::ai
    VercelAI[Vercel AI SDK]:::backend

    %% Connections
    UI <-->|TanStack Router / tRPC-like| TS
    UI <-->|JWT Auth| Auth
    TS <-->|Drizzle / Supabase Client| Supabase
    TS -->|GenerateObject| VercelAI
    VercelAI -->|Structured JSON Schema| Gateway
    Gateway -->|OpenAI Compatible API| NIM
    
    subgraph "Core Applications"
        TS
        VercelAI
        Gateway
    end
```

---

## ✨ Core Tools

1. 🔍 **RAG Debugger**: Evaluate retrieval pipelines for grounding, hallucination, and chunk relevance using a specialized judge LLM.
2. 📝 **Model Cards**: Automatically generate highly detailed, HuggingFace/Google-compatible Model Cards based on minimal engineering context.
3. 🧪 **Prompt Tester**: Systematically test system prompts across various test cases and evaluate responses using an LLM-as-a-judge.
4. 🏆 **Benchmarks**: Run multi-model benchmarking suites (e.g., comparing reasoning capabilities across Llama 3.1, Gemini, Claude).
5. 🔪 **Chunking Simulator**: Test different text splitting strategies (Fixed, Sliding, Sentence, Paragraph) and evaluate their retrieval performance.
6. ⚖️ **Bias Auditor**: Automatically scan datasets and model outputs for demographic bias and toxicity.
7. 💸 **Cost Estimator**: Calculate projected token costs for production RAG and LLM deployments.
8. 📊 **Audit Reports**: Generate PDF compliance reports for AI safety and enterprise regulations.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22+ (or Bun)
- A Supabase project
- An Nvidia API Key (for NIM access)

### Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_nvidia_nim_api_key
```

### Installation
```bash
npm install
# Start the development server
npm run dev
```
Navigate to `http://localhost:5173` to access the suite!

---

## 🛠️ Tech Stack

- **Framework:** TanStack Start (React 19 + SSR)
- **AI Integration:** Vercel AI SDK 
- **LLM Provider:** Nvidia NIM (`meta/llama-3.1-70b-instruct`)
- **Database & Auth:** Supabase (PostgreSQL)
- **Styling:** TailwindCSS v4 + Radix UI Primitives
- **Schema Validation:** Zod + Zod-to-JSON-Schema
