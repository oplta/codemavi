# Code Mavi - Void Entegrasyon Planı

## Genel Bakış

Void editor'ün `src/vs/workbench/contrib/void/` dizinine Code Mavi'nin agent-first mimarisi entegre edilecek.

## Dosya Yapısı

```
void/src/vs/workbench/contrib/void/
├── common/
│   ├── prompt/
│   │   ├── prompts.ts                    [MEVCUT - Genişletilecek]
│   │   └── codemavi-prompts.ts           [YENİ - Agent prompt'ları]
│   ├── toolsServiceTypes.ts              [MEVCUT - Genişletilecek]
│   ├── semanticSearchService.ts          [YENİ - SQLite vec entegrasyonu]
│   ├── semanticSearchTypes.ts            [YENİ - Search tipleri]
│   └── orchestratorService.ts            [YENİ - Ana agent servisi]
├── browser/
│   ├── chatThreadService.ts              [MEVCUT - _runChatAgent modifiye]
│   ├── toolsService.ts                   [MEVCUT - Yeni tool'lar eklenecek]
│   ├── semanticSearchService.ts          [YENİ - Browser tarafı]
│   └── orchestratorPanel.ts              [YENİ - Agent UI]
└── electron-main/
    └── semanticSearchMainService.ts      [YENİ - Main process indexing]
```

## Değişiklikler

### 1. `chatThreadService.ts` - Agent Loop Modifikasyonu

Mevcut `_runChatAgent` fonksiyonu Code Mavi orchestrator ile değiştirilecek:

```typescript
// ESKİ
private async _runChatAgent({ ... }) {
    // Mevcut Void agent loop
}

// YENİ
private async _runCodeMaviOrchestrator({ ... }) {
    // 1. Orchestrator'a analiz yaptır
    const plan = await this._orchestratorService.analyzeAndPlan(request, token)
    
    // 2. Checkpoint oluştur
    await this._orchestratorService.createCheckpoint(`task-${Date.now()}`)
    
    // 3. Planı çalıştır
    await this._orchestratorService.executePlan(plan, token)
}
```

### 2. `toolsService.ts` - Yeni Tool'lar

```typescript
// Yeni tool'lar eklenecek:
- create_checkpoint
- restore_checkpoint
- semantic_search
- delegate_to_executor
- delegate_to_verifier
- ask_user
```

### 3. `prompts.ts` - Prompt Katmanları

System prompt şu şekilde birleşecek:

```typescript
const systemPrompt = [
  baseSystemPrompt,                    // Code Mavi base
  globalRules,                         // ~/.codemavi/global-rules.md
  projectRules,                        // .codemavi/rules.md
  orchestratorPrompt,                  // Agent tipine göre
  dynamicContext                       // Açık dosyalar, hatalar
].join('\n\n')
```

## Entegrasyon Adımları

### Faz 0: Hazırlık (1-2 gün)
- [ ] Void build al ve çalıştır
- [ ] Mevcut agent loop'u anla
- [ ] Code Mavi dosyalarını oluştur

### Faz 1: Semantic Search (3-5 gün)
- [ ] SQLite + vec0 extension entegrasyonu
- [ ] Tree-sitter chunking
- [ ] Embedding servisi (Ollama/OpenAI)
- [ ] Indexing pipeline

### Faz 2: Orchestrator Service (5-7 gün)
- [ ] Orchestrator service implementasyonu
- [ ] Executor delegation
- [ ] Verifier delegation
- [ ] Retry mekanizması

### Faz 3: Tool Entegrasyonu (3-4 gün)
- [ ] Checkpoint tool'ları
- [ ] Semantic search tool'u
- [ ] User interaction tool'ları
- [ ] Agent delegation tool'ları

### Faz 4: UI ve Testing (3-4 gün)
- [ ] Agent panel UI
- [ ] Checkpoint yönetimi UI
- [ ] Task durum göstergesi
- [ ] Test ve debug

## Önemli Noktalar

1. **Void'un mevcut yapısını bozma**: Varolan chat mode'lar çalışmaya devam etmeli
2. **Geri dönüşüm**: Code Mavi modu isteğe bağlı olmalı
3. **Performans**: Indexing async olmalı, UI bloklanmamalı
4. **Hata yönetimi**: Her adımda hata kontrolü ve kullanıcı bilgilendirmesi