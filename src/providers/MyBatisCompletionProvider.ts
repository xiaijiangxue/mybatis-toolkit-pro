import * as vscode from 'vscode';
import { ProjectIndexer } from '../services/ProjectIndexer';
import { JavaAstUtils } from '../utils/JavaAstUtils';

export class MyBatisCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private indexer: ProjectIndexer) { }

    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {

        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);
        const textAfterCursor = lineText.substring(position.character);

        let alreadyTyped = '';

        const paramMatchOpen = textBeforeCursor.match(/[#\$]\{([^}]*)$/);
        const paramMatchClosed = textBeforeCursor.match(/[#\$]\{([^}]*)\}?$/);

        if (paramMatchOpen) {
            alreadyTyped = paramMatchOpen[1];
        } else if (paramMatchClosed && /^\}/.test(textAfterCursor)) {
            alreadyTyped = paramMatchClosed[1];
        } else {
            return undefined;
        }

        const parts = alreadyTyped.split('.');
        const rootPart = parts[0];

        const fileText = document.getText();
        const namespaceMatch = fileText.match(/<mapper\s+namespace="([^"]+)"/);
        if (!namespaceMatch) {
            return undefined;
        }

        const namespace = namespaceMatch[1];
        const javaInterface = this.indexer.getJavaByNamespace(namespace);
        if (!javaInterface) {
            return undefined;
        }

        const offset = document.offsetAt(position);
        const preText = fileText.substring(0, offset);
        const tagMatch = preText.match(/<(?:select|insert|update|delete)\s+(?:[^>]*?)\bid="([^"]+)"(?:[^>]*)>/g);
        if (!tagMatch || tagMatch.length === 0) {
            return undefined;
        }

        const lastTag = tagMatch[tagMatch.length - 1];
        const idMatch = lastTag.match(/id="([^"]+)"/);
        if (!idMatch) {
            return undefined;
        }

        const methodId = idMatch[1];
        const methodInfo = javaInterface.methods.get(methodId);
        if (!methodInfo) {
            return undefined;
        }

        if (parts.length === 1 && !alreadyTyped.includes('.')) {
            return this.getRootCompletions(javaInterface, methodInfo, alreadyTyped);
        }

        return this.getPropertyCompletions(javaInterface, methodInfo, parts, alreadyTyped);
    }

    private getRootCompletions(
        javaInterface: any,
        methodInfo: any,
        alreadyTyped: string
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        for (const [paramName, paramType] of methodInfo.params) {
            if (alreadyTyped && !paramName.startsWith(alreadyTyped)) {
                continue;
            }

            const item = new vscode.CompletionItem(paramName, vscode.CompletionItemKind.Variable);
            item.detail = paramType;
            item.documentation = methodInfo.paramDocs.get(paramName) || `参数类型: ${paramType}`;

            const isPrimitive = this.isPrimitiveOrWrapper(paramType);
            if (isPrimitive) {
                item.insertText = paramName;
            } else {
                item.insertText = paramName + '.';
                item.command = {
                    command: 'editor.action.triggerSuggest',
                    title: 'Trigger Suggestions'
                };
            }

            items.push(item);
        }

        if (methodInfo.params.size === 1 && (alreadyTyped === '' || !methodInfo.params.has(alreadyTyped))) {
            const entry = methodInfo.params.entries().next().value;
            if (entry) {
                const [singleName, singleType] = entry;
                const isPrimitive = this.isPrimitiveOrWrapper(singleType);

                if (!isPrimitive) {
                    const javaClass = this.resolveAndGetTypeClass(javaInterface, singleType);
                    if (javaClass) {
                        for (const [fieldName, fieldInfo] of javaClass.fields) {
                            if (alreadyTyped && !fieldName.startsWith(alreadyTyped)) {
                                continue;
                            }
                            const item = new vscode.CompletionItem(fieldName, vscode.CompletionItemKind.Field);
                            item.detail = fieldInfo.type;
                            item.documentation = fieldInfo.doc || `字段类型: ${fieldInfo.type}`;
                            item.insertText = fieldName;
                            items.push(item);
                        }
                    }
                }
            }
        }

        return items;
    }

    private getPropertyCompletions(
        javaInterface: any,
        methodInfo: any,
        parts: string[],
        alreadyTyped: string
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        let currentType: string | undefined;
        let currentParamName: string | undefined;

        const rootParam = parts[0];
        currentType = methodInfo.params.get(rootParam);
        currentParamName = rootParam;

        if (!currentType && methodInfo.params.size === 1) {
            const entry = methodInfo.params.entries().next().value;
            if (entry) {
                currentType = entry[1];
                currentParamName = entry[0];
            }
        }

        if (!currentType) {
            return items;
        }

        let javaClass = this.resolveAndGetTypeClass(javaInterface, currentType);
        if (!javaClass) {
            return items;
        }

        let startIndex = 0;
        if (methodInfo.params.size === 1) {
            if (parts[0] === currentParamName) {
                startIndex = 1;
            }
        } else {
            if (methodInfo.params.has(parts[0])) {
                startIndex = 1;
            }
        }

        for (let i = startIndex; i < parts.length - 1; i++) {
            const propName = parts[i];
            const field = javaClass?.fields.get(propName);
            if (!field) {
                return items;
            }
            javaClass = this.resolveAndGetTypeClass(javaInterface, field.type);
            if (!javaClass) {
                return items;
            }
        }

        const lastPart = parts[parts.length - 1];

        for (const [fieldName, fieldInfo] of javaClass.fields) {
            if (lastPart && !fieldName.startsWith(lastPart)) {
                continue;
            }

            const item = new vscode.CompletionItem(fieldName, vscode.CompletionItemKind.Field);
            item.detail = fieldInfo.type;
            item.documentation = fieldInfo.doc || `字段类型: ${fieldInfo.type}`;

            const isPrimitive = this.isPrimitiveOrWrapper(fieldInfo.type);
            if (isPrimitive) {
                item.insertText = fieldName;
            } else {
                item.insertText = fieldName + '.';
                item.command = {
                    command: 'editor.action.triggerSuggest',
                    title: 'Trigger Suggestions'
                };
            }

            items.push(item);
        }

        return items;
    }

    private resolveAndGetTypeClass(javaInterface: any, simpleOrFullName: string): any {
        let fullName = simpleOrFullName;

        if (!simpleOrFullName.includes('.')) {
            if (javaInterface.imports.has(simpleOrFullName)) {
                fullName = javaInterface.imports.get(simpleOrFullName);
            } else if (this.isPrimitiveOrWrapper(simpleOrFullName)) {
                return null;
            } else if (javaInterface.fullName) {
                const pkg = javaInterface.fullName.substring(0, javaInterface.fullName.lastIndexOf('.'));
                fullName = `${pkg}.${simpleOrFullName}`;
            }
        }

        return this.indexer.getClassByFullName(fullName);
    }

    private isPrimitiveOrWrapper(type: string): boolean {
        const simpleType = type.replace(/[<>\[\]]/g, '').split('<')[0].trim();
        const primitives = [
            'byte', 'short', 'int', 'long', 'float', 'double', 'char', 'boolean',
            'Byte', 'Short', 'Integer', 'Long', 'Float', 'Double', 'Character', 'Boolean',
            'String', 'BigDecimal', 'BigInteger', 'Date', 'LocalDate', 'LocalDateTime', 'LocalTime'
        ];
        return primitives.includes(simpleType);
    }
}
