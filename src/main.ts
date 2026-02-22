import { App, Plugin, WorkspaceLeaf, TFile } from 'obsidian';
import { TaskGraphView, VIEW_TYPE_TASK_GRAPH } from './TaskGraphView';

export interface TextNodeData { id: string; text: string; x: number; y: number; }

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
	viewRefresh?: () => void;

	async onload() {
		await this.loadSettings();
		this.registerView(VIEW_TYPE_TASK_GRAPH, (leaf) => new TaskGraphView(leaf, this));
		this.addRibbonIcon('network', 'Open Task Graph', () => { this.activateView(); });
		this.addCommand({ id: 'open-task-graph', name: 'Open Task Graph', callback: () => { this.activateView(); } });
		
        // 🌟 移除空的设置界面，保持插件轻量
		// this.addSettingTab(new TaskGraphSettingTab(this.app, this));

        // 监听文件变化，自动刷新视图
		this.registerEvent(
			this.app.metadataCache.on('changed', () => {
				if (this.viewRefresh) this.viewRefresh();
			})
		);
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

                // 🌟 核心升级：双轨制稳定 ID 系统
                let stableId = "";
                // 1. 优先寻找 Obsidian 原生 Block ID (如 ^1a2b3c)
                const blockIdMatch = lineText.match(/\s\^([a-zA-Z0-9\-]+)$/);
                
                if (blockIdMatch) {
                    // 如果存在块 ID，这是最绝对稳定的，随便你怎么改文字都不会变
                    stableId = `${file.path}::${blockIdMatch[1]}`;
                } else {
                    // 2. 兜底逻辑：纯文本哈希 (过滤掉日期、标签等易变元素)
                    const baseText = lineText.replace(/- \[[x\s\/bc!-]\]\s/, '').trim();
                    const cleanText = baseText.replace(/ ✅ \d{4}-\d{2}-\d{2}/, '').trim();
                    const textHash = cleanText.substring(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
                    stableId = `${file.path}::${textHash}`;
                    
                    // 处理完全重复的文本
                    let counter = 0;
                    while(tasks.some(t => t.id === stableId)) { counter++; stableId = `${file.path}::${textHash}_${counter}`; }
                }

                // 提取展示用的纯文本（去除结尾的 Block ID，让图谱里看起来干净）
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
            
            // 🌟 保护机制：如果原行有块 ID，在更新文本时保留它
            const blockIdMatch = originalLine.match(/(\s\^[a-zA-Z0-9\-]+)$/);
            const blockIdStr = blockIdMatch ? blockIdMatch[1] : '';

			const match = originalLine.match(/^(\s*- \[[x\s\/bc!-]\]\s)/);
			if (match) {
                // 将 checkbox、新文本、原有的块ID拼回去
                lines[lineNumber] = match[1] + newText + blockIdStr;
            } else {
                lines[lineNumber] = newText + blockIdStr;
            }
			await this.app.vault.modify(file, lines.join('\n'));
		} catch (e) { console.error(e); }
	}

	async appendTaskToFile(filePath: string, taskText: string): Promise<string | null> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return null;
		try {
			const content = await this.app.vault.read(file);
			const prefix = content.endsWith('\n') ? '' : '\n';
            
            // 🌟 自动注入机制：插件创建的任务，天生带有随机块 ID
            const randomBlockId = Math.random().toString(36).substring(2, 8); // 生成类似 1a2b3c 的 6 位标识符
			const newTaskLine = `- [ ] ${taskText} ^${randomBlockId}`;
			await this.app.vault.append(file, `${prefix}${newTaskLine}`);
            
            // 直接返回带块 ID 的绝对稳定标识
            return `${filePath}::${randomBlockId}`;
		} catch (e) { return null; }
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
	}
	async saveSettings() { await this.saveData(this.settings); }
}