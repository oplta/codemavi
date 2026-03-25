/**
 * Code Mavi IDE - AST Service
 *
 * AST parsing and code analysis service
 * Provides language-aware code parsing, symbol extraction, and chunking
 * Note: tree-sitter modules need to be installed separately for full functionality
 */

import { URI } from '../../../../../../base/common/uri.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';

export interface ASTNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children?: ASTNode[];
  parent?: ASTNode;
}

export interface CodeSymbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'import' | 'export';
  location: {
    uri: URI;
    lineStart: number;
    lineEnd: number;
    columnStart: number;
    columnEnd: number;
  };
  metadata?: {
    parameters?: string[];
    returnType?: string;
    access?: 'public' | 'private' | 'protected';
    isAsync?: boolean;
    isExported?: boolean;
  };
}

export interface CodeChunk {
  id: string;
  uri: URI;
  content: string;
  language: string;
  lineStart: number;
  lineEnd: number;
  symbols: CodeSymbol[];
  nodeType?: string;
}

export interface ParseResult {
  ast: ASTNode;
  symbols: CodeSymbol[];
  chunks: CodeChunk[];
  language: string;
}

/**
 * AST Service for code parsing and analysis
 * 
 * This is a stub implementation that provides basic functionality.
 * For full tree-sitter based parsing, install:
 * - tree-sitter
 * - tree-sitter-javascript
 * - tree-sitter-typescript
 * - tree-sitter-python
 * - tree-sitter-rust
 */
export class ASTService extends Disposable {
  private grammars: Map<string, any> = new Map();
  private initialized = false;

  constructor() {
    super();
    this._register({
      dispose: () => {
        this.grammars.clear();
      }
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Register supported languages (stub implementation)
      const supportedLanguages = ['javascript', 'typescript', 'tsx', 'python', 'rust'];
      
      for (const lang of supportedLanguages) {
        this.grammars.set(lang, { name: lang });
        console.log(`[ASTService] Registered grammar for ${lang}`);
      }

      this.initialized = true;
      console.log('[ASTService] Initialized with languages:', Array.from(this.grammars.keys()));
    } catch (error) {
      console.error('[ASTService] Failed to initialize:', error);
      throw error;
    }
  }

  private detectLanguage(uri: URI): string {
    const path = uri.fsPath.toLowerCase();

    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.ts')) return 'typescript';
    if (path.endsWith('.tsx')) return 'tsx';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.rs')) return 'rust';

    // Default to JavaScript for unknown extensions
    return 'javascript';
  }

  async parseFile(uri: URI, content?: string): Promise<ParseResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const language = this.detectLanguage(uri);

    let fileContent = content;
    if (!fileContent) {
      throw new Error('File content must be provided');
    }

    // Create a simple AST from the content (stub implementation)
    const ast = this.createStubAST(fileContent);

    const symbols = await this.extractSymbols(ast, uri);
    const chunks = await this.chunkCode(ast, uri, fileContent, language);

    return {
      ast,
      symbols,
      chunks,
      language
    };
  }

  /**
   * Creates a stub AST from code content
   * This is a simplified implementation that creates a basic tree structure
   */
  private createStubAST(content: string): ASTNode {
    const lines = content.split('\n');
    
    const root: ASTNode = {
      type: 'program',
      text: content,
      startPosition: { row: 0, column: 0 },
      endPosition: { row: lines.length - 1, column: lines[lines.length - 1]?.length || 0 },
      children: []
    };

    // Create simple line-based nodes
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.length === 0) continue;

      let nodeType = 'line';
      
      // Detect simple patterns
      if (trimmed.startsWith('function ') || trimmed.includes('function ')) {
        nodeType = 'function_declaration';
      } else if (trimmed.startsWith('class ')) {
        nodeType = 'class_declaration';
      } else if (trimmed.startsWith('import ')) {
        nodeType = 'import_statement';
      } else if (trimmed.startsWith('export ')) {
        nodeType = 'export_statement';
      } else if (trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ')) {
        nodeType = 'lexical_declaration';
      }

      const child: ASTNode = {
        type: nodeType,
        text: line,
        startPosition: { row: i, column: 0 },
        endPosition: { row: i, column: line.length },
        parent: root,
        children: []
      };

      root.children!.push(child);
    }

    return root;
  }

  async extractSymbols(ast: ASTNode, uri: URI): Promise<CodeSymbol[]> {
    const symbols: CodeSymbol[] = [];

    const traverse = (node: ASTNode) => {
      // Extract functions
      if (node.type === 'function_declaration' || node.type === 'function_definition') {
        const nameMatch = node.text.match(/function\s+(\w+)/);
        
        if (nameMatch) {
          symbols.push({
            name: nameMatch[1],
            type: 'function',
            location: {
              uri,
              lineStart: node.startPosition.row + 1,
              lineEnd: node.endPosition.row + 1,
              columnStart: node.startPosition.column,
              columnEnd: node.endPosition.column
            },
            metadata: {
              isAsync: node.text.includes('async'),
              isExported: this.isExported(node)
            }
          });
        }
      }

      // Extract classes
      if (node.type === 'class_declaration' || node.type === 'class_definition') {
        const nameMatch = node.text.match(/class\s+(\w+)/);
        
        if (nameMatch) {
          symbols.push({
            name: nameMatch[1],
            type: 'class',
            location: {
              uri,
              lineStart: node.startPosition.row + 1,
              lineEnd: node.endPosition.row + 1,
              columnStart: node.startPosition.column,
              columnEnd: node.endPosition.column
            },
            metadata: {
              isExported: this.isExported(node)
            }
          });
        }
      }

      // Extract imports
      if (node.type === 'import_statement' || node.type === 'import_declaration') {
        symbols.push({
          name: 'import',
          type: 'import',
          location: {
            uri,
            lineStart: node.startPosition.row + 1,
            lineEnd: node.endPosition.row + 1,
            columnStart: node.startPosition.column,
            columnEnd: node.endPosition.column
          }
        });
      }

      // Extract exports
      if (node.type === 'export_statement' || node.type === 'export_declaration') {
        symbols.push({
          name: 'export',
          type: 'export',
          location: {
            uri,
            lineStart: node.startPosition.row + 1,
            lineEnd: node.endPosition.row + 1,
            columnStart: node.startPosition.column,
            columnEnd: node.endPosition.column
          }
        });
      }

      // Extract variables (const, let, var)
      if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
        const nameMatch = node.text.match(/(?:const|let|var)\s+(\w+)/);
        
        if (nameMatch) {
          symbols.push({
            name: nameMatch[1],
            type: 'variable',
            location: {
              uri,
              lineStart: node.startPosition.row + 1,
              lineEnd: node.endPosition.row + 1,
              columnStart: node.startPosition.column,
              columnEnd: node.endPosition.column
            }
          });
        }
      }

      // Recursively traverse children
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(ast);
    return symbols;
  }

  private isExported(node: ASTNode): boolean {
    let current: ASTNode | undefined = node;

    while (current) {
      if (current.type.includes('export')) {
        return true;
      }
      current = current.parent;
    }

    return false;
  }

  async chunkCode(
    ast: ASTNode,
    uri: URI,
    content: string,
    language: string
  ): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');

    // Strategy 1: Function/Class level chunking
    const functionAndClassNodes = this.collectFunctionAndClassNodes(ast);

    for (const node of functionAndClassNodes) {
      const chunkContent = lines
        .slice(node.startPosition.row, node.endPosition.row + 1)
        .join('\n');

      const symbols = await this.extractSymbols(node, uri);

      chunks.push({
        id: `${uri.toString()}-${node.startPosition.row}-${node.endPosition.row}`,
        uri,
        content: chunkContent,
        language,
        lineStart: node.startPosition.row + 1,
        lineEnd: node.endPosition.row + 1,
        symbols,
        nodeType: node.type
      });
    }

    // Strategy 2: Fixed-size chunking for remaining code
    const CHUNK_SIZE_LINES = 50;
    const CHUNK_OVERLAP_LINES = 10;

    let lineIndex = 0;
    while (lineIndex < lines.length) {
      // Skip if this line is already covered by a function/class chunk
      const isCovered = chunks.some(chunk =>
        lineIndex + 1 >= chunk.lineStart && lineIndex + 1 <= chunk.lineEnd
      );

      if (!isCovered) {
        const chunkEnd = Math.min(lineIndex + CHUNK_SIZE_LINES, lines.length);
        const chunkContent = lines.slice(lineIndex, chunkEnd).join('\n');

        // Only create chunk if it has meaningful content (not just whitespace/comments)
        if (this.hasMeaningfulContent(chunkContent)) {
          chunks.push({
            id: `${uri.toString()}-${lineIndex}-${chunkEnd}`,
            uri,
            content: chunkContent,
            language,
            lineStart: lineIndex + 1,
            lineEnd: chunkEnd,
            symbols: [],
            nodeType: 'code_block'
          });
        }

        lineIndex += CHUNK_SIZE_LINES - CHUNK_OVERLAP_LINES;
      } else {
        // Move to the end of the covered chunk
        const coveringChunk = chunks.find(chunk =>
          lineIndex + 1 >= chunk.lineStart && lineIndex + 1 <= chunk.lineEnd
        );
        if (coveringChunk) {
          lineIndex = coveringChunk.lineEnd;
        } else {
          lineIndex++;
        }
      }
    }

    return chunks.sort((a, b) => a.lineStart - b.lineStart);
  }

  private collectFunctionAndClassNodes(ast: ASTNode): ASTNode[] {
    const nodes: ASTNode[] = [];

    const traverse = (node: ASTNode) => {
      // Collect function and class declarations
      if (
        node.type === 'function_declaration' ||
        node.type === 'function_definition' ||
        node.type === 'class_declaration' ||
        node.type === 'class_definition' ||
        node.type === 'method_definition' ||
        node.type === 'arrow_function'
      ) {
        nodes.push(node);
      }

      // Recursively traverse children
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(ast);
    return nodes;
  }

  private hasMeaningfulContent(content: string): boolean {
    const trimmed = content.trim();
    if (trimmed.length === 0) return false;

    // Check if it's mostly comments
    const lines = trimmed.split('\n');
    const nonCommentLines = lines.filter(line => {
      const trimmedLine = line.trim();
      return !(
        trimmedLine.startsWith('//') ||
        trimmedLine.startsWith('#') ||
        trimmedLine.startsWith('/*') ||
        trimmedLine.endsWith('*/') ||
        trimmedLine.startsWith('* ')
      );
    });

    return nonCommentLines.length > 0;
  }

  async parseFiles(files: Array<{ uri: URI; content: string }>): Promise<Map<URI, ParseResult>> {
    const results = new Map<URI, ParseResult>();

    for (const file of files) {
      try {
        const result = await this.parseFile(file.uri, file.content);
        results.set(file.uri, result);
      } catch (error) {
        console.error(`[ASTService] Failed to parse ${file.uri}:`, error);
      }
    }

    return results;
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.grammars.keys());
  }

  isLanguageSupported(language: string): boolean {
    return this.grammars.has(language);
  }
}