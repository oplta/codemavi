# 🟦 Code Mavi: Agentic Intelligence Layer

> **"Agent beyni olmayan bir IDE, sadece süslü bir metin editörüdür."**

Code Mavi, yapay zeka destekli yazılım geliştirme sürecini bir adım öteye taşıyan, **"Agent-First"** felsefesiyle tasarlanmış açık kaynaklı bir zeka katmanıdır. Bu depo, Code Mavi IDE'nin karar alma, kod yürütme ve doğrulama süreçlerini yöneten temel mimariyi ve sistem promptlarını içerir.

---

## 🎯 Vizyon: Şeffaf ve Özgür Agent Deneyimi

Günümüzün popüler AI editörleri (Cursor vb.) harika işler çıkarsa da, arkadaki "beyin" katmanı kapalı bir kutudur. Code Mavi, bu zekayı **şeffaf, özelleştirilebilir ve topluluk odaklı** hale getirir.

- **Şeffaf Promptlar:** Agent'ın nasıl düşündüğünü görün ve müdahale edin.
- **Yerel Kurallar:** `.codemavi/rules.md` ile agent davranışını projenize göre terzi usulü dikin.
- **Kendi Kendini Düzeltme:** Yazılan kodun hatasız olduğundan emin olan aktif bir doğrulama döngüsü.

---

## 🏗️ Mimari: Üçlü Agent Sistemi

Code Mavi, karmaşık görevleri çözmek için üç farklı uzmanlık alanına sahip agent yapısını kullanır:

### 🧠 1. Orchestrator (Orkestra Şefi)
Sistemin merkezi sinir sistemidir. Kullanıcı isteğini analiz eder, kod tabanında araştırma yapar ve stratejik bir plan oluşturur. Görevleri parçalara ayırarak Executor'a iletir.
*Dosya: `agents/orchestrator-prompt.md`*

### 🛠️ 2. Executor (Yürütücü)
Planı hayata geçiren "ellerdir". Hassas "Search/Replace" blokları ve semantik diff'ler üreterek dosyaları fiziksel olarak günceller.
*Dosya: `agents/executor-prompt.md`*

### 🔍 3. Verifier (Doğrulayıcı)
"Güven ama doğrula" prensibiyle çalışır. Değişiklik sonrası linter hatalarını, tip uyumsuzluklarını ve test sonuçlarını kontrol eder. Hata bulursa döngüyü Executor'a geri göndererek **Self-Correction** (Kendi Kendini Düzeltme) sürecini başlatır.
*Dosya: `agents/verifier-prompt.md`*

---

## 🚀 Öne Çıkan Özellikler

| Özellik | Açıklama |
| :--- | :--- |
| **Semantic Intelligence** | Tree-sitter ve Vektör DB ile kodun sadece metnini değil, yapısını anlar. |
| **Recursive Loop** | Başarısız olan işlemlerde pes etmez, hatayı analiz edip tekrar dener (Max 3 deneme). |
| **Rule Engine** | `rules.md` üzerinden stil ve mimari kurallarınızı agent'a dikte edin. |
| **Tool Integration** | Dosya sistemi, terminal ve kullanıcı etkileşimi için gelişmiş araç seti. |

---

## 📂 Klasör Yapısı

```text
.
├── agents/          # Agent'ların sistem promptları ve kişilik tanımları
├── tools/           # Codebase ile etkileşim kuran servis mantıkları
├── prompts/         # Dinamik prompt şablonları
├── rules.md         # Global ve projeye özel davranış kuralları
└── README.md        # Şu an okuduğunuz vizyon belgesi
```

---

## 🤝 Katkıda Bulunun

Code Mavi, açık kaynak topluluğunun gücüyle büyüyor. Eğer agent mimarileri, LLM optimizasyonu veya IDE geliştirme ile ilgileniyorsanız, aramıza katılın!

1. Bu depoyu fork edin.
2. `agents/` altındaki promptları iyileştirin veya yeni `tools/` ekleyin.
3. PR (Pull Request) göndererek ekosistemi güçlendirin.

---

*Code Mavi — Cursor'un yaptığını açık, şeffaf ve ücretsiz yapar.*
