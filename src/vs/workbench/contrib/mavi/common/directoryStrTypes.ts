import { URI } from '../../../../base/common/uri.js';

export type MaviDirectoryItem = {
	uri: URI;
	name: string;
	isSymbolicLink: boolean;
	children: MaviDirectoryItem[] | null;
	isDirectory: boolean;
	isGitIgnoredDirectory: false | { numChildren: number }; // if directory is gitignored, we ignore children
}
