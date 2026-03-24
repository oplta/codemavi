# Code Mavi IDE IDE — Proje Planı v3
### "Void'un düştüğü çukura düşmeyeceğiz"

> Void neden öldü? Provider eklediler, UI yaptılar, ama **agent beyni yoktu.**
> Cursor'u öldürmek için provider sayısı değil — **daha iyi agent mimarisi** gerekiyor.

---

## Cursor'un Gerçekte Ne Yaptığı

Araştırmadan öğrendiklerimiz:

**1. Üç katmanlı mimari var:**
```
Anlama Katmanı   → codebase semantic index (vektör DB)
Yürütme Katmanı  → ana agent (pahalı model) + alt-agent'lar (ucuz model)
Uygulama Katmanı → "apply model" — sadece diff'i dosyaya yazar
```

**2. Ana agent hiç dosya yazmıyor:**
- Ana model (Sonnet/Opus) sadece "semantic diff" üretiyor
- Ayrı bir ucuz/hızlı "apply model" bunu gerçek koda çeviriyor
- Lint sonuçları geri dönüyor → agent kendi hatasını düzeltiyor

**3. System prompt kalitesi her şey:**
Cursor'un prompt mühendisleri gerçekten iyi iş çıkarıyor — diğer AI IDE'lerden belirgin şekilde üstün.

**4. Paralel agent'lar:**
8 agent aynı anda çalışabiliyor, Git worktree izolasyonuyla her biri kendi dalında çalışıyor.

**Void'un eksiği:** Bunların hiçbirini yapmadı. Sadece "LLM'e mesaj gönder, cevabı göster" yaptı. Biz de aynı hatayı yaparsak aynı yerde biteriz.

---

## Code Mavi IDE'nin Farkı: Agent-First Mimari

```
┌─────────────────────────────────────────────────────┐
│                   KULLANICI                          │
│         "Bu servisteki tüm unwrap()'ları düzelt"    │
└────────────────────┬────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   ORCHESTRATOR      │  ← Pahalı model (Opus/GPT-4o)
          │   Ana Agent         │    Görevi anlar, planlar, böler
          └──────────┬──────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Context │  │ Executor│  │ Verifier│
   │ Agent   │  │ Agent   │  │ Agent   │
   │(ucuz)   │  │(ucuz)   │  │(ucuz)   │
   └────┬────┘  └────┬────┘  └────┬────┘
        │            │            │
   Semantic      Diff üretir   Lint + test
   search        Apply model   çalıştırır
   yapar         yazar         hata varsa
                               geri döner
```

Her "agent" aslında aynı veya farklı LLM'e farklı system prompt ile yapılan çağrı.
Token harcamak önemli değil — **sonuç doğru olmalı.**

---

## Temel Felsefe

| | Void | Cursor | Code Mavi IDE |
|---|---|---|---|
| Agent tipi | Yok | Var ama kapalı | Şeffaf + açık kaynak |
| System prompt | Sabit | Gizli | **Kullanıcı düzenleyebilir** |
| Apply model | Yok | Var ama özel | Açık (herhangi model) |
| Self-correction | Yok | Var | Var + lint tabanlı |
| Paralel agent | Yok | 8 agent | Başlangıç: 4, hedef: sınırsız |
| Provider | 12 | ~5 | 15+ |
| Fiyat | Ücretsiz | $20/ay | Ücretsiz |

---

## Mimari: 4 Temel Katman

### Katman 1 — Codebase Intelligence

```
Proje açıldığında:
  tree-sitter → her dosya AST'e çevrilir
  Embedding model (lokal veya API) → vektörleştirilir
  SQLite (vec extension) → aranabilir hale gelir

Sorgu gelince:
  "unwrap() tehlikeli olan yerler"
  → semantic search → top-20 alakalı dosya
  → re-ranker (ucuz model) → top-5'e düşer
  → bunlar context'e girer
```

Bu olmadan agent kör uçuş yapar. Void'da yoktu.

### Katman 2 — Orchestrator (Ana Agent)

System prompt'un kalbi burası. Cursor'un gizli tuttuğu şey tam da bu.

```
Sen Code Mavi IDE'nin orchestrator agent'ısın.
Görevin:
  1. Kullanıcının isteğini analiz et
  2. Etkilenecek dosyaları semantic search ile bul
  3. Görevi alt-görevlere böl
  4. Her alt-görevi executor agent'a ver
  5. Verifier'dan gelen lint/test sonuçlarını işle
  6. Hata varsa executor'ı tekrar çağır (max 3 kez)
  7. Kullanıcıya özet sun

Kurallar:
  - Asla dosya içeriğini tahmin etme, mutlaka oku
  - Büyük değişikliklerde önce plan sun, onay al
  - Her değişiklik öncesi checkpoint oluştur
  - Token harcamaktan korkma, doğru sonuç al
```

**Bu system prompt'u kullanıcı görebilir ve değiştirebilir.**
Cursor'da bu yok. Bizde olacak.

### Katman 3 — Executor + Apply Model

```
Executor Agent (ucuz/hızlı model):
  - Orchestrator'dan tek bir görev alır
  - Semantic diff üretir (tam dosya değil)
  - Format: <edit file="src/main.rs" line_start="42"> ... </edit>

Apply Model (ayrı, ucuz):
  - Semantic diff + orijinal dosyayı alır
  - Gerçek dosyayı yazar
  - Rust compiler / TypeScript / linter çalıştırır
  - Hata varsa Executor'a geri bildirir
```

### Katman 4 — Verifier (Self-Correction)

```
Her değişiklik sonrası:
  lint → hata var mı?
  type check → varsa hangi satır?
  test → ilgili test dosyası var mı, çalıştır

Sonuç Orchestrator'a döner:
  ✓ Temiz → bir sonraki göreve geç
  ✗ Hata → Executor'ı tekrar çağır, hata mesajını ver
  ✗ 3 deneme sonrası hâlâ hata → kullanıcıya sor
```

---

## System Prompt Mimarisi

Cursor'un en büyük sırrı bu. Biz açık yapacağız.

### `.mavi/rules.md` — Proje Kuralları

```markdown
# Proje Kuralları (Code Mavi IDE Agent'ı okur)

## Mimari
- Bu proje Cargo workspace, 6 crate var
- Her crate max 150 satır dosya
- unwrap() yasak, her zaman ? operatörü kullan

## Kod Stili
- Rust: clippy pedantic
- Yorum dili: Türkçe
- Test: her public fonksiyon için test zorunlu

## Yasaklar
- Hiçbir zaman src-tauri/ dışında dosya oluşturma
- Dependency eklemeden önce kullanıcıya sor
```

Bu dosya her agent çağrısında system prompt'a eklenir.
Cursor'daki `.cursorrules` ile aynı fikir ama bizimki şeffaf ve genişletilebilir.

### Global Kullanıcı Kuralları

```markdown
# Global Kurallar (~/.mavi/global-rules.md)
- Kod yorumları her zaman Türkçe
- commit message: conventional commits
- Büyük refactor öncesi mutlaka onay iste
```

### System Prompt Katmanları (sırayla birleşir)

```
1. Code Mavi IDE base prompt (biz yazıyoruz, açık kaynak)
2. ~/.mavi/global-rules.md (kullanıcı global tercihleri)
3. .mavi/rules.md (proje kuralları)
4. Otomatik context: açık dosyalar, hata mesajları, son değişiklikler
5. Kullanıcının mesajı
```

---

## Auto Dev Mode (Killer Feature)

Cursor'da var ama kısıtlı ve kapalı. Bizimki şeffaf.

```
Kullanıcı: "Bu repodaki tüm TODO'ları tamamla"

Auto Dev Mode:
  1. Tüm TODO'ları tara ve listele (kullanıcıya göster)
  2. Öncelik sırası öner (kullanıcı onaylar veya düzenler)
  3. Her TODO için:
     - Semantic context topla
     - Executor ile implement et
     - Verifier ile doğrula
     - Checkpoint oluştur
  4. Bitince: ne değişti, kaç token harcandı, özet

Kullanıcı istediği zaman durdurabilir.
Her adım şeffaf — ne yapacağını söylüyor.
```

Cursor'dan farkı: **her adım görünür, her adım durdurulabilir.**

---

## Faz 0 — Void Fork + Orientasyon (1. Hafta)

```bash
gh repo fork voideditor/void --clone --org code-mavi
cd void && npm install && ./scripts/code.sh
```

Anlaşılacak kritik dosyalar:
```
VOID_CODEBASE_GUIDE.md              ← Önce bunu oku
src/vs/workbench/contrib/void/
  ├── common/sendLLMMessage.ts       ← Buraya agent loop eklenecek
  ├── common/modelCapabilities.ts   ← Provider'lar burada
  └── browser/sidebar.tsx           ← Agent UI buraya
```

Void'un ne yaptığını anla → **ne yapmadığını** listele → onları yap.

---

## Faz 1 — Branding + Stabilizasyon (2-3. Hafta)

- [ ] Void → Code Mavi IDE rename (`product.json` ve string replace)
- [ ] Code Mavi IDE tema (`#020b18` base, `#3b82f6` accent)
- [ ] Telemetry kapat
- [ ] Bozulan Void özelliklerini düzelt
- [ ] `VOID_CODEBASE_GUIDE.md` → `CODEMAVI_CODEBASE_GUIDE.md` yeniden yaz

---

## Faz 2 — Codebase Intelligence (3-5. Hafta)

- [ ] tree-sitter entegrasyonu (Void'un Node.js tarafına)
- [ ] SQLite + vss (vector similarity search) extension
- [ ] Embedding: varsayılan olarak Ollama `nomic-embed-text` (lokal, ücretsiz)
  - Cloud tercih edenler için: OpenAI `text-embedding-3-small`
- [ ] Semantic search API: `searchCodebase(query, topK)`
- [ ] Re-ranker: ucuz model ile top-20 → top-5
- [ ] `@file`, `@folder`, `@symbol` syntax'ı sidebar'da

---

## Faz 3 — Agent Loop (5-8. Hafta)

Bu projenin kalbi. Void'un hiç yapmadığı şey.

- [ ] Orchestrator agent loop (`sendLLMMessage` üzerine)
- [ ] Tool tanımları:
  ```typescript
  read_file(path)
  write_file(path, semantic_diff)
  run_command(cmd)          // terminal
  search_codebase(query)    // semantic
  lint_file(path)           // compiler/linter feedback
  create_checkpoint()       // git stash benzeri
  ask_user(question)        // onay mekanizması
  ```
- [ ] Apply model entegrasyonu (semantic diff → gerçek kod)
- [ ] Verifier: lint + type check döngüsü
- [ ] Self-correction: hata → executor'a geri (max 3 iter)
- [ ] Checkpoint sistemi: her değişiklik öncesi otomatik

---

## Faz 4 — System Prompt + Rules (8-9. Hafta)

- [ ] `.mavi/rules.md` dosya sistemi
- [ ] Global `~/.mavi/global-rules.md`
- [ ] System prompt katman birleştirici
- [ ] UI: system prompt'u canlı göster/düzenle
- [ ] "Prompt Inspector" — her agent çağrısının tam prompt'unu göster
- [ ] Topluluk kuralları şablonları (Rust, Python, Next.js, vb.)

---

## Faz 5 — Provider + Auto Dev Mode (9-11. Hafta)

- [ ] Mevcut Void provider'ları stabilize et
- [ ] Zhipu AI, Perplexity, Together AI ekle
- [ ] Provider failover (rate limit → otomatik yedek)
- [ ] Auto Dev Mode UI
  - Görev listesi önizlemesi
  - Adım adım onay mekanizması
  - Durdur/devam et
  - Token + maliyet takibi

---

## Faz 6 — Release (12. Hafta)

- [ ] Mac + Windows + Linux build (void-builder fork)
- [ ] Auto-update sistemi
- [ ] Kurulum dökümantasyonu
- [ ] `0.1.0-alpha` tag

---

## Void'un Düştüğü Çukurdan Kaçınma

| Risk | Void'un Hatası | Bizim Önlemimiz |
|------|---------------|-----------------|
| Agent yok | UI + provider yetmez | Faz 3 en kritik faz, es geçilemez |
| System prompt zayıf | "Sen bir kodlama asistanısın" | Katmanlı, test edilmiş, açık kaynak prompt |
| Self-correction yok | İlk hatayla takılıp kalır | Lint döngüsü zorunlu |
| Context kör | Dosyaları okumadan yazar | Semantic search Faz 2'de |
| Maintenance yok | Bağımlılıklar çürür | Haftalık CI, otomatik dependency update |

---

## İlk 3 Komut

```bash
# 1. Fork
gh repo fork voideditor/void --clone --org code-mavi

# 2. Build al
cd void && npm install && ./scripts/code.sh

# 3. Agent kodunu bul
find . -name "sendLLMMessage.ts" -path "*/void/*"
# Burası agent loop'un yazılacağı yer
```

---

*Code Mavi IDE — Cursor'un yaptığını açık, şeffaf ve ücretsiz yapar.*
*Void'un vizyonunu agent beyniyle tamamlar.*
