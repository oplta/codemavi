/**
 * Code Mavi - Semantic Apply Engine
 * 
 * LLM tarafından üretilen kod değişikliklerini (SEARCH/REPLACE veya Semantic Diff)
 * kod tabanına güvenli ve anlamsal olarak uygulayan motor.
 */

export interface IApplyBlock {
	original: string
	replacement: string
	score: number // Eşleşme kalitesi
}

export class ApplyEngine {
	/**
	 * LLM çıktısından SEARCH/REPLACE bloklarını ayıklar.
	 */
	parseBlocks(llmResponse: string): IApplyBlock[] {
		const blocks: IApplyBlock[] = []
		const searchPattern = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g
		
		let match
		while ((match = searchPattern.exec(llmResponse)) !== null) {
			blocks.push({
				original: match[1],
				replacement: match[2],
				score: 0
			})
		}
		return blocks
	}

	/**
	 * Bir bloğu hedef metne anlamsal olarak en yakın yere uygular.
	 */
	applyBlock(source: string, block: IApplyBlock): { success: boolean, result: string } {
		// 1. Tam eşleşme dene
		if (source.includes(block.original)) {
			return {
				success: true,
				result: source.replace(block.original, block.replacement)
			}
		}

		// 2. Anlamsal (Fuzzy) eşleşme dene (Girinti ve boşlukları temizleyerek)
		// TODO: Bu kısım v0.3.2'de derinleştirilecek.
		
		return { success: false, result: source }
	}

	/**
	 * Tüm değişiklikleri uygular ve sonuç raporu döner.
	 */
	applyAll(source: string, response: string): { result: string, appliedCount: number, failedCount: number } {
		const blocks = this.parseBlocks(response)
		let currentSource = source
		let applied = 0
		let failed = 0

		for (const block of blocks) {
			const { success, result } = this.applyBlock(currentSource, block)
			if (success) {
				currentSource = result
				applied++
			} else {
				failed++
			}
		}

		return { result: currentSource, appliedCount: applied, failedCount: failed }
	}
}
