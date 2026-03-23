/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { INotificationActions, INotificationHandle, INotificationService } from '../../../../platform/notification/common/notification.js';
import { IMetricsService } from '../common/metricsService.js';
import { IMaviUpdateService } from '../common/codemaviUpdateService.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import * as dom from '../../../../base/browser/dom.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { Code MaviCheckUpdateRespose } from '../common/codemaviUpdateServiceTypes.js';
import { IAction } from '../../../../base/common/actions.js';




const notifyUpdate = (res: Code MaviCheckUpdateRespose & { message: string }, notifService: INotificationService, updateService: IUpdateService): INotificationHandle => {
	const message = res?.message || 'This is a very old version of Code Mavi, please download the latest version! [Code Mavi Editor](https://codemavieditor.com/download-beta)!'

	let actions: INotificationActions | undefined

	if (res?.action) {
		const primary: IAction[] = []

		if (res.action === 'reinstall') {
			primary.push({
				label: `Reinstall`,
				id: 'codemavi.updater.reinstall',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					const { window } = dom.getActiveWindow()
					window.open('https://codemavieditor.com/download-beta')
				}
			})
		}

		if (res.action === 'download') {
			primary.push({
				label: `Download`,
				id: 'codemavi.updater.download',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					updateService.downloadUpdate()
				}
			})
		}


		if (res.action === 'apply') {
			primary.push({
				label: `Apply`,
				id: 'codemavi.updater.apply',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					updateService.applyUpdate()
				}
			})
		}

		if (res.action === 'restart') {
			primary.push({
				label: `Restart`,
				id: 'codemavi.updater.restart',
				enabled: true,
				tooltip: '',
				class: undefined,
				run: () => {
					updateService.quitAndInstall()
				}
			})
		}

		primary.push({
			id: 'codemavi.updater.site',
			enabled: true,
			label: `Code Mavi Site`,
			tooltip: '',
			class: undefined,
			run: () => {
				const { window } = dom.getActiveWindow()
				window.open('https://codemavieditor.com/')
			}
		})

		actions = {
			primary: primary,
			secondary: [{
				id: 'codemavi.updater.close',
				enabled: true,
				label: `Keep current version`,
				tooltip: '',
				class: undefined,
				run: () => {
					notifController.close()
				}
			}]
		}
	}
	else {
		actions = undefined
	}

	const notifController = notifService.notify({
		severity: Severity.Info,
		message: message,
		sticky: true,
		progress: actions ? { worked: 0, total: 100 } : undefined,
		actions: actions,
	})

	return notifController
	// const d = notifController.onDidClose(() => {
	// 	notifyYesUpdate(notifService, res)
	// 	d.dispose()
	// })
}
const notifyErrChecking = (notifService: INotificationService): INotificationHandle => {
	const message = `Code Mavi Error: There was an error checking for updates. If this persists, please get in touch or reinstall Code Mavi [here](https://codemavieditor.com/download-beta)!`
	const notifController = notifService.notify({
		severity: Severity.Info,
		message: message,
		sticky: true,
	})
	return notifController
}


const performCode MaviCheck = async (
	explicit: boolean,
	notifService: INotificationService,
	codemaviUpdateService: IMaviUpdateService,
	metricsService: IMetricsService,
	updateService: IUpdateService,
): Promise<INotificationHandle | null> => {

	const metricsTag = explicit ? 'Manual' : 'Auto'

	metricsService.capture(`Code Mavi Update ${metricsTag}: Checking...`, {})
	const res = await codemaviUpdateService.check(explicit)
	if (!res) {
		const notifController = notifyErrChecking(notifService);
		metricsService.capture(`Code Mavi Update ${metricsTag}: Error`, { res })
		return notifController
	}
	else {
		if (res.message) {
			const notifController = notifyUpdate(res, notifService, updateService)
			metricsService.capture(`Code Mavi Update ${metricsTag}: Yes`, { res })
			return notifController
		}
		else {
			metricsService.capture(`Code Mavi Update ${metricsTag}: No`, { res })
			return null
		}
	}
}


// Action
let lastNotifController: INotificationHandle | null = null


registerAction2(class extends Action2 {
	constructor() {
		super({
			f1: true,
			id: 'codemavi.codemaviCheckUpdate',
			title: localize2('codemaviCheckUpdate', 'Code Mavi: Check for Updates'),
		});
	}
	async run(accessor: ServicesAccessor): Promise<codemavi> {
		const codemaviUpdateService = accessor.get(IMaviUpdateService)
		const notifService = accessor.get(INotificationService)
		const metricsService = accessor.get(IMetricsService)
		const updateService = accessor.get(IUpdateService)

		const currNotifController = lastNotifController

		const newController = await performCode MaviCheck(true, notifService, codemaviUpdateService, metricsService, updateService)

		if (newController) {
			currNotifController?.close()
			lastNotifController = newController
		}
	}
})

// on mount
class Code MaviUpdateWorkbenchContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.codemavi.codemaviUpdate'
	constructor(
		@IMaviUpdateService codemaviUpdateService: IMaviUpdateService,
		@IMetricsService metricsService: IMetricsService,
		@INotificationService notifService: INotificationService,
		@IUpdateService updateService: IUpdateService,
	) {
		super()

		const autoCheck = () => {
			performCode MaviCheck(false, notifService, codemaviUpdateService, metricsService, updateService)
		}

		// check once 5 seconds after mount
		// check every 3 hours
		const { window } = dom.getActiveWindow()

		const initId = window.setTimeout(() => autoCheck(), 5 * 1000)
		this._register({ dispose: () => window.clearTimeout(initId) })


		const intervalId = window.setInterval(() => autoCheck(), 3 * 60 * 60 * 1000) // every 3 hrs
		this._register({ dispose: () => window.clearInterval(intervalId) })

	}
}
registerWorkbenchContribution2(Code MaviUpdateWorkbenchContribution.ID, Code MaviUpdateWorkbenchContribution, WorkbenchPhase.BlockRestore);
