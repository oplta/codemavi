# 🗺️ Code Mavi Roadmap

Bu doküman, Code Mavi projesinin gelişim aşamalarını ve hedeflerini takip eder.

## 🟢 v0.1.0: Mantık Çekirdeği (Tamamlandı)
- [x] Code Mavi repo temizliği ve "Agent Logic" odaklı yapı.
- [x] Orchestrator, Executor ve Verifier rollerinin tanımı.
- [x] Temel `OrchestratorService` ve `SemanticSearchService` iskeleti.
- [x] Proje kuralları (`rules.md`) altyapısı.
- [x] GitHub vitrin düzenlemesi (README, About).

## ✅ v0.2.0: Model Çeşitliliği ve Sağlayıcılar (Tamamlandı)
- [x] **Folder Organization:** Agent logic moved to `intelligence/` for a cleaner root.
- [x] **Multi-Model Support:** DeepSeek and Zhipu AI (GLM) integration logic added to ProviderManager.
- [x] **Embedding Flexibility:** Multi-provider (Ollama, OpenAI) support added to SemanticSearchService.
- [x] **Prompt Engineering:** Optimized Orchestrator prompt for large context and deep reasoning.
- [x] **Tool Expansion:** Terminal and File System tools detailed for advanced operations.

## ✅ v0.3.0: "Apply" ve "Self-Correction" Zekası (Tamamlandı)
- [x] **Semantic Diff Engine:** Created `ApplyEngine` for parsing and applying SEARCH/REPLACE blocks.
- [x] **Auto-Verifier:** Created `VerifierService` for tracking lint/test errors and formatting correction prompts.
- [x] **State Management:** Created `AgentStateManager` for tracking thoughts, actions, and task status (Chain of Thought).

## 🟡 v1.0.0: IDE Entegrasyonu ve Yayılım (Şu anki hedef)
- [ ] Mantık katmanının Code Mavi IDE (VS Code Fork) ile tam entegrasyonu.
- [ ] Kullanıcı dostu agent arayüzü.
- [ ] Topluluk eklenti desteği.
