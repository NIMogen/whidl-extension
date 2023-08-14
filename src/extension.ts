import * as vscode from "vscode";
import { quote } from "shell-quote";


export const isWin32: () => boolean = () => process.platform === "win32";
export const isCmdExeShell: () => boolean = () => vscode.env.shell.endsWith("cmd.exe");
export const isPowershell: () => boolean = () =>
  ["powershell.exe", "pwsh.exe", "pwsh"].some((p) => vscode.env.shell.endsWith(p));
export const isVersion5Powershell = (): boolean =>
  ["powershell.exe"].some((p) => vscode.env.shell.endsWith(p));

// Normalizes the filepath if on a windows platform
function normalizeFilePath(filePath: string): string {
    if (isWin32()) {
      return filePath.replace(/\\/g, "/");
    }
    return filePath;
}
// More filepath stuff for the windows platform
function quoteWindowsPath(path: string, isExe: boolean): string {
    if (/\s/.test(path)) {
        if (isCmdExeShell()) {
            path = `"${path}"`;
        } else if (isPowershell() && isExe) {
            path = `& '${path}'`;
        } else {
            path = `'${path}'`;
        }
    }
    return path;
}
// Run func with the currently active editor. Displays error if no editor is active
function withEditor(func: (vscodeEditor: vscode.TextEditor) => void): void {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      func(editor);
    } else {
      vscode.window.showErrorMessage("A file must be opened before you can do that");
    }
}
// Run func on the file in the currently active editor
function withFilePath(func: (filePath: string) => void): void {
    withEditor((editor: vscode.TextEditor) => func(normalizeFilePath(editor.document.fileName)));
}
// Convenience function for getting a default value if no val exists in map for key
function getOrDefault<K, V>(map: Map<K, V>, key: K, getDefault: () => V): V {
    const value = map.get(key);
    if (value) {
        return value;
    }
    const def = getDefault();
    map.set(key, def);
    return def;
}
// Create a terminal for command output
export function createTerminal(filePath: string | null): vscode.Terminal {
    let terminal;
    if (filePath) {
      terminal = vscode.window.createTerminal("Whidl Output");
    } else {
      terminal = vscode.window.createTerminal("Whidl Output");
    }
    terminal.show();
    return terminal;
}
// Run provided command with filePath argument in a terminal window
function runFileInTerminal(
    command: string[],
    filePath: string,
    terminal: vscode.Terminal,
    ): void {
    terminal.show();

    if (isWin32()) {
        terminal.sendText(isPowershell() || isCmdExeShell() ? `cls` : `clear`);
        const exePath = quoteWindowsPath(command[0], true);
        filePath = quoteWindowsPath(filePath, false);
        terminal.sendText(`${exePath} ${command.slice(1).join(" ")} ${filePath}`);
    } else {
        terminal.sendText(`clear`);
        terminal.sendText(quote([...command, filePath]));
    }
}
// Save contents of editor before running function f
function saveActiveTextEditorAndRun(f: () => void) {
    vscode.window.activeTextEditor?.document?.save().then(() => f());
}
// Driver for the checkFile command
function checkFile(terminals: Map<string, vscode.Terminal>): void {
    withFilePath((filePath: string) => {
        let terminal: vscode.Terminal;
        let command = ['whidl', 'check', '--top-level-file'];
        terminal = getOrDefault(terminals, filePath, () => createTerminal(filePath));
        saveActiveTextEditorAndRun(() => runFileInTerminal(command, filePath, terminal));
    });
}
// Driver for the testFile command
function testFile(terminals: Map<string, vscode.Terminal>): void {
    withFilePath((filePath: string) => {
        let terminal: vscode.Terminal;
        let testFile = filePath.replace(".hdl", ".tst");
        if (testFile == filePath) { 
            vscode.window.showErrorMessage(`Extension Error: no match for .hdl file in filepath ${filePath}`);
            return;
        }
        let command = ['whidl', 'test', '--test-file'];
        terminal = getOrDefault(terminals, filePath, () => createTerminal(filePath));
        saveActiveTextEditorAndRun(() => runFileInTerminal(command, testFile, terminal));
    });
}

export function activate(context: vscode.ExtensionContext): void {
    const terminals: Map<string, vscode.Terminal> = new Map();
    vscode.window.onDidCloseTerminal((terminal) => {
        terminals.forEach((val, key) => val === terminal && terminals.delete(key) && val.dispose());
    });

    // Only commands for testing and checking the file are present atm
    const runFileCmd = vscode.commands.registerCommand(`whidl.checkFile`, () => checkFile(terminals));
    const testFileCmd = vscode.commands.registerCommand(`whidl.testFile`, () => testFile(terminals));
    context.subscriptions.push(runFileCmd);
    context.subscriptions.push(testFileCmd);
}
