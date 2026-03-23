# Code Mavi IDE - Agent-First Mimari

Cursor'u öldürmek için daha iyi agent mimarisi.

## 🎯 Vizyon

Void'un düştüğü çukura düşmeyeceğiz:
- ❌ Void: Provider + UI, ama agent beyni yok → Öldü
- ✅ Code Mavi: Agent-first mimari + şeffaf system prompt

## 📁 Proje Yapısı

```
/Users/polat/Ortak/mavi-ide/
├── void/                              # Void editor fork'u
│   └── src/vs/workbench/contrib/void/ # Void'un kodu
├── .codemavi/                         # Code Mavi yapılandırması
│   ├── README.md                      # Bu dosya
│   ├── rules.md                       # Proje kuralları
│   ├── integration-plan.md            # Void entegrasyon planı
│   ├── agents/                        # Agent prompt'ları
│   │   ├── orchestrator-prompt.md     # Ana agent
│   │   ├── executor-prompt.md         # İşlemci agent
│   │   └── verifier-prompt.md         # Doğrulayıcı agent
│   └── tools/                         # Tool şablonları
│       ├── agent-tools.ts             # Tool tanımları
│       ├── orchestrator-service.ts    # Ana servis arayüzü
│       └── semantic-search-service.ts # Semantic search
└── plan.md                            # Ana proje planı
```

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────┐
│                   KULLANICI                          │
└────────────────────┬────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   ORCHESTRATOR      │  ← Pahalı model
          │   Ana Agent         │    Planlar, böler, yönetir
          └──────────┬──────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Context │  │ Executor│  │ Verifier│
   │ Agent   │  │ Agent   │  │ Agent   │
   │ (ucuz)  │  │ (ucuz)  │  │ (ucuz)  │
   └────┬────┘  └────┬────┘  └────┬────┘
        │            │            │
   Semantic      Diff üretir   Lint + test
   search        Apply model   çalıştırır
```

## 🚀 Başlangıç

### 1. Void'i Çalıştır
```bash
cd /Users/polat/Ortak/mavi-ide/void
npm install
./scripts/code.sh
```

### 2. Agent-First Modu Etkinleştir (Yakında)
```bash
# VSCode: Code Mavi moduna geç
Cmd+Shift+P → "Code Mavi: Enable Agent Mode"
```

## 📋 Fazlar

| Faz | Açıklama | Durum |
|-----|----------|-------|
| Faz 0 | Void fork + orientasyon | ✅ Hazır |
| Faz 1 | Semantic search (SQLite vec) | 🔄 Başlanacak |
| Faz 2 | Orchestrator service | 🔄 Başlanacak |
| Faz 3 | Tool entegrasyonu | 🔄 Başlanacak |
| Faz 4 | UI + testing | 🔄 Başlanacak |

## 🔧 Özellikler

- **Agent-First**: Gerçek agent loop, sadece LLM çağrısı değil
- **Semantic Search**: SQLite + vec0 extension ile hızlı arama
- **Self-Correction**: Lint/test döngüsü ile otomatik düzeltme
- **Checkpoint**: Her değişiklik öncesi otomatik yedek
- **Şeffaf Prompt**: System prompt'u kullanıcı görebilir ve düzenleyebilir
- **15+ Provider**: Otomatik failover ile kesintisiz çalışma

## 📝 Katkıda Bulunma

1. `.codemavi/rules.md` - Proje kurallarını oku
2. `.codemavi/integration-plan.md` - Entegrasyon planını incele
3. `void/VOID_CODEBASE_GUIDE.md` - Void'un yapısını anla
4. Kod yaz → Test et → PR aç

---

*Code Mavi — Cursor'un yaptığını açık, şeffaf ve ücretsiz yapar.*