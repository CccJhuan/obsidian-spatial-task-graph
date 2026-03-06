import { ItemView, WorkspaceLeaf, Menu, Notice, TFile } from 'obsidian';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import ReactFlow, { 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Node,
  Connection,
  Edge,
  Panel,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  SelectionMode,
  ConnectionLineType,
  Viewport,
  OnConnectStartParams 
} from 'reactflow';

import TaskGraphPlugin, { GraphBoard } from './main';

export const VIEW_TYPE_TASK_GRAPH = 'task-graph-view';

interface TaskNodeData {
    id: string; label: string; notes: string; status: string; file: string; path: string; line: number; endLine: number; customStatus: string;
    onEdit: (data: TaskNodeData) => void;
    onToggleStatus: (id: string, status: string, path: string, line: number) => Promise<void>;
    onOpenFile: (path: string) => void;
}

interface TextNodeData {
    id: string; label: string;
    onSave: (id: string, text: string) => Promise<void>;
}

// 【终极架构修复】：定义 Data 联合类型，并据此衍生全局 AppNode
type AppNodeData = TaskNodeData | TextNodeData;
type AppNode = Node<AppNodeData>;

// 自定义类型守卫，精准指引 TypeScript 识别节点身份
const isTaskNode = (node: AppNode): node is Node<TaskNodeData, 'task'> => node.type === 'task';


const STATUS_COLORS = { 'in_progress': '#34c759', 'pending': '#ff9500', 'finished': '#af52de', 'blocked': '#ff3b30', 'backlog': '#8e8e93', 'default': 'var(--text-muted)' };
const extractTags = (text: string) => { if (!text) return { tags: [], cleanText: '' }; const tagRegex = /#[\w\u4e00-\u9fa5]+(\/[\w\u4e00-\u9fa5]+)*/g; const tags = text.match(tagRegex) || []; const cleanText = text.replace(tagRegex, '').trim(); return { tags, cleanText }; };

const TaskNode = React.memo(({ data, isConnectable }: { data: TaskNodeData, isConnectable: boolean }) => {
  const { tags, cleanText } = extractTags(data.label);
  const statusColor = STATUS_COLORS[data.customStatus as keyof typeof STATUS_COLORS] || STATUS_COLORS['default'];
  
  const hasNotes = data.notes && data.notes.trim().length > 0;
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="task-node-wrapper">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="custom-handle" style={{ left: '-20px', width: '40px', height: '40px', top: '50%', transform: 'translateY(-50%)' }} />
      <div style={{ height: '6px', width: '100%', background: statusColor, opacity: 0.8, flexShrink: 0 }}></div>
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: '600', color: statusColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{data.customStatus === 'default' ? 'TASK' : data.customStatus.replace('_', ' ')}</span>
            <div className="edit-btn" onClick={(e) => { e.stopPropagation(); data.onEdit(data); }} title="Edit task">✎</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div 
                className="nodrag" 
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={(e) => {
                    e.stopPropagation();
                    void data.onToggleStatus(data.id, data.status, data.path, data.line); 
                }}
                style={{ display: 'flex', alignItems: 'center', marginTop: '3px', cursor: 'pointer' }}
            >
                <input 
                    type="checkbox" 
                    className="custom-checkbox" 
                    checked={data.status === 'x'} 
                    readOnly
                    style={{ pointerEvents: 'none', margin: 0 }} 
                />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-normal)', fontWeight: '500', wordBreak: 'break-word', whiteSpace: 'pre-wrap', opacity: (data.status === 'x' ? 0.6 : 1), textDecoration: (data.status === 'x' ? 'line-through' : 'none') }}>
                    {cleanText || data.label}
                </div>
                
                {hasNotes && (
                    <div 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', borderRadius: '4px', padding: '2px 4px', marginLeft: '-4px' }}
                    >
                        <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', display: 'inline-block' }}>▶</span>
                        <span>Notes</span>
                    </div>
                )}

                {isExpanded && hasNotes && (
                    <div 
                        className="nodrag"
                        onMouseDown={e => e.stopPropagation()}
                        style={{ marginTop: '6px', fontSize: '11px', lineHeight: '1.4', color: 'var(--text-normal)', background: 'var(--background-primary)', padding: '6px 8px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: 'text', borderLeft: `2px solid ${statusColor}80` }}
                    >
                        {data.notes}
                    </div>
                )}
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>{tags.map((tag, i) => (<span key={i} className="node-tag">{tag}</span>))}</div>
              <div className="open-file-btn" onClick={(e) => { e.stopPropagation(); data.onOpenFile(data.path); }} title="Open file">↗ <span>{data.file}</span></div>
          </div>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="custom-handle custom-handle-right" style={{ right: '-20px', width: '40px', height: '40px', top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  );
});

const TextNode = React.memo(({ data, isConnectable }: { data: TextNodeData, isConnectable: boolean }) => {
    const [text, setText] = React.useState(data.label);
    const handleBlur = () => { if (text !== data.label) void data.onSave(data.id, text); }; 
    const rows = Math.max(1, text.split('\n').length);
    const stopKeys = (e: React.KeyboardEvent) => e.stopPropagation();

    return (
        <div className="text-node-wrapper">
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="custom-handle" style={{ left: '-20px', width: '40px', height: '40px', top: '50%', transform: 'translateY(-50%)' }} />
            <textarea className="text-node-textarea nodrag" value={text} onChange={(e) => setText(e.target.value)} onBlur={handleBlur} rows={rows} placeholder="Note..." onMouseDown={(e) => e.stopPropagation()} onKeyDown={stopKeys} onKeyUp={stopKeys} style={{ height: 'auto' }} />
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="custom-handle custom-handle-right" style={{ right: '-20px', width: '40px', height: '40px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
    );
});

const nodeTypes = { task: TaskNode, text: TextNode };

const EditTaskModal = ({ initialText, onClose, onSave, allTags }: { initialText: string, onClose: () => void, onSave: (text: string) => void | Promise<void>, allTags: string[] }) => {
    const [text, setText] = React.useState(initialText);
    const [suggestions, setSuggestions] = React.useState<string[]>([]);
    const [suggestionPos, setSuggestionPos] = React.useState({ top: 0, left: 0 });
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value; setText(val);
        const cursorPos = e.target.selectionStart; const textBeforeCursor = val.slice(0, cursorPos); const match = textBeforeCursor.match(/#([\w\u4e00-\u9fa5]*)$/);
        if (match) { const query = (match[1] || '').toLowerCase(); const filtered = allTags.filter(t => t.toLowerCase().includes(query)).slice(0, 10); if (filtered.length > 0) { setSuggestions(filtered); setSuggestionPos({ top: 140, left: 30 }); } else { setSuggestions([]); } } else { setSuggestions([]); }
    };
    const insertTag = (tag: string) => { const cursorPos = textareaRef.current?.selectionStart || text.length; const textBeforeCursor = text.slice(0, cursorPos); const textAfterCursor = text.slice(cursorPos); const lastHashIndex = textBeforeCursor.lastIndexOf('#'); const newText = textBeforeCursor.slice(0, lastHashIndex) + tag + ' ' + textAfterCursor; setText(newText); setSuggestions([]); textareaRef.current?.focus(); };
    const insertMetadata = (symbol: string) => { const newText = text + ` ${symbol} `; setText(newText); textareaRef.current?.focus(); };
    
    const handleKeyDown = (e: React.KeyboardEvent) => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void onSave(text); } };

    return (
        <div className="edit-overlay">
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: 0, fontWeight: 600, color: 'var(--text-normal)' }}>Edit task</h3>
                <div style={{ position: 'relative' }}>
                    <textarea ref={textareaRef} value={text} onChange={handleInput} onKeyDown={handleKeyDown} onKeyUp={(e) => e.stopPropagation()} style={{ width: '100%', height: '120px', resize: 'vertical', padding: '12px', borderRadius: '8px', border: '1px solid var(--background-modifier-border)', fontSize: '14px', lineHeight: '1.5', background: 'var(--background-secondary)', color: 'var(--text-normal)' }} placeholder="Task description...&#10;Press Shift+Enter to add notes." autoFocus />
                    {suggestions.length > 0 && (<div className="suggestion-list" style={{ top: suggestionPos.top, left: suggestionPos.left }}>{suggestions.map(tag => (<div key={tag} className="suggestion-item" onClick={() => insertTag(tag)}>{tag}</div>))}</div>)}
                </div>
                <div className="metadata-toolbar">
                    <div className="metadata-btn" onClick={() => insertMetadata('📅')} title="Due date">📅 <span className="metadata-label">Due</span></div>
                    <div className="metadata-btn" onClick={() => insertMetadata('🛫')} title="Start date">🛫 <span className="metadata-label">Start</span></div>
                    <div className="metadata-btn" onClick={() => insertMetadata('⏳')} title="Scheduled">⏳ <span className="metadata-label">Sched</span></div>
                    <div className="metadata-btn" onClick={() => insertMetadata('🔁')} title="Recurring">🔁 <span className="metadata-label">Recur</span></div>
                    <div style={{ width: 1, height: 16, background: 'var(--background-modifier-border)', margin: '0 4px' }}></div>
                    <div className="metadata-btn" onClick={() => insertMetadata('🔺')} title="High priority">🔺</div>
                    <div className="metadata-btn" onClick={() => insertMetadata('🔼')} title="Medium priority">🔼</div>
                    <div className="metadata-btn" onClick={() => insertMetadata('🔽')} title="Low priority">🔽</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto' }}><button onClick={onClose} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--background-modifier-border)', background: 'transparent', color: 'var(--text-normal)' }}>Cancel</button><button onClick={() => { void onSave(text); }} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: 'var(--interactive-accent)', color: 'white', fontWeight: 500 }}>Save</button></div>
            </div>
        </div>
    );
};

const ConfirmModal = ({ message, onConfirm, onClose }: { message: string, onConfirm: () => void | Promise<void>, onClose: () => void }) => {
    return (
        <div className="edit-overlay" onClick={onClose}>
            <div className="edit-modal" style={{ width: '320px', alignItems: 'center', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-normal)' }}>Confirm action</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px' }}>{message}</p>
                <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--background-modifier-border)', background: 'transparent', color: 'var(--text-normal)', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => { void onConfirm(); onClose(); }} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--interactive-accent)', color: 'white', fontWeight: 500, cursor: 'pointer' }}>Confirm</button>
                </div>
            </div>
        </div>
    );
};

const TaskSidebar = ({ nodes, onNodeCenter, onStatusChange }: { nodes: AppNode[], onNodeCenter: (nodeId: string) => void, onStatusChange: (id: string, status: string) => Promise<void> }) => {
    const { inProgress, pending, backlog } = React.useMemo(() => {
        const tasks = nodes.filter(isTaskNode);
        return {
            inProgress: tasks.filter(n => n.data.customStatus === 'in_progress'),
            pending: tasks.filter(n => n.data.customStatus === 'pending'),
            backlog: tasks.filter(n => n.data.customStatus === 'backlog' || n.data.customStatus === 'default' || !n.data.customStatus)
        };
    }, [nodes]);
    const stopProp = (e: React.MouseEvent | React.WheelEvent) => e.stopPropagation();

    const handleDragStart = (e: React.DragEvent, nodeId: string) => { e.dataTransfer.setData('nodeId', nodeId); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e: React.DragEvent, targetStatus: string) => { e.preventDefault(); const nodeId = e.dataTransfer.getData('nodeId'); if (nodeId) void onStatusChange(nodeId, targetStatus); }; 

    const renderList = (title: string, items: Node<TaskNodeData, 'task'>[], color: string, className: string, statusKey: string) => (
        <div className="sidebar-section" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, statusKey)}>
            <div className="sidebar-title" style={{ color: color }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: color }}></div>{title} <span style={{ opacity: 0.5 }}>({items.length})</span></div>
            <div className="sidebar-list">
                {items.map(node => (
                    <div key={node.id} className={`sidebar-item item-${className}`} onClick={() => onNodeCenter(node.id)} draggable onDragStart={(e) => handleDragStart(e, node.id)}>{node.data.label.replace(/#\S+/g, '').trim()}</div>
                ))}
                {items.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text-faint)', paddingLeft: '10px' }}>Empty - Drop here</div>}
            </div>
        </div>
    );
    return (<div className="task-sidebar" onMouseDown={stopProp} onWheel={stopProp} onContextMenu={stopProp}><div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-normal)' }}>My tasks</div>{renderList('In progress', inProgress, STATUS_COLORS['in_progress'], 'in-progress', 'in_progress')}{renderList('Pending', pending, STATUS_COLORS['pending'], 'pending', 'pending')}{renderList('Backlog', backlog, STATUS_COLORS['backlog'], 'backlog', 'backlog')}</div>);
};

const GraphToolbar = () => {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
    const btnStyle: React.CSSProperties = { width: '32px', height: '32px', background: 'var(--background-secondary)', border: '1px solid var(--background-modifier-border)', color: 'var(--text-normal)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '8px' };
    
    return (<Panel position="bottom-right" style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', pointerEvents: 'all' }} onMouseDown={stopPropagation}><button style={btnStyle} onClick={() => { zoomIn(); }} title="Zoom in"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button><button style={btnStyle} onClick={() => { zoomOut(); }} title="Zoom out"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button><button style={{...btnStyle, marginBottom: 0}} onClick={() => { fitView({duration: 800}); }} title="Fit view"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg></button></Panel>);
};

interface ControlPanelProps {
    boards: GraphBoard[];
    activeBoardId: string;
    onSwitchBoard: (id: string) => void;
    onAddBoard: () => void;
    onRenameBoard: (name: string) => Promise<void>;
    onDeleteBoard: (id: string) => Promise<void>;
    onAutoLayout: () => Promise<void>;
    onResetView: () => void;
    currentBoard: GraphBoard | undefined;
    onUpdateFilter: (type: string, value: string) => Promise<void>;
    onApplyFilters: (tags: string, folders: string, tagMode: 'AND' | 'OR') => Promise<void>;
    onRequestConfirm: (msg: string, action: () => void) => void;
    allTags: string[];
    allFolders: string[];
}

const sharedInputStyle: React.CSSProperties = { background: 'var(--background-modifier-form-field)', border: 'none', color: 'var(--text-normal)', padding: '8px', borderRadius: '8px', width: '100%', marginBottom: '8px', fontSize: '12px' };

const AutocompleteInput = ({ value, onChange, options, placeholder }: { value: string, onChange: (v:string)=>void, options: string[], placeholder: string }) => {
    const [show, setShow] = React.useState(false);
    const [selectedIndex, setSelectedIndex] = React.useState(-1);
    
    const parts = value.split(',').map(s => s.trim());
    const currentTyping = parts.pop()?.toLowerCase() || ''; 
    const existing = parts.filter(p => p !== ''); 
    
    let filtered = options.filter(o => !existing.includes(o));
    if (currentTyping) {
        filtered = filtered.filter(o => o.toLowerCase().includes(currentTyping));
    }
    filtered = filtered.slice(0, 10); 

    React.useEffect(() => {
        setSelectedIndex(-1);
    }, [currentTyping]);

    const handleSelect = (opt: string) => {
        const newParts = [...parts]; 
        newParts.push(opt); 
        onChange(newParts.join(', ') + (newParts.length > 0 ? ', ' : '')); 
        setShow(false);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation(); 
        if (!show || filtered.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault(); 
            setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0)); 
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1)); 
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < filtered.length) {
                const selectedOpt = filtered[selectedIndex];
                if (selectedOpt !== undefined) {
                    handleSelect(selectedOpt);
                }
            }
        } else if (e.key === 'Escape') {
            setShow(false);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input 
                style={{...sharedInputStyle, marginBottom: 0}} 
                placeholder={placeholder} 
                value={value} 
                onChange={e => { onChange(e.target.value); setShow(true); }} 
                onFocus={() => setShow(true)} 
                onBlur={() => setTimeout(() => setShow(false), 200)} 
                onKeyDown={handleKeyDown} 
                onKeyUp={e => e.stopPropagation()} 
            />
            {show && filtered.length > 0 && (
                <div className="suggestion-list" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', zIndex: 101, maxHeight: '160px', overflowY: 'auto', marginTop: '4px' }}>
                    {filtered.map((opt, index) => (
                        <div 
                            key={opt} 
                            className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`} 
                            onMouseDown={(e) => {
                                e.preventDefault(); 
                                handleSelect(opt);
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ControlPanel = ({ boards, activeBoardId, onSwitchBoard, onAddBoard, onRenameBoard, onDeleteBoard, onAutoLayout, onResetView, currentBoard, onUpdateFilter, onApplyFilters, onRequestConfirm, allTags, allFolders }: ControlPanelProps) => {
    const [showFilters, setShowFilters] = React.useState(false);
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [tempName, setTempName] = React.useState('');
    
    const [localTags, setLocalTags] = React.useState('');
    const [localFolders, setLocalFolders] = React.useState('');
    
    const [tagMode, setTagMode] = React.useState<'AND' | 'OR'>('OR');
    const [isApplying, setIsApplying] = React.useState(false);

    React.useEffect(() => { 
        setIsRenaming(false); 
        setTempName(currentBoard?.name || ''); 
        if (currentBoard) {
            setLocalTags(currentBoard.filters.tags.join(', '));
            setLocalFolders(currentBoard.filters.folders.join(', '));
            setTagMode(currentBoard.filters.tagMode === 'AND' ? 'AND' : 'OR');
        }
    }, [currentBoard]);
    
    const handleSaveName = () => { if (tempName.trim()) void onRenameBoard(tempName); setIsRenaming(false); };
    
    const handleDelete = () => { 
        if (boards.length <= 1) { new Notice("Cannot delete the only board."); return; } 
        onRequestConfirm(`Delete board "${currentBoard?.name || 'Board'}"?`, () => { void onDeleteBoard(activeBoardId); });
    };

    const handleResetClick = () => { onResetView(); };
    
    const handleApplyFiltersClick = () => { 
        setIsApplying(true);
        void onApplyFilters(localTags, localFolders, tagMode); 
        new Notice(`Filters applied! (tags logic: ${tagMode})`);
        setTimeout(() => setIsApplying(false), 1200); 
    };

    const stopPropagation = (e: React.MouseEvent | React.KeyboardEvent) => { e.stopPropagation(); };
    const stopKeys = (e: React.KeyboardEvent) => e.stopPropagation();

    const btnStyle = { background: 'var(--background-secondary)', border: '1px solid var(--background-modifier-border)', color: 'var(--text-normal)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', fontWeight: '500' };
    const activeBtnStyle = { ...btnStyle, background: 'var(--interactive-accent)', color: 'white', border: 'none', boxShadow: '0 2px 8px rgba(var(--interactive-accent-rgb), 0.3)' };
    
    return (<Panel position="top-right" style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--background-secondary)', opacity: '0.98', padding: '16px', borderRadius: '20px', border: '1px solid var(--background-modifier-border)', display: 'flex', flexDirection: 'column', gap: '12px', width: '280px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', cursor: 'default', pointerEvents: 'all', zIndex: 100 }} onMouseDown={stopPropagation} onClick={stopPropagation}><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>{isRenaming ? (<><input value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={stopKeys} onKeyUp={stopKeys} style={{ ...sharedInputStyle, marginBottom: 0, flex: 1 }} autoFocus /><button style={activeBtnStyle} onClick={handleSaveName}>Save</button></>) : (<><select value={activeBoardId} onChange={(e) => onSwitchBoard(e.target.value)} style={{ ...btnStyle, flex: 1, textOverflow: 'ellipsis', background: 'transparent', border: '1px solid var(--background-modifier-border)' }}>{boards.map((b: GraphBoard) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><button style={btnStyle} onClick={() => setIsRenaming(true)} title="Rename">✎</button><button style={btnStyle} onClick={() => void onAddBoard()} title="New">+</button></>)}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}><button style={btnStyle} onClick={() => void onAutoLayout()}>⚡ Layout</button><button style={showFilters ? activeBtnStyle : btnStyle} onClick={() => setShowFilters(!showFilters)}>Filters</button></div><div style={{ display: 'flex', gap: '8px' }}><button style={{...btnStyle, flex:1, color: '#ff3b30'}} onClick={handleResetClick}>Reset</button><button style={{...btnStyle, flex:1, color: '#ff3b30'}} onClick={handleDelete}>Delete</button></div>{showFilters && currentBoard && (<div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid var(--background-modifier-border)' }}>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <AutocompleteInput value={localTags} onChange={setLocalTags} options={allTags} placeholder="e.g. #urgent, #work" />
            </div>
            <button 
                style={{ ...btnStyle, height: '33px', margin: 0, padding: '0 4px', width: '46px', flexShrink: 0, 
                         background: tagMode === 'AND' ? 'var(--interactive-accent)' : 'var(--background-secondary)', 
                         color: tagMode === 'AND' ? 'white' : 'var(--text-normal)', 
                         border: tagMode === 'AND' ? 'none' : '1px solid var(--background-modifier-border)' }} 
                onClick={() => setTagMode(prev => prev === 'AND' ? 'OR' : 'AND')}
                title={`Currently matching ${tagMode === 'AND' ? 'ALL' : 'ANY'} tags. Click to toggle.`}
            >
                {tagMode}
            </button>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
             <AutocompleteInput value={localFolders} onChange={setLocalFolders} options={allFolders} placeholder="e.g. Projects/Work" />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>{[' ', '/', 'x'].map(status => (<label key={status} style={{fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-normal)'}}><input type="checkbox" className="filter-checkbox" checked={currentBoard.filters.status.includes(status)} onChange={() => { void onUpdateFilter('status', status); }} /> {status === ' ' ? 'Todo' : status === '/' ? 'Doing' : 'Done'}</label>))}</div>
        
        <button style={{...btnStyle, width: '100%', marginTop: '14px', 
                        background: isApplying ? 'var(--interactive-success, #28a745)' : 'var(--interactive-accent)', 
                        color: 'white', border: 'none', transition: 'background 0.3s ease'}} 
                onClick={handleApplyFiltersClick}>
            {isApplying ? '✅ Applied!' : 'Apply filters'}
        </button>

    </div>)}</Panel>);
};

const HelpPanel = ({ onClose }: { onClose: () => void }) => {
    const [lang, setLang] = React.useState<'en' | 'zh'>('zh');

    const content = {
        en: {
            title: '📖 User guide',
            sections: [
                { heading: '🎯 Tasks & connections', items: [
                    'Link: Drag from a node\'s handle to another to create a dependency.', 
                    'Sub-task: Drag a connection to empty space to quickly create a new linked task.', 
                    'Status: Click the checkbox to toggle completion, or Right-click a task for more status options.',
                    'Delete link: Right-click a connection line to remove it.'
                ]},
                { heading: '📝 Canvas & notes', items: [
                    'Add note: Right-click empty canvas space -> "Add note". Link notes to tasks to act as categories.', 
                    'Task details: Use Shift+Enter when editing a task to add multi-line notes underneath it.',
                    'Select & pan: Middle/Right-drag to pan. Left-drag on empty space to box-select. Shift+click to multi-select.'
                ]},
                { heading: '🔍 Boards & filters', items: [
                    'Filter: Use the top-right panel to filter by Tags/Folders. Use Up/Down arrows and Enter to autocomplete.', 
                    'Logic: Click the "AND/OR" button to toggle between matching ALL or ANY tags.',
                    'Boards: Create multiple boards. Zoom/pan positions are independently saved per board.'
                ]},
                { heading: '📐 Layout & shortcuts', items: [
                    'Auto-layout: Click "⚡ Layout" to automatically organize all nodes.', 
                    'Hotkey: Assign a global shortcut for "Auto-layout task graph" in Obsidian\'s hotkey settings for faster arrangement.'
                ]},
            ]
        },
        zh: {
            title: '📖 操作指南',
            sections: [
                { heading: '🎯 任务与连线', items: [
                    '建立依赖：拖拽节点两侧的圆点进行连线。', 
                    '快捷新建：将连线拖拽至空白处，直接创建关联子任务。', 
                    '状态流转：点击复选框切换完成状态；右键点击节点选择更多状态。',
                    '取消连线：右键点击连线即可删除。'
                ]},
                { heading: '📝 画布与批注', items: [
                    '独立批注：右键点击画布空白处选择 "Add note"。', 
                    '任务详情：在编辑任务时使用 Shift+Enter 换行，即可为该任务添加折叠注释！',
                    '批量与漫游：中键/右键平移画布。左键拖拽进行框选；按住 Shift 点击进行多选。'
                ]},
                { heading: '🔍 画板与检索', items: [
                    '高效检索：支持键盘上下键与回车快速补全路径和标签。', 
                    '逻辑切换：点击输入框旁的 "AND / OR" 按钮，控制匹配所有标签或任意标签。',
                    '多画板：系统将为您独立保存每一个画板的专属缩放与坐标位置。'
                ]},
                { heading: '📐 排版与快捷键', items: [
                    '一键排版：点击 "⚡ Layout" 自动梳理节点层级。', 
                    '快捷绑定：在 Obsidian 设置 -> 快捷键中搜索 "Auto-layout"，绑定全局热键。'
                ]},
            ]
        }
    };

    const c = content[lang];

    return (
        <div className="task-graph-help-panel" style={{ position: 'absolute', right: 0, bottom: '44px', width: '380px', maxHeight: '60vh', overflowY: 'auto' }}>
            <button className="task-graph-help-close" onClick={onClose}>✕</button>
            <h3 style={{ marginTop: 0, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {c.title}
                <span className="task-graph-help-lang-toggle" style={{ marginRight: '28px' }}>
                    <button className={`task-graph-help-lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
                    <button className={`task-graph-help-lang-btn ${lang === 'zh' ? 'active' : ''}`} onClick={() => setLang('zh')}>中</button>
                </span>
            </h3>
            {c.sections.map((sec, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-normal)', fontSize: '13px' }}>{sec.heading}</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {sec.items.map((item, j) => {
                            const splitIndex = item.indexOf('：') !== -1 ? item.indexOf('：') : item.indexOf(':');
                            if (splitIndex !== -1) {
                                const action = item.substring(0, splitIndex + 1);
                                const desc = item.substring(splitIndex + 1);
                                return <li key={j} style={{ marginBottom: '4px' }}><strong>{action}</strong>{desc}</li>;
                            }
                            return <li key={j} style={{ marginBottom: '4px' }}>{item}</li>;
                        })}
                    </ul>
                </div>
            ))}
        </div>
    );
};

const TaskGraphComponent = ({ plugin, view }: { plugin: TaskGraphPlugin, view: TaskGraphView }) => {
  // 【类型修复】：通过指定 Data 层的泛型，彻底打通 React Flow 与 TypeScript 的类型壁垒
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeBoardId, setActiveBoardId] = React.useState(plugin.settings.lastActiveBoardId);
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  const [editTarget, setEditTarget] = React.useState<{id: string, text: string, path: string, line: number, endLine: number} | null>(null);
  const [createTarget, setCreateTarget] = React.useState<{ sourceNodeId: string, sourcePath: string } | null>(null);
  
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [allFolders, setAllFolders] = React.useState<string[]>([]);
  
  const [showHelp, setShowHelp] = React.useState(false); 
  const [confirmReq, setConfirmReq] = React.useState<{ message: string, action: () => void } | null>(null);
  
  const [isConnecting, setIsConnecting] = React.useState(false);
  
  const prevBoardIdRef = React.useRef<string | null>(null);
  
  const reactFlowInstance = useReactFlow();
  const debouncedSaveBoardData = React.useMemo(
      () => import('obsidian').then(({ debounce }) => 
          debounce((boardId: string, data: Partial<GraphBoard['data']>) => {
              void plugin.saveBoardData(boardId, data);
          }, 800, true)
      ),
      [plugin]
  );
  const connectionStartRef = React.useRef<Partial<OnConnectStartParams>>({});
  const connectionMadeRef = React.useRef(false);

  const activeBoard = plugin.settings.boards.find(b => b.id === activeBoardId) || plugin.settings.boards[0];

  React.useEffect(() => { 
      plugin.viewRefresh = () => setRefreshKey(prev => prev + 1); 
  }, [plugin]);

  React.useEffect(() => {
    const loadData = () => {
      // 【类型修复】：利用 unknown 断言强行调用缺失类型声明的方法
      const rawTags = (plugin.app.metadataCache as unknown as { getTags(): Record<string, number> }).getTags();
      setAllTags(Object.keys(rawTags).sort());
      
      const folderSet = new Set<string>();
      for (const path of plugin.taskCache.keys()) {
          const parts = path.split('/');
          parts.pop(); 
          let currentPath = '';
          for (const part of parts) {
              currentPath = currentPath ? `${currentPath}/${part}` : part;
              folderSet.add(currentPath);
          }
      }
      setAllFolders(Array.from(folderSet).sort());

      const tasks = plugin.getTasks(activeBoardId);
      const boardConfig = plugin.settings.boards.find(b => b.id === activeBoardId);
      const savedLayout = boardConfig?.data.layout || {};
      const savedEdges = boardConfig?.data.edges || [];
      const savedNodeStatus = boardConfig?.data.nodeStatus || {};
      const savedTextNodes = boardConfig?.data.textNodes || [];

      const taskNodes: Node<TaskNodeData, 'task'>[] = tasks.map((t, index) => {
        const posX = savedLayout[t.id]?.x ?? ((index % 3) * 320);
        const posY = savedLayout[t.id]?.y ?? (Math.floor(index / 3) * 200);
        let finalCustomStatus = savedNodeStatus[t.id] || 'default';
        if (t.status === 'x') finalCustomStatus = 'finished';

        return {
            id: t.id, type: 'task', position: { x: posX, y: posY },
            data: { 
                id: t.id, label: t.text, notes: t.notes, status: t.status, file: t.file, path: t.path, line: t.line, endLine: t.endLine, 
                customStatus: finalCustomStatus, 
                onEdit: handleEditTask, onToggleStatus: handleToggleTask,
                onOpenFile: (path: string) => plugin.app.workspace.openLinkText(path, '', false)
            }
        };
      });

      const textNodes: Node<TextNodeData, 'text'>[] = savedTextNodes.map(tn => ({
          id: tn.id, type: 'text', position: { x: tn.x, y: tn.y },
          data: { id: tn.id, label: tn.text, onSave: handleSaveTextNode }
      }));

      // 泛型合并后自动转推为 Node<AppNodeData>[]，消灭强制断言
      setNodes([...taskNodes, ...textNodes] as AppNode[]);
      setEdges(savedEdges);

      if (prevBoardIdRef.current !== activeBoardId) {
          const savedViewport = boardConfig?.data.viewport;
          if (savedViewport) {
              setTimeout(() => reactFlowInstance.setViewport(savedViewport), 100);
          } else {
              setTimeout(() => reactFlowInstance.fitView({ duration: 800, padding: 0.1 }), 100);
          }
          prevBoardIdRef.current = activeBoardId;
      }
    };
    loadData();
  }, [plugin, activeBoardId, refreshKey, reactFlowInstance]);

  const onConnectStart = React.useCallback((event: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => { 
      connectionStartRef.current = params; 
      connectionMadeRef.current = false; 
      setIsConnecting(true);
  }, []);
  
  const onConnectEnd = React.useCallback((event: MouseEvent | TouchEvent) => {
      setIsConnecting(false);
      if (connectionMadeRef.current) return;
      const targetIsPane = (event.target as HTMLElement).classList.contains('react-flow__pane');
      if (targetIsPane && connectionStartRef.current.nodeId) {
          const sourceNodeId = connectionStartRef.current.nodeId;
          const sourceNode = nodes.find(n => n.id === sourceNodeId);
          if (sourceNode && isTaskNode(sourceNode)) {
              if (sourceNode.data.path) {
                  setCreateTarget({ sourceNodeId, sourcePath: sourceNode.data.path }); 
              }
          }
      }
  }, [nodes]);

  const handleToggleTask = async (id: string, currentStatus: string, path: string, line: number) => {
      const newStatus = (currentStatus === ' ' || currentStatus === '/') ? 'x' : ' ';
      const newCustomStatus = newStatus === 'x' ? 'finished' : 'backlog'; 
      
      setNodes(nds => nds.map(n => { 
          if (n.id === id && isTaskNode(n)) { 
              const updatedData: TaskNodeData = { ...n.data, status: newStatus, customStatus: newCustomStatus };
              return { ...n, data: updatedData } as AppNode; 
          } 
          return n; 
      }));
      
      const board = plugin.settings.boards.find(b => b.id === activeBoardId); 
      if (board) { 
          const nodeStatus = board.data.nodeStatus || {}; 
          nodeStatus[id] = newCustomStatus; 
          await plugin.saveBoardData(activeBoardId, { nodeStatus }); 
      }
      
      const file = plugin.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
           const content = await plugin.app.vault.read(file); 
           const lines = content.split('\n');
           let currentLineText = lines[line]; 
           if (currentLineText === undefined) return;

           const lineRegex = /^(\s*- \[[x\s/bc!-]\]\s)(.*?)(?:\s+(\^[a-zA-Z0-9-]+))?$/;
           const match = currentLineText.match(lineRegex);

           if (match) {
               let prefix = match[1] || '- [ ] ';
               let textContent = match[2] || '';
               const blockId = match[3] ? ` ${match[3]}` : '';

               prefix = prefix.replace(/\[.\]/, `[${newStatus}]`);

               const completionRegex = /\s*✅\s*\d{4}-\d{2}-\d{2}/g;
               if (newStatus === 'x') {
                   if (!completionRegex.test(textContent)) {
                       const today = new Date();
                       const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                       textContent += ` ✅ ${dateStr}`;
                   }
               } else {
                   textContent = textContent.replace(completionRegex, '');
               }

               lines[line] = `${prefix}${textContent}${blockId}`;
           } else {
               console.warn("TaskGraph: Failed to parse line format:", currentLineText);
           }
           
           await plugin.app.vault.modify(file, lines.join('\n'));
      }
  };

  const updateNodeStatus = async (nodeId: string, status: string) => { 
      setNodes((nds) => nds.map((n) => { 
          if (n.id === nodeId && isTaskNode(n)) {
              const updatedData: TaskNodeData = { ...n.data, customStatus: status };
              return { ...n, data: updatedData } as AppNode;
          } 
          return n; 
      })); 
      const board = plugin.settings.boards.find(b => b.id === activeBoardId); 
      if (board) { 
          const nodeStatus = board.data.nodeStatus || {}; 
          nodeStatus[nodeId] = status; 
          await plugin.saveBoardData(activeBoardId, { nodeStatus }); 
      } 
  };

  const onMoveEnd = React.useCallback((event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      const board = plugin.settings.boards.find(b => b.id === activeBoardId);
      if (board) {
          board.data.viewport = viewport;
          void debouncedSaveBoardData.then(save => save(activeBoardId, { viewport }));
      }
  }, [plugin, activeBoardId, debouncedSaveBoardData]);

  const handleCreateTask = async (text: string) => {
      if (!createTarget) return;
      const newId = await plugin.appendTaskToFile(createTarget.sourcePath, text);
      if (newId) {
          const parentNode = nodes.find(n => n.id === createTarget.sourceNodeId);
          let newX = 0, newY = 0; if (parentNode) { newX = parentNode.position.x + 400; newY = parentNode.position.y; }
          const newEdge = { id: `e${createTarget.sourceNodeId}-${newId}`, source: createTarget.sourceNodeId, target: newId, animated: true };
          const board = plugin.settings.boards.find(b => b.id === activeBoardId);
          if (board) { board.data.edges = [...board.data.edges, newEdge]; board.data.layout = { ...board.data.layout, [newId]: { x: newX, y: newY } }; await plugin.saveSettings(); }
          setCreateTarget(null); setRefreshKey(prev => prev + 1);
      }
  };

  const onConnect = React.useCallback((params: Connection) => { 
      void (async () => {
          connectionMadeRef.current = true; 
          if (!params.source || !params.target) return;

          const newSourceId = await plugin.ensureBlockId(activeBoardId, params.source);
          const newTargetId = await plugin.ensureBlockId(activeBoardId, params.target);

          const newEdge = { id: `e${newSourceId}-${newTargetId}`, source: newSourceId, target: newTargetId, animated: true };

          setNodes(nds => nds.map(n => {
              if (n.id === params.source) return { ...n, id: newSourceId } as AppNode;
              if (n.id === params.target) return { ...n, id: newTargetId } as AppNode;
              return n;
          }));

          setEdges((eds) => {
              const updatedEds = eds.map(e => {
                  const eSource = e.source === params.source ? newSourceId : (e.source === params.target ? newTargetId : e.source);
                  const eTarget = e.target === params.source ? newSourceId : (e.target === params.target ? newTargetId : e.target);
                  return { ...e, source: eSource, target: eTarget, id: `e${eSource}-${eTarget}` };
              });
              return addEdge(newEdge, updatedEds);
          }); 
          
          const board = plugin.settings.boards.find(b => b.id === activeBoardId);
          if (board) { 
              if (!board.data.edges.some((e: Edge) => e.id === newEdge.id)) {
                  board.data.edges.push(newEdge);
              }
              await plugin.saveSettings(); 
          }
          setRefreshKey(prev => prev + 1);
      })();
  }, [plugin, activeBoardId, setEdges, setNodes]);

  const onNodeDragStop = React.useCallback((event: React.MouseEvent, node: Node) => { 
      const board = plugin.settings.boards.find(b => b.id === activeBoardId); 
      if(!board) return; 
      
      void debouncedSaveBoardData.then(save => {
          if (node.type === 'task') { 
              const layout = { ...board.data.layout, [node.id]: node.position }; 
              save(activeBoardId, { layout }); 
          } else if (node.type === 'text') { 
              const textNodes = board.data.textNodes.map(tn => tn.id === node.id ? { ...tn, x: node.position.x, y: node.position.y } : tn); 
              save(activeBoardId, { textNodes }); 
          }
      });
  }, [plugin, activeBoardId, debouncedSaveBoardData]);
  
  const handleSaveTextNode = async (id: string, text: string) => { const board = plugin.settings.boards.find(b => b.id === activeBoardId); if(board) { const textNodes = board.data.textNodes.map(tn => tn.id === id ? { ...tn, text } : tn); await plugin.saveBoardData(activeBoardId, { textNodes }); } };
  
  const handleEditTask = (taskData: TaskNodeData) => { 
      const initialText = taskData.label + (taskData.notes ? '\n' + taskData.notes : '');
      setEditTarget({ id: taskData.id, text: initialText, path: taskData.path, line: taskData.line, endLine: taskData.endLine }); 
  };
  const saveTaskEdit = async (text: string) => { 
      if (!editTarget) return; 
      await plugin.updateTaskContent(editTarget.path, editTarget.line, editTarget.endLine, text); 
      setEditTarget(null); 
  };

  const onPaneContextMenu = React.useCallback((event: React.MouseEvent) => {
      event.preventDefault(); const menu = new Menu();
      menu.addItem((item) => item.setTitle('Add note').setIcon('sticky-note').onClick(() => {
          void (async () => {
              const bounds = (event.target as HTMLElement).getBoundingClientRect(); const position = reactFlowInstance.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
              const newNode = { id: `text-${Date.now()}`, text: 'New note', x: position.x, y: position.y };
              const board = plugin.settings.boards.find(b => b.id === activeBoardId); if (board) { const textNodes = [...(board.data.textNodes || []), newNode]; await plugin.saveBoardData(activeBoardId, { textNodes }); setRefreshKey(prev => prev + 1); }
          })();
      }));
      menu.showAtPosition({ x: event.nativeEvent.clientX, y: event.nativeEvent.clientY });
  }, [plugin, activeBoardId, reactFlowInstance]);

  const onEdgeContextMenu = React.useCallback((event: React.MouseEvent, edge: Edge) => { 
      event.preventDefault(); event.stopPropagation(); 
      setEdges((eds) => { 
          const newEdges = eds.filter((e) => e.id !== edge.id); 
          void plugin.saveBoardData(activeBoardId, { edges: newEdges }); 
          return newEdges; 
      }); 
      new Notice("Connection removed."); 
  }, [plugin, activeBoardId, setEdges]);
  
  const onNodeContextMenu = React.useCallback((event: React.MouseEvent, node: Node) => {
      event.preventDefault(); event.stopPropagation(); const menu = new Menu();
      if (node.type === 'task') {
          menu.addItem((item) => item.setTitle('Backlog').onClick(() => { void updateNodeStatus(node.id, 'backlog'); }));
          menu.addItem((item) => item.setTitle('Pending').onClick(() => { void updateNodeStatus(node.id, 'pending'); }));
          menu.addItem((item) => item.setTitle('In progress').onClick(() => { void updateNodeStatus(node.id, 'in_progress'); }));
          menu.addItem((item) => item.setTitle('Blocked').onClick(() => { void updateNodeStatus(node.id, 'blocked'); }));
          menu.addItem((item) => item.setTitle('Finished').onClick(() => { void updateNodeStatus(node.id, 'finished'); }));
      } else if (node.type === 'text') {
          menu.addItem((item) => item.setTitle('Delete note').onClick(() => { 
              void (async () => {
                  const board = plugin.settings.boards.find(b => b.id === activeBoardId); 
                  if (board) { 
                      const textNodes = board.data.textNodes.filter(tn => tn.id !== node.id); 
                      await plugin.saveBoardData(activeBoardId, { textNodes }); 
                      setRefreshKey(prev => prev + 1); 
                  }
              })();
          }));
      }
      menu.showAtPosition({ x: event.nativeEvent.clientX, y: event.nativeEvent.clientY });
  }, [plugin, activeBoardId, nodes]);

  const handleSwitchBoard = (id: string) => { setActiveBoardId(id); plugin.settings.lastActiveBoardId = id; void plugin.saveSettings(); };
  
  const handleAddBoard = () => { const newBoard: GraphBoard = { id: Date.now().toString(), name: `Board ${plugin.settings.boards.length + 1}`, filters: { tags: [], excludeTags: [], folders: [], status: [' ', '/'], tagMode: 'OR' }, data: { layout: {}, edges: [], nodeStatus: {}, textNodes: [] } }; plugin.settings.boards.push(newBoard); handleSwitchBoard(newBoard.id); };
  
  const handleDeleteBoard = async (id: string) => { 
      const newBoards = plugin.settings.boards.filter(b => b.id !== id); 
      plugin.settings.boards = newBoards; 
      const nextBoard = newBoards[0]; 
      if (nextBoard) {
          setActiveBoardId(nextBoard.id); 
          plugin.settings.lastActiveBoardId = nextBoard.id; 
          await plugin.saveSettings(); 
      }
  };
  
  const handleRenameBoard = async (newName: string) => { await plugin.updateBoardConfig(activeBoardId, { name: newName }); setRefreshKey(prev => prev + 1); };
  const handleUpdateFilter = async (type: string, value: string) => { const board = plugin.settings.boards.find(b => b.id === activeBoardId); if (!board) return; if (type === 'tags' || type === 'excludeTags' || type === 'folders') board.filters[type] = value.split(',').map(s => s.trim()).filter(s => s); else if (type === 'status') { const statusChar = value; const index = board.filters.status.indexOf(statusChar); if (index > -1) board.filters.status.splice(index, 1); else board.filters.status.push(statusChar); } await plugin.saveSettings(); setRefreshKey(prev => prev + 1); };
  
  const handleApplyFilters = async (tagsStr: string, foldersStr: string, tagMode: 'AND' | 'OR') => {
      const board = plugin.settings.boards.find(b => b.id === activeBoardId);
      if (!board) return;
      board.filters.tags = tagsStr.split(',').map(s => s.trim()).filter(s => s);
      board.filters.folders = foldersStr.split(',').map(s => s.trim()).filter(s => s);
      board.filters.tagMode = tagMode;
      await plugin.saveSettings();
      setRefreshKey(prev => prev + 1);
  };

  const handleAutoLayout = async () => {
      const undirectedAdj: Record<string, string[]> = {};
      const directedAdj: Record<string, string[]> = {};
      const inDegree: Record<string, number> = {};

      nodes.forEach(n => { undirectedAdj[n.id] = []; directedAdj[n.id] = []; inDegree[n.id] = 0; });
      edges.forEach((e: Edge) => {
          const sourceDir = directedAdj[e.source]; const sourceUndir = undirectedAdj[e.source]; const targetUndir = undirectedAdj[e.target];
          if (sourceDir) sourceDir.push(e.target);
          inDegree[e.target] = (inDegree[e.target] ?? 0) + 1;
          if (sourceUndir) sourceUndir.push(e.target);
          if (targetUndir) targetUndir.push(e.source);
      });

      const connectedNodeIds = new Set<string>();
      const isolatedActiveIds: string[] = [];
      const isolatedFinishedIds: string[] = [];

      nodes.forEach(n => {
          const isFinishedTask = isTaskNode(n) && (n.data.status === 'x' || n.data.customStatus === 'finished');
          const isConnected = (undirectedAdj[n.id]?.length ?? 0) > 0;
          if (isConnected) connectedNodeIds.add(n.id);
          else if (isFinishedTask) isolatedFinishedIds.push(n.id);
          else isolatedActiveIds.push(n.id);
      });

      const components: string[][] = [];
      const visited = new Set<string>();

      connectedNodeIds.forEach(id => {
          if (!visited.has(id)) {
              const comp: string[] = []; const queue = [id]; visited.add(id);
              while (queue.length > 0) {
                  const curr = queue.shift()!; comp.push(curr);
                  undirectedAdj[curr]?.forEach(neighbor => { if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); } });
              }
              components.push(comp);
          }
      });

      const layout: Record<string, { x: number; y: number }> = {};
      const COL_WIDTH = 320; const COMPONENT_GAP = 60; const MIN_GAP = 30; const DEFAULT_NODE_HEIGHT = 100;
      const nodeHeightMap: Record<string, number> = {};
      const zoom = reactFlowInstance?.getZoom() ?? 1;
      
      nodes.forEach(n => {
          const el = document.querySelector(`[data-id="${n.id}"]`);
          if (el) { const rect = el.getBoundingClientRect(); nodeHeightMap[n.id] = rect.height / zoom; } else nodeHeightMap[n.id] = DEFAULT_NODE_HEIGHT;
      });

      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const getUserOrderRank = (ids: string[]): string[] => { return [...ids].sort((a, b) => { const yA = nodeMap.get(a)?.position?.y ?? 0; const yB = nodeMap.get(b)?.position?.y ?? 0; return yA - yB; }); };
      const componentResults: { comp: string[]; height: number }[] = [];

      components.forEach(comp => {
          const level: Record<string, number> = {};
          comp.forEach(id => { level[id] = 0; });
          let changed = true; let iter = 0;
          while (changed && iter < 200) {
              changed = false; iter++;
              edges.forEach((e: Edge) => { if (level[e.source] !== undefined && level[e.target] !== undefined) { if (level[e.target]! <= level[e.source]!) { level[e.target] = level[e.source]! + 1; changed = true; } } });
          }

          const levelGroups: Record<number, string[]> = {};
          let maxLevel = 0;
          comp.forEach(id => { const lvl = level[id] ?? 0; maxLevel = Math.max(maxLevel, lvl); if (!levelGroups[lvl]) levelGroups[lvl] = []; levelGroups[lvl].push(id); });
          for (const lvl of Object.keys(levelGroups)) levelGroups[Number(lvl)] = getUserOrderRank(levelGroups[Number(lvl)]!);

          const posY: Record<string, number> = {};
          const assignedNodes = new Set<string>();
          const compChildren = (id: string): string[] => { return (directedAdj[id] || []).filter(cid => comp.includes(cid)); };
          const subtreeHeight: Record<string, number> = {};
          
          const computeSubtreeHeight = (id: string, visitedCalc: Set<string>): number => {
              if (subtreeHeight[id] !== undefined) return subtreeHeight[id];
              if (visitedCalc.has(id)) { subtreeHeight[id] = (nodeHeightMap[id] ?? DEFAULT_NODE_HEIGHT) + MIN_GAP; return subtreeHeight[id]; }
              visitedCalc.add(id);
              const children = compChildren(id); const nodeH = nodeHeightMap[id] ?? DEFAULT_NODE_HEIGHT;
              if (children.length === 0) { subtreeHeight[id] = nodeH + MIN_GAP; return subtreeHeight[id]; }
              let childrenTotalH = 0;
              const sortedChildren = getUserOrderRank(children);
              sortedChildren.forEach(cid => { childrenTotalH += computeSubtreeHeight(cid, visitedCalc); });
              subtreeHeight[id] = Math.max(nodeH + MIN_GAP, childrenTotalH);
              return subtreeHeight[id];
          };

          const visitedCalc = new Set<string>();
          comp.forEach(id => computeSubtreeHeight(id, visitedCalc));

          const assignPositions = (id: string, startY: number): number => {
              if (assignedNodes.has(id)) return 0;
              assignedNodes.add(id);
              const children = compChildren(id); const unassigned = children.filter(cid => !assignedNodes.has(cid)); const nodeH = nodeHeightMap[id] ?? DEFAULT_NODE_HEIGHT;
              if (children.length === 0 || unassigned.length === 0) { posY[id] = startY; return nodeH + MIN_GAP; }
              const sortedChildren = getUserOrderRank(unassigned);
              let currentY = startY; let totalUsed = 0;
              sortedChildren.forEach(childId => { const used = assignPositions(childId, currentY); currentY += used; totalUsed += used; });
              const allChildYs = children.map(cid => posY[cid]).filter((y): y is number => y !== undefined);
              if (allChildYs.length > 0) {
                  const firstY = Math.min(...allChildYs);
                  const lastChildId = children.reduce((acc, cid) => { const y = posY[cid]; const accY = posY[acc]; if (y === undefined) return acc; if (accY === undefined) return cid; return y > accY ? cid : acc; }, children[0]!);
                  const lastY = posY[lastChildId] ?? startY; const lastH = nodeHeightMap[lastChildId] ?? DEFAULT_NODE_HEIGHT;
                  const childRangeCenter = (firstY + lastY + lastH) / 2; posY[id] = childRangeCenter - nodeH / 2;
              } else posY[id] = startY;
              return Math.max(totalUsed, nodeH + MIN_GAP);
          };

          const compInDegree: Record<string, number> = {};
          comp.forEach(id => { compInDegree[id] = 0; });
          edges.forEach((e: Edge) => { if (compInDegree[e.target] !== undefined && comp.includes(e.source)) compInDegree[e.target] = (compInDegree[e.target] ?? 0) + 1; });
          const roots = comp.filter(id => (compInDegree[id] ?? 0) === 0);
          const sortedRoots = getUserOrderRank(roots);

          let globalStartY = 0;
          sortedRoots.forEach(rootId => { const used = assignPositions(rootId, globalStartY); globalStartY += used; });
          comp.forEach(id => { if (posY[id] === undefined) { posY[id] = globalStartY; globalStartY += (nodeHeightMap[id] ?? DEFAULT_NODE_HEIGHT) + MIN_GAP; } });

          for (let lvl = 0; lvl <= maxLevel; lvl++) {
              const group = levelGroups[lvl] || []; const sorted = [...group].sort((a, b) => (posY[a] ?? 0) - (posY[b] ?? 0));
              for (let i = 1; i < sorted.length; i++) {
                  const prevId = sorted[i - 1]!; const currId = sorted[i]!; const prevBottom = (posY[prevId] ?? 0) + (nodeHeightMap[prevId] ?? DEFAULT_NODE_HEIGHT) + MIN_GAP; const currTop = posY[currId] ?? 0;
                  if (currTop < prevBottom) posY[currId] = prevBottom;
              }
          }

          const compLayout: Record<string, { x: number; y: number }> = {};
          comp.forEach(id => { compLayout[id] = { x: (level[id] ?? 0) * COL_WIDTH, y: posY[id] ?? 0 }; });
          const allYs = Object.values(compLayout).map(p => p.y);
          const minY = Math.min(...allYs);
          Object.values(compLayout).forEach(p => { p.y -= minY; });

          let compMaxBottom = 0;
          comp.forEach(id => { const y = compLayout[id]?.y ?? 0; const h = nodeHeightMap[id] ?? DEFAULT_NODE_HEIGHT; compMaxBottom = Math.max(compMaxBottom, y + h); });
          comp.forEach(id => { layout[id] = { ...compLayout[id]! }; });
          componentResults.push({ comp, height: compMaxBottom });
      });

      componentResults.sort((a, b) => b.comp.length - a.comp.length);
      let globalY = 0;
      componentResults.forEach(cr => { cr.comp.forEach(id => { if (layout[id]) layout[id].y += globalY; }); globalY += cr.height + COMPONENT_GAP; });

      if (isolatedActiveIds.length > 0) {
          const sorted = getUserOrderRank(isolatedActiveIds); const COLS = 3; const ISO_ROW_GAP = 140; const startY = globalY;
          sorted.forEach((id, idx) => { const row = Math.floor(idx / COLS); const col = idx % COLS; layout[id] = { x: col * COL_WIDTH, y: startY + row * ISO_ROW_GAP }; });
          const maxRow = Math.floor((sorted.length - 1) / COLS); globalY = startY + (maxRow + 1) * ISO_ROW_GAP + COMPONENT_GAP;
      }

      if (isolatedFinishedIds.length > 0) {
          const COLS = 4; const COMPACT_GAP = 100; const startY = globalY;
          isolatedFinishedIds.forEach((id, idx) => { const row = Math.floor(idx / COLS); const col = idx % COLS; layout[id] = { x: col * COL_WIDTH, y: startY + row * COMPACT_GAP }; });
      }

      setNodes(nds => nds.map(n => ({ ...n, position: layout[n.id] ?? n.position })));

      const board = plugin.settings.boards.find(b => b.id === activeBoardId);
      if (board) {
          const mergedLayout = { ...board.data.layout }; const updatedTextNodes = board.data.textNodes.map(tn => ({ ...tn }));
          Object.keys(layout).forEach(nodeId => {
              const node = nodes.find(n => n.id === nodeId); const newPos = layout[nodeId];
              if (newPos !== undefined) {
                  if (node?.type === 'task') mergedLayout[nodeId] = newPos;
                  else if (node?.type === 'text') { const tnIndex = updatedTextNodes.findIndex(tn => tn.id === nodeId); if (tnIndex > -1) { const textNodeToUpdate = updatedTextNodes[tnIndex]; if (textNodeToUpdate !== undefined) { textNodeToUpdate.x = newPos.x; textNodeToUpdate.y = newPos.y; } } }
              }
          });
          await plugin.saveBoardData(activeBoardId, { layout: mergedLayout, textNodes: updatedTextNodes });
      }

      new Notice("Smart layout applied.");
      
      const activeNodesToFocus = nodes.filter(n => { if (isTaskNode(n)) return !(n.data.status === 'x' || n.data.customStatus === 'finished'); return false; });
      const nodesToFit = activeNodesToFocus.length > 0 ? activeNodesToFocus : nodes;
      const fitViewNodes = nodesToFit.map(n => ({ id: n.id }));

      setTimeout(() => { reactFlowInstance.fitView({ nodes: fitViewNodes, duration: 800, padding: 0.1 }); }, 50);
  };

  const layoutRef = React.useRef(handleAutoLayout);
  layoutRef.current = handleAutoLayout;
  React.useEffect(() => {
      view.triggerLayout = () => { void layoutRef.current(); };
      return () => { view.triggerLayout = undefined; };
  }, [view]);

  const handleResetView = () => { 
      setConfirmReq({
          message: "Clear all positions?",
          action: () => {
              void (async () => {
                  const board = plugin.settings.boards.find(b => b.id === activeBoardId);
                  if (board) {
                      const newLayout = {};
                      const newTextNodes = board.data.textNodes.map((tn, index) => ({ ...tn, x: (index % 3) * 320, y: Math.floor(index / 3) * 200 }));
                      await plugin.saveBoardData(activeBoardId, { layout: newLayout, textNodes: newTextNodes }); 
                      setRefreshKey(prev => prev + 1); 
                      new Notice("View reset."); 
                      setTimeout(() => reactFlowInstance.fitView({ duration: 800, padding: 0.1 }), 100);
                  }
              })();
          }
      });
  };
  
  const handleSidebarClick = (nodeId: string) => { const node = nodes.find(n => n.id === nodeId); if (node) { reactFlowInstance.setCenter(node.position.x + 120, node.position.y + 60, { zoom: 1.2, duration: 800 }); setNodes(nds => nds.map(n => ({ ...n, selected: n.id === nodeId }))); } };

  return (
    <div className={`task-graph-container ${isConnecting ? 'is-connecting' : ''}`} onContextMenu={onPaneContextMenu}>
      <TaskSidebar nodes={nodes} onNodeCenter={handleSidebarClick} onStatusChange={updateNodeStatus} />
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onConnectStart={onConnectStart} onConnectEnd={onConnectEnd}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={onMoveEnd} 
        onEdgeContextMenu={onEdgeContextMenu} 
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes} 
        defaultEdgeOptions={{ type: 'default', style: { strokeWidth: 2, stroke: 'var(--interactive-accent)' } }}
        fitView minZoom={0.1} maxZoom={4}
        nodesDraggable={true} nodesConnectable={true} elementsSelectable={true}
        snapToGrid={true} snapGrid={[24, 24]}
        proOptions={{ hideAttribution: true }}
        panOnScroll={true} zoomOnScroll={true} preventScrolling={false}
        selectionOnDrag={true} selectionMode={SelectionMode.Partial} panOnDrag={[1]} panActivationKeyCode="Space" multiSelectionKeyCode="Shift"
        connectionLineStyle={{ stroke: 'var(--interactive-accent)', strokeWidth: 2, strokeDasharray: '5,5' }}
        connectionLineType={ConnectionLineType.Bezier}
      >
        <Background gap={24} color="rgba(150,150,150,0.1)" size={1.5} />
        
        <ControlPanel boards={plugin.settings.boards} activeBoardId={activeBoardId} onSwitchBoard={handleSwitchBoard} onAddBoard={handleAddBoard} onRenameBoard={handleRenameBoard} onDeleteBoard={handleDeleteBoard} onAutoLayout={handleAutoLayout} onResetView={handleResetView} currentBoard={activeBoard} onUpdateFilter={handleUpdateFilter} onApplyFilters={handleApplyFilters} onRequestConfirm={(msg: string, action: () => void) => setConfirmReq({ message: msg, action })} allTags={allTags} allFolders={allFolders} />
        <GraphToolbar />
        
        <Panel position="bottom-right" style={{ position: 'absolute', bottom: '20px', right: '70px', zIndex: 99, pointerEvents: 'none' }}>
            <div style={{ position: 'relative', pointerEvents: 'all' }}>
                <button
                    className="task-graph-help-btn"
                    onClick={() => setShowHelp(prev => !prev)}
                    title="Help"
                >
                    ?
                </button>
                {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
            </div>
        </Panel>
      </ReactFlow>

      {editTarget && (
          <EditTaskModal initialText={editTarget.text} onClose={() => setEditTarget(null)} onSave={(text) => { void saveTaskEdit(text); }} allTags={allTags} />
      )}

      {createTarget && (
          <EditTaskModal initialText="" onClose={() => setCreateTarget(null)} onSave={(text) => { void handleCreateTask(text); }} allTags={allTags} />
      )}

      {confirmReq && (
          <ConfirmModal message={confirmReq.message} onConfirm={confirmReq.action} onClose={() => setConfirmReq(null)} />
      )}
    </div>
  );
};

const TaskGraphWithProvider = ({ plugin, view }: { plugin: TaskGraphPlugin, view: TaskGraphView }) => { return ( <ReactFlowProvider> <TaskGraphComponent plugin={plugin} view={view} /></ReactFlowProvider> ); };

export class TaskGraphView extends ItemView {
  plugin: TaskGraphPlugin; root: Root | null = null;
  triggerLayout?: () => void;

  constructor(leaf: WorkspaceLeaf, plugin: TaskGraphPlugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return VIEW_TYPE_TASK_GRAPH; } getDisplayText() { return "Spatial task graph"; } getIcon() { return "network"; }
  
  onOpen(): Promise<void> { 
      const container = this.containerEl.children[1] as HTMLElement; 
      if (container) {
          container.empty(); 
          container.setAttr('style', 'height: 100%; width: 100%; overflow: hidden;'); 
          this.root = createRoot(container); 
          this.root.render(<React.StrictMode><TaskGraphWithProvider plugin={this.plugin} view={this} /></React.StrictMode>); 
      }
      return Promise.resolve();
  }
  refresh() { if (this.plugin.viewRefresh) this.plugin.viewRefresh(); }
  onClose(): Promise<void> { 
      this.root?.unmount(); 
      return Promise.resolve();
  }
}