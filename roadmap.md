# 🗺️ Code Mavi Roadmap

Bu doküman, Code Mavi projesinin gelişim aşamalarını ve hedeflerini takip eder.

## 🟢 v0.1.0: Mantık Çekirdeği (Tamamlandı)
- [x] Void repo temizliği ve "Agent Logic" odaklı yapı.
- [x] Orchestrator, Executor ve Verifier rollerinin tanımı.
- [x] Temel `OrchestratorService` ve `SemanticSearchService` iskeleti.
- [x] Proje kuralları (`rules.md`) altyapısı.
- [x] GitHub vitrin düzenlemesi (README, About).

## 🟡 v0.2.0: Model Çeşitliliği ve Sağlayıcılar (Şu anki hedef)
- [ ] **Multi-Model Support:** Zhipu AI (GLM), DeepSeek ve Together AI entegrasyonu mantığı.
- [ ] **Embedding Flexibility:** Sadece Ollama değil, yerel ve bulut tabanlı farklı embedding sağlayıcı desteği.
- [ ] **Tool Expansion:** Terminal ve Dosya Sistemi araçlarının (tools) detaylandırılması.
- [ ] **Prompt Engineering:** `agents/` altındaki promptların 32k+ context penceresine uygun optimizasyonu.

## 🔴 v0.3.0: "Apply" ve "Self-Correction" Zekası
- [ ] **Semantic Diff Engine:** Üretilen diff'lerin kod tabanına uygulanma algoritmasının mükemmelleştirilmesi.
- [ ] **Auto-Verifier:** Linter ve Test sonuçlarının otomatik olarak döngüye sokulması.
- [ ] **State Management:** Agent'ın "düşünce zinciri" (Chain of Thought) ve durum yönetimi.

## 🔵 v1.0.0: IDE Entegrasyonu ve Yayılım
- [ ] Mantık katmanının Code Mavi IDE (VS Code Fork) ile tam entegrasyonu.
- [ ] Kullanıcı dostu agent arayüzü.
- [ ] Topluluk eklenti desteği.
