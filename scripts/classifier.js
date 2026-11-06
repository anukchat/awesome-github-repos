// Hybrid Classifier & Category Definitions for Awesome GitHub Repos
const allowedCategories = [
  { name: 'Large Language Models (LLMs)', icon: '🧠', desc: 'Pretrained/fine-tuned models, inference engines, model recipes, optimization.' },
  { name: 'LLMOps & Deployment', icon: '⚙️', desc: 'Infrastructure, orchestration, serving, routing, monitoring for LLMs.' },
  { name: 'AI Agents & Multi-Agent Systems', icon: '🤖', desc: 'Autonomous agents, agent orchestration, frameworks, agent education.' },
  { name: 'Prompt Engineering', icon: '✍️', desc: 'Prompt tuning, optimization, system prompts, evaluation guides.' },
  { name: 'Retrieval-Augmented Generation (RAG)', icon: '🔍', desc: 'RAG frameworks, pipelines, vector DB integration, hybrid search systems.' },
  { name: 'Model Context Protocol (MCP)', icon: '🔌', desc: 'Tools, clients, servers, and implementations for managing model context.' },
  { name: 'AI Frameworks & Toolkits', icon: '🧰', desc: 'Libraries, platforms, or SDKs for building, training, evaluating models.' },
  { name: 'AI Automation & Workflow Tools', icon: '⚡', desc: 'Workflow engines, automation platforms, RPA systems powered by AI.' },
  { name: 'Conversational AI & Chatbots', icon: '💬', desc: 'Frameworks or UIs for chat agents, voice-based interfaces, open chat UIs.' },
  { name: 'Computer Vision & Image Generation', icon: '👁️', desc: 'Vision models, image editing, Stable Diffusion tools, multimodal setups.' },
  { name: 'Speech & Audio (TTS, ASR, Music)', icon: '🎙️', desc: 'Text-to-speech, speech-to-text, music generation, audio processing.' },
  { name: 'Robotics & Embodied AI', icon: '🦾', desc: 'Robotics platforms, AI for robotics, humanoid or autonomous systems.' },
  { name: 'Machine Learning (Traditional)', icon: '📈', desc: 'Non-LLM ML projects, courses, guides, systems design.' },
  { name: 'MLOps & ML Infrastructure', icon: '🏗️', desc: 'Tools for ML pipelines, CI/CD, experimentation, cloud ML infra.' },
  { name: 'AI in Education & Courses', icon: '🎓', desc: 'Bootcamps, lecture notes, LLM/ML tutorials, beginner guides.' },
  { name: 'AI Testing & Evaluation', icon: '🧪', desc: 'Tools or frameworks for model testing, hallucination detection, safety.' },
  { name: 'Natural Language Processing (NLP)', icon: '🗣️', desc: 'Language understanding, transformers, tokenizers, datasets.' },
  { name: 'AI UX/UI Design & Interaction', icon: '🎨', desc: 'Web/Desktop interfaces for AI tools, UI component generation, agent UI.' },
  { name: 'Generative AI', icon: '✨', desc: 'Image, video, podcast, music generation using AI.' },
  { name: 'Data Engineering & Pipelines', icon: '🗄️', desc: 'ETL tools, doc parsers, enrichment tools, structured input generators.' },
  { name: 'Knowledge Management & Graphs', icon: '🕸️', desc: 'Semantic search, AI memory, graph systems, Q&A layers.' },
  { name: 'Low-Code / No-Code AI Tools', icon: '🧩', desc: 'Platforms for visual programming, app building with minimal code.' },
  { name: 'Web Scraping & Automation', icon: '🕷️', desc: 'Crawlers, browser automation, task schedulers, data collectors.' },
  { name: 'System & Software Design', icon: '🏛️', desc: 'Resources and examples on low-level and high-level system design.' },
  { name: 'DevOps & Cloud Infrastructure', icon: '☁️', desc: 'Self-hosting, deployment frameworks, containerized AI setups.' },
  { name: 'Productivity & Developer Tools', icon: '🛠️', desc: 'Resume builders, markdown tools, GitHub UIs, icon generators.' },
  { name: 'Search & Indexing Tools', icon: '🔎', desc: 'Local search, search engine clones, AI-enhanced discovery.' },
  { name: 'Finance & Quantitative Tools', icon: '💹', desc: 'Tools for trading, analysis, hedge funds, forecasting.' },
  { name: 'IoT & Edge AI', icon: '📡', desc: 'Projects combining AI with IoT, edge compute, ESP32-based systems.' },
  { name: 'Awesome Lists & Aggregators', icon: '🌟', desc: 'Curated resources, educational repositories, prompt or tool collections.' },
  { name: 'Others', icon: '📦', desc: 'General open-source platforms and miscellaneous projects.' }
];

const rules = [
  {
    name: 'Awesome Lists & Aggregators',
    score: (r, text, topics) => {
      let s = 0;
      if (/^awesome-|-awesome$|^awesome_|awesome-list|llm-papers/i.test(r.name)) s += 14;
      if (topics.some(t => t === 'awesome' || t === 'awesome-list' || t === 'awesome-lists')) s += 11;
      if (/\b(curated list|curated collection|awesome list|collection of awesome|list of large language model papers)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'Model Context Protocol (MCP)',
    score: (r, text, topics) => {
      let s = 0;
      if (/\bmcp\b|model-context-protocol/i.test(r.name)) s += 16;
      if (topics.some(t => t === 'mcp-server' || t === 'mcp-client' || t === 'model-context-protocol' || t === 'mcp-tools' || t === 'fastmcp')) s += 14;
      if (topics.includes('mcp') && !topics.some(t => /agent|ai-agents|reverse-engineering|dashboard|ocr/i.test(t))) s += 11;
      if (/\b(model context protocol|mcp server|mcp client|mcp tools|callable as mcp)\b/i.test(text)) s += 11;
      return s;
    }
  },
  {
    name: 'Robotics & Embodied AI',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(robot|robotics|ros|ros2|humanoid|embodied-ai|drone|isaac|le-robot|lerobot)$/i.test(t))) s += 14;
      if (/\b(robot|robotics|humanoid|embodied ai|ros2|quadruped|manipulator|teleoperation|physical intelligence)\b/i.test(text)) s += 11;
      return s;
    }
  },
  {
    name: 'Speech & Audio (TTS, ASR, Music)',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(tts|asr|speech-to-text|text-to-speech|voice-cloning|audio-generation|music-generation|whisper|voice-ai|audiobook)$/i.test(t)) && !topics.some(t => /video-production|video-generation|text-to-video/i.test(t))) s += 14;
      if (/\b(text-to-speech|speech-to-text|voice cloning|\btts\b|\basr\b|speech recognition|audio generation|music generation|elevenlabs alternative|whisper|kokoro|parler-tts|dubbing)\b/i.test(text) && !/\bvideo production\b/i.test(text)) s += 11;
      return s;
    }
  },
  {
    name: 'Finance & Quantitative Tools',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /finance|trading|quant|quantitative|stock|crypto|algotrading|hedge-fund|financial|backtesting|market/i.test(t))) s += 13;
      if (/\b(financial market|trading|quantitative|hedge fund|stock market|orderbook|backtesting|portfolio|fintech|algotrading|finansiell analyse|verdivurdering)\b/i.test(text)) s += 10;
      return s;
    }
  },
  {
    name: 'IoT & Edge AI',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(iot|esp32|arduino|raspberry-pi|edge-ai|embedded|home-assistant|microcontroller|jetson|tinyml|wearable)$/i.test(t))) s += 13;
      if (/\b(esp32|\biot\b|edge ai|microcontroller|raspberry pi|jetson|embedded device|tinyml|on-device ai|home assistant|wearable device)\b/i.test(text)) s += 10;
      return s;
    }
  },
  {
    name: 'Knowledge Management & Graphs',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /knowledge-graph|ontology|neo4j|graphrag|second-brain|obsidian|note-taking|notetaking|memory|knowledge-base|mindmap|markmap/i.test(t))) s += 12;
      if (/\b(knowledge graph|ontology|graphrag|second brain|ai memory|memory layer|semantic graph|mindmap|obsidian|note-taking|notetaking|wiki|document library)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'Retrieval-Augmented Generation (RAG)',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(rag|retrieval-augmented-generation|vector-database|vector-search|embeddings|reranker|hybrid-search|chunking)$/i.test(t))) s += 12;
      if (/\b(retrieval-augmented generation|\brag\b|vector database|hybrid search|document retrieval|rerank|nemo retriever)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'Computer Vision & Image Generation',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /computer-vision|object-detection|segmentation|ocr|image-generation|stable-diffusion|comfyui|flux|yolo|point-cloud|3d-reconstruction|gaussian-splatting/i.test(t))) s += 12;
      if (/\b(computer vision|object detection|image segmentation|segment anything|\bocr\b|stable diffusion|image editing|depth estimation|face recognition|vision model|3d reconstruction|visual foundation models)\b/i.test(text)) s += 10;
      return s;
    }
  },
  {
    name: 'Generative AI',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /video-generation|text-to-video|aivideo|video-production|animation|filmmaking|diffusion|multimodal-generation/i.test(t))) s += 12;
      if (/\b(video generation|text-to-video|video production|podcast generation|generative video|world model|diffusion model|open genai stack|render video)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'Web Scraping & Automation',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /web-scraping|scraper|crawler|browser-automation|playwright|puppeteer|selenium|headless-browser|crawling|downloader/i.test(t))) s += 11;
      if (/\b(web scraping|web crawler|scraper|browser automation|crawl|scrape|headless browser|download image galleries)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'Data Engineering & Pipelines',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(etl|data-engineering|data-pipeline|pdf-parser|document-parsing|data-extraction|duckdb|apache-arrow|parquet|data-processing)$/i.test(t))) s += 12;
      if (/\b(etl|data pipeline|data extraction|extract structured data|document parsing|pdf parser|distributed query engine|data processing|text-to-sql|pyspark)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'Search & Indexing Tools',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(search-engine|full-text-search|elasticsearch|algolia|typesense|meilisearch|indexing|site-search|local-search|rss-reader)$/i.test(t))) s += 11;
      if (/\b(search engine|full-text search|algolia|elasticsearch|indexing engine|deep research|perplexity|trending topics|rss reader|newsnow)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'AI Testing & Evaluation',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(evals|llm-evaluation|benchmark|testing|e2e-testing|red-teaming|ai-safety|guardrails|hallucination)$/i.test(t))) s += 11;
      if (/\b(llm evaluation|\bevals\b|benchmark|red teaming|hallucination|guardrails|e2e testing|test automation|security scanner|pentesting)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'AI in Education & Courses',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(course|tutorial|tutorials|education|learning|bootcamp|roadmap|book|books|cookbook|interview-preparation|notebooks|computer-science)$/i.test(t))) s += 10;
      if (/\b(tutorial|tutorials|course|bootcamp|from scratch|step-by-step|handbook|cookbook|cookbooks|quickstarts|guide to|textbook|curriculum|interview|book for learning|kaggle book|cheatsheets|3blue1brown|manim|skill taxonomy|python examples|articles, conferences)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'Prompt Engineering',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /prompt-engineering|prompts|system-prompts|context-engineering|dspy/i.test(t))) s += 12;
      if (/\b(prompt engineering|system prompt|prompt optimization|optimize prompts|reflective optimization|context engineering|prompt tuning)\b/i.test(text)) s += 10;
      return s;
    }
  },
  {
    name: 'Conversational AI & Chatbots',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(chatbot|ai-chat|chat-ui|conversational-ai|voice-assistant|open-webui)$/i.test(t))) s += 11;
      if (/\b(chat app|chat ui|chatbot|conversational ai|chat interface|best chatgpt|openchatkit|opengpts|communication platform)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'AI UX/UI Design & Interaction',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /ui-design|design-system|figma|canvas|whiteboard|generative-ui|ag-ui|copilotkit|diagram|mermaid|drawio|radix-ui|shadcn-ui|threejs|webgl/i.test(t))) s += 10;
      if (/\b(ui component|design tool|design platform|figma|penpot|canvas|diagram|mermaid|user interface|generative ui|ag-ui|custom ui for|text measurement & layout|presentation framework|webgl visualization|build great interfaces)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'Low-Code / No-Code AI Tools',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /low-code|no-code|visual-programming|drag-and-drop|app-builder/i.test(t))) s += 11;
      if (/\b(low-code|no-code|visual programming|drag-and-drop|visual builder)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'AI Automation & Workflow Tools',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(workflow|workflow-automation|automation|n8n|rpa|task-automation|cron|scheduler)$/i.test(t))) s += 10;
      if (/\b(workflow engine|workflow automation|automate tasks|automate the mundane|rpa|zapier|n8n)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'LLMOps & Deployment',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /llmops|llm-serving|llm-gateway|observability|tracing|openrouter|litellm|vllm|ollama|inference-server|routing/i.test(t))) s += 11;
      if (/\b(llmops|llm gateway|model serving|inference server|observability|tracing|proxy|routing|token cost|rate limit|sandbox runtime|private runtime for autonomous|serve llm agents in production)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'Large Language Models (LLMs)',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(llm|large-language-models|fine-tuning|lora|quantization|gguf|llama|qwen|deepseek|inference-engine|mlx|tensorrt)$/i.test(t))) s += 9;
      if (/\b(inference engine|large language model|llm inference|fine-tuning|quantization|pretrained|foundation model|gguf|mlx|llama|qwen|deepseek-v3|vllm)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'Natural Language Processing (NLP)',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(nlp|natural-language-processing|tokenizer|named-entity-recognition|sentiment-analysis|text-classification|translation)$/i.test(t))) s += 11;
      if (/\b(natural language processing|\bnlp\b|tokenizer|tokenization|named entity|text classification|language understanding|machine translation|document translation|translate documents)\b/i.test(text)) s += 10;
      return s;
    }
  },
  {
    name: 'Machine Learning (Traditional)',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(machine-learning|deep-learning|reinforcement-learning|time-series|tabular|scikit-learn|xgboost|pytorch|neural-network)$/i.test(t))) s += 9;
      if (/\b(reinforcement learning|rl training|autograd engine|recommendation algorithm|algorithm powering the for you feed|deepmind publications|time series|tabular data|gradient boosting|classical ml)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'MLOps & ML Infrastructure',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /mlops|gpu|cuda|distributed-training|kubernetes-ml|experiment-tracking|mlflow/i.test(t))) s += 11;
      if (/\b(mlops|distributed training|gpu cluster|cuda|ml infrastructure|experiment tracking)\b/i.test(text)) s += 9;
      return s;
    }
  },
  {
    name: 'DevOps & Cloud Infrastructure',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(devops|docker|kubernetes|containers|self-hosted|cloud-native|terraform|linux|vpn|networking|reverse-proxy|sandbox)$/i.test(t))) s += 9;
      if (/\b(docker|kubernetes|container|self-hosted|cloud infrastructure|reverse proxy|virtual machine|sandbox|firewall|git server|nextcloud server)\b/i.test(text)) s += 8;
      return s;
    }
  },
  {
    name: 'System & Software Design',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /system-design|architecture|software-engineering|reverse-engineering|decompiler|disassembler|operating-system|compiler|database-internals/i.test(t))) s += 11;
      if (/\b(system design|software architecture|reverse engineering|disassembler|operating system|distributed systems|design patterns|spec-driven|protocol|fullstack|realworld)\b/i.test(text)) s += 8;
      return s;
    }
  },
  {
    name: 'Productivity & Developer Tools',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(developer-tools|cli|terminal|ide|neovim|vscode|git|productivity|markdown|resume|dotfiles|wayland|window-manager|boilerplate|nextjs-template|turborepo)$/i.test(t))) s += 9;
      if (/\b(terminal|cli tool|coding cli|code editor|developer tool|git worktree|productivity|resume|cv website|markdown|window manager|compositor|dotfiles|code understanding|ebook-reader|turborepo|fasthtml)\b/i.test(text)) s += 8;
      return s;
    }
  },
  {
    name: 'AI Frameworks & Toolkits',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /^(sdk|ai-sdk|langchain|llamaindex|framework|toolkit|fastapi|pydantic)$/i.test(t))) s += 9;
      if (/\b(sdk|toolkit|framework for building|python sdk|typescript sdk)\b/i.test(text)) s += 8;
      return s;
    }
  },
  {
    name: 'AI Agents & Multi-Agent Systems',
    score: (r, text, topics) => {
      let s = 0;
      if (topics.some(t => /agent|agents|ai-agent|ai-agents|multi-agent|agentic|coding-agent|claude-code|codex|agent-skills|autonomous-agents|agent-harness|openclaw|opencode|cursor|skill/i.test(t))) s += 10;
      if (/\b(ai agent|autonomous agent|multi-agent|coding agent|web agent|claude code|agent harness|harnessing|agent skill|skills for real engineers|power of the hugging face|agentic|subagent|agent orchestration|agent teams|openmanus|cowork|coworker|openworker|skills in claude|skills in chatgpt|codexskills)\b/i.test(text)) s += 9;
      return s;
    }
  }
];

function classifyDeterministic(repo, readmeText = '') {
  const text = `${repo.full_name} ${repo.description || ''} ${(repo.topics || []).join(' ')} ${readmeText}`;
  const topics = (repo.topics || []).map(t => t.toLowerCase());
  let best = 'Others';
  let bestScore = 0;
  for (const rule of rules) {
    const s = rule.score(repo, text, topics);
    if (s > bestScore) {
      bestScore = s;
      best = rule.name;
    }
  }
  return { category: best, score: bestScore };
}

module.exports = {
  allowedCategories,
  classifyDeterministic
};
