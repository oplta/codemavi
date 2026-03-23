/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IAccessibilityService, AccessibilitySupport } from '../../common/accessibility.js';

export class TestAccessibilityService implements IAccessibilityService {

	declare readonly _serviceBrand: undefined;

	onDidChangeScreenReaderOptimized = Event.None;
	onDidChangeReducedMotion = Event.None;

	isScreenReaderOptimized(): boolean { return false; }
	isMotionReduced(): boolean { return false; }
	alwaysUnderlineAccessKeys(): Promise<boolean> { return Promise.resolve(false); }
	setAccessibilitySupport(accessibilitySupport: AccessibilitySupport): codemavi { }
	getAccessibilitySupport(): AccessibilitySupport { return AccessibilitySupport.Unknown; }
	alert(message: string): codemavi { }
	status(message: string): codemavi { }
}
