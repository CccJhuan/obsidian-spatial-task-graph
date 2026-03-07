import { Plugin, WorkspaceLeaf, TFile, debounce, Notice } from 'obsidian';
import type { Edge, Viewport } from 'reactflow';
import { TaskGraphView, VIEW_TYPE_TASK_GRAPH } from './TaskGraphView';
import { TaskGraphSettingTab } from './settings';

export interface TextNodeData { id: string; text: string; x: number; y: number; }

export interface TaskCacheItem {
    id: string;
    text: string;
    notes: string;
    status: string;
    file: string;
    path: string;
    line: number;
    endLine: number;
    rawText: string;
}

export interface GraphBoard {
	id: string; name: string;
	filters: { tags: string[]; excludeTags: string[]; folders: string[]; status: string[]; tagMode?: 'AND' | 'OR'; };
	data: { layout: Record<string, { x: number, y: number }>; edges: Edge[]; nodeStatus: Record<string, string>; textNodes: TextNodeData[]; viewport?: Viewport; }
}

interface TaskGraphSettings { boards: GraphBoard[]; lastActiveBoardId: string; }

const DEFAULT_BOARD: GraphBoard = {
	id: 'default', name: 'Main board',
	filters: { tags: [], excludeTags: [], folders: [], status: [' ', '/'], tagMode: 'OR' },
	data: { layout: {}, edges: [], nodeStatus: {}, textNodes: [] }
};
const DEFAULT_SETTINGS: TaskGraphSettings = { boards: [DEFAULT_BOARD], lastActiveBoardId: 'default' };

export default class TaskGraphPlugin extends Plugin {
	settings: TaskGraphSettings;
	viewRefresh?: () => void;
    
    taskCache: Map<string, TaskCacheItem[]> = new Map();
    isCacheInitialized: boolean = false;

	debouncedRefresh = debounce(() => {
		if (this.viewRefresh) this.viewRefresh();
	}, 500, true);

	async onload() {
		await this.loadSettings();
        
        this.addSettingTab(new TaskGraphSettingTab(this.app, this));

		this.registerView(VIEW_TYPE_TASK_GRAPH, (leaf) => new TaskGraphView(leaf, this));
		this.addRibbonIcon('network', 'Open task graph', () => { void this.activateView(); });
		
        this.addCommand({ id: 'open-task-graph', name: 'Open task graph', callback: () => { void this.activateView(); } });

        this.addCommand({ 
            id: 'layout-task-graph', 
            name: 'Auto-layout task graph (smart arrange)', 
            callback: () => { 
                const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_GRAPH);
                if (leaves.length > 0) {
                    const firstLeaf = leaves[0];
                    if (firstLeaf) {
                        const view = firstLeaf.view as TaskGraphView;
                        if (view.triggerLayout) {
                            view.triggerLayout();
                        } else {
                            new Notice("Layout engine is still loading...");
                        }
                    }
                } else {
                    new Notice("Task graph is not open.");
                }
            } 
        });

		this.registerEvent(this.app.metadataCache.on('changed', (file) => {
            void this.updateFileCache(file);
        }));
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (this.taskCache.has(oldPath)) {
                const tasks = this.taskCache.get(oldPath);
                this.taskCache.delete(oldPath);
                if (tasks) this.taskCache.set(file.path, tasks);
                this.debouncedRefresh();
            }
        }));
        this.registerEvent(this.app.vault.on('delete', (file) => {
            if (this.taskCache.has(file.path)) {
                this.taskCache.delete(file.path);
                this.debouncedRefresh();
            }
        }));
        
        this.app.workspace.onLayoutReady(() => {
            void this.initializeCache();
        });
	}

    async initializeCache() {
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            await this.updateFileCache(file, false); 
        }
        this.isCacheInitialized = true;
        this.debouncedRefresh();
    }

    async updateFileCache(file: import('obsidian').TAbstractFile, triggerRefresh = true) {
        if (!(file instanceof TFile) || file.extension !== 'md') return;
        
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache || !cache.listItems) {
            if (this.taskCache.has(file.path)) {
                this.taskCache.delete(file.path);
                if (triggerRefresh && this.isCacheInitialized) this.debouncedRefresh();
            }
            return;
        }

        const content = await this.app.vault.cachedRead(file);
        const lines = content.split('\n');
        const tasks: TaskCacheItem[] = [];

        for (let i = 0; i < cache.listItems.length; i++) {
            const item = cache.listItems[i];
            if (!item || !item.task) continue;
            
            const startLine = item.position.start.line;
            let endLine = item.position.end.line;

            for (let j = i + 1; j < cache.listItems.length; j++) {
                const nextItem = cache.listItems[j];
                if (nextItem && nextItem.position.start.line <= endLine) {
                    endLine = nextItem.position.start.line - 1;
                    break;
                } else {
                    break; 
                }
            }

            const rawLineText = lines[startLine];
            if (rawLineText === undefined) continue;

            let notesText = "";
            if (endLine > startLine) {
                const notesLines = lines.slice(startLine + 1, endLine + 1);
                let minIndent = Infinity;
                for (const nl of notesLines) {
                    if (nl.trim().length === 0) continue;
                    const match = nl.match(/^\s*/);
                    if (match) minIndent = Math.min(minIndent, match[0].length);
                }
                if (minIndent < Infinity) {
                    notesText = notesLines.map(nl => nl.length >= minIndent ? nl.substring(minIndent) : nl).join('\n');
                } else {
                    notesText = notesLines.join('\n');
                }
            }

            let stableId = "";
            const blockIdMatch = rawLineText.match(/\s\^([a-zA-Z0-9-]+)$/);
            
            if (blockIdMatch && blockIdMatch[1]) {
                stableId = `${file.path}::^${blockIdMatch[1]}`; 
            } else {
                const baseText = rawLineText.replace(/- \[[x\s/bc!-]\]\s/, '').trim();
                const cleanText = baseText.replace(/ ✅ \d{4}-\d{2}-\d{2}/, '').trim();
                const textHash = cleanText.substring(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
                stableId = `${file.path}::#${textHash}`; 
                
                let counter = 0;
                while(tasks.some(t => t.id === stableId)) { 
                    counter++; 
                    stableId = `${file.path}::#${textHash}_${counter}`; 
                }
            }

            const displayText = rawLineText.replace(/- \[[x\s/bc!-]\]\s/, '').replace(/\s\^([a-zA-Z0-9-]+)$/, '').trim();

            tasks.push({
                id: stableId,
                text: displayText,
                notes: notesText,
                status: item.task,
                file: file.basename,
                path: file.path,
                line: startLine,
                endLine: endLine,
                rawText: rawLineText
            });
        }

        this.taskCache.set(file.path, tasks);
        if (triggerRefresh && this.isCacheInitialized) {
            this.debouncedRefresh();
        }
    }

	onunload() { }

	async loadSettings() {
        // 使用类型断言将 any 显式收敛为我们的目标类型
        const loadedData = (await this.loadData()) as Partial<TaskGraphSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
		if (!this.settings.boards || this.settings.boards.length === 0) {
			this.settings.boards = [DEFAULT_BOARD];
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_TASK_GRAPH);
		if (leaves.length > 0) {
            const firstLeaf = leaves[0];
            if (firstLeaf) {
                leaf = firstLeaf;
            }
        } else {
            // 【修改点】：使用 getLeaf('tab') 在中间的主工作区创建一个新的标签页
            const centerLeaf = workspace.getLeaf('tab');
            if (centerLeaf) {
                leaf = centerLeaf;
                await leaf.setViewState({ type: VIEW_TYPE_TASK_GRAPH, active: true });
            }
        }
        // 显式等待视图被激活和渲染
		if (leaf) await workspace.revealLeaf(leaf);
	}

	async ensureBlockId(boardId: string, taskId: string): Promise<string> {
		if (taskId.includes('::^')) return taskId; 
		const parts = taskId.split('::#');
		const filePath = parts[0];
		if (!filePath) return taskId;

		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return taskId;

		try {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache || !cache.listItems) return taskId;
			
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');
			const targetTaskObj = this.getTasks(boardId).find(t => t.id === taskId);
			if (!targetTaskObj) return taskId;

			const lineNumber = targetTaskObj.line;
            const originalLine = lines[lineNumber];
			if (originalLine === undefined) return taskId;

			const randomBlockId = Math.random().toString(36).substring(2, 8);
			lines[lineNumber] = `${originalLine.trimEnd()} ^${randomBlockId}`;
			await this.app.vault.modify(file, lines.join('\n'));
			
			return `${filePath}::^${randomBlockId}`;
		} catch(err) { 
            console.error("TaskGraph Plugin Error ensuring block ID:", err);
            return taskId; 
        }
	}

	async updateTaskContent(filePath: string, startLine: number, endLine: number, newText: string) {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return;
		try {
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');
			if (startLine >= lines.length) return;
			
			const originalLine = lines[startLine];
            if (originalLine === undefined) return; 

            const lineRegex = /^(\s*- \[[x\s/bc!-]\]\s)?(.*?)(?:\s+(\^[a-zA-Z0-9-]+))?$/;
            const originalMatch = originalLine.match(lineRegex);

            const prefix = originalMatch && originalMatch[1] ? originalMatch[1] : '- [ ] ';
            const existingBlockId = originalMatch && originalMatch[3] ? originalMatch[3] : '';

            const newTextLines = newText.split('\n');
            const firstLine = newTextLines[0] || '';
            const cleanNewTitle = firstLine.replace(/(?:\s+\^[a-zA-Z0-9-]+)+$/, '').trim();
            const newNotes = newTextLines.slice(1);

            const finalBlockIdStr = existingBlockId ? ` ${existingBlockId}` : '';
            const newFirstLine = `${prefix}${cleanNewTitle}${finalBlockIdStr}`;

            const baseIndentMatch = prefix.match(/^\s*/);
            const baseIndent = baseIndentMatch ? baseIndentMatch[0] : '';
            const noteIndent = baseIndent + '\t';

            const formattedNotes = newNotes.map(n => n.trim() === '' ? '' : `${noteIndent}${n.trim()}`);
            const replacement = [newFirstLine, ...formattedNotes];

            lines.splice(startLine, endLine - startLine + 1, ...replacement);

			await this.app.vault.modify(file, lines.join('\n'));
		} catch (err) { 
            console.error("TaskGraph Plugin Error updating task content:", err); 
        }
	}

	async appendTaskToFile(filePath: string, taskText: string): Promise<string | null> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return null;
		try {
			const content = await this.app.vault.read(file);
			const prefix = content.endsWith('\n') ? '' : '\n';
            
            const cleanText = taskText.replace(/(?:\s+\^[a-zA-Z0-9-]+)+$/, '').trim();
            const randomBlockId = Math.random().toString(36).substring(2, 8);
			
            const newTaskLine = `- [ ] ${cleanText} ^${randomBlockId}`;
			
            await this.app.vault.append(file, `${prefix}${newTaskLine}`);
            
            return `${filePath}::^${randomBlockId}`;
		} catch (err) { 
            console.error("TaskGraph Plugin Error appending task:", err);
            return null; 
        }
	}

	async saveBoardData(boardId: string, data: Partial<GraphBoard['data']>) {
		const boardIndex = this.settings.boards.findIndex(b => b.id === boardId);
		if (boardIndex === -1) return;
        const board = this.settings.boards[boardIndex];
        if (!board) return; 
		board.data = { ...board.data, ...data };
		await this.saveSettings();
	}

	async updateBoardConfig(boardId: string, config: Partial<GraphBoard>) {
		const boardIndex = this.settings.boards.findIndex(b => b.id === boardId);
		if (boardIndex === -1) return;
		this.settings.boards[boardIndex] = { ...this.settings.boards[boardIndex], ...config } as GraphBoard;
		await this.saveSettings();
	}

	getTasks(boardId: string): TaskCacheItem[] {
        if (!this.isCacheInitialized) return [];

		const board = this.settings.boards.find(b => b.id === boardId) || this.settings.boards[0];
        if (!board) return [];

		const filters = board.filters;
        
		const connectedTaskIds = new Set<string>();
		board.data.edges.forEach((e: Edge) => { 
			connectedTaskIds.add(e.source);
			connectedTaskIds.add(e.target);
		});

        const allTasks: TaskCacheItem[] = []; 

        for (const [path, fileTasks] of this.taskCache.entries()) {
            
            if (filters.folders.length > 0 && !filters.folders.some(folder => path.startsWith(folder))) {
                continue;
            }

            for (const t of fileTasks) {
                const isConnected = connectedTaskIds.has(t.id);
                
                if (!isConnected && filters.status.length > 0 && !filters.status.includes(t.status)) continue;
                
                if (filters.tags.length > 0) {
                    const tagMode = filters.tagMode || 'OR';
                    if (tagMode === 'OR') {
                        if (!filters.tags.some(tag => t.rawText.includes(tag))) continue;
                    } else {
                        if (!filters.tags.every(tag => t.rawText.includes(tag))) continue;
                    }
                }

                if (filters.excludeTags.length > 0 && filters.excludeTags.some(tag => t.rawText.includes(tag))) continue;

                allTasks.push(t);
            }
        }

		return allTasks;
	}
}