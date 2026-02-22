import { Plugin, WorkspaceLeaf, TFile } from 'obsidian';
// 假设你有这些导入，如果没有请保留你原有的
import { TaskGraphView, VIEW_TYPE_TASK_GRAPH } from './TaskGraphView';
import { TaskGraphSettingTab } from './settings';

// ============================================================================
// 1. 数据契约定义 (彻底解决 TS7034, TS7005 报错)
// ============================================================================

export interface TaskNode {
    id: string;
    line: number;
    filePath: string;
    text?: string;
}

export interface GraphBoard {
    id: string;
    name: string;
    filters: {
        tags: string[];
        excludeTags: string[];
        folders: string[];
        status: string[];
    };
    data: {
        layout: Record<string, { x: number; y: number }>;
        edges: any[];
        nodeStatus: Record<string, string>;
        textNodes: any[]; // 如果你有 TextNodeData 接口，替换 any
    };
}

export interface TaskGraphSettings {
    boards: GraphBoard[];
	lastActiveBoardId: string; // 补全这个字段
}

const DEFAULT_SETTINGS: TaskGraphSettings = {
    boards: [],
	lastActiveBoardId: 'default'
};

// ============================================================================
// 2. 插件主类
// ============================================================================

export default class SpatialTaskGraphPlugin extends Plugin {
    settings: TaskGraphSettings;
	viewRefresh?: () => void; // 补全刷新回调

    async onload() {
        console.log('Loading Spatial Task Graph...'); // 替换了原本的 sample 文本

        await this.loadSettings();

        this.registerView(
            VIEW_TYPE_TASK_GRAPH,
            (leaf) => new TaskGraphView(leaf, this)
        );

        // 注册设置面板
        this.addSettingTab(new TaskGraphSettingTab(this.app, this));
    }

    onunload() {
        console.log('Unloading Spatial Task Graph...');
    }

    // ============================================================================
    // 3. 核心方法修复 (彻底解决 TS18048, TS2532 可能为空的报错)
    // ============================================================================

    // 修复 TS2322 & TS2345：WorkspaceLeaf 可能为空的问题 (Line 42)
    async activateView() {
        const { workspace } = this.app;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_TASK_GRAPH);
        let leaf: WorkspaceLeaf | null = null;

        if (leaves.length > 0) {
            leaf = leaves[0] ?? null;
        } else {
            leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
            await leaf.setViewState({ type: VIEW_TYPE_TASK_GRAPH, active: true });
        }

        // 建立空值防线
        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    // 修复 TS18048：board 和 lineText 可能为空的问题 (Line 48 - 85)
    parseTasksFromLines(boardId: number, file: TFile, lines: string[]): TaskNode[] {
        const board = this.settings.boards[boardId];
        if (!board) return []; // 防线：如果 board 不存在，直接返回空数组

        const filters = board.filters;
        const tasks: TaskNode[] = []; // 显式声明类型，解决 implicitly any[] 报错
        let counter = 0;

        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];
            if (typeof lineText !== 'string') continue; // 防线：确保是字符串

            // 安全地调用 includes 和 match
            if (filters.tags.length > 0 && !filters.tags.some(tag => lineText.includes(tag))) continue;
            if (filters.excludeTags.length > 0 && filters.excludeTags.some(tag => lineText.includes(tag))) continue;

            const blockIdMatch = lineText.match(/\s\^([a-zA-Z0-9\-]+)$/);
            const baseText = lineText.replace(/- \[[x\s\/bc!-]\]\s/, '').trim();
            
            const textHash = "hash_placeholder"; // 请替换为你真实的哈希逻辑
            let stableId = `${file.path}::#${textHash}_${counter}`;

            while (tasks.some(t => t.id === stableId)) { 
                counter++; 
                stableId = `${file.path}::#${textHash}_${counter}`; 
            }

            const displayText = lineText.replace(/- \[[x\s\/bc!-]\]\s/, '').replace(/\s\^([a-zA-Z0-9\-]+)$/, '').trim();

            tasks.push({
                id: stableId,
                line: i,
                filePath: file.path,
                text: displayText
            });
        }
        return tasks;
    }

    // 修复 TS2532：修改文件行内容时未验证对象 (Line 119 - 120)
    appendBlockIdToLine(lines: string[], task: TaskNode, randomBlockId: string) {
        const targetLine = lines[task.line];
        // 防线：必须确保 targetLine 存在且为字符串
        if (typeof targetLine === 'string' && !targetLine.match(/\s\^([a-zA-Z0-9\-]+)$/)) {
            lines[task.line] = targetLine.trimEnd() + ` ^${randomBlockId}`;
        }
    }

    // 修复 TS18048：画布节点与连线更新时的 undefined 报错 (Line 132 - 144)
    migrateNodeId(boardId: number, nodeId: string, newId: string) {
        const board = this.settings.boards[boardId];
        // 防线：深度检查 data 对象是否存在
        if (!board || !board.data) return;

        board.data.edges.forEach((e: any) => {
            if (e.source === nodeId) e.source = newId;
            if (e.target === nodeId) e.target = newId;
        });

        if (board.data.layout[nodeId]) {
            board.data.layout[newId] = board.data.layout[nodeId];
            delete board.data.layout[nodeId];
        }

        if (board.data.nodeStatus[nodeId]) {
            board.data.nodeStatus[newId] = board.data.nodeStatus[nodeId];
            delete board.data.nodeStatus[nodeId];
        }
    }

    // 修复 TS18048：正则匹配时 originalLine 可能为空 (Line 161 - 164)
    processOriginalLine(originalLine: string | undefined) {
        if (!originalLine) return null; // 防线
        
        const blockIdMatch = originalLine.match(/(\s\^[a-zA-Z0-9\-]+)$/);
        const match = originalLine.match(/^(\s*- \[[x\s\/bc!-]\]\s)/);
        return { blockIdMatch, match };
    }

    // 修复 TS2322：设置更新时的解构赋值类型丢失问题 (Line 189 - 200)
    async updateBoardConfig(boardId: string, config: Partial<GraphBoard>) {
        // 1. 先找到该 boardId 在数组中的真实数字索引
        const boardIndex = this.settings.boards.findIndex(b => b.id === boardId);
        if (boardIndex === -1) return;

        // 2. 提取数据
        const board = this.settings.boards[boardIndex];
        
        // 3. 终极防线：满足 TypeScript 的 noUncheckedIndexedAccess 检查
        if (!board) return;

        // 4. 合并数据
        this.settings.boards[boardIndex] = {
            ...board,
            ...config,
            id: config.id ?? board.id,
            name: config.name ?? board.name,
            filters: config.filters ?? board.filters,
            data: config.data ?? board.data
        };
        
        // 5. 保存更改
        await this.saveSettings();
    }

    // ============================================================================
    // 4. 数据持久化
    // ============================================================================

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
	// 补全缺失的业务逻辑方法
    async getTasks(boardId: string): Promise<any[]> {
        // 这里的逻辑应根据你的需求实现，返回该 Board 下的任务
        return []; 
    }

    async saveBoardData(boardId: string, data: any) {
        const board = this.settings.boards.find(b => b.id === boardId);
        if (board) {
            board.data = { ...board.data, ...data };
            await this.saveSettings();
        }
    }

    async appendTaskToFile(path: string, text: string): Promise<string | null> {
        // 实现添加任务逻辑
        return null;
    }

    async ensureBlockId(boardId: string, nodeId: string): Promise<string> {
        return nodeId;
    }

    async updateTaskContent(path: string, line: number, text: string) {
        // 实现更新逻辑
    }
}