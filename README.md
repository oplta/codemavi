# Code Mavi Agent Logic

Code Mavi, "Agent-First" yaklaşımıyla geliştirilen açık kaynaklı yapay zeka destekli IDE projesinin beyin katmanıdır. Bu depo, IDE'nin orkestrasyon, yürütme ve doğrulama süreçlerini yöneten sistem promptlarını ve servis mantığını içerir.

## Mimari Yapı

### 1. Orchestrator (Orkestra Şefi)
`agents/orchestrator-prompt.md` dosyasında tanımlanan bu agent, tüm sistemin beynidir. Kullanıcı isteğini analiz eder, plan yapar ve alt görevleri diğer agent'lara dağıtır.

### 2. Executor (Yürütücü)
`agents/executor-prompt.md` dosyasında tanımlanır. Orchestrator'dan gelen görevleri yerine getirir ve kod değişikliklerini (diff) üretir.

### 3. Verifier (Doğrulayıcı)
`agents/verifier-prompt.md` dosyasında tanımlanır. Yapılan değişikliklerin kod kalitesine, lint kurallarına ve testlere uygunluğunu denetler. Hata varsa "Self-Correction" döngüsünü tetikler.

## Araçlar (Tools)
`tools/` dizini altında agent'ların codebase ile etkileşime girmesini sağlayan servis tanımları bulunur:
- **Semantic Search**: Kod tabanında anlamsal arama.
- **Agent Tools**: Dosya okuma, yazma, komut çalıştırma ve kullanıcıyla etkileşim.

## Kurallar
`rules.md` dosyası, agent'ların uyması gereken proje özelindeki standartları içerir. Bu kurallar her agent isteğinde sistem promptuna otomatik olarak enjekte edilir.

---
*Code Mavi — Cursor'un yaptığını açık, şeffaf ve ücretsiz yapar.*
