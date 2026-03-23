/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../base/common/buffer.js';
import { Event } from '../../../base/common/event.js';
import { URI } from '../../../base/common/uri.js';
import { MessageBoxOptions, MessageBoxReturnValue, OpenDevToolsOptions, OpenDialogOptions, OpenDialogReturnValue, SaveDialogOptions, SaveDialogReturnValue } from '../../../base/parts/sandbox/common/electronTypes.js';
import { ISerializableCommandAction } from '../../action/common/action.js';
import { INativeOpenDialogOptions } from '../../dialogs/common/dialogs.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IV8Profile } from '../../profiling/common/profiling.js';
import { AuthInfo, Credentials } from '../../request/common/request.js';
import { IPartsSplash } from '../../theme/common/themeService.js';
import { IColorScheme, IOpenedAuxiliaryWindow, IOpenedMainWindow, IOpenEmptyWindowOptions, IOpenWindowOptions, IPoint, IRectangle, IWindowOpenable } from '../../window/common/window.js';

export interface ICPUProperties {
	model: string;
	speed: number;
}

export interface IOSProperties {
	type: string;
	release: string;
	arch: string;
	platform: string;
	cpus: ICPUProperties[];
}

export interface IOSStatistics {
	totalmem: number;
	freemem: number;
	loadavg: number[];
}

export interface INativeHostOptions {
	readonly targetWindowId?: number;
}

export interface ICommonNativeHostService {

	readonly _serviceBrand: undefined;

	// Properties
	readonly windowId: number;

	// Events
	readonly onDidOpenMainWindow: Event<number>;

	readonly onDidMaximizeWindow: Event<number>;
	readonly onDidUnmaximizeWindow: Event<number>;

	readonly onDidFocusMainWindow: Event<number>;
	readonly onDidBlurMainWindow: Event<number>;

	readonly onDidChangeWindowFullScreen: Event<{ windowId: number; fullscreen: boolean }>;

	readonly onDidFocusMainOrAuxiliaryWindow: Event<number>;
	readonly onDidBlurMainOrAuxiliaryWindow: Event<number>;

	readonly onDidChangeDisplay: Event<codemavi>;

	readonly onDidResumeOS: Event<unknown>;

	readonly onDidChangeColorScheme: Event<IColorScheme>;

	readonly onDidChangePassword: Event<{ readonly service: string; readonly account: string }>;

	readonly onDidTriggerWindowSystemContextMenu: Event<{ readonly windowId: number; readonly x: number; readonly y: number }>;

	// Window
	getWindows(options: { includeAuxiliaryWindows: true }): Promise<Array<IOpenedMainWindow | IOpenedAuxiliaryWindow>>;
	getWindows(options: { includeAuxiliaryWindows: false }): Promise<Array<IOpenedMainWindow>>;
	getWindowCount(): Promise<number>;
	getActiveWindowId(): Promise<number | undefined>;
	getActiveWindowPosition(): Promise<IRectangle | undefined>;
	getNativeWindowHandle(windowId: number): Promise<VSBuffer | undefined>;

	openWindow(options?: IOpenEmptyWindowOptions): Promise<codemavi>;
	openWindow(toOpen: IWindowOpenable[], options?: IOpenWindowOptions): Promise<codemavi>;

	isFullScreen(options?: INativeHostOptions): Promise<boolean>;
	toggleFullScreen(options?: INativeHostOptions): Promise<codemavi>;

	getCursorScreenPoint(): Promise<{ readonly point: IPoint; readonly display: IRectangle }>;

	isMaximized(options?: INativeHostOptions): Promise<boolean>;
	maximizeWindow(options?: INativeHostOptions): Promise<codemavi>;
	unmaximizeWindow(options?: INativeHostOptions): Promise<codemavi>;
	minimizeWindow(options?: INativeHostOptions): Promise<codemavi>;
	moveWindowTop(options?: INativeHostOptions): Promise<codemavi>;
	positionWindow(position: IRectangle, options?: INativeHostOptions): Promise<codemavi>;

	/**
	 * Only supported on Windows and macOS. Updates the window controls to match the title bar size.
	 *
	 * @param options `backgroundColor` and `foregroundColor` are only supported on Windows
	 */
	updateWindowControls(options: INativeHostOptions & { height?: number; backgroundColor?: string; foregroundColor?: string }): Promise<codemavi>;

	setMinimumSize(width: number | undefined, height: number | undefined): Promise<codemavi>;

	saveWindowSplash(splash: IPartsSplash): Promise<codemavi>;

	/**
	 * Make the window focused.
	 *
	 * @param options Pass `force: true` if you want to make the window take
	 * focus even if the application does not have focus currently. This option
	 * should only be used if it is necessary to steal focus from the current
	 * focused application which may not be VSCode.
	 */
	focusWindow(options?: INativeHostOptions & { force?: boolean }): Promise<codemavi>;

	// Dialogs
	showMessageBox(options: MessageBoxOptions & INativeHostOptions): Promise<MessageBoxReturnValue>;
	showSaveDialog(options: SaveDialogOptions & INativeHostOptions): Promise<SaveDialogReturnValue>;
	showOpenDialog(options: OpenDialogOptions & INativeHostOptions): Promise<OpenDialogReturnValue>;

	pickFileFolderAndOpen(options: INativeOpenDialogOptions): Promise<codemavi>;
	pickFileAndOpen(options: INativeOpenDialogOptions): Promise<codemavi>;
	pickFolderAndOpen(options: INativeOpenDialogOptions): Promise<codemavi>;
	pickWorkspaceAndOpen(options: INativeOpenDialogOptions): Promise<codemavi>;

	// OS
	showItemInFolder(path: string): Promise<codemavi>;
	setRepresentedFilename(path: string, options?: INativeHostOptions): Promise<codemavi>;
	setDocumentEdited(edited: boolean, options?: INativeHostOptions): Promise<codemavi>;
	openExternal(url: string, defaultApplication?: string): Promise<boolean>;
	moveItemToTrash(fullPath: string): Promise<codemavi>;

	isAdmin(): Promise<boolean>;
	writeElevated(source: URI, target: URI, options?: { unlock?: boolean }): Promise<codemavi>;
	isRunningUnderARM64Translation(): Promise<boolean>;

	getOSProperties(): Promise<IOSProperties>;
	getOSStatistics(): Promise<IOSStatistics>;
	getOSVirtualMachineHint(): Promise<number>;

	getOSColorScheme(): Promise<IColorScheme>;

	hasWSLFeatureInstalled(): Promise<boolean>;

	// Screenshots
	getScreenshot(): Promise<ArrayBufferLike | undefined>;

	// Process
	getProcessId(): Promise<number | undefined>;
	killProcess(pid: number, code: string): Promise<codemavi>;

	// Clipboard
	readClipboardText(type?: 'selection' | 'clipboard'): Promise<string>;
	writeClipboardText(text: string, type?: 'selection' | 'clipboard'): Promise<codemavi>;
	readClipboardFindText(): Promise<string>;
	writeClipboardFindText(text: string): Promise<codemavi>;
	writeClipboardBuffer(format: string, buffer: VSBuffer, type?: 'selection' | 'clipboard'): Promise<codemavi>;
	readClipboardBuffer(format: string): Promise<VSBuffer>;
	hasClipboard(format: string, type?: 'selection' | 'clipboard'): Promise<boolean>;
	readImage(): Promise<Uint8Array>;

	// macOS Touchbar
	newWindowTab(): Promise<codemavi>;
	showPreviousWindowTab(): Promise<codemavi>;
	showNextWindowTab(): Promise<codemavi>;
	moveWindowTabToNewWindow(): Promise<codemavi>;
	mergeAllWindowTabs(): Promise<codemavi>;
	toggleWindowTabsBar(): Promise<codemavi>;
	updateTouchBar(items: ISerializableCommandAction[][]): Promise<codemavi>;

	// macOS Shell command
	installShellCommand(): Promise<codemavi>;
	uninstallShellCommand(): Promise<codemavi>;

	// Lifecycle
	notifyReady(): Promise<codemavi>;
	relaunch(options?: { addArgs?: string[]; removeArgs?: string[] }): Promise<codemavi>;
	reload(options?: { disableExtensions?: boolean }): Promise<codemavi>;
	closeWindow(options?: INativeHostOptions): Promise<codemavi>;
	quit(): Promise<codemavi>;
	exit(code: number): Promise<codemavi>;

	// Development
	openDevTools(options?: Partial<OpenDevToolsOptions> & INativeHostOptions): Promise<codemavi>;
	toggleDevTools(options?: INativeHostOptions): Promise<codemavi>;
	openGPUInfoWindow(): Promise<codemavi>;

	// Perf Introspection
	profileRenderer(session: string, duration: number): Promise<IV8Profile>;

	// Connectivity
	resolveProxy(url: string): Promise<string | undefined>;
	lookupAuthorization(authInfo: AuthInfo): Promise<Credentials | undefined>;
	lookupKerberosAuthorization(url: string): Promise<string | undefined>;
	loadCertificates(): Promise<string[]>;
	findFreePort(startPort: number, giveUpAfter: number, timeout: number, stride?: number): Promise<number>;

	// Registry (Windows only)
	windowsGetStringRegKey(hive: 'HKEY_CURRENT_USER' | 'HKEY_LOCAL_MACHINE' | 'HKEY_CLASSES_ROOT' | 'HKEY_USERS' | 'HKEY_CURRENT_CONFIG', path: string, name: string): Promise<string | undefined>;
}

export const INativeHostService = createDecorator<INativeHostService>('nativeHostService');

/**
 * A set of methods specific to a native host, i.e. unsupported in web
 * environments.
 *
 * @see {@link IHostService} for methods that can be used in native and web
 * hosts.
 */
export interface INativeHostService extends ICommonNativeHostService { }
