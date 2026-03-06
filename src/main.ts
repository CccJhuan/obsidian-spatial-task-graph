import { Plugin, WorkspaceLeaf, TFile, debounce, Notice } from 'obsidian';
import { TaskGraphView, VIEW_TYPE_TASK_GRAPH } from './TaskGraphView';
import { TaskGraphSettingTab } from './settings';

export interface TextNodeData { id: string; text: string; x: number; y: number; }

export interface GraphBoard {
	id: string; name: string;
	filters: { tags: string[]; excludeTags: string[]; folders: string[]; status: string[]; };
	data: { layout: Record<string, { x: number, y: number }>; edges: any[]; nodeStatus: Record<string, string>; textNodes: TextNodeData[]; viewport?: { x: number; y: number; zoom: number }; }
}

interface TaskGraphSettings { boards: GraphBoard[]; lastActiveBoardId: string; }

const DEFAULT_BOARD: GraphBoard = {
	id: 'default', name: 'Main Board',
	filters: { tags: [], excludeTags: [], folders: [], status: [' ', '/'] },
	data: { layout: {}, edges: [], nodeStatus: {}, textNodes: [] }
};
const DEFAULT_SETTINGS: TaskGraphSettings = { boards: [DEFAULT_BOARD], lastActiveBoardId: 'default' };

export default class TaskGraphPlugin extends Plugin {
	settings: TaskGraphSettings;
	viewRefresh?: () => void;
    
    taskCache: Map<string, any[]> = new Map();
    isCacheInitialized: boolean = false;

	debouncedRefresh = debounce(() => {
		if (this.viewRefresh) this.viewRefresh();
	}, 500, true);

	async onload() {
		await this.loadSettings();
        
        this.addSettingTab(new TaskGraphSettingTab(this.app, this));

		this.registerView(VIEW_TYPE_TASK_GRAPH, (leaf) => new TaskGraphView(leaf, this));
		this.addRibbonIcon('network', 'Open Task Graph', () => { this.activateView(); });
		
        // 注册打开视图的命令
        this.addCommand({ id: 'open-task-graph', name: 'Open Task Graph', callback: () => { this.activateView(); } });

        // 【全新升级】：注册全局自动排版快捷键入口
        this.addCommand({ 
            id: 'layout-task-graph', 
            name: 'Auto-layout Task Graph (Smart Arrange)', 
            callback: () => { 
                const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_GRAPH);
                if (leaves.length > 0) {
                    // 【核心修复】：将索引访问提取为变量，并进行显式真值校验，完美消除 TS 严格模式报错
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
                    new Notice("Task Graph is not open.");
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
        const tasks: any[] = [];

        for (const item of cache.listItems) {
            if (!item.task) continue;
            
            const lineText = lines[item.position.start.line];
            if (lineText === undefined) continue;

            let stableId = "";
            const blockIdMatch = lineText.match(/\s\^([a-zA-Z0-9\-]+)$/);
            
            if (blockIdMatch && blockIdMatch[1]) {
                stableId = `${file.path}::^${blockIdMatch[1]}`; 
            } else {
                const baseText = lineText.replace(/- \[[x\s\/bc!-]\]\s/, '').trim();
                const cleanText = baseText.replace(/ ✅ \d{4}-\d{2}-\d{2}/, '').trim();
                const textHash = cleanText.substring(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
                stableId = `${file.path}::#${textHash}`; 
                
                let counter = 0;
                while(tasks.some(t => t.id === stableId)) { 
                    counter++; 
                    stableId = `${file.path}::#${textHash}_${counter}`; 
                }
            }

            const displayText = lineText.replace(/- \[[x\s\/bc!-]\]\s/, '').replace(/\s\^([a-zA-Z0-9\-]+)$/, '').trim();

            tasks.push({
                id: stableId,
                text: displayText,
                status: item.task,
                file: file.basename,
                path: file.path,
                line: item.position.start.line,
                rawText: lineText
            });
        }

        this.taskCache.set(file.path, tasks);
        if (triggerRefresh && this.isCacheInitialized) {
            this.debouncedRefresh();
        }
    }

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({ type: VIEW_TYPE_TASK_GRAPH, active: true });
            }
        }
		if (leaf) workspace.revealLeaf(leaf);
	}

	async ensureBlockId(boardId: string, taskId: string): Promise<string> {
		if (taskId.includes('::^')) return taskId; 
		const [filePath] = taskId.split('::#');
		if (!filePath) return taskId;

		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return taskId;

		try {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache || !cache.listItems) return taskId;
			
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');
			const targetTaskObj = (await this.getTasks(boardId)).find(t => t.id === taskId);
			if (!targetTaskObj) return taskId;

			const lineNumber = targetTaskObj.line;
            const originalLine = lines[lineNumber];
			if (originalLine === undefined) return taskId;

			const randomBlockId = Math.random().toString(36).substring(2, 8);
			lines[lineNumber] = `${originalLine.trimEnd()} ^${randomBlockId}`;
			await this.app.vault.modify(file, lines.join('\n'));
			
			return `${filePath}::^${randomBlockId}`;
		} catch(e) { 
            console.error("TaskGraph Plugin Error ensuring block ID:", e);
            return taskId; 
        }
	}

	async updateTaskContent(filePath: string, lineNumber: number, newText: string) {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return;
		try {
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');
			if (lineNumber >= lines.length) return;
			
			const originalLine = lines[lineNumber];
            if (originalLine === undefined) return; 

            const lineRegex = /^(\s*- \[[x\s\/bc!-]\]\s)?(.*?)(?:\s+(\^[a-zA-Z0-9\-]+))?$/;
            const originalMatch = originalLine.match(lineRegex);

            const prefix = originalMatch && originalMatch[1] ? originalMatch[1] : '- [ ] ';
            const existingBlockId = originalMatch && originalMatch[3] ? originalMatch[3] : '';

            const cleanNewText = newText.replace(/(?:\s+\^[a-zA-Z0-9\-]+)+$/, '').trim();

            const finalBlockIdStr = existingBlockId ? ` ${existingBlockId}` : '';
            lines[lineNumber] = `${prefix}${cleanNewText}${finalBlockIdStr}`;

			await this.app.vault.modify(file, lines.join('\n'));
		} catch (e) { 
            console.error("TaskGraph Plugin Error updating task content:", e); 
        }
	}

	async appendTaskToFile(filePath: string, taskText: string): Promise<string | null> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return null;
		try {
			const content = await this.app.vault.read(file);
			const prefix = content.endsWith('\n') ? '' : '\n';
            
            const cleanText = taskText.replace(/(?:\s+\^[a-zA-Z0-9\-]+)+$/, '').trim();
            const randomBlockId = Math.random().toString(36).substring(2, 8);
			
            const newTaskLine = `- [ ] ${cleanText} ^${randomBlockId}`;
			
            await this.app.vault.append(file, `${prefix}${newTaskLine}`);
            
            return `${filePath}::^${randomBlockId}`;
		} catch (e) { 
            console.error("TaskGraph Plugin Error appending task:", e);
            return null; 
        }
	}

	async saveBoardData(boardId: string, data: Partial<GraphBoard['data']>) {
		const boardIndex = this.settings.boards.findIndex(b => b.id === boardId);
		if (boardIndex === -1) return;
        const board = this.settings.boards[boardIndex];
        if (!board) return; 
		const currentData = board.data;
		if (data.layout) currentData.layout = data.layout;
		if (data.edges) currentData.edges = data.edges;
		if (data.nodeStatus) currentData.nodeStatus = data.nodeStatus;
		if (data.textNodes) currentData.textNodes = data.textNodes;
        if (data.viewport) currentData.viewport = data.viewport;
		await this.saveSettings();
	}

	async updateBoardConfig(boardId: string, config: Partial<GraphBoard>) {
		const boardIndex = this.settings.boards.findIndex(b => b.id === boardId);
		if (boardIndex === -1) return;
		this.settings.boards[boardIndex] = { ...this.settings.boards[boardIndex], ...config } as GraphBoard;
		await this.saveSettings();
	}

	getTasks(boardId: string) {
        if (!this.isCacheInitialized) return [];

		const board = this.settings.boards.find(b => b.id === boardId) || this.settings.boards[0];
        if (!board) return [];

		const filters = board.filters;
        
		const connectedTaskIds = new Set<string>();
		board.data.edges.forEach((e: any) => {
			connectedTaskIds.add(e.source);
			connectedTaskIds.add(e.target);
		});

        const allTasks: any[] = [];

        for (const [path, fileTasks] of this.taskCache.entries()) {
            
            if (filters.folders.length > 0 && !filters.folders.some(folder => path.startsWith(folder))) {
                continue;
            }

            for (const t of fileTasks) {
                const isConnected = connectedTaskIds.has(t.id);
                
                if (!isConnected && filters.status.length > 0 && !filters.status.includes(t.status)) continue;
                
                if (filters.tags.length > 0) {
                    const tagMode = (filters as any).tagMode || 'OR';
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