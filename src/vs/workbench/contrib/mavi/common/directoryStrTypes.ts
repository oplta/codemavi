import { URI } from '../../../../base/common/uri.js';

export type Code MaviDirectoryItem = {
	uri: URI;
	name: string;
	isSymbolicLink: boolean;
	children: Code MaviDirectoryItem[] | null;
	isDirectory: boolean;
	isGitIgnoredDirectory: false | { numChildren: number }; // if directory is gitignored, we ignore children
}
