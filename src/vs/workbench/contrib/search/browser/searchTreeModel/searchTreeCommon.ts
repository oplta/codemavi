/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Range } from '../../../../../editor/common/core/range.js';
import { IAITextQuery, IFileMatch, ISearchComplete, ISearchProgressItem, ISearchRange, ITextQuery, ITextSearchQuery, ITextSearchResult } from '../../../../services/search/common/search.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { IFileStatWithPartialMetadata, IFileService } from '../../../../../platform/files/common/files.js';
import { IProgress, IProgressStep } from '../../../../../platform/progress/common/progress.js';
import { ReplacePattern } from '../../../../services/search/common/replace.js';
import { NotebookEditorWidget } from '../../../notebook/browser/notebookEditorWidget.js';
import { RangeHighlightDecorations } from './rangeDecorations.js';
import { Event } from '../../../../../base/common/event.js';

export type FileMatchOrMatch = ISearchTreeFileMatch | ISearchTreeMatch;

export type RenderableMatch = ITextSearchHeading | ISearchTreeFolderMatch | ISearchTreeFileMatch | ISearchTreeMatch;
export function arrayContainsElementOrParent(element: RenderableMatch, testArray: RenderableMatch[]): boolean {
	do {
		if (testArray.includes(element)) {
			return true;
		}
	} while (!isSearchResult(element.parent()) && (element = <RenderableMatch>element.parent()));

	return false;
}


export interface IChangeEvent {
	elements: ISearchTreeFileMatch[];
	added?: boolean;
	removed?: boolean;
	clearingAll?: boolean;
}
export enum SearchModelLocation {
	PANEL,
	QUICK_ACCESS
}


export const PLAIN_TEXT_SEARCH__RESULT_ID = 'plainTextSearch';
export const AI_TEXT_SEARCH_RESULT_ID = 'aiTextSearch';

export function createParentList(element: RenderableMatch): RenderableMatch[] {
	const parentArray: RenderableMatch[] = [];
	let currElement: RenderableMatch | ITextSearchHeading = element;

	while (!isTextSearchHeading(currElement)) {
		parentArray.push(currElement);
		currElement = currElement.parent();
	}

	return parentArray;
}

export const SEARCH_MODEL_PREFIX = 'SEARCH_MODEL_';
export const SEARCH_RESULT_PREFIX = 'SEARCH_RESULT_';
export const TEXT_SEARCH_HEADING_PREFIX = 'TEXT_SEARCH_HEADING_';
export const FOLDER_MATCH_PREFIX = 'FOLDER_MATCH_';
export const FILE_MATCH_PREFIX = 'FILE_MATCH_';
export const MATCH_PREFIX = 'MATCH_';

export function mergeSearchResultEvents(events: IChangeEvent[]): IChangeEvent {
	const retEvent: IChangeEvent = {
		elements: [],
		added: false,
		removed: false,
	};
	events.forEach((e) => {
		if (e.added) {
			retEvent.added = true;
		}

		if (e.removed) {
			retEvent.removed = true;
		}

		retEvent.elements = retEvent.elements.concat(e.elements);
	});

	return retEvent;
}

export interface ISearchModel {
	readonly onReplaceTermChanged: Event<codemavi>;
	readonly onSearchResultChanged: Event<IChangeEvent>;
	location: SearchModelLocation;
	id(): string;

	getAITextResultProviderName(): Promise<string>;
	isReplaceActive(): boolean;
	replaceActive: boolean;
	replacePattern: ReplacePattern | null;
	replaceString: string;
	preserveCase: boolean;
	searchResult: ISearchResult;
	addAIResults(onProgress?: (result: ISearchProgressItem) => codemavi): Promise<ISearchComplete>;
	aiSearch(query: IAITextQuery, onProgress?: (result: ISearchProgressItem) => codemavi): Promise<ISearchComplete>;
	hasAIResults: boolean;
	hasPlainResults: boolean;
	search(query: ITextQuery, onProgress?: (result: ISearchProgressItem) => codemavi, callerToken?: CancellationToken): {
		asyncResults: Promise<ISearchComplete>;
		syncResults: IFileMatch<URI>[];
	};
	cancelSearch(cancelledForNewSearch?: boolean): boolean;
	cancelAISearch(cancelledForNewSearch?: boolean): boolean;
	clearAiSearchResults(): codemavi;
	dispose(): codemavi;
}


export interface ISearchResult {
	readonly onChange: Event<IChangeEvent>;
	readonly searchModel: ISearchModel;
	readonly plainTextSearchResult: IPlainTextSearchHeading;
	readonly aiTextSearchResult: ITextSearchHeading;
	readonly children: ITextSearchHeading[];
	readonly hasChildren: boolean;
	readonly isDirty: boolean;
	query: ITextQuery | null;

	batchReplace(elementsToReplace: RenderableMatch[]): Promise<codemavi>;
	batchRemove(elementsToRemove: RenderableMatch[]): codemavi;
	folderMatches(ai?: boolean): ISearchTreeFolderMatch[];
	add(allRaw: IFileMatch[], searchInstanceID: string, ai: boolean, silent?: boolean): codemavi;
	clear(): codemavi;
	remove(matches: ISearchTreeFileMatch | ISearchTreeFolderMatch | (ISearchTreeFileMatch | ISearchTreeFolderMatch)[], ai?: boolean): codemavi;
	replace(match: ISearchTreeFileMatch): Promise<any>;
	matches(ai?: boolean): ISearchTreeFileMatch[];
	isEmpty(): boolean;
	fileCount(): number;
	count(): number;
	id(): string;
	setCachedSearchComplete(cachedSearchComplete: ISearchComplete | undefined, ai: boolean): codemavi;
	getCachedSearchComplete(ai: boolean): ISearchComplete | undefined;
	toggleHighlights(value: boolean, ai?: boolean): codemavi;
	getRangeHighlightDecorations(ai?: boolean): RangeHighlightDecorations;
	replaceAll(progress: IProgress<IProgressStep>): Promise<any>;
	setAIQueryUsingTextQuery(query?: ITextQuery | null): codemavi;
	dispose(): codemavi;
}

export interface ITextSearchHeading {
	readonly onChange: Event<IChangeEvent>;
	resource: URI | null;
	hidden: boolean;
	cachedSearchComplete: ISearchComplete | undefined;
	hide(): codemavi;
	readonly isAIContributed: boolean;
	id(): string;
	parent(): ISearchResult;
	readonly hasChildren: boolean;
	name(): string;
	readonly isDirty: boolean;
	getFolderMatch(resource: URI): ISearchTreeFolderMatch | undefined;
	add(allRaw: IFileMatch[], searchInstanceID: string, ai: boolean, silent?: boolean): codemavi;
	remove(matches: ISearchTreeFileMatch | ISearchTreeFolderMatch | (ISearchTreeFileMatch | ISearchTreeFolderMatch)[], ai?: boolean): codemavi;
	groupFilesByFolder(fileMatches: ISearchTreeFileMatch[]): { byFolder: Map<URI, ISearchTreeFileMatch[]>; other: ISearchTreeFileMatch[] };
	isEmpty(): boolean;
	findFolderSubstr(resource: URI): ISearchTreeFolderMatch | undefined;
	query: ITextSearchQuery | null;
	folderMatches(): ISearchTreeFolderMatch[];
	matches(): ISearchTreeFileMatch[];
	showHighlights: boolean;
	toggleHighlights(value: boolean): codemavi;
	rangeHighlightDecorations: RangeHighlightDecorations;
	fileCount(): number;
	count(): number;
	clear(clearAll: boolean): codemavi;
	dispose(): codemavi;
}

export interface IPlainTextSearchHeading extends ITextSearchHeading {
	replace(match: ISearchTreeFileMatch): Promise<any>;
	replaceAll(progress: IProgress<IProgressStep>): Promise<any>;
}

export interface ISearchTreeFolderMatch {
	readonly onChange: Event<IChangeEvent>;
	readonly onDispose: Event<codemavi>;
	id(): string;
	resource: URI | null;
	index(): number;
	name(): string;
	count(): number;
	hasChildren: boolean;
	parent(): ISearchTreeFolderMatch | ITextSearchHeading;
	matches(): (ISearchTreeFileMatch | ISearchTreeFolderMatchWithResource)[];
	allDownstreamFileMatches(): ISearchTreeFileMatch[];
	remove(matches: ISearchTreeFileMatch | ISearchTreeFolderMatchWithResource | (ISearchTreeFileMatch | ISearchTreeFolderMatchWithResource)[]): codemavi;
	addFileMatch(raw: IFileMatch[], silent: boolean, searchInstanceID: string): codemavi;
	isEmpty(): boolean;
	clear(clearingAll?: boolean): codemavi;
	showHighlights: boolean;
	searchModel: ISearchModel;
	query: ITextSearchQuery | null;
	replace(match: ISearchTreeFileMatch): Promise<any>;
	replacingAll: boolean;
	bindModel(model: ITextModel): codemavi;
	getDownstreamFileMatch(uri: URI): ISearchTreeFileMatch | null;
	replaceAll(): Promise<any>;
	recursiveFileCount(): number;
	doRemoveFile(fileMatches: ISearchTreeFileMatch[], dispose?: boolean, trigger?: boolean, keepReadonly?: boolean): codemavi;
	unbindNotebookEditorWidget(editor: NotebookEditorWidget, resource: URI): codemavi;
	bindNotebookEditorWidget(editor: NotebookEditorWidget, resource: URI): Promise<codemavi>;
	unbindNotebookEditorWidget(editor: NotebookEditorWidget, resource: URI): codemavi;
	hasOnlyReadOnlyMatches(): boolean;
	fileMatchesIterator(): IterableIterator<ISearchTreeFileMatch>;
	folderMatchesIterator(): IterableIterator<ISearchTreeFolderMatchWithResource>;
	recursiveFileCount(): number;
	recursiveMatchCount(): number;
	dispose(): codemavi;
	isAIContributed(): boolean;
}

export interface ISearchTreeFolderMatchWithResource extends ISearchTreeFolderMatch {
	resource: URI;
}

export interface ISearchTreeFolderMatchWorkspaceRoot extends ISearchTreeFolderMatchWithResource {
	createAndConfigureFileMatch(rawFileMatch: IFileMatch<URI>, searchInstanceID: string): ISearchTreeFileMatch;
}

export interface ISearchTreeFolderMatchNoRoot extends ISearchTreeFolderMatch {
	createAndConfigureFileMatch(rawFileMatch: IFileMatch<URI>, searchInstanceID: string): ISearchTreeFileMatch;
}

export interface ISearchTreeFileMatch {
	id(): string;
	resource: URI;
	onChange: Event<{
		didRemove?: boolean;
		forceUpdateModel?: boolean;
	}>;
	hasChildren: boolean;
	readonly onDispose: Event<codemavi>;
	name(): string;
	count(): number;
	hasOnlyReadOnlyMatches(): boolean;
	matches(): ISearchTreeMatch[];
	updateHighlights(): codemavi;
	getSelectedMatch(): ISearchTreeMatch | null;
	parent(): ISearchTreeFolderMatch;
	bindModel(model: ITextModel): codemavi;
	hasReadonlyMatches(): boolean;
	addContext(results: ITextSearchResult[] | undefined): codemavi;
	add(match: ISearchTreeMatch, trigger?: boolean): codemavi;
	replace(toReplace: ISearchTreeMatch): Promise<codemavi>;
	remove(matches: ISearchTreeMatch | (ISearchTreeMatch[])): codemavi;
	setSelectedMatch(match: ISearchTreeMatch | null): codemavi;
	fileStat: IFileStatWithPartialMetadata | undefined;
	resolveFileStat(fileService: IFileService): Promise<codemavi>;
	textMatches(): ISearchTreeMatch[];
	readonly context: Map<number, string>;
	readonly closestRoot: ISearchTreeFolderMatchWorkspaceRoot | null;
	isMatchSelected(match: ISearchTreeMatch): boolean;
	dispose(): codemavi;
}

export interface ISearchTreeMatch {
	id(): string;
	parent(): ISearchTreeFileMatch;
	text(): string;
	range(): Range;
	preview(): { before: string; fullBefore: string; inside: string; after: string };
	replaceString: string;
	fullMatchText(includeSurrounding?: boolean): string;
	rangeInPreview(): ISearchRange;
	fullPreviewLines(): string[];
	getMatchString(): string;
	isReadonly: boolean;
}

export function isSearchModel(obj: any): obj is ISearchModel {
	return typeof obj === 'object' &&
		obj !== null &&
		typeof obj.id === 'function' &&
		obj.id().startsWith(SEARCH_MODEL_PREFIX);
}

export function isSearchResult(obj: any): obj is ISearchResult {
	return typeof obj === 'object' &&
		obj !== null &&
		typeof obj.id === 'function' &&
		obj.id().startsWith(SEARCH_RESULT_PREFIX);
}

export function isTextSearchHeading(obj: any): obj is ITextSearchHeading {
	return typeof obj === 'object' &&
		obj !== null &&
		typeof obj.id === 'function' &&
		obj.id().startsWith(TEXT_SEARCH_HEADING_PREFIX);
}

export function isPlainTextSearchHeading(obj: any): obj is IPlainTextSearchHeading {
	return isTextSearchHeading(obj) &&
		typeof (<any>obj).replace === 'function' &&
		typeof (<any>obj).replaceAll === 'function';
}

export function isSearchTreeFolderMatch(obj: any): obj is ISearchTreeFolderMatch {
	return typeof obj === 'object' &&
		obj !== null &&
		typeof obj.id === 'function' &&
		obj.id().startsWith(FOLDER_MATCH_PREFIX);
}

export function isSearchTreeFolderMatchWithResource(obj: any): obj is ISearchTreeFolderMatchWithResource {
	return isSearchTreeFolderMatch(obj) && obj.resource instanceof URI;
}

export function isSearchTreeFolderMatchWorkspaceRoot(obj: any): obj is ISearchTreeFolderMatchWorkspaceRoot {
	return isSearchTreeFolderMatchWithResource(obj) &&
		typeof (<any>obj).createAndConfigureFileMatch === 'function';
}

export function isSearchTreeFolderMatchNoRoot(obj: any): obj is ISearchTreeFolderMatchNoRoot {
	return isSearchTreeFolderMatch(obj) &&
		typeof (<any>obj).createAndConfigureFileMatch === 'function';
}

export function isSearchTreeFileMatch(obj: any): obj is ISearchTreeFileMatch {
	return typeof obj === 'object' &&
		obj !== null &&
		typeof obj.id === 'function' &&
		obj.id().startsWith(FILE_MATCH_PREFIX);
}

export function isSearchTreeMatch(obj: any): obj is ISearchTreeMatch {
	return typeof obj === 'object' &&
		obj !== null &&
		typeof obj.id === 'function' &&
		obj.id().startsWith(MATCH_PREFIX);
}

export function isSearchHeader(obj: any): boolean {
	return typeof obj === 'object' &&
		obj !== null &&
		typeof obj.id === 'function' &&
		obj.id().startsWith(TEXT_SEARCH_HEADING_PREFIX);
}

export function getFileMatches(matches: (ISearchTreeFileMatch | ISearchTreeFolderMatchWithResource)[]): ISearchTreeFileMatch[] {

	const folderMatches: ISearchTreeFolderMatchWithResource[] = [];
	const fileMatches: ISearchTreeFileMatch[] = [];
	matches.forEach((e) => {
		if (isSearchTreeFileMatch(e)) {
			fileMatches.push(e);
		} else {
			folderMatches.push(e);
		}
	});

	return fileMatches.concat(folderMatches.map(e => e.allDownstreamFileMatches()).flat());
}
