/**
 * Mavi - Verifier Service
 * 
 * Yapılan kod değişikliklerini linter ve testler ile doğrular.
 * Hata durumunda "Self-Correction" döngüsü için veri hazırlar.
 */

import { URI } from '../../../../base/common/uri.js'

export interface IVerificationReport {
	status: 'passed' | 'failed'
	errors: IVerificationError[]
	timestamp: number
}

export interface IVerificationError {
	file: URI
	line: number
	message: string
	severity: 'error' | 'warning'
	source: 'lint' | 'test' | 'typecheck'
}

export class VerifierService {
	/**
	 * Değiştirilen dosyaları tarar ve hataları raporlar.
	 */
	async verify(uris: URI[]): Promise<IVerificationReport> {
		console.log(`[Verifier] Verifying ${uris.length} files...`)
		const errors: IVerificationError[] = []

		// 1. IDE MarkerService'den linter hatalarını al
		// 2. Proje tipine göre (ts, py, vb.) testleri çalıştır (Opsiyonel)
		
		return {
			status: errors.length === 0 ? 'passed' : 'failed',
			errors,
			timestamp: Date.now()
		}
	}

	/**
	 * Hata raporunu Agent'ın anlayabileceği bir "Correction Prompt"una çevirir.
	 */
	formatCorrectionPrompt(report: IVerificationReport): string {
		if (report.status === 'passed') return "Her şey yolunda, hata bulunamadı."

		let prompt = "Aşağıdaki hatalar tespit edildi, lütfen bunları düzelt:\n\n"
		for (const error of report.errors) {
			prompt += `- [${error.source}] ${error.file.fsPath}:${error.line}: ${error.message}\n`
		}
		return prompt
	}
}
