import * as vscode from 'vscode';
import { ProjectIndexer } from './ProjectIndexer';
import { JavaAstUtils } from '../utils/JavaAstUtils';
import * as fs from 'fs';
import * as path from 'path';

interface XmlFileInfo {
    uri: vscode.Uri;
    fileName: string;
    refCount: number;
    originalContent: string;
    newContent: string;
    changes: ChangeInfo[];
}

interface JavaMethodInfo {
    uri: vscode.Uri;
    fileName: string;
    refCount: number;
    originalContent: string;
    newContent: string;
    changes: ChangeInfo[];
}

interface ChangeInfo {
    line: number;
    oldText: string;
    newText: string;
}

export class PropertyRenameService {
    private lastSavedProperties: Map<string, Set<string>> = new Map();
    
    constructor(private indexer: ProjectIndexer) {}
    
    public onDocumentOpen(document: vscode.TextDocument): void {
        if (document.languageId !== 'java') return;
        this.saveCurrentProperties(document);
    }
    
    public onDocumentSave(document: vscode.TextDocument): void {
        if (document.languageId !== 'java') return;
        this.checkForRename(document);
    }
    
    private saveCurrentProperties(document: vscode.TextDocument): void {
        const info = this.getClassInfo(document.getText());
        if (info) {
            this.lastSavedProperties.set(info.fullName, info.properties);
        }
    }
    
    private getClassInfo(content: string): { fullName: string; className: string; properties: Set<string> } | null {
        const packageName = JavaAstUtils.getPackageName(content);
        const className = JavaAstUtils.getSimpleName(content);
        if (!packageName || !className) return null;
        
        const properties = new Set<string>();
        const fieldRegex = /(?:private|protected|public)\s+(?:static\s+)?(?:final\s+)?(\w+(?:<[^>]+>)?)\s+(\w+)\s*[;=]/g;
        let match;
        while ((match = fieldRegex.exec(content)) !== null) {
            properties.add(match[2]);
        }
        
        return {
            fullName: `${packageName}.${className}`,
            className,
            properties
        };
    }
    
    private async checkForRename(document: vscode.TextDocument): Promise<void> {
        const currentInfo = this.getClassInfo(document.getText());
        if (!currentInfo) return;
        
        const lastProps = this.lastSavedProperties.get(currentInfo.fullName);
        if (!lastProps) {
            this.saveCurrentProperties(document);
            return;
        }
        
        const currentProps = currentInfo.properties;
        
        const removed = [...lastProps].filter(p => !currentProps.has(p));
        const added = [...currentProps].filter(p => !lastProps.has(p));
        
        if (removed.length !== 1 || added.length !== 1) {
            this.saveCurrentProperties(document);
            return;
        }
        
        const oldName = removed[0];
        const newName = added[0];
        
        if (!this.isSimilarRename(oldName, newName)) {
            this.saveCurrentProperties(document);
            return;
        }
        
        const xmlFiles = await this.findXmlWithProperty(oldName, newName);
        const javaFiles = await this.findJavaWithMethod(oldName, newName);
        
        if (xmlFiles.length === 0 && javaFiles.length === 0) {
            vscode.window.showInformationMessage(
                `检测到属性重命名 "${oldName}" → "${newName}"，但未找到相关引用`
            );
            this.saveCurrentProperties(document);
            return;
        }
        
        const confirmed = await this.showQuickPick(oldName, newName, xmlFiles, javaFiles);
        if (confirmed) {
            await this.applyRename(xmlFiles, javaFiles);
        }
        
        this.saveCurrentProperties(document);
    }
    
    private isSimilarRename(oldName: string, newName: string): boolean {
        const oldLower = oldName.toLowerCase();
        const newLower = newName.toLowerCase();
        
        if (oldLower === newLower) return true;
        
        const prefixes = ['user', 'is', 'has', 'get', 'set'];
        for (const prefix of prefixes) {
            if (oldLower === newLower.replace(new RegExp(`^${prefix}`), '')) return true;
            if (newLower === oldLower.replace(new RegExp(`^${prefix}`), '')) return true;
        }
        
        return false;
    }
    
    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    private async findJavaWithMethod(oldName: string, newName: string): Promise<JavaMethodInfo[]> {
        const result: JavaMethodInfo[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return result;
        
        const javaFiles = await vscode.workspace.findFiles('**/*.java', '**/target/**');
        
        const oldCap = this.capitalizeFirst(oldName);
        const newCap = this.capitalizeFirst(newName);
        
        const methodPatterns = [
            { old: `get${oldCap}`, new: `get${newCap}` },
            { old: `set${oldCap}`, new: `set${newCap}` },
            { old: `is${oldCap}`, new: `is${newCap}` },
        ];
        
        for (const javaFile of javaFiles) {
            try {
                const originalContent = fs.readFileSync(javaFile.fsPath, 'utf-8');
                let newContent = originalContent;
                
                for (const pattern of methodPatterns) {
                    const methodRegex = new RegExp(`\\b(${pattern.old})\\b`, 'g');
                    newContent = newContent.replace(methodRegex, pattern.new);
                }
                
                if (originalContent !== newContent) {
                    const changes = this.findChanges(originalContent, newContent);
                    result.push({
                        uri: javaFile,
                        fileName: path.basename(javaFile.fsPath),
                        refCount: changes.length,
                        originalContent,
                        newContent,
                        changes
                    });
                }
            } catch (e) {
                // ignore
            }
        }
        
        return result;
    }
    
    private async findXmlWithProperty(oldName: string, newName: string): Promise<XmlFileInfo[]> {
        const result: XmlFileInfo[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return result;
        
        const xmlFiles = await vscode.workspace.findFiles('**/*.xml', '**/target/**');
        
        for (const xmlFile of xmlFiles) {
            try {
                const originalContent = fs.readFileSync(xmlFile.fsPath, 'utf-8');
                const newContent = this.applyRenameToContent(originalContent, oldName, newName);
                
                if (originalContent !== newContent) {
                    const changes = this.findChanges(originalContent, newContent);
                    result.push({
                        uri: xmlFile,
                        fileName: path.basename(xmlFile.fsPath),
                        refCount: changes.length,
                        originalContent,
                        newContent,
                        changes
                    });
                }
            } catch (e) {
                // ignore
            }
        }
        
        return result;
    }
    
    private applyRenameToContent(content: string, oldName: string, newName: string): string {
        let newContent = content;
        
        newContent = newContent.replace(
            new RegExp(`(property\\s*=\\s*["'])${this.escapeRegex(oldName)}(["'])`, 'g'),
            `$1${newName}$2`
        );
        
        newContent = newContent.replace(
            new RegExp(`([#\$]\\{[^}]*?)\\b${this.escapeRegex(oldName)}\\b([^}]*\\})`, 'g'),
            `$1${newName}$2`
        );
        
        let prevContent = '';
        while (prevContent !== newContent) {
            prevContent = newContent;
            newContent = newContent.replace(
                new RegExp(`(test\\s*=\\s*["'][^"']*?)\\b${this.escapeRegex(oldName)}\\b([^"']*["'])`, 'g'),
                `$1${newName}$2`
            );
        }
        
        return newContent;
    }
    
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    private findChanges(original: string, modified: string): ChangeInfo[] {
        const changes: ChangeInfo[] = [];
        const origLines = original.split('\n');
        const modLines = modified.split('\n');
        
        for (let i = 0; i < Math.max(origLines.length, modLines.length); i++) {
            if (origLines[i] !== modLines[i]) {
                changes.push({
                    line: i + 1,
                    oldText: origLines[i] || '',
                    newText: modLines[i] || ''
                });
            }
        }
        
        return changes;
    }
    
    private async showQuickPick(
        oldName: string, 
        newName: string, 
        xmlFiles: XmlFileInfo[], 
        javaFiles: JavaMethodInfo[]
    ): Promise<boolean> {
        const totalXmlChanges = xmlFiles.reduce((sum, f) => sum + f.changes.length, 0);
        const totalJavaChanges = javaFiles.reduce((sum, f) => sum + f.changes.length, 0);
        
        interface FileItem extends vscode.QuickPickItem {
            fileIndex: number;
            isFile: boolean;
            fileType: 'xml' | 'java';
        }
        
        const items: FileItem[] = [
            {
                label: '$(check) 确认更新所有文件',
                description: `XML: ${xmlFiles.length} 个文件 ${totalXmlChanges} 处 | Java: ${javaFiles.length} 个文件 ${totalJavaChanges} 处`,
                fileIndex: -1,
                isFile: false,
                fileType: 'xml',
                alwaysShow: true
            },
            {
                label: '$(x) 取消',
                description: '不进行任何修改',
                fileIndex: -2,
                isFile: false,
                fileType: 'xml',
                alwaysShow: true
            }
        ];
        
        if (xmlFiles.length > 0) {
            items.push({
                label: '',
                kind: vscode.QuickPickItemKind.Separator,
                fileIndex: -3,
                isFile: false,
                fileType: 'xml'
            });
            items.push({
                label: `$(file-code) XML 文件 (${xmlFiles.length} 个)`,
                description: `${totalXmlChanges} 处修改`,
                fileIndex: -4,
                isFile: false,
                fileType: 'xml'
            });
            
            for (let i = 0; i < xmlFiles.length; i++) {
                const file = xmlFiles[i];
                items.push({
                    label: `    $(xml) ${file.fileName}`,
                    description: `${file.changes.length} 处`,
                    detail: '点击查看修改预览',
                    fileIndex: i,
                    isFile: true,
                    fileType: 'xml'
                });
            }
        }
        
        if (javaFiles.length > 0) {
            items.push({
                label: '',
                kind: vscode.QuickPickItemKind.Separator,
                fileIndex: -5,
                isFile: false,
                fileType: 'java'
            });
            items.push({
                label: `$(code) Java 文件 (${javaFiles.length} 个)`,
                description: `${totalJavaChanges} 处修改 (getter/setter)`,
                fileIndex: -6,
                isFile: false,
                fileType: 'java'
            });
            
            for (let i = 0; i < javaFiles.length; i++) {
                const file = javaFiles[i];
                items.push({
                    label: `    $(java) ${file.fileName}`,
                    description: `${file.changes.length} 处`,
                    detail: '点击查看修改预览',
                    fileIndex: i,
                    isFile: true,
                    fileType: 'java'
                });
            }
        }
        
        return new Promise((resolve) => {
            const quickPick = vscode.window.createQuickPick<FileItem>();
            quickPick.title = `属性重命名: ${oldName} → ${newName}`;
            quickPick.placeholder = '选择操作或点击文件预览修改';
            quickPick.items = items;
            quickPick.matchOnDescription = true;
            quickPick.ignoreFocusOut = true;
            
            let resolved = false;
            let isPreviewing = false;
            
            quickPick.onDidAccept(async () => {
                const selected = quickPick.selectedItems[0];
                if (!selected) return;
                
                if (selected.isFile && selected.fileIndex >= 0) {
                    isPreviewing = true;
                    quickPick.hide();
                    
                    if (selected.fileType === 'xml') {
                        const file = xmlFiles[selected.fileIndex];
                        const tempDoc = await vscode.workspace.openTextDocument({
                            content: file.newContent,
                            language: 'xml'
                        });
                        await vscode.commands.executeCommand(
                            'vscode.diff',
                            file.uri,
                            tempDoc.uri,
                            `${file.fileName}: ${oldName} → ${newName}`
                        );
                    } else {
                        const file = javaFiles[selected.fileIndex];
                        const tempDoc = await vscode.workspace.openTextDocument({
                            content: file.newContent,
                            language: 'java'
                        });
                        await vscode.commands.executeCommand(
                            'vscode.diff',
                            file.uri,
                            tempDoc.uri,
                            `${file.fileName}: ${oldName} → ${newName}`
                        );
                    }
                    
                    await new Promise<void>(r => {
                        const disposable = vscode.window.onDidChangeActiveTextEditor(() => {
                            disposable.dispose();
                            r();
                        });
                    });
                    
                    isPreviewing = false;
                    quickPick.items = items;
                    quickPick.show();
                } else if (selected.fileIndex === -1) {
                    resolved = true;
                    quickPick.hide();
                    resolve(true);
                } else if (selected.fileIndex === -2) {
                    resolved = true;
                    quickPick.hide();
                    resolve(false);
                }
            });
            
            quickPick.onDidHide(() => {
                if (!resolved && !isPreviewing) {
                    resolved = true;
                    resolve(false);
                }
            });
            
            quickPick.show();
        });
    }
    
    private async applyRename(xmlFiles: XmlFileInfo[], javaFiles: JavaMethodInfo[]): Promise<void> {
        let totalUpdated = 0;
        
        for (const fileInfo of xmlFiles) {
            const edit = new vscode.WorkspaceEdit();
            const doc = await vscode.workspace.openTextDocument(fileInfo.uri);
            
            edit.replace(
                fileInfo.uri,
                new vscode.Range(0, 0, doc.lineCount, 0),
                fileInfo.newContent
            );
            
            const success = await vscode.workspace.applyEdit(edit);
            
            if (success) {
                const updatedDoc = await vscode.workspace.openTextDocument(fileInfo.uri);
                await updatedDoc.save();
            }
            
            totalUpdated += fileInfo.refCount;
        }
        
        for (const fileInfo of javaFiles) {
            const edit = new vscode.WorkspaceEdit();
            const doc = await vscode.workspace.openTextDocument(fileInfo.uri);
            
            edit.replace(
                fileInfo.uri,
                new vscode.Range(0, 0, doc.lineCount, 0),
                fileInfo.newContent
            );
            
            const success = await vscode.workspace.applyEdit(edit);
            
            if (success) {
                const updatedDoc = await vscode.workspace.openTextDocument(fileInfo.uri);
                await updatedDoc.save();
            }
            
            totalUpdated += fileInfo.refCount;
        }
        
        vscode.window.showInformationMessage(
            `已更新 ${xmlFiles.length + javaFiles.length} 个文件中的 ${totalUpdated} 处引用`
        );
    }
}
