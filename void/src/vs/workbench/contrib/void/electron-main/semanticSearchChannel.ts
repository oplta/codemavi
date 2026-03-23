/**
 * Code Mavi - Semantic Search IPC Channel
 */

import { IServerChannel } from '../../../../base/parts/ipc/common/ipc.js'
import { Event } from '../../../../base/common/event.js'
import { ISemanticSearchMainService } from './semanticSearchMainService.js'
import { URI } from '../../../../base/common/uri.js'

export class SemanticSearchChannel implements IServerChannel {
	constructor(private readonly service: ISemanticSearchMainService) {}

	listen(_: unknown, event: string): Event<any> {
		throw new Error(`Event not found: ${event}`)
	}

	async call(_: unknown, command: string, arg?: any): Promise<any> {
		switch (command) {
			case 'initialize': return this.service.initialize(arg)
			case 'insertChunks': return this.service.insertChunks(arg)
			case 'search': return this.service.search(arg.embedding, arg.opts)
			case 'deleteFileIndices': return this.service.deleteFileIndices(URI.revive(arg))
			case 'clearAllIndices': return this.service.clearAllIndices()
			case 'getStats': return this.service.getStats()
		}
		throw new Error(`Command not found: ${command}`)
	}
}
