# Code Mavi Proje Kuralları
# Code Mavi Agent bu kuralları her istekte system prompt'a ekler
# Format: Markdown, "##" başlıkları bölümleri ayırır

---

## Proje Bilgisi
<!-- Bu bölümde projenin temel yapısını tanımlayın -->

- **Proje Tipi**: [örn: Cargo workspace, Next.js app, TypeScript monorepo]
- **Dil/Framework**: [örn: Rust, TypeScript/React, Python/Django]
- **Dosya Sınırı**: [örn: Her modül max 150 satır, her fonksiyon max 50 satır]
- **Dizin Yapısı**: [örn: src/ kaynak, tests/ test dosyaları, docs/ dokümantasyon]

---

## Mimari Kuralları
<!-- Proje mimarisiyle ilgili temel kurallar -->

### Modül Yapısı
- [örn: Her crate max 150 satır dosya]
- [örn: Feature-based modül organizasyonu]
- [örn: Public API'ler src/lib.ts'de toplanır]

### Bağımlılıklar
- [örn: Yeni dependency eklenmeden önce kullanıcıya sor]
- [örn: Sadece production-dependencies kullan, dev-deps minimal tut]
- [örn: Peer dependency versiyonları package.json'da sabit]

### Veri Akışı
- [örn: Unidirectional data flow (Redux/Zustand)]
- [örn: API calls sadece services/ dizininde]
- [örn: State management: React Context + hooks]

---

## Kod Stili
<!-- Dil-spesifik kod stili kuralları -->

### Genel
- **Yorum Dili**: [örn: Türkçe / English]
- **Değişken İsimlendirme**: [örn: camelCase, PascalCase, snake_case]
- **Satır Uzunluğu**: [örn: Max 100 karakter]

### [Dil Adı - örn: TypeScript]
```
- strict mode zorunlu
- Explicit return types public fonksiyonlarda
- No implicit any
- Interface > Type alias (objeler için)
- Enum yerine const assertion kullan
```

### [Dil Adı - örn: Rust]
```
- clippy pedantic enabled
- unwrap() yasak, her zaman ? operatörü
- Her public fonksiyon için doc comment
- Result<T, E> dönüş tipleri explicit
```

### Formatlama
- [örn: Prettier config: `.prettierrc` dosyasına uy]
- [örn: ESLint: `npm run lint` geçmeli]
- [örn: rustfmt: `cargo fmt` geçmeli]

---

## Test Kuralları
<!-- Test yazımıyla ilgili kurallar -->

- [örn: Her public fonksiyon için unit test zorunlu]
- [örn: Test coverage minimum %80]
- [örn: Integration tests tests/integrations/ altında]
- [örn: Test isimlendirme: `should_<do_something>_when_<condition>`]
- [örn: Mock kullanımı: sadece external API'ler için]

---

## Yasaklar (Kırmızı Çizgiler)
<!-- ASLA yapılmaması gerekenler -->

- ❌ [örn: Hiçbir zaman src-tauri/ dışında dosya oluşturma]
- ❌ [örn: Dependency eklemeden önce kullanıcıya sorma]
- ❌ [örn: unwrap() kullanımı yasak]
- ❌ [örn: console.log commit'lenemez (eslint no-console)]
- ❌ [örn: Herhangi bir API key hardcode edilemez]
- ❌ [örn: Büyük refactor'ler onaysız yapılamaz]

---

## Git & Commit Kuralları
<!-- Versiyon kontrolü kuralları -->

- **Commit Format**: [örn: Conventional Commits - `feat:`, `fix:`, `refactor:`]
- **Branch İsimlendirme**: [örn: `feature/`, `bugfix/`, `hotfix/` prefix]
- **Pre-commit**: [örn: `npm run lint && npm run test` çalışmalı]

---

## Agent Davranış Kuralları
<!-- Code Mavi agent'ının bu projede nasıl davranması gerektiği -->

### Planlama
- [örn: 3+ dosya değişikliği gerekiyorsa önce plan sun]
- [örn: Breaking change varsa önce migration planı sun]
- [örn: Performans kritik kodlarda Big-O analizi yap]

### Onay Mekanizmaları
- [örn: Yeni dependency → onay iste]
- [örn: Dosya silme → onay iste]
- [örn: 50+ satır değişiklik → onay iste]
- [örn: Config dosyası değişikliği → onay iste]

### Context Toplama
- [örn: Semantic search önce, sonra dosya oku]
- [örn: Hata ayıklamada relevant logları oku]
- [örn: Test dosyalarını implementasyondan önce oku]

---

## Performans Kuralları
<!-- Performansla ilgibi gereksinimler -->

- [örn: Bundle size: main chunk < 200KB]
- [örn: API response time: < 200ms p95]
- [örn: Memory leak kontrolü: heap snapshot per PR]
- [örn: Lazy loading: routes ve heavy components için]

---

## Güvenlik Kuralları
<!-- Güvenlikle ilgili kontrol listesi -->

- [örn: Input validation: zod schema zorunlu]
- [örn: SQL injection: parametrik query'ler only]
- [örn: XSS: innerHTML kullanımı yasak]
- [örn: Secrets: .env.example'de dummy değerler]

---

## Dokümantasyon
<!-- Dokümantasyon standartları -->

- [örn: README.md her dizinde olmalı]
- [örn: API değişiklikleri CHANGELOG.md'ye yazılmalı]
- [örn: Complex logic inline comments ile açıklanmalı]
- [örn: ADR (Architecture Decision Records) major decisions için]

---

## Örnek Kullanım
<!-- Bu kuralların nasıl uygulandığını gösteren örnekler -->

### ✅ DO
```typescript
// Kullanıcı profilini getirir, cache'den döner
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const cached = await cache.get(`user:${userId}`);
  if (cached) return cached;
  
  const profile = await db.users.findById(userId);
  if (!profile) {
    throw new NotFoundError(`Kullanıcı bulunamadı: ${userId}`);
  }
  
  await cache.set(`user:${userId}`, profile, TTL.HOUR);
  return profile;
}
```

### ❌ DON'T
```typescript
// Hatalı: unwrap benzeri, hata yönetimi yok
function getUser(id: string) {
  return db.users.findById(id)!; // ! kullanımı yasak
}
```

---

# Notlar
<!-- Agent'ın bilmesi gereken ek bağlam -->

- [Proje-spesifik notlar, örn: "Eski modül: src/legacy/, dokunma"]
- [Bilininen teknik borçlar, örn: "Refactor gereken: authService.ts"]
- [Özel durumlar, örn: "API v1 deprecated, v2 kullan"]

---

# Kural Önceliği
<!-- Çakışma durumunda hangi kural geçerli -->

1. **Yasaklar** (Kırmızı Çizgiler) - Kesin, tartışmasız
2. **Mimari Kuralları** - Proje yapısını korur
3. **Kod Stili** - Tutarlılık için
4. **Agent Davranış** - Esnek, projeye göre ayarlanabilir

---

<!-- 
SİSTEM BİLGİSİ (Otomatik eklenir, elle düzenlenmez):
- Code Mavi versiyonu
- Aktif agent modu (normal/gather/agent)
- Son checkpoint bilgisi
- Açık dosyalar ve context
-->
