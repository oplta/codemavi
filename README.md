# 🟦 Code Mavi: The Agentic Open-Source IDE

> **"A tool that doesn't just assist, but thinks, acts, and verifies."**

Code Mavi, yapay zeka destekli yazılım geliştirme sürecini bir adım öteye taşıyan, **"Agent-First"** felsefesiyle tasarlanmış açık kaynaklı bir IDE'dir. VS Code (via Code Mavi) tabanlı bu editör, şeffaf promptları, kendi kendini düzelten döngüleri ve gelişmiş agent orkestrasyonu ile geliştirici deneyimini özgürleştirir.

---

## 🎯 Vizyon: Şeffaf ve Güçlü Agent Deneyimi

Cursor gibi araçların sunduğu kolaylığı, açık kaynak dünyasının şeffaflığıyla birleştiriyoruz. Code Mavi'de agent'ın nasıl düşündüğünü görebilir, promptlara müdahale edebilir ve yerel kurallarınızla onu yönlendirebilirsiniz.

- **Şeffaf Promptlar:** Gizli kutu yok. Her adım izlenebilir ve özelleştirilebilir.
- **Agentic Loop:** Hata aldığında durmayan, analiz edip tekrar deneyen bir zeka.
- **Multi-Model Desteği:** DeepSeek, Zhipu AI, Ollama ve daha fazlası ile tam uyum.

---

## 🏗️ Mimari: Üçlü Agent Sistemi (The Brain)

Code Mavi, karmaşık görevleri çözmek için uzmanlaşmış üç farklı agent katmanını kullanır:

### 🧠 1. Orchestrator (Orkestra Şefi)
Sistemin merkezi sinir sistemidir. Kullanıcı isteğini analiz eder, kod tabanında araştırma yapar ve stratejik bir plan oluşturur.
*Dosya: `src/vs/workbench/contrib/codemavi/common/mavi-logic/agents/orchestrator-prompt.md`*

### 🛠️ 2. Executor (Yürütücü)
Planı hayata geçiren "ellerdir". Hassas "Search/Replace" blokları ve semantik diff'ler üreterek dosyaları fiziksel olarak günceller.
*Dosya: `src/vs/workbench/contrib/codemavi/common/mavi-logic/agents/executor-prompt.md`*

### 🔍 3. Verifier (Doğrulayıcı)
"Güven ama doğrula" prensibiyle çalışır. Değişiklik sonrası linter hatalarını ve test sonuçlarını kontrol eder. Hata bulursa döngüyü Executor'a geri göndererek **Self-Correction** sürecini yönetir.
*Dosya: `src/vs/workbench/contrib/codemavi/common/mavi-logic/agents/verifier-prompt.md`*

---

## 🚀 Öne Çıkan Özellikler

| Özellik | Açıklama |
| :--- | :--- |
| **Semantic Search** | SQLite + Vektör DB ile kodun yapısını anlayan akıllı arama. |
| **Recursive Correction** | Linter hatalarını otomatik algılar ve agent tarafından düzeltilmesini sağlar. |
| **Custom Rules** | `rules.md` üzerinden projeye özel standartları agent'a dikte edin. |
| **Checkpoints** | Her büyük değişiklik öncesi otomatik güvenli geri dönüş noktaları. |

---

## 🛠️ Geliştirme ve Kurulum

Code Mavi bir VS Code fork'udur. Geliştirmeye başlamak için:

1. `npm install` ile bağımlılıkları yükleyin.
2. `npm run watch` ile derleme sürecini başlatın.
3. `./scripts/code.sh` (Mac/Linux) veya `./scripts/code.bat` (Windows) ile geliştirici modunda açın.

---

## 🤝 Katkıda Bulunun

Code Mavi, topluluk odaklı bir projedir. Agent promptlarını iyileştirmek, yeni araçlar (tools) eklemek veya IDE çekirdeğine destek vermek için her zaman PR'larınızı bekliyoruz.

---

*Code Mavi — Cursor'un yaptığını açık, şeffaf ve ücretsiz yapar.*
