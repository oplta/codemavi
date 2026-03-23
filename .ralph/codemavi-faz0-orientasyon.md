# Code Mavi IDE - Faz 0: Void Fork + Orientasyon

## Hedef
Void editor'ü fork edip agent-first mimari temellerini atmak

## Checklist

### 1. Void Fork Kontrolü
- [x] `/Users/polat/Ortak/mavi-ide/void` dizini var mı kontrol et
- [x] Void codebase yapısını anla (`VOID_CODEBASE_GUIDE.md` var mı oku)
- [x] Kritik dosyaları bul:
  - `src/vs/workbench/contrib/void/common/sendLLMMessage.ts` → `sendLLMMessageService.ts` olarak mevcut
  - `src/vs/workbench/contrib/void/common/modelCapabilities.ts` → Mevcut
  - `src/vs/workbench/contrib/void/browser/sidebar.tsx` → `sidebarPane.ts` olarak mevcut

### 2. Proje Yapısı Analizi
- [x] Void'un mevcut provider sistemi nasıl çalışıyor → `voidSettingsService.ts` içinde tanımlı, 12+ provider desteği var
- [x] Agent loop nereye eklenecek belirle → `chatThreadService.ts` içinde `_runChatAgent` fonksiyonu mevcut, buraya orchestrator entegre edilecek
- [x] UI extension noktalarını haritala → `browser/react/` altında React bileşenleri, `sidebarPane.ts` ana konteyner

### 3. Code Mavi Temel Yapıları
- [x] `.codemavi/` dizini oluştur
- [x] `rules.md` template oluştur
- [x] `orchestrator-prompt.md` - Ana agent system prompt
- [x] `executor-prompt.md` - Executor agent prompt
- [x] `verifier-prompt.md` - Verifier agent prompt
- [x] `agent-tools.ts` - Tool tanımları için template
- [x] `orchestrator-service.ts` - Ana servis arayüzü
- [x] `semantic-search-service.ts` - Semantic search servisi

### 4. Faz 1 Hazırlık
- [x] Branding rename planı (Void → Code Mavi) → `integration-plan.md` içinde detaylandırıldı
- [x] Renk şeması: `#020b18` base, `#3b82f6` accent → `rules.md` içinde tanımlandı
- [x] Telemetry kapatma noktalarını belirle → Void'te telemetry mevcut, kapatma noktaları `product.json` ve build config'de

## Tamamlanan Dosya Yapısı

```
/Users/polat/Ortak/mavi-ide/.codemavi/
├── README.md                    # Proje özet ve başlangıç rehberi
├── rules.md                     # Proje kuralları ve kısıtlamalar
├── integration-plan.md          # Void entegrasyon yol haritası
├── agents/
│   ├── orchestrator-prompt.md   # Ana agent system prompt
│   ├── executor-prompt.md       # İşlemci agent prompt
│   └── verifier-prompt.md       # Doğrulayıcı agent prompt
└── tools/
    ├── agent-tools.ts           # Yeni tool tanımları
    ├── orchestrator-service.ts  # Ana servis arayüzü
    └── semantic-search-service.ts # Semantic search servisi
```

## Void Analizi Özeti

**Void'un Mevcut Yapısı:**
- `chatThreadService.ts`: `_runChatAgent()` fonksiyonu var ama temel seviyede
- `toolsService.ts`: Mevcut tool'lar (read_file, edit_file, run_command vb.)
- `prompt/prompts.ts`: System prompt'lar ve tool tanımları
- `voidSettingsService.ts`: Provider yönetimi

**Void'un Eksikleri (Code Mavi yapacak):**
- Gerçek orchestrator/executor/verifier ayrımı
- Semantic search (codebase intelligence)
- Checkpoint sistemi
- Self-correction döngüsü (lint/test)
- Şeffaf system prompt katmanları

## Başarı Kriteri
✅ Void'un agent yapısının nerelerde ekleneceği net, ilk dosya yapıları oluşmuş.

## Not
Void'un yaptıklarını anla, yapmadıklarını listele - onları yapacağız.
→ Void'te agent loop var ama basit. Gerçek 3-katmanlı mimari ve semantic search eksik.