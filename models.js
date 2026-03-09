const MODELS_DATA = {
  "text": [
    { "id": "gpt-4.1-2025-04-14",         "label": "GPT-4.1",           "editeur": "openai",    "inputPer1M": 2,    "outputPer1M": 8 },
    { "id": "gpt-5-mini-2025-08-07",       "label": "GPT-5 Mini",        "editeur": "openai",    "inputPer1M": 0.25, "outputPer1M": 2 },
    { "id": "gpt-5.2-2025-12-11",          "label": "GPT-5.2",           "editeur": "openai",    "inputPer1M": 1.75, "outputPer1M": 14 },
    { "id": "gpt-5.4-2026-03-05",          "label": "GPT-5.4",           "editeur": "openai",    "inputPer1M": 2.5, "outputPer1M": 15 },
    { "id": "claude-opus-4-6",             "label": "Claude Opus 4.6",   "editeur": "anthropic", "inputPer1M": 5,    "outputPer1M": 25 },
    { "id": "claude-sonnet-4-5-20250929",  "label": "Claude Sonnet 4.5", "editeur": "anthropic", "inputPer1M": 3,    "outputPer1M": 15 },
    { "id": "claude-haiku-4-5-20251001",   "label": "Claude Haiku 4.5",  "editeur": "anthropic", "inputPer1M": 1,    "outputPer1M": 5 },
    { "id": "gemini-3.1-pro-preview",      "label": "Gemini 3.1 Pro",    "editeur": "google",    "inputPer1M": 2,    "outputPer1M": 12 },
    { "id": "gemini-2.5-pro",              "label": "Gemini 2.5 Pro",    "editeur": "google",    "inputPer1M": 1.25, "outputPer1M": 10 },
    { "id": "gemini-2.5-flash",            "label": "Gemini 2.5 Flash",  "editeur": "google",    "inputPer1M": 0.3,  "outputPer1M": 2.5 }
  ],
  "image": [
    { "id": "gemini-3-pro-image-preview",    "label": "Nano Banana Pro", "editeur": "google", "inputPer1M": 2,   "outputPer1M": 12, "imageOutput": 0.134 },
    { "id": "gemini-3.1-flash-image-preview", "label": "Nano Banana 2",  "editeur": "google", "inputPer1M": 0.5, "outputPer1M": 3,  "imageOutput": 0.134 },
    { "id": "gpt-image-1.5",                 "label": "GPT Image 1.5",  "editeur": "openai", "inputPer1M": 5,   "outputPer1M": 10, "imageOutput": 0.2 }
  ],
  "search": [
    { "id": "sonar-pro",            "label": "Sonar Pro",            "editeur": "perplexity", "inputPer1M": 3, "outputPer1M": 15 },
    { "id": "sonar-reasoning-pro",  "label": "Sonar Reasoning Pro",  "editeur": "perplexity", "inputPer1M": 2, "outputPer1M": 8 }
  ]
};
