/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../base/common/event.js';
import { workbenchInstantiationService as browserWorkbenchInstantiationService, ITestInstantiationService, TestEncodingOracle, TestEnvironmentService, TestFileDialogService, TestFilesConfigurationService, TestFileService, TestLifecycleService, TestTextFileService } from '../browser/workbenchTestServices.js';
import { ISharedProcessService } from '../../../platform/ipc/electron-sandbox/services.js';
import { INativeHostService, INativeHostOptions, IOSProperties, IOSStatistics } from '../../../platform/native/common/native.js';
import { VSBuffer, VSBufferReadable, VSBufferReadableStream } from '../../../base/common/buffer.js';
import { DisposableStore, IDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IFileDialogService, INativeOpenDialogOptions } from '../../../platform/dialogs/common/dialogs.js';
import { IPartsSplash } from '../../../platform/theme/common/themeService.js';
import { IOpenedMainWindow, IOpenEmptyWindowOptions, IWindowOpenable, IOpenWindowOptions, IColorScheme, IRectangle, IPoint } from '../../../platform/window/common/window.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IEnvironmentService, INativeEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IPathService } from '../../services/path/common/pathService.js';
import { ITextEditorService } from '../../services/textfile/common/textEditorService.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { AbstractNativeExtensionTipsService } from '../../../platform/extensionManagement/common/extensionTipsService.js';
import { IExtensionManagementService } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationNotificationService } from '../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ModelService } from '../../../editor/common/services/modelService.js';
import { IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { IFilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { ILifecycleService } from '../../services/lifecycle/common/lifecycle.js';
import { IWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackup.js';
import { IWorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { TestContextService } from '../common/workbenchTestServices.js';
import { NativeTextFileService } from '../../services/textfile/electron-sandbox/nativeTextFileService.js';
import { insert } from '../../../base/common/arrays.js';
import { Schemas } from '../../../base/common/network.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../platform/files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../platform/log/common/log.js';
import { FileUserDataProvider } from '../../../platform/userData/common/fileUserDataProvider.js';
import { IWorkingCopyIdentifier } from '../../services/workingCopy/common/workingCopy.js';
import { NativeWorkingCopyBackupService } from '../../services/workingCopy/electron-sandbox/workingCopyBackupService.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { UserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfile.js';
import { AuthInfo, Credentials } from '../../../platform/request/common/request.js';

export class TestSharedProcessService implements ISharedProcessService {

	declare readonly _serviceBrand: undefined;

	createRawConnection(): never { throw new Error('Not Implemented'); }
	getChannel(channelName: string): any { return undefined; }
	registerChannel(channelName: string, channel: any): codemavi { }
	notifyRestored(): codemavi { }
}

export class TestNativeHostService implements INativeHostService {
	declare readonly _serviceBrand: undefined;

	readonly windowId = -1;

	onDidOpenMainWindow: Event<number> = Event.None;
	onDidMaximizeWindow: Event<number> = Event.None;
	onDidUnmaximizeWindow: Event<number> = Event.None;
	onDidFocusMainWindow: Event<number> = Event.None;
	onDidBlurMainWindow: Event<number> = Event.None;
	onDidFocusMainOrAuxiliaryWindow: Event<number> = Event.None;
	onDidBlurMainOrAuxiliaryWindow: Event<number> = Event.None;
	onDidResumeOS: Event<unknown> = Event.None;
	onDidChangeColorScheme = Event.None;
	onDidChangePassword = Event.None;
	onDidTriggerWindowSystemContextMenu: Event<{ windowId: number; x: number; y: number }> = Event.None;
	onDidChangeWindowFullScreen = Event.None;
	onDidChangeDisplay = Event.None;

	windowCount = Promise.resolve(1);
	getWindowCount(): Promise<number> { return this.windowCount; }

	async getWindows(): Promise<IOpenedMainWindow[]> { return []; }
	async getActiveWindowId(): Promise<number | undefined> { return undefined; }
	async getActiveWindowPosition(): Promise<IRectangle | undefined> { return undefined; }
	async getNativeWindowHandle(windowId: number): Promise<VSBuffer | undefined> { return undefined; }

	openWindow(options?: IOpenEmptyWindowOptions): Promise<codemavi>;
	openWindow(toOpen: IWindowOpenable[], options?: IOpenWindowOptions): Promise<codemavi>;
	openWindow(arg1?: IOpenEmptyWindowOptions | IWindowOpenable[], arg2?: IOpenWindowOptions): Promise<codemavi> {
		throw new Error('Method not implemented.');
	}

	async toggleFullScreen(): Promise<codemavi> { }
	async isMaximized(): Promise<boolean> { return true; }
	async isFullScreen(): Promise<boolean> { return true; }
	async maximizeWindow(): Promise<codemavi> { }
	async unmaximizeWindow(): Promise<codemavi> { }
	async minimizeWindow(): Promise<codemavi> { }
	async moveWindowTop(options?: INativeHostOptions): Promise<codemavi> { }
	getCursorScreenPoint(): Promise<{ readonly point: IPoint; readonly display: IRectangle }> { throw new Error('Method not implemented.'); }
	async positionWindow(position: IRectangle, options?: INativeHostOptions): Promise<codemavi> { }
	async updateWindowControls(options: { height?: number; backgroundColor?: string; foregroundColor?: string }): Promise<codemavi> { }
	async setMinimumSize(width: number | undefined, height: number | undefined): Promise<codemavi> { }
	async saveWindowSplash(value: IPartsSplash): Promise<codemavi> { }
	async focusWindow(options?: INativeHostOptions): Promise<codemavi> { }
	async showMessageBox(options: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue> { throw new Error('Method not implemented.'); }
	async showSaveDialog(options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> { throw new Error('Method not implemented.'); }
	async showOpenDialog(options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> { throw new Error('Method not implemented.'); }
	async pickFileFolderAndOpen(options: INativeOpenDialogOptions): Promise<codemavi> { }
	async pickFileAndOpen(options: INativeOpenDialogOptions): Promise<codemavi> { }
	async pickFolderAndOpen(options: INativeOpenDialogOptions): Promise<codemavi> { }
	async pickWorkspaceAndOpen(options: INativeOpenDialogOptions): Promise<codemavi> { }
	async showItemInFolder(path: string): Promise<codemavi> { }
	async setRepresentedFilename(path: string): Promise<codemavi> { }
	async isAdmin(): Promise<boolean> { return false; }
	async writeElevated(source: URI, target: URI): Promise<codemavi> { }
	async isRunningUnderARM64Translation(): Promise<boolean> { return false; }
	async getOSProperties(): Promise<IOSProperties> { return Object.create(null); }
	async getOSStatistics(): Promise<IOSStatistics> { return Object.create(null); }
	async getOSVirtualMachineHint(): Promise<number> { return 0; }
	async getOSColorScheme(): Promise<IColorScheme> { return { dark: true, highContrast: false }; }
	async hasWSLFeatureInstalled(): Promise<boolean> { return false; }
	async getProcessId(): Promise<number> { throw new Error('Method not implemented.'); }
	async killProcess(): Promise<codemavi> { }
	async setDocumentEdited(edited: boolean): Promise<codemavi> { }
	async openExternal(url: string, defaultApplication?: string): Promise<boolean> { return false; }
	async updateTouchBar(): Promise<codemavi> { }
	async moveItemToTrash(): Promise<codemavi> { }
	async newWindowTab(): Promise<codemavi> { }
	async showPreviousWindowTab(): Promise<codemavi> { }
	async showNextWindowTab(): Promise<codemavi> { }
	async moveWindowTabToNewWindow(): Promise<codemavi> { }
	async mergeAllWindowTabs(): Promise<codemavi> { }
	async toggleWindowTabsBar(): Promise<codemavi> { }
	async installShellCommand(): Promise<codemavi> { }
	async uninstallShellCommand(): Promise<codemavi> { }
	async notifyReady(): Promise<codemavi> { }
	async relaunch(options?: { addArgs?: string[] | undefined; removeArgs?: string[] | undefined } | undefined): Promise<codemavi> { }
	async reload(): Promise<codemavi> { }
	async closeWindow(): Promise<codemavi> { }
	async quit(): Promise<codemavi> { }
	async exit(code: number): Promise<codemavi> { }
	async openDevTools(options?: Partial<Electron.OpenDevToolsOptions> & INativeHostOptions | undefined): Promise<codemavi> { }
	async toggleDevTools(): Promise<codemavi> { }
	async openGPUInfoWindow(): Promise<codemavi> { }
	async resolveProxy(url: string): Promise<string | undefined> { return undefined; }
	async lookupAuthorization(authInfo: AuthInfo): Promise<Credentials | undefined> { return undefined; }
	async lookupKerberosAuthorization(url: string): Promise<string | undefined> { return undefined; }
	async loadCertificates(): Promise<string[]> { return []; }
	async findFreePort(startPort: number, giveUpAfter: number, timeout: number, stride?: number): Promise<number> { return -1; }
	async readClipboardText(type?: 'selection' | 'clipboard' | undefined): Promise<string> { return ''; }
	async writeClipboardText(text: string, type?: 'selection' | 'clipboard' | undefined): Promise<codemavi> { }
	async readClipboardFindText(): Promise<string> { return ''; }
	async writeClipboardFindText(text: string): Promise<codemavi> { }
	async writeClipboardBuffer(format: string, buffer: VSBuffer, type?: 'selection' | 'clipboard' | undefined): Promise<codemavi> { }
	async readImage(): Promise<Uint8Array> { return Uint8Array.from([]); }
	async readClipboardBuffer(format: string): Promise<VSBuffer> { return VSBuffer.wrap(Uint8Array.from([])); }
	async hasClipboard(format: string, type?: 'selection' | 'clipboard' | undefined): Promise<boolean> { return false; }
	async windowsGetStringRegKey(hive: 'HKEY_CURRENT_USER' | 'HKEY_LOCAL_MACHINE' | 'HKEY_CLASSES_ROOT' | 'HKEY_USERS' | 'HKEY_CURRENT_CONFIG', path: string, name: string): Promise<string | undefined> { return undefined; }
	async profileRenderer(): Promise<any> { throw new Error(); }
	async getScreenshot(): Promise<ArrayBufferLike | undefined> { return undefined; }
}

export class TestExtensionTipsService extends AbstractNativeExtensionTipsService {

	constructor(
		@INativeEnvironmentService environmentService: INativeEnvironmentService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IExtensionManagementService extensionManagementService: IExtensionManagementService,
		@IStorageService storageService: IStorageService,
		@INativeHostService nativeHostService: INativeHostService,
		@IExtensionRecommendationNotificationService extensionRecommendationNotificationService: IExtensionRecommendationNotificationService,
		@IFileService fileService: IFileService,
		@IProductService productService: IProductService,
	) {
		super(environmentService.userHome, nativeHostService, telemetryService, extensionManagementService, storageService, extensionRecommendationNotificationService, fileService, productService);
	}
}

export function workbenchInstantiationService(overrides?: {
	environmentService?: (instantiationService: IInstantiationService) => IEnvironmentService;
	fileService?: (instantiationService: IInstantiationService) => IFileService;
	configurationService?: (instantiationService: IInstantiationService) => TestConfigurationService;
	textFileService?: (instantiationService: IInstantiationService) => ITextFileService;
	pathService?: (instantiationService: IInstantiationService) => IPathService;
	editorService?: (instantiationService: IInstantiationService) => IEditorService;
	contextKeyService?: (instantiationService: IInstantiationService) => IContextKeyService;
	textEditorService?: (instantiationService: IInstantiationService) => ITextEditorService;
}, disposables = new DisposableStore()): ITestInstantiationService {
	const instantiationService = browserWorkbenchInstantiationService({
		workingCopyBackupService: () => disposables.add(new TestNativeWorkingCopyBackupService()),
		...overrides
	}, disposables);

	instantiationService.stub(INativeHostService, new TestNativeHostService());

	return instantiationService;
}

export class TestServiceAccessor {
	constructor(
		@ILifecycleService public lifecycleService: TestLifecycleService,
		@ITextFileService public textFileService: TestTextFileService,
		@IFilesConfigurationService public filesConfigurationService: TestFilesConfigurationService,
		@IWorkspaceContextService public contextService: TestContextService,
		@IModelService public modelService: ModelService,
		@IFileService public fileService: TestFileService,
		@INativeHostService public nativeHostService: TestNativeHostService,
		@IFileDialogService public fileDialogService: TestFileDialogService,
		@IWorkingCopyBackupService public workingCopyBackupService: TestNativeWorkingCopyBackupService,
		@IWorkingCopyService public workingCopyService: IWorkingCopyService,
		@IEditorService public editorService: IEditorService
	) {
	}
}

export class TestNativeTextFileServiceWithEncodingOverrides extends NativeTextFileService {

	private _testEncoding: TestEncodingOracle | undefined;
	override get encoding(): TestEncodingOracle {
		if (!this._testEncoding) {
			this._testEncoding = this._register(this.instantiationService.createInstance(TestEncodingOracle));
		}

		return this._testEncoding;
	}
}

export class TestNativeWorkingCopyBackupService extends NativeWorkingCopyBackupService implements IDisposable {

	private backupResourceJoiners: Function[];
	private discardBackupJoiners: Function[];
	discardedBackups: IWorkingCopyIdentifier[];
	discardedAllBackups: boolean;
	private pendingBackupsArr: Promise<codemavi>[];

	constructor() {
		const environmentService = TestEnvironmentService;
		const logService = new NullLogService();
		const fileService = new FileService(logService);
		const lifecycleService = new TestLifecycleService();
		super(environmentService as any, fileService, logService, lifecycleService);

		const inMemoryFileSystemProvider = this._register(new InMemoryFileSystemProvider());
		this._register(fileService.registerProvider(Schemas.inMemory, inMemoryFileSystemProvider));
		const uriIdentityService = this._register(new UriIdentityService(fileService));
		const userDataProfilesService = this._register(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
		this._register(fileService.registerProvider(Schemas.vscodeUserData, this._register(new FileUserDataProvider(Schemas.file, inMemoryFileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService))));

		this.backupResourceJoiners = [];
		this.discardBackupJoiners = [];
		this.discardedBackups = [];
		this.pendingBackupsArr = [];
		this.discardedAllBackups = false;

		this._register(fileService);
		this._register(lifecycleService);
	}

	testGetFileService(): IFileService {
		return this.fileService;
	}

	async waitForAllBackups(): Promise<codemavi> {
		await Promise.all(this.pendingBackupsArr);
	}

	joinBackupResource(): Promise<codemavi> {
		return new Promise(resolve => this.backupResourceJoiners.push(resolve));
	}

	override async backup(identifier: IWorkingCopyIdentifier, content?: VSBufferReadableStream | VSBufferReadable, versionId?: number, meta?: any, token?: CancellationToken): Promise<codemavi> {
		const p = super.backup(identifier, content, versionId, meta, token);
		const removeFromPendingBackups = insert(this.pendingBackupsArr, p.then(undefined, undefined));

		try {
			await p;
		} finally {
			removeFromPendingBackups();
		}

		while (this.backupResourceJoiners.length) {
			this.backupResourceJoiners.pop()!();
		}
	}

	joinDiscardBackup(): Promise<codemavi> {
		return new Promise(resolve => this.discardBackupJoiners.push(resolve));
	}

	override async discardBackup(identifier: IWorkingCopyIdentifier): Promise<codemavi> {
		await super.discardBackup(identifier);
		this.discardedBackups.push(identifier);

		while (this.discardBackupJoiners.length) {
			this.discardBackupJoiners.pop()!();
		}
	}

	override async discardBackups(filter?: { except: IWorkingCopyIdentifier[] }): Promise<codemavi> {
		this.discardedAllBackups = true;

		return super.discardBackups(filter);
	}

	async getBackupContents(identifier: IWorkingCopyIdentifier): Promise<string> {
		const backupResource = this.toBackupResource(identifier);

		const fileContents = await this.fileService.readFile(backupResource);

		return fileContents.value.toString();
	}
}
