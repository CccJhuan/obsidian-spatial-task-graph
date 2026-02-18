import { App, Plugin, PluginSettingTab, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import { TaskGraphView, VIEW_TYPE_TASK_GRAPH } from './TaskGraphView';

export interface TextNodeData {
	id: string; text: string; x: number; y: number;
}

export interface GraphBoard {
	id: string; name: string;
	filters: { tags: string[]; excludeTags: string[]; folders: string[]; status: string[]; };
	data: { layout: Record<string, { x: number, y: number }>; edges: any[]; nodeStatus: Record<string, string>; textNodes: TextNodeData[]; }
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

	async onload() {
		await this.loadSettings();
		this.registerView(VIEW_TYPE_TASK_GRAPH, (leaf) => new TaskGraphView(leaf, this));
		this.addRibbonIcon('network', 'Open Task Graph', () => { this.activateView(); });
		this.addCommand({ id: 'open-task-graph', name: 'Open Task Graph', callback: () => { this.activateView(); } });
		this.addSettingTab(new TaskGraphSettingTab(this.app, this));
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_TASK_GRAPH);
		if (leaves.length > 0) { leaf = leaves[0]; workspace.revealLeaf(leaf); } 
		else { leaf = workspace.getLeaf('tab'); await leaf.setViewState({ type: VIEW_TYPE_TASK_GRAPH, active: true }); workspace.revealLeaf(leaf); }
	}

	async getTasks(boardId: string) {
		const board = this.settings.boards.find(b => b.id === boardId) || this.settings.boards[0];
		const filters = board.filters;
		const files = this.app.vault.getMarkdownFiles();
		const tasks = [];
		let candidateFiles = files;
		
		if (filters.folders.length > 0) { candidateFiles = files.filter(f => filters.folders.some(folder => f.path.startsWith(folder))); }

		for (const file of candidateFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache || !cache.listItems) continue;
			const content = await this.app.vault.cachedRead(file);
			const lines = content.split('\n');
			for (const item of cache.listItems) {
				if (!item.task) continue;
				if (filters.status.length > 0 && !filters.status.includes(item.task)) continue;
				const lineText = lines[item.position.start.line];
				if (filters.tags.length > 0 && !filters.tags.some(tag => lineText.includes(tag))) continue;
				if (filters.excludeTags.length > 0 && filters.excludeTags.some(tag => lineText.includes(tag))) continue;

				tasks.push({
					id: `${file.path}-${item.position.start.line}`,
					text: lineText.replace(/- \[.\] /, '').trim(),
					status: item.task,
					file: file.basename,
					path: file.path,
					line: item.position.start.line,
					rawText: lineText
				});
			}
		}
		return tasks;
	}

	async updateTaskContent(filePath: string, lineNumber: number, newText: string) {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return;
		try {
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');
			if (lineNumber >= lines.length) return;
			const originalLine = lines[lineNumber];
			const match = originalLine.match(/^(\s*- \[[x\s\/bc!-]\]\s)(.*)/);
			if (match) lines[lineNumber] = match[1] + newText;
			else lines[lineNumber] = newText;
			await this.app.vault.modify(file, lines.join('\n'));
			new Notice("Task updated!");
		} catch (e) { console.error(e); new Notice("Failed to update task."); }
	}

	// 🌟 新增：在文件末尾追加新任务，并返回新节点的 ID
	async appendTaskToFile(filePath: string, taskText: string): Promise<string | null> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) { new Notice("Source file not found!"); return null; }
		
		try {
			const content = await this.app.vault.read(file);
			// 确保有换行符
			const prefix = content.endsWith('\n') ? '' : '\n';
			const newTaskLine = `- [ ] ${taskText}`;
			await this.app.vault.append(file, `${prefix}${newTaskLine}`);
			
			// 计算新 ID：路径 + 行号 (旧行数)
			const oldLineCount = content.split('\n').length;
			const newLineIndex = content.endsWith('\n') ? oldLineCount : oldLineCount; 
			// 注意：这只是一个极其简化的 ID 预测。在并发高时可能不准，但对于个人使用足够。
			// 因为 Dataview 索引有延迟，我们先生成一个临时的 ID 或者是基于物理位置的 ID。
			// 最稳妥的是等待 Cache 更新，但这太慢。我们假设追加到了最后一行。
			
			// Obsidian 的行号从 0 开始。
			// 如果原文件有 10 行 (0-9)，追加后新行是 10。
			const newId = `${filePath}-${newLineIndex}`; 
			return newId;
		} catch (e) {
			console.error(e);
			new Notice("Failed to create task.");
			return null;
		}
	}

	async saveBoardData(boardId: string, data: Partial<GraphBoard['data']>) {
		const boardIndex = this.settings.boards.findIndex(b => b.id === boardId);
		if (boardIndex === -1) return;
		const currentData = this.settings.boards[boardIndex].data;
		if (data.layout) currentData.layout = data.layout;
		if (data.edges) currentData.edges = data.edges;
		if (data.nodeStatus) currentData.nodeStatus = data.nodeStatus;
		if (data.textNodes) currentData.textNodes = data.textNodes;
		await this.saveSettings();
	}

	async updateBoardConfig(boardId: string, config: Partial<GraphBoard>) {
		const boardIndex = this.settings.boards.findIndex(b => b.id === boardId);
		if (boardIndex === -1) return;
		this.settings.boards[boardIndex] = { ...this.settings.boards[boardIndex], ...config };
		await this.saveSettings();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		if (!this.settings.boards || this.settings.boards.length === 0) this.settings.boards = [DEFAULT_BOARD];
		this.settings.boards.forEach(b => {
			if (!b.data.nodeStatus) b.data.nodeStatus = {};
			if (!b.data.textNodes) b.data.textNodes = [];
		});
	}

	async saveSettings() { await this.saveData(this.settings); }
}

class TaskGraphSettingTab extends PluginSettingTab {
	plugin: TaskGraphPlugin;
	constructor(app: App, plugin: TaskGraphPlugin) { super(app, plugin); this.plugin = plugin; }
	display(): void { this.containerEl.empty(); this.containerEl.createEl('h2', { text: 'Task Graph Settings' }); }
}