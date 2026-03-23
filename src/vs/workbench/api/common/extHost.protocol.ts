/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { IRemoteConsoleLog } from '../../../base/common/console.js';
import { SerializedError } from '../../../base/common/errors.js';
import { IRelativePattern } from '../../../base/common/glob.js';
import { IMarkdownString } from '../../../base/common/htmlContent.js';
import { IDisposable } from '../../../base/common/lifecycle.js';
import * as performance from '../../../base/common/performance.js';
import Severity from '../../../base/common/severity.js';
import { ThemeColor, ThemeIcon } from '../../../base/common/themables.js';
import { URI, UriComponents, UriDto } from '../../../base/common/uri.js';
import { RenderLineNumbersType, TextEditorCursorStyle } from '../../../editor/common/config/editorOptions.js';
import { ISingleEditOperation } from '../../../editor/common/core/editOperation.js';
import { IPosition } from '../../../editor/common/core/position.js';
import { IRange } from '../../../editor/common/core/range.js';
import { ISelection, Selection } from '../../../editor/common/core/selection.js';
import { IChange } from '../../../editor/common/diff/legacyLinesDiffComputer.js';
import * as editorCommon from '../../../editor/common/editorCommon.js';
import { StandardTokenType } from '../../../editor/common/encodedTokenAttributes.js';
import * as languages from '../../../editor/common/languages.js';
import { CompletionItemLabel } from '../../../editor/common/languages.js';
import { CharacterPair, CommentRule, EnterAction } from '../../../editor/common/languages/languageConfiguration.js';
import { EndOfLineSequence } from '../../../editor/common/model.js';
import { IModelChangedEvent } from '../../../editor/common/model/mirrorTextModel.js';
import { IAccessibilityInformation } from '../../../platform/accessibility/common/accessibility.js';
import { ILocalizedString } from '../../../platform/action/common/action.js';
import { ConfigurationTarget, IConfigurationChange, IConfigurationData, IConfigurationOverrides } from '../../../platform/configuration/common/configuration.js';
import { ConfigurationScope } from '../../../platform/configuration/common/configurationRegistry.js';
import { IExtensionIdWithVersion } from '../../../platform/extensionManagement/common/extensionStorage.js';
import { ExtensionIdentifier, IExtensionDescription } from '../../../platform/extensions/common/extensions.js';
import * as files from '../../../platform/files/common/files.js';
import { ResourceLabelFormatter } from '../../../platform/label/common/label.js';
import { ILoggerOptions, ILoggerResource, LogLevel } from '../../../platform/log/common/log.js';
import { IMarkerData } from '../../../platform/markers/common/markers.js';
import { IProgressOptions, IProgressStep } from '../../../platform/progress/common/progress.js';
import * as quickInput from '../../../platform/quickinput/common/quickInput.js';
import { IRemoteConnectionData, TunnelDescription } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { AuthInfo, Credentials } from '../../../platform/request/common/request.js';
import { ClassifiedEvent, IGDPRProperty, OmitMetadata, StrictPropertyCheck } from '../../../platform/telemetry/common/gdprTypings.js';
import { TelemetryLevel } from '../../../platform/telemetry/common/telemetry.js';
import { ISerializableEnvironmentDescriptionMap, ISerializableEnvironmentVariableCollection } from '../../../platform/terminal/common/environmentVariable.js';
import { ICreateContributedTerminalProfileOptions, IProcessProperty, IProcessReadyWindowsPty, IShellLaunchConfigDto, ITerminalEnvironment, ITerminalLaunchError, ITerminalProfile, TerminalExitReason, TerminalLocation, TerminalShellType } from '../../../platform/terminal/common/terminal.js';
import { ProvidedPortAttributes, TunnelCreationOptions, TunnelOptions, TunnelPrivacyId, TunnelProviderFeatures } from '../../../platform/tunnel/common/tunnel.js';
import { EditSessionIdentityMatch } from '../../../platform/workspace/common/editSessions.js';
import { WorkspaceTrustRequestOptions } from '../../../platform/workspace/common/workspaceTrust.js';
import { SaveReason } from '../../common/editor.js';
import { IRevealOptions, ITreeItem, IViewBadge } from '../../common/views.js';
import { CallHierarchyItem } from '../../contrib/callHierarchy/common/callHierarchy.js';
import { IChatAgentMetadata, IChatAgentRequest, IChatAgentResult } from '../../contrib/chat/common/chatAgents.js';
import { ICodeMapperRequest, ICodeMapperResult } from '../../contrib/chat/common/chatCodeMapperService.js';
import { IChatRelatedFile, IChatRelatedFileProviderMetadata as IChatRelatedFilesProviderMetadata, IChatRequestDraft } from '../../contrib/chat/common/chatEditingService.js';
import { IChatProgressHistoryResponseContent } from '../../contrib/chat/common/chatModel.js';
import { IChatContentInlineReference, IChatFollowup, IChatNotebookEdit, IChatProgress, IChatResponseErrorDetails, IChatTask, IChatTaskDto, IChatUserActionEvent, IChatVoteAction } from '../../contrib/chat/common/chatService.js';
import { IChatRequestVariableValue } from '../../contrib/chat/common/chatVariables.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { IChatMessage, IChatResponseFragment, ILanguageModelChatMetadata, ILanguageModelChatSelector, ILanguageModelsChangeEvent } from '../../contrib/chat/common/languageModels.js';
import { IPreparedToolInvocation, IToolData, IToolInvocation, IToolResult } from '../../contrib/chat/common/languageModelToolsService.js';
import { DebugConfigurationProviderTriggerKind, IAdapterDescriptor, IConfig, IDebugSessionReplMode, IDebugTestRunReference, IDebugVisualization, IDebugVisualizationContext, IDebugVisualizationTreeItem, MainThreadDebugVisualization } from '../../contrib/debug/common/debug.js';
import { McpCollectionDefinition, McpConnectionState, McpServerDefinition, McpServerLaunch } from '../../contrib/mcp/common/mcpTypes.js';
import * as notebookCommon from '../../contrib/notebook/common/notebookCommon.js';
import { CellExecutionUpdateType } from '../../contrib/notebook/common/notebookExecutionService.js';
import { ICellExecutionComplete, ICellExecutionStateUpdate } from '../../contrib/notebook/common/notebookExecutionStateService.js';
import { ICellRange } from '../../contrib/notebook/common/notebookRange.js';
import { InputValidationType } from '../../contrib/scm/common/scm.js';
import { IWorkspaceSymbol, NotebookPriorityInfo } from '../../contrib/search/common/search.js';
import { IRawClosedNotebookFileMatch } from '../../contrib/search/common/searchNotebookHelpers.js';
import { IKeywordRecognitionEvent, ISpeechProviderMetadata, ISpeechToTextEvent, ITextToSpeechEvent } from '../../contrib/speech/common/speechService.js';
import { CoverageDetails, ExtensionRunTestsRequest, ICallProfileRunHandler, IFileCoverage, ISerializedTestResults, IStartControllerTests, ITestItem, ITestMessage, ITestRunProfile, ITestRunTask, ResolvedTestRunRequest, TestControllerCapability, TestMessageFollowupRequest, TestMessageFollowupResponse, TestResultState, TestsDiffOp } from '../../contrib/testing/common/testTypes.js';
import { Timeline, TimelineChangeEvent, TimelineOptions, TimelineProviderDescriptor } from '../../contrib/timeline/common/timeline.js';
import { TypeHierarchyItem } from '../../contrib/typeHierarchy/common/typeHierarchy.js';
import { RelatedInformationResult, RelatedInformationType } from '../../services/aiRelatedInformation/common/aiRelatedInformation.js';
import { AuthenticationSession, AuthenticationSessionAccount, AuthenticationSessionsChangeEvent, IAuthenticationCreateSessionOptions, IAuthenticationProviderSessionOptions } from '../../services/authentication/common/authentication.js';
import { EditorGroupColumn } from '../../services/editor/common/editorGroupColumn.js';
import { IExtensionDescriptionDelta, IStaticWorkspaceData } from '../../services/extensions/common/extensionHostProtocol.js';
import { IResolveAuthorityResult } from '../../services/extensions/common/extensionHostProxy.js';
import { ActivationKind, ExtensionActivationReason, MissingExtensionDependency } from '../../services/extensions/common/extensions.js';
import { Dto, IRPCProtocol, SerializableObjectWithBuffers, createProxyIdentifier } from '../../services/extensions/common/proxyIdentifier.js';
import { ILanguageStatus } from '../../services/languageStatus/common/languageStatusService.js';
import { OutputChannelUpdateMode } from '../../services/output/common/output.js';
import { CandidatePort } from '../../services/remote/common/tunnelModel.js';
import { IFileQueryBuilderOptions, ITextQueryBuilderOptions } from '../../services/search/common/queryBuilder.js';
import * as search from '../../services/search/common/search.js';
import { TextSearchCompleteMessage } from '../../services/search/common/searchExtTypes.js';
import { ISaveProfileResult } from '../../services/userDataProfile/common/userDataProfile.js';
import { TerminalShellExecutionCommandLineConfidence } from './extHostTypes.js';
import * as tasks from './shared/tasks.js';

export interface IWorkspaceData extends IStaticWorkspaceData {
	folders: { uri: UriComponents; name: string; index: number }[];
}

export interface IConfigurationInitData extends IConfigurationData {
	configurationScopes: [string, ConfigurationScope | undefined][];
}

export interface IMainContext extends IRPCProtocol {
}

// --- main thread

export interface MainThreadClipboardShape extends IDisposable {
	$readText(): Promise<string>;
	$writeText(value: string): Promise<codemavi>;
}

export interface MainThreadCommandsShape extends IDisposable {
	$registerCommand(id: string): codemavi;
	$unregisterCommand(id: string): codemavi;
	$fireCommandActivationEvent(id: string): codemavi;
	$executeCommand(id: string, args: any[] | SerializableObjectWithBuffers<any[]>, retry: boolean): Promise<unknown | undefined>;
	$getCommands(): Promise<string[]>;
}

export interface CommentProviderFeatures {
	reactionGroup?: languages.CommentReaction[];
	reactionHandler?: boolean;
	options?: languages.CommentOptions;
}

export interface CommentChanges {
	readonly uniqueIdInThread: number;
	readonly body: string | IMarkdownString;
	readonly userName: string;
	readonly userIconPath?: UriComponents;
	readonly contextValue?: string;
	readonly commentReactions?: languages.CommentReaction[];
	readonly label?: string;
	readonly mode?: languages.CommentMode;
	readonly state?: languages.CommentState;
	readonly timestamp?: string;
}

export type CommentThreadChanges<T = IRange> = Partial<{
	range: T | undefined;
	label: string;
	contextValue: string | null;
	comments: CommentChanges[];
	collapseState: languages.CommentThreadCollapsibleState;
	canReply: boolean;
	state: languages.CommentThreadState;
	applicability: languages.CommentThreadApplicability;
	isTemplate: boolean;
}>;

export interface MainThreadCommentsShape extends IDisposable {
	$registerCommentController(handle: number, id: string, label: string, extensionId: string): codemavi;
	$unregisterCommentController(handle: number): codemavi;
	$updateCommentControllerFeatures(handle: number, features: CommentProviderFeatures): codemavi;
	$createCommentThread(handle: number, commentThreadHandle: number, threadId: string, resource: UriComponents, range: IRange | ICellRange | undefined, comments: languages.Comment[], extensionId: ExtensionIdentifier, isTemplate: boolean, editorId?: string): languages.CommentThread<IRange | ICellRange> | undefined;
	$updateCommentThread(handle: number, commentThreadHandle: number, threadId: string, resource: UriComponents, changes: CommentThreadChanges): codemavi;
	$deleteCommentThread(handle: number, commentThreadHandle: number): codemavi;
	$updateCommentingRanges(handle: number, resourceHints?: languages.CommentingRangeResourceHint): codemavi;
	$revealCommentThread(handle: number, commentThreadHandle: number, commentUniqueIdInThread: number, options: languages.CommentThreadRevealOptions): Promise<codemavi>;
	$hideCommentThread(handle: number, commentThreadHandle: number): codemavi;
}

export interface AuthenticationForceNewSessionOptions {
	detail?: string;
	sessionToRecreate?: AuthenticationSession;
}

export interface AuthenticationInteractiveOptions {
	detail?: string;
	learnMore?: UriComponents;
	sessionToRecreate?: AuthenticationSession;
}

export interface AuthenticationGetSessionOptions {
	clearSessionPreference?: boolean;
	createIfNone?: boolean | AuthenticationInteractiveOptions;
	forceNewSession?: boolean | AuthenticationInteractiveOptions;
	silent?: boolean;
	account?: AuthenticationSessionAccount;
}

export interface MainThreadAuthenticationShape extends IDisposable {
	$registerAuthenticationProvider(id: string, label: string, supportsMultipleAccounts: boolean): codemavi;
	$unregisterAuthenticationProvider(id: string): codemavi;
	$ensureProvider(id: string): Promise<codemavi>;
	$sendDidChangeSessions(providerId: string, event: AuthenticationSessionsChangeEvent): codemavi;
	$getSession(providerId: string, scopes: readonly string[], extensionId: string, extensionName: string, options: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined>;
	$getAccounts(providerId: string): Promise<ReadonlyArray<AuthenticationSessionAccount>>;
	$removeSession(providerId: string, sessionId: string): Promise<codemavi>;
}

export interface MainThreadSecretStateShape extends IDisposable {
	$getPassword(extensionId: string, key: string): Promise<string | undefined>;
	$setPassword(extensionId: string, key: string, value: string): Promise<codemavi>;
	$deletePassword(extensionId: string, key: string): Promise<codemavi>;
}

export interface MainThreadConfigurationShape extends IDisposable {
	$updateConfigurationOption(target: ConfigurationTarget | null, key: string, value: any, overrides: IConfigurationOverrides | undefined, scopeToLanguage: boolean | undefined): Promise<codemavi>;
	$removeConfigurationOption(target: ConfigurationTarget | null, key: string, overrides: IConfigurationOverrides | undefined, scopeToLanguage: boolean | undefined): Promise<codemavi>;
}

export interface MainThreadDiagnosticsShape extends IDisposable {
	$changeMany(owner: string, entries: [UriComponents, IMarkerData[] | undefined][]): codemavi;
	$clear(owner: string): codemavi;
}

export interface MainThreadDialogOpenOptions {
	defaultUri?: UriComponents;
	openLabel?: string;
	canSelectFiles?: boolean;
	canSelectFolders?: boolean;
	canSelectMany?: boolean;
	filters?: { [name: string]: string[] };
	title?: string;
	allowUIResources?: boolean;
}

export interface MainThreadDialogSaveOptions {
	defaultUri?: UriComponents;
	saveLabel?: string;
	filters?: { [name: string]: string[] };
	title?: string;
}

export interface MainThreadDiaglogsShape extends IDisposable {
	$showOpenDialog(options?: MainThreadDialogOpenOptions): Promise<UriComponents[] | undefined>;
	$showSaveDialog(options?: MainThreadDialogSaveOptions): Promise<UriComponents | undefined>;
}

export interface MainThreadDecorationsShape extends IDisposable {
	$registerDecorationProvider(handle: number, label: string): codemavi;
	$unregisterDecorationProvider(handle: number): codemavi;
	$onDidChange(handle: number, resources: UriComponents[] | null): codemavi;
}

export interface MainThreadDocumentContentProvidersShape extends IDisposable {
	$registerTextContentProvider(handle: number, scheme: string): codemavi;
	$unregisterTextContentProvider(handle: number): codemavi;
	$onVirtualDocumentChange(uri: UriComponents, value: string): Promise<codemavi>;
}

export interface MainThreadDocumentsShape extends IDisposable {
	$tryCreateDocument(options?: { language?: string; content?: string; encoding?: string }): Promise<UriComponents>;
	$tryOpenDocument(uri: UriComponents, options?: { encoding?: string }): Promise<UriComponents>;
	$trySaveDocument(uri: UriComponents): Promise<boolean>;
}

export interface ITextEditorConfigurationUpdate {
	tabSize?: number | 'auto';
	indentSize?: number | 'tabSize';
	insertSpaces?: boolean | 'auto';
	cursorStyle?: TextEditorCursorStyle;
	lineNumbers?: RenderLineNumbersType;
}

export interface IResolvedTextEditorConfiguration {
	tabSize: number;
	indentSize: number;
	originalIndentSize: number | 'tabSize';
	insertSpaces: boolean;
	cursorStyle: TextEditorCursorStyle;
	lineNumbers: RenderLineNumbersType;
}

export enum TextEditorRevealType {
	Default = 0,
	InCenter = 1,
	InCenterIfOutsideViewport = 2,
	AtTop = 3
}

export interface IUndoStopOptions {
	undoStopBefore: boolean;
	undoStopAfter: boolean;
}

export interface IApplyEditsOptions extends IUndoStopOptions {
	setEndOfLine?: EndOfLineSequence;
}

export interface ISnippetOptions extends IUndoStopOptions {
	keepWhitespace?: boolean;
}
export interface ITextDocumentShowOptions {
	position?: EditorGroupColumn;
	preserveFocus?: boolean;
	pinned?: boolean;
	selection?: IRange;
}

export interface MainThreadBulkEditsShape extends IDisposable {
	$tryApplyWorkspaceEdit(workspaceEditDto: SerializableObjectWithBuffers<IWorkspaceEditDto>, undoRedoGroupId?: number, respectAutoSaveConfig?: boolean): Promise<boolean>;
}

export interface MainThreadTextEditorsShape extends IDisposable {
	$tryShowTextDocument(resource: UriComponents, options: ITextDocumentShowOptions): Promise<string | undefined>;
	$registerTextEditorDecorationType(extensionId: ExtensionIdentifier, key: string, options: editorCommon.IDecorationRenderOptions): codemavi;
	$removeTextEditorDecorationType(key: string): codemavi;
	$tryShowEditor(id: string, position: EditorGroupColumn): Promise<codemavi>;
	$tryHideEditor(id: string): Promise<codemavi>;
	$trySetOptions(id: string, options: ITextEditorConfigurationUpdate): Promise<codemavi>;
	$trySetDecorations(id: string, key: string, ranges: editorCommon.IDecorationOptions[]): Promise<codemavi>;
	$trySetDecorationsFast(id: string, key: string, ranges: number[]): Promise<codemavi>;
	$tryRevealRange(id: string, range: IRange, revealType: TextEditorRevealType): Promise<codemavi>;
	$trySetSelections(id: string, selections: ISelection[]): Promise<codemavi>;
	$tryApplyEdits(id: string, modelVersionId: number, edits: ISingleEditOperation[], opts: IApplyEditsOptions): Promise<boolean>;
	$tryInsertSnippet(id: string, modelVersionId: number, template: string, selections: readonly IRange[], opts: IUndoStopOptions): Promise<boolean>;
	$getDiffInformation(id: string): Promise<IChange[]>;
}

export interface MainThreadTreeViewsShape extends IDisposable {
	$registerTreeViewDataProvider(treeViewId: string, options: { showCollapseAll: boolean; canSelectMany: boolean; dropMimeTypes: readonly string[]; dragMimeTypes: readonly string[]; hasHandleDrag: boolean; hasHandleDrop: boolean; manuallyManageCheckboxes: boolean }): Promise<codemavi>;
	$refresh(treeViewId: string, itemsToRefresh?: { [treeItemHandle: string]: ITreeItem }): Promise<codemavi>;
	$reveal(treeViewId: string, itemInfo: { item: ITreeItem; parentChain: ITreeItem[] } | undefined, options: IRevealOptions): Promise<codemavi>;
	$setMessage(treeViewId: string, message: string | IMarkdownString): codemavi;
	$setTitle(treeViewId: string, title: string, description: string | undefined): codemavi;
	$setBadge(treeViewId: string, badge: IViewBadge | undefined): codemavi;
	$resolveDropFileData(destinationViewId: string, requestId: number, dataItemId: string): Promise<VSBuffer>;
	$disposeTree(treeViewId: string): Promise<codemavi>;
}

export interface MainThreadDownloadServiceShape extends IDisposable {
	$download(uri: UriComponents, to: UriComponents): Promise<codemavi>;
}

export interface MainThreadErrorsShape extends IDisposable {
	$onUnexpectedError(err: any | SerializedError): codemavi;
}

export interface MainThreadConsoleShape extends IDisposable {
	$logExtensionHostMessage(msg: IRemoteConsoleLog): codemavi;
}

export interface IRegExpDto {
	pattern: string;
	flags?: string;
}
export interface IIndentationRuleDto {
	decreaseIndentPattern: IRegExpDto;
	increaseIndentPattern: IRegExpDto;
	indentNextLinePattern?: IRegExpDto;
	unIndentedLinePattern?: IRegExpDto;
}
export interface IOnEnterRuleDto {
	beforeText: IRegExpDto;
	afterText?: IRegExpDto;
	previousLineText?: IRegExpDto;
	action: EnterAction;
}
export interface ILanguageConfigurationDto {
	comments?: CommentRule;
	brackets?: CharacterPair[];
	wordPattern?: IRegExpDto;
	indentationRules?: IIndentationRuleDto;
	onEnterRules?: IOnEnterRuleDto[];
	__electricCharacterSupport?: {
		brackets?: any;
		docComment?: {
			scope: string;
			open: string;
			lineStart: string;
			close?: string;
		};
	};
	__characterPairSupport?: {
		autoClosingPairs: {
			open: string;
			close: string;
			notIn?: string[];
		}[];
	};
	autoClosingPairs?: {
		open: string;
		close: string;
		notIn?: string[];
	}[];
}

export type GlobPattern = string | IRelativePattern;

export interface IRelativePatternDto extends IRelativePattern {
	baseUri: UriComponents;
}

export interface IDocumentFilterDto {
	$serialized: true;
	language?: string;
	scheme?: string;
	pattern?: string | IRelativePattern;
	exclusive?: boolean;
	notebookType?: string;
	isBuiltin?: boolean;
}

export interface IShareableItemDto {
	resourceUri: UriComponents;
	selection?: IRange;
}

export interface IDocumentContextItemDto {
	readonly uri: UriComponents;
	readonly version: number;
	readonly ranges: IRange[];
}

export interface IConversationItemDto {
	readonly type: 'request' | 'response';
	readonly message: string;
	readonly references?: IDocumentContextItemDto[];
}

export interface IMappedEditsContextDto {
	documents: IDocumentContextItemDto[][];
	conversation?: IConversationItemDto[];
}

export interface ICodeBlockDto {
	code: string;
	resource: UriComponents;
}

export interface IMappedEditsRequestDto {
	readonly codeBlocks: ICodeBlockDto[];
	readonly conversation?: IConversationItemDto[];
}

export interface IMappedEditsResultDto {
	readonly errorMessage?: string;
}

export interface ISignatureHelpProviderMetadataDto {
	readonly triggerCharacters: readonly string[];
	readonly retriggerCharacters: readonly string[];
}

export interface IdentifiableInlineCompletions extends languages.InlineCompletions<IdentifiableInlineCompletion> {
	pid: number;
}

export interface IdentifiableInlineCompletion extends languages.InlineCompletion {
	idx: number;
}

export interface IdentifiableInlineEdit extends languages.IInlineEdit {
	pid: number;
}

export interface MainThreadLanguageFeaturesShape extends IDisposable {
	$unregister(handle: number): codemavi;
	$registerDocumentSymbolProvider(handle: number, selector: IDocumentFilterDto[], label: string): codemavi;
	$registerCodeLensSupport(handle: number, selector: IDocumentFilterDto[], eventHandle: number | undefined): codemavi;
	$emitCodeLensEvent(eventHandle: number, event?: any): codemavi;
	$registerDefinitionSupport(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerDeclarationSupport(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerImplementationSupport(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerTypeDefinitionSupport(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerHoverProvider(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerEvaluatableExpressionProvider(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerInlineValuesProvider(handle: number, selector: IDocumentFilterDto[], eventHandle: number | undefined): codemavi;
	$emitInlineValuesEvent(eventHandle: number, event?: any): codemavi;
	$registerDocumentHighlightProvider(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerMultiDocumentHighlightProvider(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerLinkedEditingRangeProvider(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerReferenceSupport(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerCodeActionSupport(handle: number, selector: IDocumentFilterDto[], metadata: ICodeActionProviderMetadataDto, displayName: string, extensionID: string, supportsResolve: boolean): codemavi;
	$registerPasteEditProvider(handle: number, selector: IDocumentFilterDto[], metadata: IPasteEditProviderMetadataDto): codemavi;
	$registerDocumentFormattingSupport(handle: number, selector: IDocumentFilterDto[], extensionId: ExtensionIdentifier, displayName: string): codemavi;
	$registerRangeFormattingSupport(handle: number, selector: IDocumentFilterDto[], extensionId: ExtensionIdentifier, displayName: string, supportRanges: boolean): codemavi;
	$registerOnTypeFormattingSupport(handle: number, selector: IDocumentFilterDto[], autoFormatTriggerCharacters: string[], extensionId: ExtensionIdentifier): codemavi;
	$registerNavigateTypeSupport(handle: number, supportsResolve: boolean): codemavi;
	$registerRenameSupport(handle: number, selector: IDocumentFilterDto[], supportsResolveInitialValues: boolean): codemavi;
	$registerNewSymbolNamesProvider(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerDocumentSemanticTokensProvider(handle: number, selector: IDocumentFilterDto[], legend: languages.SemanticTokensLegend, eventHandle: number | undefined): codemavi;
	$emitDocumentSemanticTokensEvent(eventHandle: number): codemavi;
	$registerDocumentRangeSemanticTokensProvider(handle: number, selector: IDocumentFilterDto[], legend: languages.SemanticTokensLegend): codemavi;
	$registerCompletionsProvider(handle: number, selector: IDocumentFilterDto[], triggerCharacters: string[], supportsResolveDetails: boolean, extensionId: ExtensionIdentifier): codemavi;
	$registerInlineCompletionsSupport(handle: number, selector: IDocumentFilterDto[], supportsHandleDidShowCompletionItem: boolean, extensionId: string, yieldsToExtensionIds: string[], displayName: string | undefined, debounceDelayMs: number | undefined): codemavi;
	$registerInlineEditProvider(handle: number, selector: IDocumentFilterDto[], extensionId: ExtensionIdentifier, displayName: string): codemavi;
	$registerSignatureHelpProvider(handle: number, selector: IDocumentFilterDto[], metadata: ISignatureHelpProviderMetadataDto): codemavi;
	$registerInlayHintsProvider(handle: number, selector: IDocumentFilterDto[], supportsResolve: boolean, eventHandle: number | undefined, displayName: string | undefined): codemavi;
	$emitInlayHintsEvent(eventHandle: number): codemavi;
	$registerDocumentLinkProvider(handle: number, selector: IDocumentFilterDto[], supportsResolve: boolean): codemavi;
	$registerDocumentColorProvider(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerFoldingRangeProvider(handle: number, selector: IDocumentFilterDto[], extensionId: ExtensionIdentifier, eventHandle: number | undefined): codemavi;
	$emitFoldingRangeEvent(eventHandle: number, event?: any): codemavi;
	$registerSelectionRangeProvider(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerCallHierarchyProvider(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerTypeHierarchyProvider(handle: number, selector: IDocumentFilterDto[]): codemavi;
	$registerDocumentOnDropEditProvider(handle: number, selector: IDocumentFilterDto[], metadata?: IDocumentDropEditProviderMetadata): codemavi;
	$resolvePasteFileData(handle: number, requestId: number, dataId: string): Promise<VSBuffer>;
	$resolveDocumentOnDropFileData(handle: number, requestId: number, dataId: string): Promise<VSBuffer>;
	$setLanguageConfiguration(handle: number, languageId: string, configuration: ILanguageConfigurationDto): codemavi;
}

export interface MainThreadLanguagesShape extends IDisposable {
	$changeLanguage(resource: UriComponents, languageId: string): Promise<codemavi>;
	$tokensAtPosition(resource: UriComponents, position: IPosition): Promise<undefined | { type: StandardTokenType; range: IRange }>;
	$setLanguageStatus(handle: number, status: ILanguageStatus): codemavi;
	$removeLanguageStatus(handle: number): codemavi;
}

export interface MainThreadMessageOptions {
	source?: { identifier: ExtensionIdentifier; label: string };
	modal?: boolean;
	detail?: string;
	useCustom?: boolean;
}

export interface MainThreadMessageServiceShape extends IDisposable {
	$showMessage(severity: Severity, message: string, options: MainThreadMessageOptions, commands: { title: string; isCloseAffordance: boolean; handle: number }[]): Promise<number | undefined>;
}

export interface MainThreadOutputServiceShape extends IDisposable {
	$register(label: string, file: UriComponents, languageId: string | undefined, extensionId: string): Promise<string>;
	$update(channelId: string, mode: OutputChannelUpdateMode, till?: number): Promise<codemavi>;
	$reveal(channelId: string, preserveFocus: boolean): Promise<codemavi>;
	$close(channelId: string): Promise<codemavi>;
	$dispose(channelId: string): Promise<codemavi>;
}

export interface MainThreadProgressShape extends IDisposable {

	$startProgress(handle: number, options: IProgressOptions, extensionId?: string): Promise<codemavi>;
	$progressReport(handle: number, message: IProgressStep): codemavi;
	$progressEnd(handle: number): codemavi;
}

/**
 * A terminal that is created on the extension host side is temporarily assigned
 * a UUID by the extension host that created it. Once the renderer side has assigned
 * a real numeric id, the numeric id will be used.
 *
 * All other terminals (that are not created on the extension host side) always
 * use the numeric id.
 */
export type ExtHostTerminalIdentifier = number | string;

export interface TerminalLaunchConfig {
	name?: string;
	shellPath?: string;
	shellArgs?: string[] | string;
	cwd?: string | UriComponents;
	env?: ITerminalEnvironment;
	icon?: URI | { light: URI; dark: URI } | ThemeIcon;
	color?: string;
	initialText?: string;
	waitOnExit?: boolean;
	strictEnv?: boolean;
	hideFromUser?: boolean;
	isExtensionCustomPtyTerminal?: boolean;
	forceShellIntegration?: boolean;
	isFeatureTerminal?: boolean;
	isExtensionOwnedTerminal?: boolean;
	useShellEnvironment?: boolean;
	location?: TerminalLocation | { viewColumn: number; preserveFocus?: boolean } | { parentTerminal: ExtHostTerminalIdentifier } | { splitActiveTerminal: boolean };
	isTransient?: boolean;
}


export interface MainThreadTerminalServiceShape extends IDisposable {
	$createTerminal(extHostTerminalId: string, config: TerminalLaunchConfig): Promise<codemavi>;
	$dispose(id: ExtHostTerminalIdentifier): codemavi;
	$hide(id: ExtHostTerminalIdentifier): codemavi;
	$sendText(id: ExtHostTerminalIdentifier, text: string, shouldExecute: boolean): codemavi;
	$show(id: ExtHostTerminalIdentifier, preserveFocus: boolean): codemavi;
	$registerProcessSupport(isSupported: boolean): codemavi;
	$registerProfileProvider(id: string, extensionIdentifier: string): codemavi;
	$unregisterProfileProvider(id: string): codemavi;
	$registerCompletionProvider(id: string, extensionIdentifier: string, ...triggerCharacters: string[]): codemavi;
	$unregisterCompletionProvider(id: string): codemavi;
	$registerQuickFixProvider(id: string, extensionIdentifier: string): codemavi;
	$unregisterQuickFixProvider(id: string): codemavi;
	$setEnvironmentVariableCollection(extensionIdentifier: string, persistent: boolean, collection: ISerializableEnvironmentVariableCollection | undefined, descriptionMap: ISerializableEnvironmentDescriptionMap): codemavi;

	// Optional event toggles
	$startSendingDataEvents(): codemavi;
	$stopSendingDataEvents(): codemavi;
	$startSendingCommandEvents(): codemavi;
	$stopSendingCommandEvents(): codemavi;
	$startLinkProvider(): codemavi;
	$stopLinkProvider(): codemavi;

	// Process
	$sendProcessData(terminalId: number, data: string): codemavi;
	$sendProcessReady(terminalId: number, pid: number, cwd: string, windowsPty: IProcessReadyWindowsPty | undefined): codemavi;
	$sendProcessProperty(terminalId: number, property: IProcessProperty<any>): codemavi;
	$sendProcessExit(terminalId: number, exitCode: number | undefined): codemavi;
}

export interface MainThreadTerminalShellIntegrationShape extends IDisposable {
	$executeCommand(terminalId: number, commandLine: string): codemavi;
}

export type TransferQuickPickItemOrSeparator = TransferQuickPickItem | quickInput.IQuickPickSeparator;
export interface TransferQuickPickItem {
	handle: number;

	// shared properties from IQuickPickItem
	type?: 'item';
	label: string;
	iconPath?: { light?: URI; dark: URI };
	iconClass?: string;
	description?: string;
	detail?: string;
	picked?: boolean;
	alwaysShow?: boolean;
	buttons?: TransferQuickInputButton[];
}

export interface TransferQuickInputButton extends quickInput.IQuickInputButton {
	handle: number;
}

export type TransferQuickInput = TransferQuickPick | TransferInputBox;

export interface BaseTransferQuickInput {

	[key: string]: any;

	id: number;

	title?: string;

	type?: 'quickPick' | 'inputBox';

	enabled?: boolean;

	busy?: boolean;

	visible?: boolean;
}

export interface TransferQuickPick extends BaseTransferQuickInput {

	type?: 'quickPick';

	value?: string;

	placeholder?: string;

	buttons?: TransferQuickInputButton[];

	items?: TransferQuickPickItemOrSeparator[];

	activeItems?: number[];

	selectedItems?: number[];

	canSelectMany?: boolean;

	ignoreFocusOut?: boolean;

	matchOnDescription?: boolean;

	matchOnDetail?: boolean;

	sortByLabel?: boolean;
}

export interface TransferInputBox extends BaseTransferQuickInput {

	type?: 'inputBox';

	value?: string;

	valueSelection?: Readonly<[number, number]>;

	placeholder?: string;

	password?: boolean;

	buttons?: TransferQuickInputButton[];

	prompt?: string;

	validationMessage?: string;
}

export interface IInputBoxOptions {
	title?: string;
	value?: string;
	valueSelection?: Readonly<[number, number]>;
	prompt?: string;
	placeHolder?: string;
	password?: boolean;
	ignoreFocusOut?: boolean;
}

export interface MainThreadQuickOpenShape extends IDisposable {
	$show(instance: number, options: quickInput.IPickOptions<TransferQuickPickItem>, token: CancellationToken): Promise<number | number[] | undefined>;
	$setItems(instance: number, items: TransferQuickPickItemOrSeparator[]): Promise<codemavi>;
	$setError(instance: number, error: Error): Promise<codemavi>;
	$input(options: IInputBoxOptions | undefined, validateInput: boolean, token: CancellationToken): Promise<string | undefined>;
	$createOrUpdate(params: TransferQuickInput): Promise<codemavi>;
	$dispose(id: number): Promise<codemavi>;
}

export interface MainThreadStatusBarShape extends IDisposable {
	$setEntry(id: string, statusId: string, extensionId: string | undefined, statusName: string, text: string, tooltip: IMarkdownString | string | undefined, hasTooltipProvider: boolean, command: ICommandDto | undefined, color: string | ThemeColor | undefined, backgroundColor: string | ThemeColor | undefined, alignLeft: boolean, priority: number | undefined, accessibilityInformation: IAccessibilityInformation | undefined): codemavi;
	$disposeEntry(id: string): codemavi;
}

export type StatusBarItemDto = {
	entryId: string;
	alignLeft: boolean;
	priority?: number;
	name: string;
	text: string;
	tooltip?: string;
	command?: string;
	accessibilityInformation?: IAccessibilityInformation;
};

export interface ExtHostStatusBarShape {
	$acceptStaticEntries(added?: StatusBarItemDto[]): codemavi;
	$provideTooltip(entryId: string, cancellation: CancellationToken): Promise<string | IMarkdownString | undefined>;
}

export interface MainThreadStorageShape extends IDisposable {
	$initializeExtensionStorage(shared: boolean, extensionId: string): Promise<string | undefined>;
	$setValue(shared: boolean, extensionId: string, value: object): Promise<codemavi>;
	$registerExtensionStorageKeysToSync(extension: IExtensionIdWithVersion, keys: string[]): codemavi;
}

export interface MainThreadTelemetryShape extends IDisposable {
	$publicLog(eventName: string, data?: any): codemavi;
	$publicLog2<E extends ClassifiedEvent<OmitMetadata<T>> = never, T extends IGDPRProperty = never>(eventName: string, data?: StrictPropertyCheck<T, E>): codemavi;
}

export interface MainThreadEditorInsetsShape extends IDisposable {
	$createEditorInset(handle: number, id: string, uri: UriComponents, line: number, height: number, options: IWebviewContentOptions, extensionId: ExtensionIdentifier, extensionLocation: UriComponents): Promise<codemavi>;
	$disposeEditorInset(handle: number): codemavi;

	$setHtml(handle: number, value: string): codemavi;
	$setOptions(handle: number, options: IWebviewContentOptions): codemavi;
	$postMessage(handle: number, value: any): Promise<boolean>;
}

export interface ExtHostEditorInsetsShape {
	$onDidDispose(handle: number): codemavi;
	$onDidReceiveMessage(handle: number, message: any): codemavi;
}

//#region --- tabs model

export const enum TabInputKind {
	UnknownInput,
	TextInput,
	TextDiffInput,
	TextMergeInput,
	NotebookInput,
	NotebookDiffInput,
	CustomEditorInput,
	WebviewEditorInput,
	TerminalEditorInput,
	InteractiveEditorInput,
	ChatEditorInput,
	MultiDiffEditorInput
}

export const enum TabModelOperationKind {
	TAB_OPEN,
	TAB_CLOSE,
	TAB_UPDATE,
	TAB_MOVE
}

export interface UnknownInputDto {
	kind: TabInputKind.UnknownInput;
}

export interface TextInputDto {
	kind: TabInputKind.TextInput;
	uri: UriComponents;
}

export interface TextDiffInputDto {
	kind: TabInputKind.TextDiffInput;
	original: UriComponents;
	modified: UriComponents;
}

export interface TextMergeInputDto {
	kind: TabInputKind.TextMergeInput;
	base: UriComponents;
	input1: UriComponents;
	input2: UriComponents;
	result: UriComponents;
}

export interface NotebookInputDto {
	kind: TabInputKind.NotebookInput;
	notebookType: string;
	uri: UriComponents;
}

export interface NotebookDiffInputDto {
	kind: TabInputKind.NotebookDiffInput;
	notebookType: string;
	original: UriComponents;
	modified: UriComponents;
}

export interface CustomInputDto {
	kind: TabInputKind.CustomEditorInput;
	viewType: string;
	uri: UriComponents;
}

export interface WebviewInputDto {
	kind: TabInputKind.WebviewEditorInput;
	viewType: string;
}

export interface InteractiveEditorInputDto {
	kind: TabInputKind.InteractiveEditorInput;
	uri: UriComponents;
	inputBoxUri: UriComponents;
}

export interface ChatEditorInputDto {
	kind: TabInputKind.ChatEditorInput;
}

export interface MultiDiffEditorInputDto {
	kind: TabInputKind.MultiDiffEditorInput;
	diffEditors: TextDiffInputDto[];
}

export interface TabInputDto {
	kind: TabInputKind.TerminalEditorInput;
}

export type AnyInputDto = UnknownInputDto | TextInputDto | TextDiffInputDto | MultiDiffEditorInputDto | TextMergeInputDto | NotebookInputDto | NotebookDiffInputDto | CustomInputDto | WebviewInputDto | InteractiveEditorInputDto | ChatEditorInputDto | TabInputDto;

export interface MainThreadEditorTabsShape extends IDisposable {
	// manage tabs: move, close, rearrange etc
	$moveTab(tabId: string, index: number, viewColumn: EditorGroupColumn, preserveFocus?: boolean): codemavi;
	$closeTab(tabIds: string[], preserveFocus?: boolean): Promise<boolean>;
	$closeGroup(groupIds: number[], preservceFocus?: boolean): Promise<boolean>;
}

export interface IEditorTabGroupDto {
	isActive: boolean;
	viewColumn: EditorGroupColumn;
	// Decided not to go with simple index here due to opening and closing causing index shifts
	// This allows us to patch the model without having to do full rebuilds
	tabs: IEditorTabDto[];
	groupId: number;
}

export interface TabOperation {
	readonly kind: TabModelOperationKind.TAB_OPEN | TabModelOperationKind.TAB_CLOSE | TabModelOperationKind.TAB_UPDATE | TabModelOperationKind.TAB_MOVE;
	// TODO @lramos15 Possibly get rid of index for tab update, it's only needed for open and close
	readonly index: number;
	readonly tabDto: IEditorTabDto;
	readonly groupId: number;
	readonly oldIndex?: number;
}

export interface IEditorTabDto {
	id: string;
	label: string;
	input: AnyInputDto;
	editorId?: string;
	isActive: boolean;
	isPinned: boolean;
	isPreview: boolean;
	isDirty: boolean;
}

export interface IExtHostEditorTabsShape {
	// Accepts a whole new model
	$acceptEditorTabModel(tabGroups: IEditorTabGroupDto[]): codemavi;
	// Only when group property changes (not the tabs inside)
	$acceptTabGroupUpdate(groupDto: IEditorTabGroupDto): codemavi;
	// When a tab is added, removed, or updated
	$acceptTabOperation(operation: TabOperation): codemavi;
}

//#endregion

export type WebviewHandle = string;

export interface WebviewPanelShowOptions {
	readonly viewColumn?: EditorGroupColumn;
	readonly preserveFocus?: boolean;
}

export interface WebviewExtensionDescription {
	readonly id: ExtensionIdentifier;
	readonly location: UriComponents;
}

export enum WebviewEditorCapabilities {
	Editable,
	SupportsHotExit,
}

export interface IWebviewPortMapping {
	readonly webviewPort: number;
	readonly extensionHostPort: number;
}

export interface IWebviewContentOptions {
	readonly enableScripts?: boolean;
	readonly enableForms?: boolean;
	readonly enableCommandUris?: boolean | readonly string[];
	readonly localResourceRoots?: readonly UriComponents[];
	readonly portMapping?: readonly IWebviewPortMapping[];
}

export interface IWebviewPanelOptions {
	readonly enableFindWidget?: boolean;
	readonly retainContextWhenHidden?: boolean;
}

export interface CustomTextEditorCapabilities {
	readonly supportsMove?: boolean;
}

export const enum WebviewMessageArrayBufferViewType {
	Int8Array = 1,
	Uint8Array = 2,
	Uint8ClampedArray = 3,
	Int16Array = 4,
	Uint16Array = 5,
	Int32Array = 6,
	Uint32Array = 7,
	Float32Array = 8,
	Float64Array = 9,
	BigInt64Array = 10,
	BigUint64Array = 11,
}

export interface WebviewMessageArrayBufferReference {
	readonly $$vscode_array_buffer_reference$$: true;

	readonly index: number;

	/**
	 * Tracks if the reference is to a view instead of directly to an ArrayBuffer.
	 */
	readonly view?: {
		readonly type: WebviewMessageArrayBufferViewType;
		readonly byteLength: number;
		readonly byteOffset: number;
	};
}

export interface MainThreadWebviewsShape extends IDisposable {
	$setHtml(handle: WebviewHandle, value: string): codemavi;
	$setOptions(handle: WebviewHandle, options: IWebviewContentOptions): codemavi;
	$postMessage(handle: WebviewHandle, value: string, ...buffers: VSBuffer[]): Promise<boolean>;
}

export interface IWebviewIconPath {
	readonly light: UriComponents;
	readonly dark: UriComponents;
}

export interface IWebviewInitData {
	readonly title: string;
	readonly webviewOptions: IWebviewContentOptions;
	readonly panelOptions: IWebviewPanelOptions;
	readonly serializeBuffersForPostMessage: boolean;
}

export interface MainThreadWebviewPanelsShape extends IDisposable {
	$createWebviewPanel(
		extension: WebviewExtensionDescription,
		handle: WebviewHandle,
		viewType: string,
		initData: IWebviewInitData,
		showOptions: WebviewPanelShowOptions,
	): codemavi;
	$disposeWebview(handle: WebviewHandle): codemavi;
	$reveal(handle: WebviewHandle, showOptions: WebviewPanelShowOptions): codemavi;
	$setTitle(handle: WebviewHandle, value: string): codemavi;
	$setIconPath(handle: WebviewHandle, value: IWebviewIconPath | undefined): codemavi;

	$registerSerializer(viewType: string, options: { serializeBuffersForPostMessage: boolean }): codemavi;
	$unregisterSerializer(viewType: string): codemavi;
}

export interface MainThreadCustomEditorsShape extends IDisposable {
	$registerTextEditorProvider(extension: WebviewExtensionDescription, viewType: string, options: IWebviewPanelOptions, capabilities: CustomTextEditorCapabilities, serializeBuffersForPostMessage: boolean): codemavi;
	$registerCustomEditorProvider(extension: WebviewExtensionDescription, viewType: string, options: IWebviewPanelOptions, supportsMultipleEditorsPerDocument: boolean, serializeBuffersForPostMessage: boolean): codemavi;
	$unregisterEditorProvider(viewType: string): codemavi;

	$onDidEdit(resource: UriComponents, viewType: string, editId: number, label: string | undefined): codemavi;
	$onContentChange(resource: UriComponents, viewType: string): codemavi;
}

export interface MainThreadWebviewViewsShape extends IDisposable {
	$registerWebviewViewProvider(extension: WebviewExtensionDescription, viewType: string, options: { retainContextWhenHidden?: boolean; serializeBuffersForPostMessage: boolean }): codemavi;
	$unregisterWebviewViewProvider(viewType: string): codemavi;

	$setWebviewViewTitle(handle: WebviewHandle, value: string | undefined): codemavi;
	$setWebviewViewDescription(handle: WebviewHandle, value: string | undefined): codemavi;
	$setWebviewViewBadge(handle: WebviewHandle, badge: IViewBadge | undefined): codemavi;

	$show(handle: WebviewHandle, preserveFocus: boolean): codemavi;
}

export interface WebviewPanelViewStateData {
	[handle: string]: {
		readonly active: boolean;
		readonly visible: boolean;
		readonly position: EditorGroupColumn;
	};
}

export interface ExtHostWebviewsShape {
	$onMessage(handle: WebviewHandle, jsonSerializedMessage: string, buffers: SerializableObjectWithBuffers<VSBuffer[]>): codemavi;
	$onMissingCsp(handle: WebviewHandle, extensionId: string): codemavi;
}

export interface ExtHostWebviewPanelsShape {
	$onDidChangeWebviewPanelViewStates(newState: WebviewPanelViewStateData): codemavi;
	$onDidDisposeWebviewPanel(handle: WebviewHandle): Promise<codemavi>;
	$deserializeWebviewPanel(
		newWebviewHandle: WebviewHandle,
		viewType: string,
		initData: {
			title: string;
			state: any;
			webviewOptions: IWebviewContentOptions;
			panelOptions: IWebviewPanelOptions;
			active: boolean;
		},
		position: EditorGroupColumn,
	): Promise<codemavi>;
}

export interface ExtHostCustomEditorsShape {
	$resolveCustomEditor(
		resource: UriComponents,
		newWebviewHandle: WebviewHandle,
		viewType: string,
		initData: {
			title: string;
			contentOptions: IWebviewContentOptions;
			options: IWebviewPanelOptions;
			active: boolean;
		},
		position: EditorGroupColumn,
		cancellation: CancellationToken
	): Promise<codemavi>;
	$createCustomDocument(resource: UriComponents, viewType: string, backupId: string | undefined, untitledDocumentData: VSBuffer | undefined, cancellation: CancellationToken): Promise<{ editable: boolean }>;
	$disposeCustomDocument(resource: UriComponents, viewType: string): Promise<codemavi>;

	$undo(resource: UriComponents, viewType: string, editId: number, isDirty: boolean): Promise<codemavi>;
	$redo(resource: UriComponents, viewType: string, editId: number, isDirty: boolean): Promise<codemavi>;
	$revert(resource: UriComponents, viewType: string, cancellation: CancellationToken): Promise<codemavi>;
	$disposeEdits(resourceComponents: UriComponents, viewType: string, editIds: number[]): codemavi;

	$onSave(resource: UriComponents, viewType: string, cancellation: CancellationToken): Promise<codemavi>;
	$onSaveAs(resource: UriComponents, viewType: string, targetResource: UriComponents, cancellation: CancellationToken): Promise<codemavi>;

	$backup(resource: UriComponents, viewType: string, cancellation: CancellationToken): Promise<string>;

	$onMoveCustomEditor(handle: WebviewHandle, newResource: UriComponents, viewType: string): Promise<codemavi>;
}

export interface ExtHostWebviewViewsShape {
	$resolveWebviewView(webviewHandle: WebviewHandle, viewType: string, title: string | undefined, state: any, cancellation: CancellationToken): Promise<codemavi>;

	$onDidChangeWebviewViewVisibility(webviewHandle: WebviewHandle, visible: boolean): codemavi;

	$disposeWebviewView(webviewHandle: WebviewHandle): codemavi;
}

export interface MainThreadManagedSocketsShape extends IDisposable {
	$registerSocketFactory(socketFactoryId: number): Promise<codemavi>;
	$unregisterSocketFactory(socketFactoryId: number): Promise<codemavi>;
	$onDidManagedSocketHaveData(socketId: number, data: VSBuffer): codemavi;
	$onDidManagedSocketClose(socketId: number, error: string | undefined): codemavi;
	$onDidManagedSocketEnd(socketId: number): codemavi;
}

export interface ExtHostManagedSocketsShape {
	$openRemoteSocket(socketFactoryId: number): Promise<number>;
	$remoteSocketWrite(socketId: number, buffer: VSBuffer): codemavi;
	$remoteSocketEnd(socketId: number): codemavi;
	$remoteSocketDrain(socketId: number): Promise<codemavi>;
}

export enum CellOutputKind {
	Text = 1,
	Error = 2,
	Rich = 3
}

export enum NotebookEditorRevealType {
	Default = 0,
	InCenter = 1,
	InCenterIfOutsideViewport = 2,
	AtTop = 3
}

export interface INotebookDocumentShowOptions {
	position?: EditorGroupColumn;
	preserveFocus?: boolean;
	pinned?: boolean;
	selections?: ICellRange[];
	label?: string;
}

export type INotebookCellStatusBarEntryDto = Dto<notebookCommon.INotebookCellStatusBarItem>;

export interface INotebookCellStatusBarListDto {
	items: INotebookCellStatusBarEntryDto[];
	cacheId: number;
}

export interface MainThreadNotebookShape extends IDisposable {
	$registerNotebookSerializer(handle: number, extension: notebookCommon.NotebookExtensionDescription, viewType: string, options: notebookCommon.TransientOptions, registration: notebookCommon.INotebookContributionData | undefined): codemavi;
	$unregisterNotebookSerializer(handle: number): codemavi;

	$registerNotebookCellStatusBarItemProvider(handle: number, eventHandle: number | undefined, viewType: string): Promise<codemavi>;
	$unregisterNotebookCellStatusBarItemProvider(handle: number, eventHandle: number | undefined): Promise<codemavi>;
	$emitCellStatusBarEvent(eventHandle: number): codemavi;
}

export interface MainThreadNotebookEditorsShape extends IDisposable {
	$tryShowNotebookDocument(uriComponents: UriComponents, viewType: string, options: INotebookDocumentShowOptions): Promise<string>;
	$tryRevealRange(id: string, range: ICellRange, revealType: NotebookEditorRevealType): Promise<codemavi>;
	$trySetSelections(id: string, range: ICellRange[]): codemavi;
}

export interface MainThreadNotebookDocumentsShape extends IDisposable {
	$tryCreateNotebook(options: { viewType: string; content?: NotebookDataDto }): Promise<UriComponents>;
	$tryOpenNotebook(uriComponents: UriComponents): Promise<UriComponents>;
	$trySaveNotebook(uri: UriComponents): Promise<boolean>;
}

export interface INotebookKernelDto2 {
	id: string;
	notebookType: string;
	extensionId: ExtensionIdentifier;
	extensionLocation: UriComponents;
	label: string;
	detail?: string;
	description?: string;
	supportedLanguages?: string[];
	supportsInterrupt?: boolean;
	supportsExecutionOrder?: boolean;
	preloads?: { uri: UriComponents; provides: readonly string[] }[];
	hasVariableProvider?: boolean;
}

export interface INotebookProxyKernelDto {
	id: string;
	notebookType: string;
	extensionId: ExtensionIdentifier;
	extensionLocation: UriComponents;
	label: string;
	detail?: string;
	description?: string;
	kind?: string;
}

export interface ICellExecuteOutputEditDto {
	editType: CellExecutionUpdateType.Output;
	cellHandle: number;
	append?: boolean;
	outputs: NotebookOutputDto[];
}

export interface ICellExecuteOutputItemEditDto {
	editType: CellExecutionUpdateType.OutputItems;
	append?: boolean;
	outputId: string;
	items: NotebookOutputItemDto[];
}

export interface ICellExecutionStateUpdateDto extends ICellExecutionStateUpdate {
}

export interface ICellExecutionCompleteDto extends ICellExecutionComplete {
}

export type ICellExecuteUpdateDto = ICellExecuteOutputEditDto | ICellExecuteOutputItemEditDto | ICellExecutionStateUpdateDto;

export interface VariablesResult {
	id: number;
	name: string;
	value: string;
	type?: string;
	language?: string;
	expression?: string;
	hasNamedChildren: boolean;
	indexedChildrenCount: number;
	extensionId: string;
}

export interface MainThreadNotebookKernelsShape extends IDisposable {
	$postMessage(handle: number, editorId: string | undefined, message: any): Promise<boolean>;
	$addKernel(handle: number, data: INotebookKernelDto2): Promise<codemavi>;
	$updateKernel(handle: number, data: Partial<INotebookKernelDto2>): codemavi;
	$removeKernel(handle: number): codemavi;
	$updateNotebookPriority(handle: number, uri: UriComponents, value: number | undefined): codemavi;

	$createExecution(handle: number, controllerId: string, uri: UriComponents, cellHandle: number): codemavi;
	$updateExecution(handle: number, data: SerializableObjectWithBuffers<ICellExecuteUpdateDto[]>): codemavi;
	$completeExecution(handle: number, data: SerializableObjectWithBuffers<ICellExecutionCompleteDto>): codemavi;

	$createNotebookExecution(handle: number, controllerId: string, uri: UriComponents): codemavi;
	$beginNotebookExecution(handle: number,): codemavi;
	$completeNotebookExecution(handle: number): codemavi;

	$addKernelDetectionTask(handle: number, notebookType: string): Promise<codemavi>;
	$removeKernelDetectionTask(handle: number): codemavi;

	$addKernelSourceActionProvider(handle: number, eventHandle: number, notebookType: string): Promise<codemavi>;
	$removeKernelSourceActionProvider(handle: number, eventHandle: number): codemavi;
	$emitNotebookKernelSourceActionsChangeEvent(eventHandle: number): codemavi;
	$receiveVariable(requestId: string, variable: VariablesResult): codemavi;
	$variablesUpdated(notebookUri: UriComponents): codemavi;
}

export interface MainThreadNotebookRenderersShape extends IDisposable {
	$postMessage(editorId: string | undefined, rendererId: string, message: unknown): Promise<boolean>;
}

export interface MainThreadInteractiveShape extends IDisposable {
}

export interface MainThreadSpeechShape extends IDisposable {
	$registerProvider(handle: number, identifier: string, metadata: ISpeechProviderMetadata): codemavi;
	$unregisterProvider(handle: number): codemavi;

	$emitSpeechToTextEvent(session: number, event: ISpeechToTextEvent): codemavi;
	$emitTextToSpeechEvent(session: number, event: ITextToSpeechEvent): codemavi;
	$emitKeywordRecognitionEvent(session: number, event: IKeywordRecognitionEvent): codemavi;
}

export interface ExtHostSpeechShape {
	$createSpeechToTextSession(handle: number, session: number, language?: string): Promise<codemavi>;
	$cancelSpeechToTextSession(session: number): Promise<codemavi>;

	$createTextToSpeechSession(handle: number, session: number, language?: string): Promise<codemavi>;
	$synthesizeSpeech(session: number, text: string): Promise<codemavi>;
	$cancelTextToSpeechSession(session: number): Promise<codemavi>;

	$createKeywordRecognitionSession(handle: number, session: number): Promise<codemavi>;
	$cancelKeywordRecognitionSession(session: number): Promise<codemavi>;
}

export interface MainThreadLanguageModelsShape extends IDisposable {
	$registerLanguageModelProvider(handle: number, identifier: string, metadata: ILanguageModelChatMetadata): codemavi;
	$unregisterProvider(handle: number): codemavi;
	$tryStartChatRequest(extension: ExtensionIdentifier, provider: string, requestId: number, messages: SerializableObjectWithBuffers<IChatMessage[]>, options: {}, token: CancellationToken): Promise<codemavi>;
	$reportResponsePart(requestId: number, chunk: IChatResponseFragment): Promise<codemavi>;
	$reportResponseDone(requestId: number, error: SerializedError | undefined): Promise<codemavi>;
	$selectChatModels(selector: ILanguageModelChatSelector): Promise<string[]>;
	$whenLanguageModelChatRequestMade(identifier: string, extension: ExtensionIdentifier, participant?: string, tokenCount?: number): codemavi;
	$countTokens(provider: string, value: string | IChatMessage, token: CancellationToken): Promise<number>;
	$fileIsIgnored(uri: UriComponents, token: CancellationToken): Promise<boolean>;
	$registerFileIgnoreProvider(handle: number): codemavi;
	$unregisterFileIgnoreProvider(handle: number): codemavi;
}

export interface ExtHostLanguageModelsShape {
	$acceptChatModelMetadata(data: ILanguageModelsChangeEvent): codemavi;
	$updateModelAccesslist(data: { from: ExtensionIdentifier; to: ExtensionIdentifier; enabled: boolean }[]): codemavi;
	$startChatRequest(handle: number, requestId: number, from: ExtensionIdentifier, messages: SerializableObjectWithBuffers<IChatMessage[]>, options: { [name: string]: any }, token: CancellationToken): Promise<codemavi>;
	$acceptResponsePart(requestId: number, chunk: IChatResponseFragment): Promise<codemavi>;
	$acceptResponseDone(requestId: number, error: SerializedError | undefined): Promise<codemavi>;
	$provideTokenLength(handle: number, value: string | IChatMessage, token: CancellationToken): Promise<number>;
	$isFileIgnored(handle: number, uri: UriComponents, token: CancellationToken): Promise<boolean>;
}

export interface MainThreadEmbeddingsShape extends IDisposable {
	$registerEmbeddingProvider(handle: number, identifier: string): codemavi;
	$unregisterEmbeddingProvider(handle: number): codemavi;
	$computeEmbeddings(embeddingsModel: string, input: string[], token: CancellationToken): Promise<({ values: number[] }[])>;
}

export interface ExtHostEmbeddingsShape {
	$provideEmbeddings(handle: number, input: string[], token: CancellationToken): Promise<{ values: number[] }[]>;
	$acceptEmbeddingModels(models: string[]): codemavi;
}

export interface IExtensionChatAgentMetadata extends Dto<IChatAgentMetadata> {
	hasFollowups?: boolean;
}

export interface IDynamicChatAgentProps {
	name: string;
	publisherName: string;
	description?: string;
	fullName?: string;
}

export interface MainThreadChatAgentsShape2 extends IDisposable {
	$registerAgent(handle: number, extension: ExtensionIdentifier, id: string, metadata: IExtensionChatAgentMetadata, dynamicProps: IDynamicChatAgentProps | undefined): codemavi;
	$registerChatParticipantDetectionProvider(handle: number): codemavi;
	$unregisterChatParticipantDetectionProvider(handle: number): codemavi;
	$registerRelatedFilesProvider(handle: number, metadata: IChatRelatedFilesProviderMetadata): codemavi;
	$unregisterRelatedFilesProvider(handle: number): codemavi;
	$registerAgentCompletionsProvider(handle: number, id: string, triggerCharacters: string[]): codemavi;
	$unregisterAgentCompletionsProvider(handle: number, id: string): codemavi;
	$updateAgent(handle: number, metadataUpdate: IExtensionChatAgentMetadata): codemavi;
	$unregisterAgent(handle: number): codemavi;
	$handleProgressChunk(requestId: string, chunk: IChatProgressDto, handle?: number): Promise<number | codemavi>;
	$handleAnchorResolve(requestId: string, handle: string, anchor: Dto<IChatContentInlineReference>): codemavi;


	$transferActiveChatSession(toWorkspace: UriComponents): codemavi;
}

export interface ICodeMapperTextEdit {
	uri: URI;
	edits: languages.TextEdit[];
}

export interface ICodeMapperNotebookEditDto {
	uri: URI;
	edits: ICellEditOperationDto[];
}

export type ICodeMapperProgressDto = Dto<ICodeMapperTextEdit> | Dto<ICodeMapperNotebookEditDto>;

export interface MainThreadCodeMapperShape extends IDisposable {
	$registerCodeMapperProvider(handle: number, displayName: string): codemavi;
	$unregisterCodeMapperProvider(handle: number): codemavi;
	$handleProgress(requestId: string, data: ICodeMapperProgressDto): Promise<codemavi>;
}

export interface IChatAgentCompletionItem {
	id: string;
	fullName?: string;
	icon?: string;
	insertText?: string;
	label: string | languages.CompletionItemLabel;
	value: IChatRequestVariableValueDto;
	detail?: string;
	documentation?: string | IMarkdownString;
	command?: ICommandDto;
}

export type IChatContentProgressDto =
	| Dto<Exclude<IChatProgressHistoryResponseContent, IChatTask>>
	| IChatTaskDto;

export type IChatAgentHistoryEntryDto = {
	request: IChatAgentRequest;
	response: ReadonlyArray<IChatContentProgressDto>;
	result: IChatAgentResult;
};

export interface ExtHostChatAgentsShape2 {
	$invokeAgent(handle: number, request: Dto<IChatAgentRequest>, context: { history: IChatAgentHistoryEntryDto[] }, token: CancellationToken): Promise<IChatAgentResult | undefined>;
	$setRequestPaused(handle: number, requestId: string, isPaused: boolean): codemavi;
	$provideFollowups(request: Dto<IChatAgentRequest>, handle: number, result: IChatAgentResult, context: { history: IChatAgentHistoryEntryDto[] }, token: CancellationToken): Promise<IChatFollowup[]>;
	$acceptFeedback(handle: number, result: IChatAgentResult, voteAction: IChatVoteAction): codemavi;
	$acceptAction(handle: number, result: IChatAgentResult, action: IChatUserActionEvent): codemavi;
	$invokeCompletionProvider(handle: number, query: string, token: CancellationToken): Promise<IChatAgentCompletionItem[]>;
	$provideChatTitle(handle: number, context: IChatAgentHistoryEntryDto[], token: CancellationToken): Promise<string | undefined>;
	$provideSampleQuestions(handle: number, location: ChatAgentLocation, token: CancellationToken): Promise<IChatFollowup[] | undefined>;
	$releaseSession(sessionId: string): codemavi;
	$detectChatParticipant(handle: number, request: Dto<IChatAgentRequest>, context: { history: IChatAgentHistoryEntryDto[] }, options: { participants: IChatParticipantMetadata[]; location: ChatAgentLocation }, token: CancellationToken): Promise<IChatParticipantDetectionResult | null | undefined>;
	$provideRelatedFiles(handle: number, request: Dto<IChatRequestDraft>, token: CancellationToken): Promise<Dto<IChatRelatedFile>[] | undefined>;
}
export interface IChatParticipantMetadata {
	participant: string;
	command?: string;
	disambiguation: { category: string; description: string; examples: string[] }[];
}

export interface IChatParticipantDetectionResult {
	participant: string;
	command?: string;
}

export type IToolDataDto = Omit<IToolData, 'when'>;

export interface MainThreadLanguageModelToolsShape extends IDisposable {
	$getTools(): Promise<Dto<IToolDataDto>[]>;
	$invokeTool(dto: IToolInvocation, token?: CancellationToken): Promise<Dto<IToolResult>>;
	$countTokensForInvocation(callId: string, input: string, token: CancellationToken): Promise<number>;
	$registerTool(id: string): codemavi;
	$unregisterTool(name: string): codemavi;
}

export type IChatRequestVariableValueDto = Dto<IChatRequestVariableValue>;

export interface ExtHostLanguageModelToolsShape {
	$onDidChangeTools(tools: IToolDataDto[]): codemavi;
	$invokeTool(dto: IToolInvocation, token: CancellationToken): Promise<Dto<IToolResult>>;
	$countTokensForInvocation(callId: string, input: string, token: CancellationToken): Promise<number>;

	$prepareToolInvocation(toolId: string, parameters: any, token: CancellationToken): Promise<IPreparedToolInvocation | undefined>;
}

export interface MainThreadUrlsShape extends IDisposable {
	$registerUriHandler(handle: number, extensionId: ExtensionIdentifier, extensionDisplayName: string): Promise<codemavi>;
	$unregisterUriHandler(handle: number): Promise<codemavi>;
	$createAppUri(uri: UriComponents): Promise<UriComponents>;
}

export interface IChatDto {
}

export interface IChatRequestDto {
	message: string;
	variables?: Record<string, IChatRequestVariableValue[]>;
}

export interface IChatResponseDto {
	errorDetails?: IChatResponseErrorDetails;
	timings: {
		firstProgress: number;
		totalElapsed: number;
	};
}

export interface IChatResponseProgressFileTreeData {
	label: string;
	uri: URI;
	children?: IChatResponseProgressFileTreeData[];
}

export type IDocumentContextDto = {
	uri: UriComponents;
	version: number;
	ranges: IRange[];
};

export type IChatProgressDto =
	| Dto<Exclude<IChatProgress, IChatTask | IChatNotebookEdit>>
	| IChatTaskDto
	| IChatNotebookEditDto;

export interface ExtHostUrlsShape {
	$handleExternalUri(handle: number, uri: UriComponents): Promise<codemavi>;
}

export interface MainThreadUriOpenersShape extends IDisposable {
	$registerUriOpener(id: string, schemes: readonly string[], extensionId: ExtensionIdentifier, label: string): Promise<codemavi>;
	$unregisterUriOpener(id: string): Promise<codemavi>;
}

export interface ExtHostUriOpenersShape {
	$canOpenUri(id: string, uri: UriComponents, token: CancellationToken): Promise<languages.ExternalUriOpenerPriority>;
	$openUri(id: string, context: { resolvedUri: UriComponents; sourceUri: UriComponents }, token: CancellationToken): Promise<codemavi>;
}

export interface MainThreadProfileContentHandlersShape {
	$registerProfileContentHandler(id: string, name: string, description: string | undefined, extensionId: string): Promise<codemavi>;
	$unregisterProfileContentHandler(id: string): Promise<codemavi>;
}

export interface ExtHostProfileContentHandlersShape {
	$saveProfile(id: string, name: string, content: string, token: CancellationToken): Promise<UriDto<ISaveProfileResult> | null>;
	$readProfile(id: string, idOrUri: string | UriComponents, token: CancellationToken): Promise<string | null>;
}

export interface ITextSearchComplete {
	limitHit?: boolean;
	message?: TextSearchCompleteMessage | TextSearchCompleteMessage[];
}

export interface MainThreadWorkspaceShape extends IDisposable {
	$startFileSearch(includeFolder: UriComponents | null, options: IFileQueryBuilderOptions, token: CancellationToken): Promise<UriComponents[] | null>;
	$startTextSearch(query: search.IPatternInfo, folder: UriComponents | null, options: ITextQueryBuilderOptions, requestId: number, token: CancellationToken): Promise<ITextSearchComplete | null>;
	$checkExists(folders: readonly UriComponents[], includes: string[], token: CancellationToken): Promise<boolean>;
	$save(uri: UriComponents, options: { saveAs: boolean }): Promise<UriComponents | undefined>;
	$saveAll(includeUntitled?: boolean): Promise<boolean>;
	$updateWorkspaceFolders(extensionName: string, index: number, deleteCount: number, workspaceFoldersToAdd: { uri: UriComponents; name?: string }[]): Promise<codemavi>;
	$resolveProxy(url: string): Promise<string | undefined>;
	$lookupAuthorization(authInfo: AuthInfo): Promise<Credentials | undefined>;
	$lookupKerberosAuthorization(url: string): Promise<string | undefined>;
	$loadCertificates(): Promise<string[]>;
	$requestWorkspaceTrust(options?: WorkspaceTrustRequestOptions): Promise<boolean | undefined>;
	$registerEditSessionIdentityProvider(handle: number, scheme: string): codemavi;
	$unregisterEditSessionIdentityProvider(handle: number): codemavi;
	$registerCanonicalUriProvider(handle: number, scheme: string): codemavi;
	$unregisterCanonicalUriProvider(handle: number): codemavi;
	$decode(content: VSBuffer, resource: UriComponents | undefined, options?: { encoding?: string }): Promise<string>;
	$encode(content: string, resource: UriComponents | undefined, options?: { encoding?: string }): Promise<VSBuffer>;
}

export interface IFileChangeDto {
	resource: UriComponents;
	type: files.FileChangeType;
}

export interface MainThreadFileSystemShape extends IDisposable {
	$registerFileSystemProvider(handle: number, scheme: string, capabilities: files.FileSystemProviderCapabilities, readonlyMessage?: IMarkdownString): Promise<codemavi>;
	$unregisterProvider(handle: number): codemavi;
	$onFileSystemChange(handle: number, resource: IFileChangeDto[]): codemavi;

	$stat(resource: UriComponents): Promise<files.IStat>;
	$readdir(resource: UriComponents): Promise<[string, files.FileType][]>;
	$readFile(resource: UriComponents): Promise<VSBuffer>;
	$writeFile(resource: UriComponents, content: VSBuffer): Promise<codemavi>;
	$rename(resource: UriComponents, target: UriComponents, opts: files.IFileOverwriteOptions): Promise<codemavi>;
	$copy(resource: UriComponents, target: UriComponents, opts: files.IFileOverwriteOptions): Promise<codemavi>;
	$mkdir(resource: UriComponents): Promise<codemavi>;
	$delete(resource: UriComponents, opts: files.IFileDeleteOptions): Promise<codemavi>;

	$ensureActivation(scheme: string): Promise<codemavi>;
}

export interface MainThreadFileSystemEventServiceShape extends IDisposable {
	$watch(extensionId: string, session: number, resource: UriComponents, opts: files.IWatchOptions, correlate: boolean): codemavi;
	$unwatch(session: number): codemavi;
}

export interface MainThreadLabelServiceShape extends IDisposable {
	$registerResourceLabelFormatter(handle: number, formatter: ResourceLabelFormatter): codemavi;
	$unregisterResourceLabelFormatter(handle: number): codemavi;
}

export interface MainThreadSearchShape extends IDisposable {
	$registerFileSearchProvider(handle: number, scheme: string): codemavi;
	$registerAITextSearchProvider(handle: number, scheme: string): codemavi;
	$registerTextSearchProvider(handle: number, scheme: string): codemavi;
	$unregisterProvider(handle: number): codemavi;
	$handleFileMatch(handle: number, session: number, data: UriComponents[]): codemavi;
	$handleTextMatch(handle: number, session: number, data: search.IRawFileMatch2[]): codemavi;
	$handleTelemetry(eventName: string, data: any): codemavi;
}

export interface MainThreadShareShape extends IDisposable {
	$registerShareProvider(handle: number, selector: IDocumentFilterDto[], id: string, label: string, priority: number): codemavi;
	$unregisterShareProvider(handle: number): codemavi;
}

export interface MainThreadTaskShape extends IDisposable {
	$createTaskId(task: tasks.ITaskDTO): Promise<string>;
	$registerTaskProvider(handle: number, type: string): Promise<codemavi>;
	$unregisterTaskProvider(handle: number): Promise<codemavi>;
	$fetchTasks(filter?: tasks.ITaskFilterDTO): Promise<tasks.ITaskDTO[]>;
	$getTaskExecution(value: tasks.ITaskHandleDTO | tasks.ITaskDTO): Promise<tasks.ITaskExecutionDTO>;
	$executeTask(task: tasks.ITaskHandleDTO | tasks.ITaskDTO): Promise<tasks.ITaskExecutionDTO>;
	$terminateTask(id: string): Promise<codemavi>;
	$registerTaskSystem(scheme: string, info: tasks.ITaskSystemInfoDTO): codemavi;
	$customExecutionComplete(id: string, result?: number): Promise<codemavi>;
	$registerSupportedExecutions(custom?: boolean, shell?: boolean, process?: boolean): Promise<codemavi>;
}

export interface MainThreadExtensionServiceShape extends IDisposable {
	$getExtension(extensionId: string): Promise<Dto<IExtensionDescription> | undefined>;
	$activateExtension(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<codemavi>;
	$onWillActivateExtension(extensionId: ExtensionIdentifier): Promise<codemavi>;
	$onDidActivateExtension(extensionId: ExtensionIdentifier, codeLoadingTime: number, activateCallTime: number, activateResolvedTime: number, activationReason: ExtensionActivationReason): codemavi;
	$onExtensionActivationError(extensionId: ExtensionIdentifier, error: SerializedError, missingExtensionDependency: MissingExtensionDependency | null): Promise<codemavi>;
	$onExtensionRuntimeError(extensionId: ExtensionIdentifier, error: SerializedError): codemavi;
	$setPerformanceMarks(marks: performance.PerformanceMark[]): Promise<codemavi>;
	$asBrowserUri(uri: UriComponents): Promise<UriComponents>;
}

export interface SCMProviderFeatures {
	hasHistoryProvider?: boolean;
	hasQuickDiffProvider?: boolean;
	quickDiffLabel?: string;
	count?: number;
	commitTemplate?: string;
	acceptInputCommand?: languages.Command;
	actionButton?: SCMActionButtonDto | null;
	statusBarCommands?: ICommandDto[];
}

export interface SCMActionButtonDto {
	command: ICommandDto & { shortTitle?: string };
	secondaryCommands?: ICommandDto[][];
	enabled: boolean;
}

export interface SCMGroupFeatures {
	hideWhenEmpty?: boolean;
	contextValue?: string;
}

export type SCMRawResource = [
	number /*handle*/,
	UriComponents /*resourceUri*/,
	[UriComponents | ThemeIcon | undefined, UriComponents | ThemeIcon | undefined] /*icons: light, dark*/,
	string /*tooltip*/,
	boolean /*strike through*/,
	boolean /*faded*/,
	string /*context value*/,
	ICommandDto | undefined /*command*/,
	UriComponents | undefined /* multiFileDiffEditorOriginalUri */,
	UriComponents | undefined /* multiFileDiffEditorModifiedUri */,
];

export type SCMRawResourceSplice = [
	number /* start */,
	number /* delete count */,
	SCMRawResource[]
];

export type SCMRawResourceSplices = [
	number, /*handle*/
	SCMRawResourceSplice[]
];

export interface SCMHistoryItemRefDto {
	readonly id: string;
	readonly name: string;
	readonly revision?: string;
	readonly category?: string;
	readonly description?: string;
	readonly icon?: UriComponents | { light: UriComponents; dark: UriComponents } | ThemeIcon;
}

export interface SCMHistoryItemRefsChangeEventDto {
	readonly added: readonly SCMHistoryItemRefDto[];
	readonly modified: readonly SCMHistoryItemRefDto[];
	readonly removed: readonly SCMHistoryItemRefDto[];
	readonly silent: boolean;
}

export interface SCMHistoryItemDto {
	readonly id: string;
	readonly parentIds: string[];
	readonly subject: string;
	readonly message: string;
	readonly displayId?: string;
	readonly author?: string;
	readonly authorIcon?: UriComponents | { light: UriComponents; dark: UriComponents } | ThemeIcon;
	readonly authorEmail?: string;
	readonly timestamp?: number;
	readonly statistics?: {
		readonly files: number;
		readonly insertions: number;
		readonly deletions: number;
	};
	readonly references?: SCMHistoryItemRefDto[];
}

export interface SCMHistoryItemChangeDto {
	readonly uri: UriComponents;
	readonly originalUri: UriComponents | undefined;
	readonly modifiedUri: UriComponents | undefined;
}

export interface MainThreadSCMShape extends IDisposable {
	$registerSourceControl(handle: number, id: string, label: string, rootUri: UriComponents | undefined, inputBoxDocumentUri: UriComponents): Promise<codemavi>;
	$updateSourceControl(handle: number, features: SCMProviderFeatures): Promise<codemavi>;
	$unregisterSourceControl(handle: number): Promise<codemavi>;

	$registerGroups(sourceControlHandle: number, groups: [number /*handle*/, string /*id*/, string /*label*/, SCMGroupFeatures, /* multiDiffEditorEnableViewChanges */ boolean][], splices: SCMRawResourceSplices[]): Promise<codemavi>;
	$updateGroup(sourceControlHandle: number, handle: number, features: SCMGroupFeatures): Promise<codemavi>;
	$updateGroupLabel(sourceControlHandle: number, handle: number, label: string): Promise<codemavi>;
	$unregisterGroup(sourceControlHandle: number, handle: number): Promise<codemavi>;

	$spliceResourceStates(sourceControlHandle: number, splices: SCMRawResourceSplices[]): Promise<codemavi>;

	$setInputBoxValue(sourceControlHandle: number, value: string): Promise<codemavi>;
	$setInputBoxPlaceholder(sourceControlHandle: number, placeholder: string): Promise<codemavi>;
	$setInputBoxEnablement(sourceControlHandle: number, enabled: boolean): Promise<codemavi>;
	$setInputBoxVisibility(sourceControlHandle: number, visible: boolean): Promise<codemavi>;
	$showValidationMessage(sourceControlHandle: number, message: string | IMarkdownString, type: InputValidationType): Promise<codemavi>;
	$setValidationProviderIsEnabled(sourceControlHandle: number, enabled: boolean): Promise<codemavi>;

	$onDidChangeHistoryProviderCurrentHistoryItemRefs(sourceControlHandle: number, historyItemRef?: SCMHistoryItemRefDto, historyItemRemoteRef?: SCMHistoryItemRefDto, historyItemBaseRef?: SCMHistoryItemRefDto): Promise<codemavi>;
	$onDidChangeHistoryProviderHistoryItemRefs(sourceControlHandle: number, historyItemRefs: SCMHistoryItemRefsChangeEventDto): Promise<codemavi>;
}

export interface MainThreadQuickDiffShape extends IDisposable {
	$registerQuickDiffProvider(handle: number, selector: IDocumentFilterDto[], label: string, rootUri: UriComponents | undefined, visible: boolean): Promise<codemavi>;
	$unregisterQuickDiffProvider(handle: number): Promise<codemavi>;
}

export type DebugSessionUUID = string;

export interface IDebugConfiguration {
	type: string;
	name: string;
	request: string;
	[key: string]: any;
}

export interface IStartDebuggingOptions {
	parentSessionID?: DebugSessionUUID;
	lifecycleManagedByParent?: boolean;
	repl?: IDebugSessionReplMode;
	noDebug?: boolean;
	compact?: boolean;
	suppressDebugToolbar?: boolean;
	suppressDebugStatusbar?: boolean;
	suppressDebugView?: boolean;
	suppressSaveBeforeStart?: boolean;
	testRun?: IDebugTestRunReference;
}

export interface MainThreadDebugServiceShape extends IDisposable {
	$registerDebugTypes(debugTypes: string[]): codemavi;
	$sessionCached(sessionID: string): codemavi;
	$acceptDAMessage(handle: number, message: DebugProtocol.ProtocolMessage): codemavi;
	$acceptDAError(handle: number, name: string, message: string, stack: string | undefined): codemavi;
	$acceptDAExit(handle: number, code: number | undefined, signal: string | undefined): codemavi;
	$registerDebugConfigurationProvider(type: string, triggerKind: DebugConfigurationProviderTriggerKind, hasProvideMethod: boolean, hasResolveMethod: boolean, hasResolve2Method: boolean, handle: number): Promise<codemavi>;
	$registerDebugAdapterDescriptorFactory(type: string, handle: number): Promise<codemavi>;
	$unregisterDebugConfigurationProvider(handle: number): codemavi;
	$unregisterDebugAdapterDescriptorFactory(handle: number): codemavi;
	$startDebugging(folder: UriComponents | undefined, nameOrConfig: string | IDebugConfiguration, options: IStartDebuggingOptions): Promise<boolean>;
	$stopDebugging(sessionId: DebugSessionUUID | undefined): Promise<codemavi>;
	$setDebugSessionName(id: DebugSessionUUID, name: string): codemavi;
	$customDebugAdapterRequest(id: DebugSessionUUID, command: string, args: any): Promise<any>;
	$getDebugProtocolBreakpoint(id: DebugSessionUUID, breakpoinId: string): Promise<DebugProtocol.Breakpoint | undefined>;
	$appendDebugConsole(value: string): codemavi;
	$registerBreakpoints(breakpoints: Array<ISourceMultiBreakpointDto | IFunctionBreakpointDto | IDataBreakpointDto>): Promise<codemavi>;
	$unregisterBreakpoints(breakpointIds: string[], functionBreakpointIds: string[], dataBreakpointIds: string[]): Promise<codemavi>;
	$registerDebugVisualizer(extensionId: string, id: string): codemavi;
	$unregisterDebugVisualizer(extensionId: string, id: string): codemavi;
	$registerDebugVisualizerTree(treeId: string, canEdit: boolean): codemavi;
	$unregisterDebugVisualizerTree(treeId: string): codemavi;
}

export interface IOpenUriOptions {
	readonly allowTunneling?: boolean;
	readonly allowContributedOpeners?: boolean | string;
}

export interface MainThreadWindowShape extends IDisposable {
	$getInitialState(): Promise<{ isFocused: boolean; isActive: boolean }>;
	$openUri(uri: UriComponents, uriString: string | undefined, options: IOpenUriOptions): Promise<boolean>;
	$asExternalUri(uri: UriComponents, options: IOpenUriOptions): Promise<UriComponents>;
}

export enum CandidatePortSource {
	None = 0,
	Process = 1,
	Output = 2,
	Hybrid = 3
}

export interface PortAttributesSelector {
	portRange?: [number, number] | number;
	commandPattern?: RegExp;
}

export interface MainThreadTunnelServiceShape extends IDisposable {
	$openTunnel(tunnelOptions: TunnelOptions, source: string | undefined): Promise<TunnelDto | undefined>;
	$closeTunnel(remote: { host: string; port: number }): Promise<codemavi>;
	$getTunnels(): Promise<TunnelDescription[]>;
	$setTunnelProvider(features: TunnelProviderFeatures | undefined, enablePortsView: boolean): Promise<codemavi>;
	$setRemoteTunnelService(processId: number): Promise<codemavi>;
	$setCandidateFilter(): Promise<codemavi>;
	$onFoundNewCandidates(candidates: CandidatePort[]): Promise<codemavi>;
	$setCandidatePortSource(source: CandidatePortSource): Promise<codemavi>;
	$registerPortsAttributesProvider(selector: PortAttributesSelector, providerHandle: number): Promise<codemavi>;
	$unregisterPortsAttributesProvider(providerHandle: number): Promise<codemavi>;
}

export interface MainThreadTimelineShape extends IDisposable {
	$registerTimelineProvider(provider: TimelineProviderDescriptor): codemavi;
	$unregisterTimelineProvider(source: string): codemavi;
	$emitTimelineChangeEvent(e: TimelineChangeEvent | undefined): codemavi;
}

export interface HoverWithId extends languages.Hover {
	/**
	 * Id of the hover
	 */
	id: number;
}

// -- extension host

export interface ICommandMetadataDto {
	/**
	 * NOTE: Please use an ILocalizedString. string is in the type for backcompat for now.
	 * A short summary of what the command does. This will be used in:
	 * - API commands
	 * - when showing keybindings that have no other UX
	 * - when searching for commands in the Command Palette
	 */
	readonly description: ILocalizedString | string;
	readonly args?: ReadonlyArray<{
		readonly name: string;
		readonly isOptional?: boolean;
		readonly description?: string;
	}>;
	readonly returns?: string;
}

export interface ICodeMapperRequestDto extends Dto<ICodeMapperRequest> {
	requestId: string;
}

export interface ExtHostCodeMapperShape {
	$mapCode(handle: number, request: ICodeMapperRequestDto, token: CancellationToken): Promise<ICodeMapperResult | null | undefined>;
}

export interface ExtHostCommandsShape {
	$executeContributedCommand(id: string, ...args: any[]): Promise<unknown>;
	$getContributedCommandMetadata(): Promise<{ [id: string]: string | ICommandMetadataDto }>;
}

export interface ExtHostConfigurationShape {
	$initializeConfiguration(data: IConfigurationInitData): codemavi;
	$acceptConfigurationChanged(data: IConfigurationInitData, change: IConfigurationChange): codemavi;
}

export interface ExtHostDiagnosticsShape {
	$acceptMarkersChange(data: [UriComponents, IMarkerData[]][]): codemavi;
}

export interface ExtHostDocumentContentProvidersShape {
	$provideTextDocumentContent(handle: number, uri: UriComponents): Promise<string | null | undefined>;
}

export interface IModelAddedData {
	uri: UriComponents;
	versionId: number;
	lines: string[];
	EOL: string;
	languageId: string;
	isDirty: boolean;
	encoding: string;
}
export interface ExtHostDocumentsShape {
	$acceptModelLanguageChanged(strURL: UriComponents, newLanguageId: string): codemavi;
	$acceptModelSaved(strURL: UriComponents): codemavi;
	$acceptDirtyStateChanged(strURL: UriComponents, isDirty: boolean): codemavi;
	$acceptEncodingChanged(strURL: UriComponents, encoding: string): codemavi;
	$acceptModelChanged(strURL: UriComponents, e: IModelChangedEvent, isDirty: boolean): codemavi;
}

export interface ExtHostDocumentSaveParticipantShape {
	$participateInSave(resource: UriComponents, reason: SaveReason): Promise<boolean[]>;
}

export interface ITextEditorAddData {
	id: string;
	documentUri: UriComponents;
	options: IResolvedTextEditorConfiguration;
	selections: ISelection[];
	visibleRanges: IRange[];
	editorPosition: EditorGroupColumn | undefined;
}
export interface ITextEditorPositionData {
	[id: string]: EditorGroupColumn;
}

export type ITextEditorChange = [
	originalStartLineNumber: number,
	originalEndLineNumberExclusive: number,
	modifiedStartLineNumber: number,
	modifiedEndLineNumberExclusive: number
];

export interface ITextEditorDiffInformation {
	readonly documentVersion: number;
	readonly original: UriComponents | undefined;
	readonly modified: UriComponents;
	readonly changes: readonly ITextEditorChange[];
}

export interface IEditorPropertiesChangeData {
	options: IResolvedTextEditorConfiguration | null;
	selections: ISelectionChangeEvent | null;
	visibleRanges: IRange[] | null;
}
export interface ISelectionChangeEvent {
	selections: Selection[];
	source?: string;
}

export interface ExtHostEditorsShape {
	$acceptEditorPropertiesChanged(id: string, props: IEditorPropertiesChangeData): codemavi;
	$acceptEditorPositionData(data: ITextEditorPositionData): codemavi;
	$acceptEditorDiffInformation(id: string, diffInformation: ITextEditorDiffInformation[] | undefined): codemavi;
}

export interface IDocumentsAndEditorsDelta {
	removedDocuments?: UriComponents[];
	addedDocuments?: IModelAddedData[];
	removedEditors?: string[];
	addedEditors?: ITextEditorAddData[];
	newActiveEditor?: string | null;
}

export interface ExtHostDocumentsAndEditorsShape {
	$acceptDocumentsAndEditorsDelta(delta: IDocumentsAndEditorsDelta): codemavi;
}

export interface IDataTransferFileDTO {
	readonly id: string;
	readonly name: string;
	readonly uri?: UriComponents;
}

export interface DataTransferItemDTO {
	id: string;
	readonly asString: string;
	readonly fileData: IDataTransferFileDTO | undefined;
	readonly uriListData?: ReadonlyArray<string | UriComponents>;
}

export interface DataTransferDTO {
	items: Array<readonly [/* type */string, DataTransferItemDTO]>;
}

export interface CheckboxUpdate {
	treeItemHandle: string;
	newState: boolean;
}

export interface ExtHostTreeViewsShape {
	/**
	 * To reduce what is sent on the wire:
	 * w
	 * 	x
	 *  y
	 *   z
	 *
	 * for [x,y] returns
	 * [[1,z]], where the inner array is [original index, ...children]
	 */
	$getChildren(treeViewId: string, treeItemHandles?: string[]): Promise<(number | ITreeItem)[][] | undefined>;
	$handleDrop(destinationViewId: string, requestId: number, treeDataTransfer: DataTransferDTO, targetHandle: string | undefined, token: CancellationToken, operationUuid?: string, sourceViewId?: string, sourceTreeItemHandles?: string[]): Promise<codemavi>;
	$handleDrag(sourceViewId: string, sourceTreeItemHandles: string[], operationUuid: string, token: CancellationToken): Promise<DataTransferDTO | undefined>;
	$setExpanded(treeViewId: string, treeItemHandle: string, expanded: boolean): codemavi;
	$setSelectionAndFocus(treeViewId: string, selectionHandles: string[], focusHandle: string): codemavi;
	$setVisible(treeViewId: string, visible: boolean): codemavi;
	$changeCheckboxState(treeViewId: string, checkboxUpdates: CheckboxUpdate[]): codemavi;
	$hasResolve(treeViewId: string): Promise<boolean>;
	$resolve(treeViewId: string, treeItemHandle: string, token: CancellationToken): Promise<ITreeItem | undefined>;
}

export interface ExtHostWorkspaceShape {
	$initializeWorkspace(workspace: IWorkspaceData | null, trusted: boolean): codemavi;
	$acceptWorkspaceData(workspace: IWorkspaceData | null): codemavi;
	$handleTextSearchResult(result: search.IRawFileMatch2, requestId: number): codemavi;
	$onDidGrantWorkspaceTrust(): codemavi;
	$getEditSessionIdentifier(folder: UriComponents, token: CancellationToken): Promise<string | undefined>;
	$provideEditSessionIdentityMatch(folder: UriComponents, identity1: string, identity2: string, token: CancellationToken): Promise<EditSessionIdentityMatch | undefined>;
	$onWillCreateEditSessionIdentity(folder: UriComponents, token: CancellationToken, timeout: number): Promise<codemavi>;
	$provideCanonicalUri(uri: UriComponents, targetScheme: string, token: CancellationToken): Promise<UriComponents | undefined>;
}

export interface ExtHostFileSystemInfoShape {
	$acceptProviderInfos(uri: UriComponents, capabilities: number | null): codemavi;
}

export interface ExtHostFileSystemShape {
	$stat(handle: number, resource: UriComponents): Promise<files.IStat>;
	$readdir(handle: number, resource: UriComponents): Promise<[string, files.FileType][]>;
	$readFile(handle: number, resource: UriComponents): Promise<VSBuffer>;
	$writeFile(handle: number, resource: UriComponents, content: VSBuffer, opts: files.IFileWriteOptions): Promise<codemavi>;
	$rename(handle: number, resource: UriComponents, target: UriComponents, opts: files.IFileOverwriteOptions): Promise<codemavi>;
	$copy(handle: number, resource: UriComponents, target: UriComponents, opts: files.IFileOverwriteOptions): Promise<codemavi>;
	$mkdir(handle: number, resource: UriComponents): Promise<codemavi>;
	$delete(handle: number, resource: UriComponents, opts: files.IFileDeleteOptions): Promise<codemavi>;
	$watch(handle: number, session: number, resource: UriComponents, opts: files.IWatchOptions): codemavi;
	$unwatch(handle: number, session: number): codemavi;
	$open(handle: number, resource: UriComponents, opts: files.IFileOpenOptions): Promise<number>;
	$close(handle: number, fd: number): Promise<codemavi>;
	$read(handle: number, fd: number, pos: number, length: number): Promise<VSBuffer>;
	$write(handle: number, fd: number, pos: number, data: VSBuffer): Promise<number>;
}

export interface ExtHostLabelServiceShape {
	$registerResourceLabelFormatter(formatter: ResourceLabelFormatter): IDisposable;
}

export interface ExtHostAuthenticationShape {
	$getSessions(id: string, scopes: string[] | undefined, options: IAuthenticationProviderSessionOptions): Promise<ReadonlyArray<AuthenticationSession>>;
	$createSession(id: string, scopes: string[], options: IAuthenticationCreateSessionOptions): Promise<AuthenticationSession>;
	$removeSession(id: string, sessionId: string): Promise<codemavi>;
	$onDidChangeAuthenticationSessions(id: string, label: string, extensionIdFilter?: string[]): Promise<codemavi>;
}

export interface ExtHostAiRelatedInformationShape {
	$provideAiRelatedInformation(handle: number, query: string, token: CancellationToken): Promise<RelatedInformationResult[]>;
}

export interface MainThreadAiRelatedInformationShape {
	$getAiRelatedInformation(query: string, types: RelatedInformationType[]): Promise<RelatedInformationResult[]>;
	$registerAiRelatedInformationProvider(handle: number, type: RelatedInformationType): codemavi;
	$unregisterAiRelatedInformationProvider(handle: number): codemavi;
}

export interface ExtHostAiEmbeddingVectorShape {
	$provideAiEmbeddingVector(handle: number, strings: string[], token: CancellationToken): Promise<number[][]>;
}

export interface MainThreadAiEmbeddingVectorShape {
	$registerAiEmbeddingVectorProvider(model: string, handle: number): codemavi;
	$unregisterAiEmbeddingVectorProvider(handle: number): codemavi;
}

export interface ExtHostSecretStateShape {
	$onDidChangePassword(e: { extensionId: string; key: string }): Promise<codemavi>;
}

export interface ExtHostSearchShape {
	$enableExtensionHostSearch(): codemavi;
	$getAIName(handle: number): Promise<string | undefined>;
	$provideFileSearchResults(handle: number, session: number, query: search.IRawQuery, token: CancellationToken): Promise<search.ISearchCompleteStats>;
	$provideAITextSearchResults(handle: number, session: number, query: search.IRawAITextQuery, token: CancellationToken): Promise<search.ISearchCompleteStats>;
	$provideTextSearchResults(handle: number, session: number, query: search.IRawTextQuery, token: CancellationToken): Promise<search.ISearchCompleteStats>;
	$clearCache(cacheKey: string): Promise<codemavi>;
}

export interface ExtHostExtensionServiceShape {
	$resolveAuthority(remoteAuthority: string, resolveAttempt: number): Promise<Dto<IResolveAuthorityResult>>;
	/**
	 * Returns `null` if no resolver for `remoteAuthority` is found.
	 */
	$getCanonicalURI(remoteAuthority: string, uri: UriComponents): Promise<UriComponents | null>;
	$startExtensionHost(extensionsDelta: IExtensionDescriptionDelta): Promise<codemavi>;
	$extensionTestsExecute(): Promise<number>;
	$activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<codemavi>;
	$activate(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<boolean>;
	$setRemoteEnvironment(env: { [key: string]: string | null }): Promise<codemavi>;
	$updateRemoteConnectionData(connectionData: IRemoteConnectionData): Promise<codemavi>;

	$deltaExtensions(extensionsDelta: IExtensionDescriptionDelta): Promise<codemavi>;

	$test_latency(n: number): Promise<number>;
	$test_up(b: VSBuffer): Promise<number>;
	$test_down(size: number): Promise<VSBuffer>;
}

export interface FileSystemEvents {
	session?: number;
	created: UriComponents[];
	changed: UriComponents[];
	deleted: UriComponents[];
}

export interface SourceTargetPair {
	source?: UriComponents;
	target: UriComponents;
}

export interface IWillRunFileOperationParticipation {
	edit: IWorkspaceEditDto;
	extensionNames: string[];
}

export interface ExtHostFileSystemEventServiceShape {
	$onFileEvent(events: FileSystemEvents): codemavi;
	$onWillRunFileOperation(operation: files.FileOperation, files: readonly SourceTargetPair[], timeout: number, token: CancellationToken): Promise<IWillRunFileOperationParticipation | undefined>;
	$onDidRunFileOperation(operation: files.FileOperation, files: readonly SourceTargetPair[]): codemavi;
}

export interface ExtHostLanguagesShape {
	$acceptLanguageIds(ids: string[]): codemavi;
}

export interface ExtHostHeapServiceShape {
	$onGarbageCollection(ids: number[]): codemavi;
}
export interface IRawColorInfo {
	color: [number, number, number, number];
	range: IRange;
}

export class IdObject {
	_id?: number;
	private static _n = 0;
	static mixin<T extends object>(object: T): T & IdObject {
		(<any>object)._id = IdObject._n++;
		return <any>object;
	}
}

export const enum ISuggestDataDtoField {
	label = 'a',
	kind = 'b',
	detail = 'c',
	documentation = 'd',
	sortText = 'e',
	filterText = 'f',
	preselect = 'g',
	insertText = 'h',
	insertTextRules = 'i',
	range = 'j',
	commitCharacters = 'k',
	additionalTextEdits = 'l',
	kindModifier = 'm',
	commandIdent = 'n',
	commandId = 'o',
	commandArguments = 'p',
}

export interface ISuggestDataDto {
	[ISuggestDataDtoField.label]: string | languages.CompletionItemLabel;
	[ISuggestDataDtoField.kind]?: languages.CompletionItemKind;
	[ISuggestDataDtoField.detail]?: string;
	[ISuggestDataDtoField.documentation]?: string | IMarkdownString;
	[ISuggestDataDtoField.sortText]?: string;
	[ISuggestDataDtoField.filterText]?: string;
	[ISuggestDataDtoField.preselect]?: true;
	[ISuggestDataDtoField.insertText]?: string;
	[ISuggestDataDtoField.insertTextRules]?: languages.CompletionItemInsertTextRule;
	[ISuggestDataDtoField.range]?: IRange | { insert: IRange; replace: IRange };
	[ISuggestDataDtoField.commitCharacters]?: string;
	[ISuggestDataDtoField.additionalTextEdits]?: ISingleEditOperation[];
	[ISuggestDataDtoField.kindModifier]?: languages.CompletionItemTag[];
	// Command
	[ISuggestDataDtoField.commandIdent]?: string;
	[ISuggestDataDtoField.commandId]?: string;
	[ISuggestDataDtoField.commandArguments]?: any[];
	// not-standard
	x?: ChainedCacheId;
}

export const enum ISuggestResultDtoField {
	defaultRanges = 'a',
	completions = 'b',
	isIncomplete = 'c',
	duration = 'd',
}

export interface ISuggestResultDto {
	[ISuggestResultDtoField.defaultRanges]: { insert: IRange; replace: IRange };
	[ISuggestResultDtoField.completions]: ISuggestDataDto[];
	[ISuggestResultDtoField.isIncomplete]: undefined | true;
	[ISuggestResultDtoField.duration]: number;
	x?: number;
}

export interface ISignatureHelpDto {
	id: CacheId;
	signatures: languages.SignatureInformation[];
	activeSignature: number;
	activeParameter: number;
}

export interface ISignatureHelpContextDto {
	readonly triggerKind: languages.SignatureHelpTriggerKind;
	readonly triggerCharacter: string | undefined;
	readonly isRetrigger: boolean;
	readonly activeSignatureHelp: ISignatureHelpDto | undefined;
}

export type IInlayHintDto = CachedSessionItem<Dto<languages.InlayHint>>;

export type IInlayHintsDto = CachedSession<{ hints: IInlayHintDto[] }>;

export type ILocationDto = Dto<languages.Location>;
export type ILocationLinkDto = Dto<languages.LocationLink>;

export type IWorkspaceSymbolDto = CachedSessionItem<Dto<IWorkspaceSymbol>>;
export type IWorkspaceSymbolsDto = CachedSession<{ symbols: IWorkspaceSymbolDto[] }>;

export interface IWorkspaceEditEntryMetadataDto {
	needsConfirmation: boolean;
	label: string;
	description?: string;
	iconPath?: { id: string } | UriComponents | { light: UriComponents; dark: UriComponents };
}

export interface IChatNotebookEditDto {
	uri: URI;
	edits: ICellEditOperationDto[];
	kind: 'notebookEdit';
	done?: boolean;
}

export type ICellEditOperationDto =
	notebookCommon.ICellMetadataEdit
	| notebookCommon.IDocumentMetadataEdit
	| {
		editType: notebookCommon.CellEditType.Replace;
		index: number;
		count: number;
		cells: NotebookCellDataDto[];
	};

export type IWorkspaceCellEditDto = Dto<Omit<notebookCommon.IWorkspaceNotebookCellEdit, 'cellEdit'>> & { cellEdit: ICellEditOperationDto };

export type IWorkspaceFileEditDto = Dto<
	Omit<languages.IWorkspaceFileEdit, 'options'> & {
		options?: Omit<languages.WorkspaceFileEditOptions, 'contents'> & { contents?: { type: 'base64'; value: string } | { type: 'dataTransferItem'; id: string } };
	}>;

export type IWorkspaceTextEditDto = Dto<languages.IWorkspaceTextEdit>;

export interface IWorkspaceEditDto {
	edits: Array<IWorkspaceFileEditDto | IWorkspaceTextEditDto | IWorkspaceCellEditDto>;
}

export type ICommandDto = { $ident?: string } & languages.Command;

export interface ICodeActionDto {
	cacheId?: ChainedCacheId;
	title: string;
	edit?: IWorkspaceEditDto;
	diagnostics?: Dto<IMarkerData[]>;
	command?: ICommandDto;
	kind?: string;
	isPreferred?: boolean;
	isAI?: boolean;
	disabled?: string;
	ranges?: IRange[];
}

export interface ICodeActionListDto {
	cacheId: CacheId;
	actions: ReadonlyArray<ICodeActionDto>;
}

export interface ICodeActionProviderMetadataDto {
	readonly providedKinds?: readonly string[];
	readonly documentation?: ReadonlyArray<{ readonly kind: string; readonly command: ICommandDto }>;
}

export type CacheId = number;
export type ChainedCacheId = [CacheId, CacheId];

type CachedSessionItem<T> = T & { cacheId?: ChainedCacheId };
type CachedSession<T> = T & { cacheId?: CacheId };

export type ILinksListDto = CachedSession<{ links: ILinkDto[] }>;
export type ILinkDto = CachedSessionItem<Dto<languages.ILink>>;

export type ICodeLensListDto = CachedSession<{ lenses: ICodeLensDto[] }>;
export type ICodeLensDto = CachedSessionItem<Dto<languages.CodeLens>>;

export type ICallHierarchyItemDto = Dto<CallHierarchyItem>;

export interface IIncomingCallDto {
	from: ICallHierarchyItemDto;
	fromRanges: IRange[];
}

export interface IOutgoingCallDto {
	fromRanges: IRange[];
	to: ICallHierarchyItemDto;
}

export interface ILanguageWordDefinitionDto {
	languageId: string;
	regexSource: string;
	regexFlags: string;
}

export interface ILinkedEditingRangesDto {
	ranges: IRange[];
	wordPattern?: IRegExpDto;
}

export interface IInlineValueContextDto {
	frameId: number;
	stoppedLocation: IRange;
}

export type ITypeHierarchyItemDto = Dto<TypeHierarchyItem>;

export interface IPasteEditProviderMetadataDto {
	readonly supportsCopy: boolean;
	readonly supportsPaste: boolean;
	readonly supportsResolve: boolean;

	readonly providedPasteEditKinds?: readonly string[];
	readonly copyMimeTypes?: readonly string[];
	readonly pasteMimeTypes?: readonly string[];
}

export interface IDocumentPasteContextDto {
	readonly only: string | undefined;
	readonly triggerKind: languages.DocumentPasteTriggerKind;
}

export interface IPasteEditDto {
	_cacheId?: ChainedCacheId;
	title: string;
	kind: { value: string } | undefined;
	insertText: string | { snippet: string };
	additionalEdit?: IWorkspaceEditDto;
	yieldTo?: readonly string[];
}

export interface IDocumentDropEditProviderMetadata {
	readonly supportsResolve: boolean;

	readonly dropMimeTypes: readonly string[];
	readonly providedDropKinds?: readonly string[];
}

export interface IDocumentDropEditDto {
	_cacheId?: ChainedCacheId;
	title: string;
	kind: string | undefined;
	insertText: string | { snippet: string };
	additionalEdit?: IWorkspaceEditDto;
	yieldTo?: readonly string[];
}

export interface ExtHostLanguageFeaturesShape {
	$provideDocumentSymbols(handle: number, resource: UriComponents, token: CancellationToken): Promise<languages.DocumentSymbol[] | undefined>;
	$provideCodeLenses(handle: number, resource: UriComponents, token: CancellationToken): Promise<ICodeLensListDto | undefined>;
	$resolveCodeLens(handle: number, symbol: ICodeLensDto, token: CancellationToken): Promise<ICodeLensDto | undefined>;
	$releaseCodeLenses(handle: number, id: number): codemavi;
	$provideDefinition(handle: number, resource: UriComponents, position: IPosition, token: CancellationToken): Promise<ILocationLinkDto[]>;
	$provideDeclaration(handle: number, resource: UriComponents, position: IPosition, token: CancellationToken): Promise<ILocationLinkDto[]>;
	$provideImplementation(handle: number, resource: UriComponents, position: IPosition, token: CancellationToken): Promise<ILocationLinkDto[]>;
	$provideTypeDefinition(handle: number, resource: UriComponents, position: IPosition, token: CancellationToken): Promise<ILocationLinkDto[]>;
	$provideHover(handle: number, resource: UriComponents, position: IPosition, context: languages.HoverContext<{ id: number }> | undefined, token: CancellationToken): Promise<HoverWithId | undefined>;
	$releaseHover(handle: number, id: number): codemavi;
	$provideEvaluatableExpression(handle: number, resource: UriComponents, position: IPosition, token: CancellationToken): Promise<languages.EvaluatableExpression | undefined>;
	$provideInlineValues(handle: number, resource: UriComponents, range: IRange, context: languages.InlineValueContext, token: CancellationToken): Promise<languages.InlineValue[] | undefined>;
	$provideDocumentHighlights(handle: number, resource: UriComponents, position: IPosition, token: CancellationToken): Promise<languages.DocumentHighlight[] | undefined>;
	$provideMultiDocumentHighlights(handle: number, resource: UriComponents, position: IPosition, otherModels: UriComponents[], token: CancellationToken): Promise<Dto<languages.MultiDocumentHighlight[]> | undefined>;
	$provideLinkedEditingRanges(handle: number, resource: UriComponents, position: IPosition, token: CancellationToken): Promise<ILinkedEditingRangesDto | undefined>;
	$provideReferences(handle: number, resource: UriComponents, position: IPosition, context: languages.ReferenceContext, token: CancellationToken): Promise<ILocationDto[] | undefined>;
	$provideCodeActions(handle: number, resource: UriComponents, rangeOrSelection: IRange | ISelection, context: languages.CodeActionContext, token: CancellationToken): Promise<ICodeActionListDto | undefined>;
	$resolveCodeAction(handle: number, id: ChainedCacheId, token: CancellationToken): Promise<{ edit?: IWorkspaceEditDto; command?: ICommandDto }>;
	$releaseCodeActions(handle: number, cacheId: number): codemavi;
	$prepareDocumentPaste(handle: number, uri: UriComponents, ranges: readonly IRange[], dataTransfer: DataTransferDTO, token: CancellationToken): Promise<DataTransferDTO | undefined>;
	$providePasteEdits(handle: number, requestId: number, uri: UriComponents, ranges: IRange[], dataTransfer: DataTransferDTO, context: IDocumentPasteContextDto, token: CancellationToken): Promise<IPasteEditDto[] | undefined>;
	$resolvePasteEdit(handle: number, id: ChainedCacheId, token: CancellationToken): Promise<{ insertText?: string; additionalEdit?: IWorkspaceEditDto }>;
	$releasePasteEdits(handle: number, cacheId: number): codemavi;
	$provideDocumentFormattingEdits(handle: number, resource: UriComponents, options: languages.FormattingOptions, token: CancellationToken): Promise<languages.TextEdit[] | undefined>;
	$provideDocumentRangeFormattingEdits(handle: number, resource: UriComponents, range: IRange, options: languages.FormattingOptions, token: CancellationToken): Promise<languages.TextEdit[] | undefined>;
	$provideDocumentRangesFormattingEdits(handle: number, resource: UriComponents, range: IRange[], options: languages.FormattingOptions, token: CancellationToken): Promise<languages.TextEdit[] | undefined>;
	$provideOnTypeFormattingEdits(handle: number, resource: UriComponents, position: IPosition, ch: string, options: languages.FormattingOptions, token: CancellationToken): Promise<languages.TextEdit[] | undefined>;
	$provideWorkspaceSymbols(handle: number, search: string, token: CancellationToken): Promise<IWorkspaceSymbolsDto>;
	$resolveWorkspaceSymbol(handle: number, symbol: IWorkspaceSymbolDto, token: CancellationToken): Promise<IWorkspaceSymbolDto | undefined>;
	$releaseWorkspaceSymbols(handle: number, id: number): codemavi;
	$provideRenameEdits(handle: number, resource: UriComponents, position: IPosition, newName: string, token: CancellationToken): Promise<IWorkspaceEditDto & { rejectReason?: string } | undefined>;
	$resolveRenameLocation(handle: number, resource: UriComponents, position: IPosition, token: CancellationToken): Promise<languages.RenameLocation | undefined>;
	$supportsAutomaticNewSymbolNamesTriggerKind(handle: number): Promise<boolean | undefined>;
	$provideNewSymbolNames(handle: number, resource: UriComponents, range: IRange, triggerKind: languages.NewSymbolNameTriggerKind, token: CancellationToken): Promise<languages.NewSymbolName[] | undefined>;
	$provideDocumentSemanticTokens(handle: number, resource: UriComponents, previousResultId: number, token: CancellationToken): Promise<VSBuffer | null>;
	$releaseDocumentSemanticTokens(handle: number, semanticColoringResultId: number): codemavi;
	$provideDocumentRangeSemanticTokens(handle: number, resource: UriComponents, range: IRange, token: CancellationToken): Promise<VSBuffer | null>;
	$provideCompletionItems(handle: number, resource: UriComponents, position: IPosition, context: languages.CompletionContext, token: CancellationToken): Promise<ISuggestResultDto | undefined>;
	$resolveCompletionItem(handle: number, id: ChainedCacheId, token: CancellationToken): Promise<ISuggestDataDto | undefined>;
	$releaseCompletionItems(handle: number, id: number): codemavi;
	$provideInlineCompletions(handle: number, resource: UriComponents, position: IPosition, context: languages.InlineCompletionContext, token: CancellationToken): Promise<IdentifiableInlineCompletions | undefined>;
	$provideInlineEditsForRange(handle: number, resource: UriComponents, range: IRange, context: languages.InlineCompletionContext, token: CancellationToken): Promise<IdentifiableInlineCompletions | undefined>;
	$handleInlineCompletionDidShow(handle: number, pid: number, idx: number, updatedInsertText: string): codemavi;
	$handleInlineCompletionPartialAccept(handle: number, pid: number, idx: number, acceptedCharacters: number, info: languages.PartialAcceptInfo): codemavi;
	$handleInlineCompletionRejection(handle: number, pid: number, idx: number): codemavi;
	$freeInlineCompletionsList(handle: number, pid: number): codemavi;
	$provideSignatureHelp(handle: number, resource: UriComponents, position: IPosition, context: languages.SignatureHelpContext, token: CancellationToken): Promise<ISignatureHelpDto | undefined>;
	$releaseSignatureHelp(handle: number, id: number): codemavi;
	$provideInlayHints(handle: number, resource: UriComponents, range: IRange, token: CancellationToken): Promise<IInlayHintsDto | undefined>;
	$resolveInlayHint(handle: number, id: ChainedCacheId, token: CancellationToken): Promise<IInlayHintDto | undefined>;
	$releaseInlayHints(handle: number, id: number): codemavi;
	$provideDocumentLinks(handle: number, resource: UriComponents, token: CancellationToken): Promise<ILinksListDto | undefined>;
	$resolveDocumentLink(handle: number, id: ChainedCacheId, token: CancellationToken): Promise<ILinkDto | undefined>;
	$releaseDocumentLinks(handle: number, id: number): codemavi;
	$provideDocumentColors(handle: number, resource: UriComponents, token: CancellationToken): Promise<IRawColorInfo[]>;
	$provideColorPresentations(handle: number, resource: UriComponents, colorInfo: IRawColorInfo, token: CancellationToken): Promise<languages.IColorPresentation[] | undefined>;
	$provideFoldingRanges(handle: number, resource: UriComponents, context: languages.FoldingContext, token: CancellationToken): Promise<languages.FoldingRange[] | undefined>;
	$provideSelectionRanges(handle: number, resource: UriComponents, positions: IPosition[], token: CancellationToken): Promise<languages.SelectionRange[][]>;
	$prepareCallHierarchy(handle: number, resource: UriComponents, position: IPosition, token: CancellationToken): Promise<ICallHierarchyItemDto[] | undefined>;
	$provideCallHierarchyIncomingCalls(handle: number, sessionId: string, itemId: string, token: CancellationToken): Promise<IIncomingCallDto[] | undefined>;
	$provideCallHierarchyOutgoingCalls(handle: number, sessionId: string, itemId: string, token: CancellationToken): Promise<IOutgoingCallDto[] | undefined>;
	$releaseCallHierarchy(handle: number, sessionId: string): codemavi;
	$setWordDefinitions(wordDefinitions: ILanguageWordDefinitionDto[]): codemavi;
	$prepareTypeHierarchy(handle: number, resource: UriComponents, position: IPosition, token: CancellationToken): Promise<ITypeHierarchyItemDto[] | undefined>;
	$provideTypeHierarchySupertypes(handle: number, sessionId: string, itemId: string, token: CancellationToken): Promise<ITypeHierarchyItemDto[] | undefined>;
	$provideTypeHierarchySubtypes(handle: number, sessionId: string, itemId: string, token: CancellationToken): Promise<ITypeHierarchyItemDto[] | undefined>;
	$releaseTypeHierarchy(handle: number, sessionId: string): codemavi;
	$provideDocumentOnDropEdits(handle: number, requestId: number, resource: UriComponents, position: IPosition, dataTransferDto: DataTransferDTO, token: CancellationToken): Promise<IDocumentDropEditDto[] | undefined>;
	$releaseDocumentOnDropEdits(handle: number, cacheId: number): codemavi;
	$provideInlineEdit(handle: number, document: UriComponents, context: languages.IInlineEditContext, token: CancellationToken): Promise<IdentifiableInlineEdit | undefined>;
	$freeInlineEdit(handle: number, pid: number): codemavi;
}

export interface ExtHostQuickOpenShape {
	$onItemSelected(handle: number): codemavi;
	$validateInput(input: string): Promise<string | { content: string; severity: Severity } | null | undefined>;
	$onDidChangeActive(sessionId: number, handles: number[]): codemavi;
	$onDidChangeSelection(sessionId: number, handles: number[]): codemavi;
	$onDidAccept(sessionId: number): codemavi;
	$onDidChangeValue(sessionId: number, value: string): codemavi;
	$onDidTriggerButton(sessionId: number, handle: number): codemavi;
	$onDidTriggerItemButton(sessionId: number, itemHandle: number, buttonHandle: number): codemavi;
	$onDidHide(sessionId: number): codemavi;
}

export interface ExtHostTelemetryShape {
	$initializeTelemetryLevel(level: TelemetryLevel, supportsTelemetry: boolean, productConfig?: { usage: boolean; error: boolean }): codemavi;
	$onDidChangeTelemetryLevel(level: TelemetryLevel): codemavi;
}

export interface ITerminalLinkDto {
	/** The ID of the link to enable activation and disposal. */
	id: number;
	/** The startIndex of the link in the line. */
	startIndex: number;
	/** The length of the link in the line. */
	length: number;
	/** The descriptive label for what the link does when activated. */
	label?: string;
}

export interface ITerminalDimensionsDto {
	columns: number;
	rows: number;
}

type SingleOrMany<T> = T[] | T;

export interface ITerminalQuickFixTerminalCommandDto {
	terminalCommand: string;
	shouldExecute?: boolean;
}

export interface ITerminalQuickFixOpenerDto {
	uri: UriComponents;
}

export type TerminalQuickFix = ITerminalQuickFixTerminalCommandDto | ITerminalQuickFixOpenerDto | ICommandDto;

export interface TerminalCommandMatchResultDto {
	commandLine: string;
	commandLineMatch: RegExpMatchArray;
	outputMatch?: {
		regexMatch: RegExpMatchArray;
		outputLines: string[];
	};
}

export interface ITerminalCommandDto {
	commandLine: string | undefined;
	cwd: URI | string | undefined;
	exitCode: number | undefined;
	output: string | undefined;
}

export interface ITerminalCompletionContextDto {
	commandLine: string;
	cursorPosition: number;
	allowFallbackCompletions: boolean;
}

export interface ITerminalCompletionItemDto {
	label: string | CompletionItemLabel;
	detail?: string;
	documentation?: string | IMarkdownString;
	icon?: ThemeIcon | undefined;
	isFile?: boolean | undefined;
	isDirectory?: boolean | undefined;
	isKeyword?: boolean | undefined;
	replacementIndex: number;
	replacementLength: number;
}

export interface ITerminalCompletionProvider {
	id: string;
	shellTypes?: TerminalShellType[];
	provideCompletions(value: string, cursorPosition: number, token: CancellationToken): Promise<TerminalCompletionListDto<ITerminalCompletionItemDto> | undefined>;
	triggerCharacters?: string[];
	isBuiltin?: boolean;
}
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the editor.
 */
export class TerminalCompletionListDto<T extends ITerminalCompletionItemDto = ITerminalCompletionItemDto> {

	/**
	 * Resources should be shown in the completions list
	 */
	resourceRequestConfig?: TerminalResourceRequestConfigDto;

	/**
	 * The completion items.
	 */
	items: T[];

	/**
	 * Creates a new completion list.
	 *
	 * @param items The completion items.
	 * @param isIncomplete The list is not complete.
	 */
	constructor(items?: T[], resourceRequestConfig?: TerminalResourceRequestConfigDto) {
		this.items = items ?? [];
		this.resourceRequestConfig = resourceRequestConfig;
	}
}

export interface TerminalResourceRequestConfigDto {
	filesRequested?: boolean;
	foldersRequested?: boolean;
	fileExtensions?: string[];
	cwd?: UriComponents;
	pathSeparator: string;
}

export interface ExtHostTerminalServiceShape {
	$acceptTerminalClosed(id: number, exitCode: number | undefined, exitReason: TerminalExitReason): codemavi;
	$acceptTerminalOpened(id: number, extHostTerminalId: string | undefined, name: string, shellLaunchConfig: IShellLaunchConfigDto): codemavi;
	$acceptActiveTerminalChanged(id: number | null): codemavi;
	$acceptTerminalProcessId(id: number, processId: number): codemavi;
	$acceptTerminalProcessData(id: number, data: string): codemavi;
	$acceptDidExecuteCommand(id: number, command: ITerminalCommandDto): codemavi;
	$acceptTerminalTitleChange(id: number, name: string): codemavi;
	$acceptTerminalDimensions(id: number, cols: number, rows: number): codemavi;
	$acceptTerminalMaximumDimensions(id: number, cols: number, rows: number): codemavi;
	$acceptTerminalInteraction(id: number): codemavi;
	$acceptTerminalSelection(id: number, selection: string | undefined): codemavi;
	$acceptTerminalShellType(id: number, shellType: TerminalShellType | undefined): codemavi;
	$startExtensionTerminal(id: number, initialDimensions: ITerminalDimensionsDto | undefined): Promise<ITerminalLaunchError | undefined>;
	$acceptProcessAckDataEvent(id: number, charCount: number): codemavi;
	$acceptProcessInput(id: number, data: string): codemavi;
	$acceptProcessResize(id: number, cols: number, rows: number): codemavi;
	$acceptProcessShutdown(id: number, immediate: boolean): codemavi;
	$acceptProcessRequestInitialCwd(id: number): codemavi;
	$acceptProcessRequestCwd(id: number): codemavi;
	$acceptProcessRequestLatency(id: number): Promise<number>;
	$provideLinks(id: number, line: string): Promise<ITerminalLinkDto[]>;
	$activateLink(id: number, linkId: number): codemavi;
	$initEnvironmentVariableCollections(collections: [string, ISerializableEnvironmentVariableCollection][]): codemavi;
	$acceptDefaultProfile(profile: ITerminalProfile, automationProfile: ITerminalProfile): codemavi;
	$createContributedProfileTerminal(id: string, options: ICreateContributedTerminalProfileOptions): Promise<codemavi>;
	$provideTerminalQuickFixes(id: string, matchResult: TerminalCommandMatchResultDto, token: CancellationToken): Promise<SingleOrMany<TerminalQuickFix> | undefined>;
	$provideTerminalCompletions(id: string, options: ITerminalCompletionContextDto, token: CancellationToken): Promise<TerminalCompletionListDto | undefined>;
}

export interface ExtHostTerminalShellIntegrationShape {
	$shellIntegrationChange(instanceId: number): codemavi;
	$shellExecutionStart(instanceId: number, commandLineValue: string, commandLineConfidence: TerminalShellExecutionCommandLineConfidence, isTrusted: boolean, cwd: UriComponents | undefined): codemavi;
	$shellExecutionEnd(instanceId: number, commandLineValue: string, commandLineConfidence: TerminalShellExecutionCommandLineConfidence, isTrusted: boolean, exitCode: number | undefined): codemavi;
	$shellExecutionData(instanceId: number, data: string): codemavi;
	$shellEnvChange(instanceId: number, shellEnvKeys: string[], shellEnvValues: string[], isTrusted: boolean): codemavi;
	$cwdChange(instanceId: number, cwd: UriComponents | undefined): codemavi;
	$closeTerminal(instanceId: number): codemavi;
}

export interface ExtHostSCMShape {
	$provideOriginalResource(sourceControlHandle: number, uri: UriComponents, token: CancellationToken): Promise<UriComponents | null>;
	$onInputBoxValueChange(sourceControlHandle: number, value: string): codemavi;
	$executeResourceCommand(sourceControlHandle: number, groupHandle: number, handle: number, preserveFocus: boolean): Promise<codemavi>;
	$validateInput(sourceControlHandle: number, value: string, cursorPosition: number): Promise<[string | IMarkdownString, number] | undefined>;
	$setSelectedSourceControl(selectedSourceControlHandle: number | undefined): Promise<codemavi>;
	$provideHistoryItemRefs(sourceControlHandle: number, historyItemRefs: string[] | undefined, token: CancellationToken): Promise<SCMHistoryItemRefDto[] | undefined>;
	$provideHistoryItems(sourceControlHandle: number, options: any, token: CancellationToken): Promise<SCMHistoryItemDto[] | undefined>;
	$provideHistoryItemChanges(sourceControlHandle: number, historyItemId: string, historyItemParentId: string | undefined, token: CancellationToken): Promise<SCMHistoryItemChangeDto[] | undefined>;
	$resolveHistoryItemRefsCommonAncestor(sourceControlHandle: number, historyItemRefs: string[], token: CancellationToken): Promise<string | undefined>;
}

export interface ExtHostQuickDiffShape {
	$provideOriginalResource(sourceControlHandle: number, uri: UriComponents, token: CancellationToken): Promise<UriComponents | null>;
}

export interface ExtHostShareShape {
	$provideShare(handle: number, shareableItem: IShareableItemDto, token: CancellationToken): Promise<UriComponents | string | undefined>;
}

export interface ExtHostTaskShape {
	$provideTasks(handle: number, validTypes: { [key: string]: boolean }): Promise<tasks.ITaskSetDTO>;
	$resolveTask(handle: number, taskDTO: tasks.ITaskDTO): Promise<tasks.ITaskDTO | undefined>;
	$onDidStartTask(execution: tasks.ITaskExecutionDTO, terminalId: number, resolvedDefinition: tasks.ITaskDefinitionDTO): codemavi;
	$onDidStartTaskProcess(value: tasks.ITaskProcessStartedDTO): codemavi;
	$onDidEndTaskProcess(value: tasks.ITaskProcessEndedDTO): codemavi;
	$OnDidEndTask(execution: tasks.ITaskExecutionDTO): codemavi;
	$onDidStartTaskProblemMatchers(status: tasks.ITaskProblemMatcherStartedDto): codemavi;
	$onDidEndTaskProblemMatchers(status: tasks.ITaskProblemMatcherEndedDto): codemavi;
	$resolveVariables(workspaceFolder: UriComponents, toResolve: { process?: { name: string; cwd?: string }; variables: string[] }): Promise<{ process?: string; variables: { [key: string]: string } }>;
	$jsonTasksSupported(): Promise<boolean>;
	$findExecutable(command: string, cwd?: string, paths?: string[]): Promise<string | undefined>;
}

export interface IBreakpointDto {
	type: string;
	id?: string;
	enabled: boolean;
	condition?: string;
	hitCondition?: string;
	logMessage?: string;
	mode?: string;
}

export interface IFunctionBreakpointDto extends IBreakpointDto {
	type: 'function';
	functionName: string;
	mode?: string;
}

export interface IDataBreakpointDto extends IBreakpointDto {
	type: 'data';
	dataId: string;
	canPersist: boolean;
	label: string;
	accessTypes?: DebugProtocol.DataBreakpointAccessType[];
	accessType: DebugProtocol.DataBreakpointAccessType;
	mode?: string;
}

export interface ISourceBreakpointDto extends IBreakpointDto {
	type: 'source';
	uri: UriComponents;
	line: number;
	character: number;
}

export interface IBreakpointsDeltaDto {
	added?: Array<ISourceBreakpointDto | IFunctionBreakpointDto | IDataBreakpointDto>;
	removed?: string[];
	changed?: Array<ISourceBreakpointDto | IFunctionBreakpointDto | IDataBreakpointDto>;
}

export interface ISourceMultiBreakpointDto {
	type: 'sourceMulti';
	uri: UriComponents;
	lines: {
		id: string;
		enabled: boolean;
		condition?: string;
		hitCondition?: string;
		logMessage?: string;
		line: number;
		character: number;
		mode?: string;
	}[];
}

export interface IDebugSessionFullDto {
	id: DebugSessionUUID;
	type: string;
	name: string;
	parent: DebugSessionUUID | undefined;
	folderUri: UriComponents | undefined;
	configuration: IConfig;
}

export type IDebugSessionDto = IDebugSessionFullDto | DebugSessionUUID;

export interface IThreadFocusDto {
	kind: 'thread';
	sessionId: string;
	threadId: number;
}

export interface IStackFrameFocusDto {
	kind: 'stackFrame';
	sessionId: string;
	threadId: number;
	frameId: number;
}


export interface ExtHostDebugServiceShape {
	$substituteVariables(folder: UriComponents | undefined, config: IConfig): Promise<IConfig>;
	$runInTerminal(args: DebugProtocol.RunInTerminalRequestArguments, sessionId: string): Promise<number | undefined>;
	$startDASession(handle: number, session: IDebugSessionDto): Promise<codemavi>;
	$stopDASession(handle: number): Promise<codemavi>;
	$sendDAMessage(handle: number, message: DebugProtocol.ProtocolMessage): codemavi;
	$resolveDebugConfiguration(handle: number, folder: UriComponents | undefined, debugConfiguration: IConfig, token: CancellationToken): Promise<IConfig | null | undefined>;
	$resolveDebugConfigurationWithSubstitutedVariables(handle: number, folder: UriComponents | undefined, debugConfiguration: IConfig, token: CancellationToken): Promise<IConfig | null | undefined>;
	$provideDebugConfigurations(handle: number, folder: UriComponents | undefined, token: CancellationToken): Promise<IConfig[]>;
	$provideDebugAdapter(handle: number, session: IDebugSessionDto): Promise<Dto<IAdapterDescriptor>>;
	$acceptDebugSessionStarted(session: IDebugSessionDto): codemavi;
	$acceptDebugSessionTerminated(session: IDebugSessionDto): codemavi;
	$acceptDebugSessionActiveChanged(session: IDebugSessionDto | undefined): codemavi;
	$acceptDebugSessionCustomEvent(session: IDebugSessionDto, event: any): codemavi;
	$acceptBreakpointsDelta(delta: IBreakpointsDeltaDto): codemavi;
	$acceptDebugSessionNameChanged(session: IDebugSessionDto, name: string): codemavi;
	$acceptStackFrameFocus(focus: IThreadFocusDto | IStackFrameFocusDto | undefined): codemavi;
	$provideDebugVisualizers(extensionId: string, id: string, context: IDebugVisualizationContext, token: CancellationToken): Promise<IDebugVisualization.Serialized[]>;
	$resolveDebugVisualizer(id: number, token: CancellationToken): Promise<MainThreadDebugVisualization>;
	$executeDebugVisualizerCommand(id: number): Promise<codemavi>;
	$disposeDebugVisualizers(ids: number[]): codemavi;
	$getVisualizerTreeItem(treeId: string, element: IDebugVisualizationContext): Promise<IDebugVisualizationTreeItem.Serialized | undefined>;
	$getVisualizerTreeItemChildren(treeId: string, element: number): Promise<IDebugVisualizationTreeItem.Serialized[]>;
	$editVisualizerTreeItem(element: number, value: string): Promise<IDebugVisualizationTreeItem.Serialized | undefined>;
	$disposeVisualizedTree(element: number): codemavi;
}


export interface DecorationRequest {
	readonly id: number;
	readonly uri: UriComponents;
}

export type DecorationData = [boolean, string, string | ThemeIcon, ThemeColor];
export type DecorationReply = { [id: number]: DecorationData };

export interface ExtHostDecorationsShape {
	$provideDecorations(handle: number, requests: DecorationRequest[], token: CancellationToken): Promise<DecorationReply>;
}

export interface ExtHostWindowShape {
	$onDidChangeWindowFocus(value: boolean): codemavi;
	$onDidChangeWindowActive(value: boolean): codemavi;
	$onDidChangeActiveNativeWindowHandle(handle: string | undefined): codemavi;
}

export interface ExtHostLogLevelServiceShape {
	$setLogLevel(level: LogLevel, resource?: UriComponents): codemavi;
}

export interface MainThreadLoggerShape {
	$log(file: UriComponents, messages: [LogLevel, string][]): codemavi;
	$flush(file: UriComponents): codemavi;
	$createLogger(file: UriComponents, options?: ILoggerOptions): Promise<codemavi>;
	$registerLogger(logger: UriDto<ILoggerResource>): Promise<codemavi>;
	$deregisterLogger(resource: UriComponents): Promise<codemavi>;
	$setVisibility(resource: UriComponents, visible: boolean): Promise<codemavi>;
}

export interface ExtHostOutputServiceShape {
	$setVisibleChannel(channelId: string | null): codemavi;
}

export interface ExtHostProgressShape {
	$acceptProgressCanceled(handle: number): codemavi;
}

export interface ExtHostCommentsShape {
	$createCommentThreadTemplate(commentControllerHandle: number, uriComponents: UriComponents, range: IRange | undefined, editorId?: string): Promise<codemavi>;
	$updateCommentThreadTemplate(commentControllerHandle: number, threadHandle: number, range: IRange): Promise<codemavi>;
	$updateCommentThread(commentControllerHandle: number, threadHandle: number, changes: CommentThreadChanges): Promise<codemavi>;
	$deleteCommentThread(commentControllerHandle: number, commentThreadHandle: number): codemavi;
	$provideCommentingRanges(commentControllerHandle: number, uriComponents: UriComponents, token: CancellationToken): Promise<{ ranges: IRange[]; fileComments: boolean } | undefined>;
	$toggleReaction(commentControllerHandle: number, threadHandle: number, uri: UriComponents, comment: languages.Comment, reaction: languages.CommentReaction): Promise<codemavi>;
	$setActiveComment(controllerHandle: number, commentInfo: { commentThreadHandle: number; uniqueIdInThread?: number } | undefined): Promise<codemavi>;
}

export interface INotebookSelectionChangeEvent {
	selections: ICellRange[];
}

export interface INotebookVisibleRangesEvent {
	ranges: ICellRange[];
}

export interface INotebookEditorPropertiesChangeData {
	visibleRanges?: INotebookVisibleRangesEvent;
	selections?: INotebookSelectionChangeEvent;
}

export interface INotebookDocumentPropertiesChangeData {
	metadata?: notebookCommon.NotebookDocumentMetadata;
}

export interface INotebookModelAddedData {
	uri: UriComponents;
	versionId: number;
	cells: NotebookCellDto[];
	viewType: string;
	metadata?: notebookCommon.NotebookDocumentMetadata;
}

export interface INotebookEditorAddData {
	id: string;
	documentUri: UriComponents;
	selections: ICellRange[];
	visibleRanges: ICellRange[];
	viewColumn?: number;
	viewType: string;
}

export interface INotebookDocumentsAndEditorsDelta {
	removedDocuments?: UriComponents[];
	addedDocuments?: INotebookModelAddedData[];
	removedEditors?: string[];
	addedEditors?: INotebookEditorAddData[];
	newActiveEditor?: string | null;
	visibleEditors?: string[];
}

export interface NotebookOutputItemDto {
	readonly mime: string;
	readonly valueBytes: VSBuffer;
}

export interface NotebookOutputDto {
	items: NotebookOutputItemDto[];
	outputId: string;
	metadata?: Record<string, any>;
}

export interface NotebookCellDataDto {
	source: string;
	language: string;
	mime: string | undefined;
	cellKind: notebookCommon.CellKind;
	outputs: NotebookOutputDto[];
	metadata?: notebookCommon.NotebookCellMetadata;
	internalMetadata?: notebookCommon.NotebookCellInternalMetadata;
}

export interface NotebookDataDto {
	readonly cells: NotebookCellDataDto[];
	readonly metadata: notebookCommon.NotebookDocumentMetadata;
}

export interface NotebookCellDto {
	handle: number;
	uri: UriComponents;
	eol: string;
	source: string[];
	language: string;
	mime?: string;
	cellKind: notebookCommon.CellKind;
	outputs: NotebookOutputDto[];
	metadata?: notebookCommon.NotebookCellMetadata;
	internalMetadata?: notebookCommon.NotebookCellInternalMetadata;
}

export type INotebookPartialFileStatsWithMetadata = Omit<files.IFileStatWithMetadata, 'resource' | 'children'>;

export interface ExtHostNotebookShape extends ExtHostNotebookDocumentsAndEditorsShape {
	$provideNotebookCellStatusBarItems(handle: number, uri: UriComponents, index: number, token: CancellationToken): Promise<INotebookCellStatusBarListDto | undefined>;
	$releaseNotebookCellStatusBarItems(id: number): codemavi;

	$dataToNotebook(handle: number, data: VSBuffer, token: CancellationToken): Promise<SerializableObjectWithBuffers<NotebookDataDto>>;
	$notebookToData(handle: number, data: SerializableObjectWithBuffers<NotebookDataDto>, token: CancellationToken): Promise<VSBuffer>;
	$saveNotebook(handle: number, uri: UriComponents, versionId: number, options: files.IWriteFileOptions, token: CancellationToken): Promise<INotebookPartialFileStatsWithMetadata>;

	$searchInNotebooks(handle: number, textQuery: search.ITextQuery, viewTypeFileTargets: NotebookPriorityInfo[], otherViewTypeFileTargets: NotebookPriorityInfo[], token: CancellationToken): Promise<{ results: IRawClosedNotebookFileMatch[]; limitHit: boolean }>;
}

export interface ExtHostNotebookDocumentSaveParticipantShape {
	$participateInSave(resource: UriComponents, reason: SaveReason, token: CancellationToken): Promise<boolean>;
}

export interface ExtHostNotebookRenderersShape {
	$postRendererMessage(editorId: string, rendererId: string, message: unknown): codemavi;
}

export interface ExtHostNotebookDocumentsAndEditorsShape {
	$acceptDocumentAndEditorsDelta(delta: SerializableObjectWithBuffers<INotebookDocumentsAndEditorsDelta>): codemavi;
}

export type NotebookRawContentEventDto =
	// notebookCommon.NotebookCellsInitializeEvent<NotebookCellDto>
	| {

		readonly kind: notebookCommon.NotebookCellsChangeType.ModelChange;
		readonly changes: notebookCommon.NotebookCellTextModelSplice<NotebookCellDto>[];
	}
	| {
		readonly kind: notebookCommon.NotebookCellsChangeType.Move;
		readonly index: number;
		readonly length: number;
		readonly newIdx: number;
	}
	| {
		readonly kind: notebookCommon.NotebookCellsChangeType.Output;
		readonly index: number;
		readonly outputs: NotebookOutputDto[];
	}
	| {
		readonly kind: notebookCommon.NotebookCellsChangeType.OutputItem;
		readonly index: number;
		readonly outputId: string;
		readonly outputItems: NotebookOutputItemDto[];
		readonly append: boolean;
	}
	| notebookCommon.NotebookCellsChangeLanguageEvent
	| notebookCommon.NotebookCellsChangeMimeEvent
	| notebookCommon.NotebookCellsChangeMetadataEvent
	| notebookCommon.NotebookCellsChangeInternalMetadataEvent
	// | notebookCommon.NotebookDocumentChangeMetadataEvent
	| notebookCommon.NotebookCellContentChangeEvent
	// | notebookCommon.NotebookDocumentUnknownChangeEvent
	;

export type NotebookCellsChangedEventDto = {
	readonly rawEvents: NotebookRawContentEventDto[];
	readonly versionId: number;
};

export interface ExtHostNotebookDocumentsShape {
	$acceptModelChanged(uriComponents: UriComponents, event: SerializableObjectWithBuffers<NotebookCellsChangedEventDto>, isDirty: boolean, newMetadata?: notebookCommon.NotebookDocumentMetadata): codemavi;
	$acceptDirtyStateChanged(uriComponents: UriComponents, isDirty: boolean): codemavi;
	$acceptModelSaved(uriComponents: UriComponents): codemavi;
}

export type INotebookEditorViewColumnInfo = Record<string, number>;

export interface ExtHostNotebookEditorsShape {
	$acceptEditorPropertiesChanged(id: string, data: INotebookEditorPropertiesChangeData): codemavi;
	$acceptEditorViewColumns(data: INotebookEditorViewColumnInfo): codemavi;
}

export interface ExtHostNotebookKernelsShape {
	$acceptNotebookAssociation(handle: number, uri: UriComponents, value: boolean): codemavi;
	$executeCells(handle: number, uri: UriComponents, handles: number[]): Promise<codemavi>;
	$cancelCells(handle: number, uri: UriComponents, handles: number[]): Promise<codemavi>;
	$acceptKernelMessageFromRenderer(handle: number, editorId: string, message: any): codemavi;
	$cellExecutionChanged(uri: UriComponents, cellHandle: number, state: notebookCommon.NotebookCellExecutionState | undefined): codemavi;
	$provideKernelSourceActions(handle: number, token: CancellationToken): Promise<notebookCommon.INotebookKernelSourceAction[]>;
	$provideVariables(handle: number, requestId: string, notebookUri: UriComponents, parentId: number | undefined, kind: 'named' | 'indexed', start: number, token: CancellationToken): Promise<codemavi>;
}

export interface ExtHostInteractiveShape {
	$willAddInteractiveDocument(uri: UriComponents, eol: string, languageId: string, notebookUri: UriComponents): codemavi;
	$willRemoveInteractiveDocument(uri: UriComponents, notebookUri: UriComponents): codemavi;
}

export interface ExtHostStorageShape {
	$acceptValue(shared: boolean, extensionId: string, value: string): codemavi;
}

export interface ExtHostThemingShape {
	$onColorThemeChange(themeType: string): codemavi;
}

export interface MainThreadThemingShape extends IDisposable {
}

export interface MainThreadLocalizationShape extends IDisposable {
	$fetchBuiltInBundleUri(id: string, language: string): Promise<UriComponents | undefined>;
	$fetchBundleContents(uriComponents: UriComponents): Promise<string>;
}

export interface TunnelDto {
	remoteAddress: { port: number; host: string };
	localAddress: { port: number; host: string } | string;
	public: boolean;
	privacy: TunnelPrivacyId | string;
	protocol: string | undefined;
}


export interface ExtHostTunnelServiceShape {
	$forwardPort(tunnelOptions: TunnelOptions, tunnelCreationOptions: TunnelCreationOptions): Promise<TunnelDto | string | undefined>;
	$closeTunnel(remote: { host: string; port: number }, silent?: boolean): Promise<codemavi>;
	$onDidTunnelsChange(): Promise<codemavi>;
	$registerCandidateFinder(enable: boolean): Promise<codemavi>;
	$applyCandidateFilter(candidates: CandidatePort[]): Promise<CandidatePort[]>;
	$providePortAttributes(handles: number[], ports: number[], pid: number | undefined, commandline: string | undefined, cancellationToken: CancellationToken): Promise<ProvidedPortAttributes[]>;
}

export interface ExtHostTimelineShape {
	$getTimeline(source: string, uri: UriComponents, options: TimelineOptions, token: CancellationToken): Promise<Dto<Timeline> | undefined>;
}

export const enum ExtHostTestingResource {
	Workspace,
	TextDocument
}

export interface ExtHostTestingShape {
	$runControllerTests(req: IStartControllerTests[], token: CancellationToken): Promise<{ error?: string }[]>;
	$startContinuousRun(req: ICallProfileRunHandler[], token: CancellationToken): Promise<{ error?: string }[]>;
	$cancelExtensionTestRun(runId: string | undefined, taskId: string | undefined): codemavi;
	/** Handles a diff of tests, as a result of a subscribeToDiffs() call */
	$acceptDiff(diff: TestsDiffOp.Serialized[]): codemavi;
	/** Expands a test item's children, by the given number of levels. */
	$expandTest(testId: string, levels: number): Promise<codemavi>;
	/** Requests coverage details for a test run. Errors if not available. */
	$getCoverageDetails(coverageId: string, testId: string | undefined, token: CancellationToken): Promise<CoverageDetails.Serialized[]>;
	/** Disposes resources associated with a test run. */
	$disposeRun(runId: string): codemavi;
	/** Configures a test run config. */
	$configureRunProfile(controllerId: string, configId: number): codemavi;
	/** Asks the controller to refresh its tests */
	$refreshTests(controllerId: string, token: CancellationToken): Promise<codemavi>;
	/** Ensures any pending test diffs are flushed */
	$syncTests(): Promise<codemavi>;
	/** Sets the active test run profiles */
	$setDefaultRunProfiles(profiles: Record</* controller id */string, /* profile id */ number[]>): codemavi;
	$getTestsRelatedToCode(uri: UriComponents, position: IPosition, token: CancellationToken): Promise<string[]>;
	$getCodeRelatedToTest(testId: string, token: CancellationToken): Promise<ILocationDto[]>;

	// --- test results:

	/** Publishes that a test run finished. */
	$publishTestResults(results: ISerializedTestResults[]): codemavi;
	/** Requests followup actions for a test (failure) message */
	$provideTestFollowups(req: TestMessageFollowupRequest, token: CancellationToken): Promise<TestMessageFollowupResponse[]>;
	/** Actions a followup actions for a test (failure) message */
	$executeTestFollowup(id: number): Promise<codemavi>;
	/** Disposes followup actions for a test (failure) message */
	$disposeTestFollowups(id: number[]): codemavi;
}

export interface ExtHostMcpShape {
	$startMcp(id: number, launch: McpServerLaunch.Serialized): codemavi;
	$stopMcp(id: number): codemavi;
	$sendMessage(id: number, message: string): codemavi;
	$waitForInitialCollectionProviders(): Promise<codemavi>;
}

export interface MainThreadMcpShape {
	$onDidChangeState(id: number, state: McpConnectionState): codemavi;
	$onDidPublishLog(id: number, level: LogLevel, log: string): codemavi;
	$onDidReceiveMessage(id: number, message: string): codemavi;
	$upsertMcpCollection(collection: McpCollectionDefinition.FromExtHost, servers: Dto<McpServerDefinition>[]): codemavi;
	$deleteMcpCollection(collectionId: string): codemavi;
}

export interface ExtHostLocalizationShape {
	getMessage(extensionId: string, details: IStringDetails): string;
	getBundle(extensionId: string): { [key: string]: string } | undefined;
	getBundleUri(extensionId: string): URI | undefined;
	initializeLocalizedMessages(extension: IExtensionDescription): Promise<codemavi>;
}

export interface IStringDetails {
	message: string;
	args?: Record<string | number, any>;
	comment?: string | string[];
}

export interface ITestControllerPatch {
	label?: string;
	capabilities?: TestControllerCapability;
}

export interface MainThreadTestingShape {
	// --- test lifecycle:

	/** Registers that there's a test controller with the given ID */
	$registerTestController(controllerId: string, label: string, capability: TestControllerCapability): codemavi;
	/** Updates the label of an existing test controller. */
	$updateController(controllerId: string, patch: ITestControllerPatch): codemavi;
	/** Diposes of the test controller with the given ID */
	$unregisterTestController(controllerId: string): codemavi;
	/** Requests tests published to VS Code. */
	$subscribeToDiffs(): codemavi;
	/** Stops requesting tests published to VS Code. */
	$unsubscribeFromDiffs(): codemavi;
	/** Publishes that new tests were available on the given source. */
	$publishDiff(controllerId: string, diff: TestsDiffOp.Serialized[]): codemavi;
	/** Gets coverage details from a test result. */
	$getCoverageDetails(resultId: string, taskIndex: number, uri: UriComponents, token: CancellationToken): Promise<CoverageDetails.Serialized[]>;

	// --- test run configurations:

	/** Called when a new test run configuration is available */
	$publishTestRunProfile(config: ITestRunProfile): codemavi;
	/** Updates an existing test run configuration */
	$updateTestRunConfig(controllerId: string, configId: number, update: Partial<ITestRunProfile>): codemavi;
	/** Removes a previously-published test run config */
	$removeTestProfile(controllerId: string, configId: number): codemavi;


	// --- test run handling:

	/** Request by an extension to run tests. */
	$runTests(req: ResolvedTestRunRequest, token: CancellationToken): Promise<string>;
	/**
	 * Adds tests to the run. The tests are given in descending depth. The first
	 * item will be a previously-known test, or a test root.
	 */
	$addTestsToRun(controllerId: string, runId: string, tests: ITestItem.Serialized[]): codemavi;
	/** Updates the state of a test run in the given run. */
	$updateTestStateInRun(runId: string, taskId: string, testId: string, state: TestResultState, duration?: number): codemavi;
	/** Appends a message to a test in the run. */
	$appendTestMessagesInRun(runId: string, taskId: string, testId: string, messages: ITestMessage.Serialized[]): codemavi;
	/** Appends raw output to the test run.. */
	$appendOutputToRun(runId: string, taskId: string, output: VSBuffer, location?: ILocationDto, testId?: string): codemavi;
	/** Triggered when coverage is added to test results. */
	$appendCoverage(runId: string, taskId: string, coverage: IFileCoverage.Serialized): codemavi;
	/** Signals a task in a test run started. */
	$startedTestRunTask(runId: string, task: ITestRunTask): codemavi;
	/** Signals a task in a test run ended. */
	$finishedTestRunTask(runId: string, taskId: string): codemavi;
	/** Start a new extension-provided test run. */
	$startedExtensionTestRun(req: ExtensionRunTestsRequest): codemavi;
	/** Signals that an extension-provided test run finished. */
	$finishedExtensionTestRun(runId: string): codemavi;
	/** Marks a test (or controller) as retired in all results. */
	$markTestRetired(testIds: string[] | undefined): codemavi;
}

export type ChatStatusItemDto = {
	id: string;
	title: string;
	description: string;
	detail: string | undefined;
};

export interface MainThreadChatStatusShape {
	$setEntry(id: string, entry: ChatStatusItemDto): codemavi;
	$disposeEntry(id: string): codemavi;
}

// --- proxy identifiers

export const MainContext = {
	MainThreadAuthentication: createProxyIdentifier<MainThreadAuthenticationShape>('MainThreadAuthentication'),
	MainThreadBulkEdits: createProxyIdentifier<MainThreadBulkEditsShape>('MainThreadBulkEdits'),
	MainThreadLanguageModels: createProxyIdentifier<MainThreadLanguageModelsShape>('MainThreadLanguageModels'),
	MainThreadEmbeddings: createProxyIdentifier<MainThreadEmbeddingsShape>('MainThreadEmbeddings'),
	MainThreadChatAgents2: createProxyIdentifier<MainThreadChatAgentsShape2>('MainThreadChatAgents2'),
	MainThreadCodeMapper: createProxyIdentifier<MainThreadCodeMapperShape>('MainThreadCodeMapper'),
	MainThreadLanguageModelTools: createProxyIdentifier<MainThreadLanguageModelToolsShape>('MainThreadChatSkills'),
	MainThreadClipboard: createProxyIdentifier<MainThreadClipboardShape>('MainThreadClipboard'),
	MainThreadCommands: createProxyIdentifier<MainThreadCommandsShape>('MainThreadCommands'),
	MainThreadComments: createProxyIdentifier<MainThreadCommentsShape>('MainThreadComments'),
	MainThreadConfiguration: createProxyIdentifier<MainThreadConfigurationShape>('MainThreadConfiguration'),
	MainThreadConsole: createProxyIdentifier<MainThreadConsoleShape>('MainThreadConsole'),
	MainThreadDebugService: createProxyIdentifier<MainThreadDebugServiceShape>('MainThreadDebugService'),
	MainThreadDecorations: createProxyIdentifier<MainThreadDecorationsShape>('MainThreadDecorations'),
	MainThreadDiagnostics: createProxyIdentifier<MainThreadDiagnosticsShape>('MainThreadDiagnostics'),
	MainThreadDialogs: createProxyIdentifier<MainThreadDiaglogsShape>('MainThreadDiaglogs'),
	MainThreadDocuments: createProxyIdentifier<MainThreadDocumentsShape>('MainThreadDocuments'),
	MainThreadDocumentContentProviders: createProxyIdentifier<MainThreadDocumentContentProvidersShape>('MainThreadDocumentContentProviders'),
	MainThreadTextEditors: createProxyIdentifier<MainThreadTextEditorsShape>('MainThreadTextEditors'),
	MainThreadEditorInsets: createProxyIdentifier<MainThreadEditorInsetsShape>('MainThreadEditorInsets'),
	MainThreadEditorTabs: createProxyIdentifier<MainThreadEditorTabsShape>('MainThreadEditorTabs'),
	MainThreadErrors: createProxyIdentifier<MainThreadErrorsShape>('MainThreadErrors'),
	MainThreadTreeViews: createProxyIdentifier<MainThreadTreeViewsShape>('MainThreadTreeViews'),
	MainThreadDownloadService: createProxyIdentifier<MainThreadDownloadServiceShape>('MainThreadDownloadService'),
	MainThreadLanguageFeatures: createProxyIdentifier<MainThreadLanguageFeaturesShape>('MainThreadLanguageFeatures'),
	MainThreadLanguages: createProxyIdentifier<MainThreadLanguagesShape>('MainThreadLanguages'),
	MainThreadLogger: createProxyIdentifier<MainThreadLoggerShape>('MainThreadLogger'),
	MainThreadMessageService: createProxyIdentifier<MainThreadMessageServiceShape>('MainThreadMessageService'),
	MainThreadOutputService: createProxyIdentifier<MainThreadOutputServiceShape>('MainThreadOutputService'),
	MainThreadProgress: createProxyIdentifier<MainThreadProgressShape>('MainThreadProgress'),
	MainThreadQuickDiff: createProxyIdentifier<MainThreadQuickDiffShape>('MainThreadQuickDiff'),
	MainThreadQuickOpen: createProxyIdentifier<MainThreadQuickOpenShape>('MainThreadQuickOpen'),
	MainThreadStatusBar: createProxyIdentifier<MainThreadStatusBarShape>('MainThreadStatusBar'),
	MainThreadSecretState: createProxyIdentifier<MainThreadSecretStateShape>('MainThreadSecretState'),
	MainThreadStorage: createProxyIdentifier<MainThreadStorageShape>('MainThreadStorage'),
	MainThreadSpeech: createProxyIdentifier<MainThreadSpeechShape>('MainThreadSpeechProvider'),
	MainThreadTelemetry: createProxyIdentifier<MainThreadTelemetryShape>('MainThreadTelemetry'),
	MainThreadTerminalService: createProxyIdentifier<MainThreadTerminalServiceShape>('MainThreadTerminalService'),
	MainThreadTerminalShellIntegration: createProxyIdentifier<MainThreadTerminalShellIntegrationShape>('MainThreadTerminalShellIntegration'),
	MainThreadWebviews: createProxyIdentifier<MainThreadWebviewsShape>('MainThreadWebviews'),
	MainThreadWebviewPanels: createProxyIdentifier<MainThreadWebviewPanelsShape>('MainThreadWebviewPanels'),
	MainThreadWebviewViews: createProxyIdentifier<MainThreadWebviewViewsShape>('MainThreadWebviewViews'),
	MainThreadCustomEditors: createProxyIdentifier<MainThreadCustomEditorsShape>('MainThreadCustomEditors'),
	MainThreadUrls: createProxyIdentifier<MainThreadUrlsShape>('MainThreadUrls'),
	MainThreadUriOpeners: createProxyIdentifier<MainThreadUriOpenersShape>('MainThreadUriOpeners'),
	MainThreadProfileContentHandlers: createProxyIdentifier<MainThreadProfileContentHandlersShape>('MainThreadProfileContentHandlers'),
	MainThreadWorkspace: createProxyIdentifier<MainThreadWorkspaceShape>('MainThreadWorkspace'),
	MainThreadFileSystem: createProxyIdentifier<MainThreadFileSystemShape>('MainThreadFileSystem'),
	MainThreadFileSystemEventService: createProxyIdentifier<MainThreadFileSystemEventServiceShape>('MainThreadFileSystemEventService'),
	MainThreadExtensionService: createProxyIdentifier<MainThreadExtensionServiceShape>('MainThreadExtensionService'),
	MainThreadSCM: createProxyIdentifier<MainThreadSCMShape>('MainThreadSCM'),
	MainThreadSearch: createProxyIdentifier<MainThreadSearchShape>('MainThreadSearch'),
	MainThreadShare: createProxyIdentifier<MainThreadShareShape>('MainThreadShare'),
	MainThreadTask: createProxyIdentifier<MainThreadTaskShape>('MainThreadTask'),
	MainThreadWindow: createProxyIdentifier<MainThreadWindowShape>('MainThreadWindow'),
	MainThreadLabelService: createProxyIdentifier<MainThreadLabelServiceShape>('MainThreadLabelService'),
	MainThreadNotebook: createProxyIdentifier<MainThreadNotebookShape>('MainThreadNotebook'),
	MainThreadNotebookDocuments: createProxyIdentifier<MainThreadNotebookDocumentsShape>('MainThreadNotebookDocumentsShape'),
	MainThreadNotebookEditors: createProxyIdentifier<MainThreadNotebookEditorsShape>('MainThreadNotebookEditorsShape'),
	MainThreadNotebookKernels: createProxyIdentifier<MainThreadNotebookKernelsShape>('MainThreadNotebookKernels'),
	MainThreadNotebookRenderers: createProxyIdentifier<MainThreadNotebookRenderersShape>('MainThreadNotebookRenderers'),
	MainThreadInteractive: createProxyIdentifier<MainThreadInteractiveShape>('MainThreadInteractive'),
	MainThreadTheming: createProxyIdentifier<MainThreadThemingShape>('MainThreadTheming'),
	MainThreadTunnelService: createProxyIdentifier<MainThreadTunnelServiceShape>('MainThreadTunnelService'),
	MainThreadManagedSockets: createProxyIdentifier<MainThreadManagedSocketsShape>('MainThreadManagedSockets'),
	MainThreadTimeline: createProxyIdentifier<MainThreadTimelineShape>('MainThreadTimeline'),
	MainThreadTesting: createProxyIdentifier<MainThreadTestingShape>('MainThreadTesting'),
	MainThreadLocalization: createProxyIdentifier<MainThreadLocalizationShape>('MainThreadLocalizationShape'),
	MainThreadMcp: createProxyIdentifier<MainThreadMcpShape>('MainThreadMcpShape'),
	MainThreadAiRelatedInformation: createProxyIdentifier<MainThreadAiRelatedInformationShape>('MainThreadAiRelatedInformation'),
	MainThreadAiEmbeddingVector: createProxyIdentifier<MainThreadAiEmbeddingVectorShape>('MainThreadAiEmbeddingVector'),
	MainThreadChatStatus: createProxyIdentifier<MainThreadChatStatusShape>('MainThreadChatStatus'),
};

export const ExtHostContext = {
	ExtHostCodeMapper: createProxyIdentifier<ExtHostCodeMapperShape>('ExtHostCodeMapper'),
	ExtHostCommands: createProxyIdentifier<ExtHostCommandsShape>('ExtHostCommands'),
	ExtHostConfiguration: createProxyIdentifier<ExtHostConfigurationShape>('ExtHostConfiguration'),
	ExtHostDiagnostics: createProxyIdentifier<ExtHostDiagnosticsShape>('ExtHostDiagnostics'),
	ExtHostDebugService: createProxyIdentifier<ExtHostDebugServiceShape>('ExtHostDebugService'),
	ExtHostDecorations: createProxyIdentifier<ExtHostDecorationsShape>('ExtHostDecorations'),
	ExtHostDocumentsAndEditors: createProxyIdentifier<ExtHostDocumentsAndEditorsShape>('ExtHostDocumentsAndEditors'),
	ExtHostDocuments: createProxyIdentifier<ExtHostDocumentsShape>('ExtHostDocuments'),
	ExtHostDocumentContentProviders: createProxyIdentifier<ExtHostDocumentContentProvidersShape>('ExtHostDocumentContentProviders'),
	ExtHostDocumentSaveParticipant: createProxyIdentifier<ExtHostDocumentSaveParticipantShape>('ExtHostDocumentSaveParticipant'),
	ExtHostEditors: createProxyIdentifier<ExtHostEditorsShape>('ExtHostEditors'),
	ExtHostTreeViews: createProxyIdentifier<ExtHostTreeViewsShape>('ExtHostTreeViews'),
	ExtHostFileSystem: createProxyIdentifier<ExtHostFileSystemShape>('ExtHostFileSystem'),
	ExtHostFileSystemInfo: createProxyIdentifier<ExtHostFileSystemInfoShape>('ExtHostFileSystemInfo'),
	ExtHostFileSystemEventService: createProxyIdentifier<ExtHostFileSystemEventServiceShape>('ExtHostFileSystemEventService'),
	ExtHostLanguages: createProxyIdentifier<ExtHostLanguagesShape>('ExtHostLanguages'),
	ExtHostLanguageFeatures: createProxyIdentifier<ExtHostLanguageFeaturesShape>('ExtHostLanguageFeatures'),
	ExtHostQuickOpen: createProxyIdentifier<ExtHostQuickOpenShape>('ExtHostQuickOpen'),
	ExtHostQuickDiff: createProxyIdentifier<ExtHostQuickDiffShape>('ExtHostQuickDiff'),
	ExtHostStatusBar: createProxyIdentifier<ExtHostStatusBarShape>('ExtHostStatusBar'),
	ExtHostShare: createProxyIdentifier<ExtHostShareShape>('ExtHostShare'),
	ExtHostExtensionService: createProxyIdentifier<ExtHostExtensionServiceShape>('ExtHostExtensionService'),
	ExtHostLogLevelServiceShape: createProxyIdentifier<ExtHostLogLevelServiceShape>('ExtHostLogLevelServiceShape'),
	ExtHostTerminalService: createProxyIdentifier<ExtHostTerminalServiceShape>('ExtHostTerminalService'),
	ExtHostTerminalShellIntegration: createProxyIdentifier<ExtHostTerminalShellIntegrationShape>('ExtHostTerminalShellIntegration'),
	ExtHostSCM: createProxyIdentifier<ExtHostSCMShape>('ExtHostSCM'),
	ExtHostSearch: createProxyIdentifier<ExtHostSearchShape>('ExtHostSearch'),
	ExtHostTask: createProxyIdentifier<ExtHostTaskShape>('ExtHostTask'),
	ExtHostWorkspace: createProxyIdentifier<ExtHostWorkspaceShape>('ExtHostWorkspace'),
	ExtHostWindow: createProxyIdentifier<ExtHostWindowShape>('ExtHostWindow'),
	ExtHostWebviews: createProxyIdentifier<ExtHostWebviewsShape>('ExtHostWebviews'),
	ExtHostWebviewPanels: createProxyIdentifier<ExtHostWebviewPanelsShape>('ExtHostWebviewPanels'),
	ExtHostCustomEditors: createProxyIdentifier<ExtHostCustomEditorsShape>('ExtHostCustomEditors'),
	ExtHostWebviewViews: createProxyIdentifier<ExtHostWebviewViewsShape>('ExtHostWebviewViews'),
	ExtHostEditorInsets: createProxyIdentifier<ExtHostEditorInsetsShape>('ExtHostEditorInsets'),
	ExtHostEditorTabs: createProxyIdentifier<IExtHostEditorTabsShape>('ExtHostEditorTabs'),
	ExtHostProgress: createProxyIdentifier<ExtHostProgressShape>('ExtHostProgress'),
	ExtHostComments: createProxyIdentifier<ExtHostCommentsShape>('ExtHostComments'),
	ExtHostSecretState: createProxyIdentifier<ExtHostSecretStateShape>('ExtHostSecretState'),
	ExtHostStorage: createProxyIdentifier<ExtHostStorageShape>('ExtHostStorage'),
	ExtHostUrls: createProxyIdentifier<ExtHostUrlsShape>('ExtHostUrls'),
	ExtHostUriOpeners: createProxyIdentifier<ExtHostUriOpenersShape>('ExtHostUriOpeners'),
	ExtHostProfileContentHandlers: createProxyIdentifier<ExtHostProfileContentHandlersShape>('ExtHostProfileContentHandlers'),
	ExtHostOutputService: createProxyIdentifier<ExtHostOutputServiceShape>('ExtHostOutputService'),
	ExtHostLabelService: createProxyIdentifier<ExtHostLabelServiceShape>('ExtHostLabelService'),
	ExtHostNotebook: createProxyIdentifier<ExtHostNotebookShape>('ExtHostNotebook'),
	ExtHostNotebookDocuments: createProxyIdentifier<ExtHostNotebookDocumentsShape>('ExtHostNotebookDocuments'),
	ExtHostNotebookEditors: createProxyIdentifier<ExtHostNotebookEditorsShape>('ExtHostNotebookEditors'),
	ExtHostNotebookKernels: createProxyIdentifier<ExtHostNotebookKernelsShape>('ExtHostNotebookKernels'),
	ExtHostNotebookRenderers: createProxyIdentifier<ExtHostNotebookRenderersShape>('ExtHostNotebookRenderers'),
	ExtHostNotebookDocumentSaveParticipant: createProxyIdentifier<ExtHostNotebookDocumentSaveParticipantShape>('ExtHostNotebookDocumentSaveParticipant'),
	ExtHostInteractive: createProxyIdentifier<ExtHostInteractiveShape>('ExtHostInteractive'),
	ExtHostChatAgents2: createProxyIdentifier<ExtHostChatAgentsShape2>('ExtHostChatAgents'),
	ExtHostLanguageModelTools: createProxyIdentifier<ExtHostLanguageModelToolsShape>('ExtHostChatSkills'),
	ExtHostChatProvider: createProxyIdentifier<ExtHostLanguageModelsShape>('ExtHostChatProvider'),
	ExtHostSpeech: createProxyIdentifier<ExtHostSpeechShape>('ExtHostSpeech'),
	ExtHostEmbeddings: createProxyIdentifier<ExtHostEmbeddingsShape>('ExtHostEmbeddings'),
	ExtHostAiRelatedInformation: createProxyIdentifier<ExtHostAiRelatedInformationShape>('ExtHostAiRelatedInformation'),
	ExtHostAiEmbeddingVector: createProxyIdentifier<ExtHostAiEmbeddingVectorShape>('ExtHostAiEmbeddingVector'),
	ExtHostTheming: createProxyIdentifier<ExtHostThemingShape>('ExtHostTheming'),
	ExtHostTunnelService: createProxyIdentifier<ExtHostTunnelServiceShape>('ExtHostTunnelService'),
	ExtHostManagedSockets: createProxyIdentifier<ExtHostManagedSocketsShape>('ExtHostManagedSockets'),
	ExtHostAuthentication: createProxyIdentifier<ExtHostAuthenticationShape>('ExtHostAuthentication'),
	ExtHostTimeline: createProxyIdentifier<ExtHostTimelineShape>('ExtHostTimeline'),
	ExtHostTesting: createProxyIdentifier<ExtHostTestingShape>('ExtHostTesting'),
	ExtHostTelemetry: createProxyIdentifier<ExtHostTelemetryShape>('ExtHostTelemetry'),
	ExtHostLocalization: createProxyIdentifier<ExtHostLocalizationShape>('ExtHostLocalization'),
	ExtHostMcp: createProxyIdentifier<ExtHostMcpShape>('ExtHostMcp'),
};
