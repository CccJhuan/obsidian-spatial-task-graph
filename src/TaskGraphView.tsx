import { ItemView, WorkspaceLeaf, Menu, Notice, TFile } from 'obsidian';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import ReactFlow, { 
  Background, 
  MiniMap, 
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
  OnConnectStart,
  OnConnectEnd
} from 'reactflow';

import TaskGraphPlugin, { GraphBoard } from './main';

export const VIEW_TYPE_TASK_GRAPH = 'task-graph-view';

// 🌟 核心样式：React Flow 基础
const REACT_FLOW_CORE_STYLES = `
    .react-flow{direction:ltr;width:100%;height:100%;position:relative;z-index:0;overflow:hidden}
    .react-flow__background{background-color:transparent;z-index:-1;width:100%;height:100%;top:0;left:0;position:absolute}
    .react-flow__container{position:absolute;width:100%;height:100%;top:0;left:0}
    .react-flow__pane{z-index:1;cursor:grab;width:100%;height:100%;top:0;left:0;position:absolute}
    .react-flow__pane.dragging{cursor:grabbing}
    .react-flow__viewport{transform-origin:0 0;z-index:2;pointer-events:none;width:100%;height:100%;top:0;left:0;position:absolute}
    .react-flow__renderer{z-index:4}
    .react-flow__selection{z-index:1001;position:absolute;top:0;left:0;pointer-events:none}
    .react-flow__nodes{pointer-events:none;transform-origin:0 0}
    .react-flow__node{position:absolute;user-select:none;pointer-events:all;transform-origin:0 0;box-sizing:border-box;cursor:default}
    .react-flow__edges{pointer-events:none;overflow:visible}
    .react-flow__edge{pointer-events:all}
    .react-flow__edge-text{pointer-events:none;user-select:none}
    .react-flow__handle{position:absolute;pointer-events:all;min-width:5px;min-height:5px;width:6px;height:6px;background:#555;border:1px solid #fff;border-radius:100%;z-index:1}
    .react-flow__minimap{z-index:5}
    .react-flow__panel{z-index:10; position:absolute; pointer-events:none;}
    
    .react-flow__selection {
        background: rgba(var(--interactive-accent-rgb), 0.1);
        border: 1px solid var(--interactive-accent);
        border-radius: 6px;
    }
`;

// 🌟 自定义样式
const CUSTOM_STYLES = `
    .task-graph-container { width: 100%; height: 100%; position: relative; background: var(--background-primary); font-family: var(--font-interface); color: var(--text-normal); }
    
    input[type="checkbox"].custom-checkbox {
        appearance: none; -webkit-appearance: none;
        width: 18px; height: 18px;
        border: 1.5px solid var(--text-muted);
        border-radius: 50%;
        margin: 0 8px 0 0; padding: 0;
        cursor: pointer;
        position: relative;
        display: inline-flex; align-items: center; justify-content: center;
        background-color: transparent;
        flex-shrink: 0;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    input[type="checkbox"].custom-checkbox:hover {
        border-color: var(--interactive-accent);
        background-color: rgba(var(--interactive-accent-rgb), 0.1);
    }
    input[type="checkbox"].custom-checkbox:checked {
        background-color: var(--interactive-accent);
        border-color: var(--interactive-accent);
    }
    input[type="checkbox"].custom-checkbox:checked::after {
        content: '';
        width: 100%; height: 100%;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>');
        background-size: 12px;
        background-position: center;
        background-repeat: no-repeat;
    }

    input[type="checkbox"].filter-checkbox {
        appearance: none; -webkit-appearance: none;
        width: 14px; height: 14px;
        border: 1px solid var(--text-muted);
        border-radius: 4px;
        margin-right: 6px;
        cursor: pointer;
        position: relative;
    }
    input[type="checkbox"].filter-checkbox:checked {
        background-color: var(--text-normal);
        border-color: var(--text-normal);
    }
    input[type="checkbox"].filter-checkbox:checked::after {
        content: ''; position: absolute; top: 1px; left: 4px; width: 4px; height: 8px;
        border: solid var(--background-primary); border-width: 0 2px 2px 0; transform: rotate(45deg);
    }

    .custom-handle {
        width: 24px !important; height: 24px !important; background: transparent !important; border: none !important;
        display: flex; align-items: center; justify-content: center; z-index: 20 !important;
    }
    .custom-handle::after {
        content: ""; display: block; width: 10px; height: 10px; border-radius: 50%;
        background: var(--text-muted); border: 2px solid var(--background-primary); transition: transform 0.2s, background 0.2s;
    }
    .custom-handle:hover::after { transform: scale(1.2); background: var(--interactive-accent); }
    .custom-handle-right::after { background: var(--interactive-accent); }
    
    .task-node-wrapper {
        position: relative; width: 240px; height: auto; min-height: 80px;
        background: var(--background-secondary); border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05);
        transition: all 0.2s; border: 1px solid var(--background-modifier-border);
        overflow: hidden; display: flex; flex-direction: column;
    }
    .task-node-wrapper:hover { transform: translateY(-2px) scale(1.01); box-shadow: 0 12px 24px rgba(0,0,0,0.12); z-index: 10; }
    .react-flow__node.selected .task-node-wrapper { border: 1px solid var(--interactive-accent); box-shadow: 0 0 0 3px rgba(var(--interactive-accent-rgb), 0.2); }

    .text-node-wrapper {
        min-width: 150px; max-width: 300px; background: var(--background-primary-alt); color: var(--text-normal);
        border-radius: 8px; padding: 12px; font-family: var(--font-text);
        box-shadow: 0 4px 10px rgba(0,0,0,0.1); text-align: center; position: relative; transform: rotate(-1deg); height: auto;
        border: 1px dashed var(--text-accent);
    }
    .text-node-textarea { background: transparent; border: none; color: inherit; width: 100%; text-align: center; resize: none; font-size: 14px; outline: none; overflow: hidden; }

    .node-tag { font-size: 10px; padding: 3px 8px; border-radius: 12px; font-weight: 600; background-color: var(--background-modifier-active-hover); color: var(--text-muted); }
    .edit-btn { opacity: 0; transition: all 0.2s; cursor: pointer; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--background-modifier-hover); color: var(--text-normal); flex-shrink: 0; }
    .task-node-wrapper:hover .edit-btn { opacity: 1; }
    .edit-btn:hover { background: var(--interactive-accent); color: white; }

    .edit-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; pointer-events: all; }
    .edit-modal { 
        background: var(--background-primary); padding: 24px; border-radius: 16px; width: 480px; 
        box-shadow: 0 20px 40px rgba(0,0,0,0.3); 
        display: flex; flex-direction: column;
        gap: 16px; 
        border: 1px solid var(--background-modifier-border); position: relative;
    }
    
    .suggestion-list {
        position: absolute; background: var(--background-primary); border: 1px solid var(--background-modifier-border);
        border-radius: 8px; box-shadow: 0 8px 16px rgba(0,0,0,0.2); max-height: 150px; overflow-y: auto;
        z-index: 200; width: 200px;
    }
    .suggestion-item {
        padding: 6px 12px; font-size: 13px; cursor: pointer; color: var(--text-normal);
        display: flex; align-items: center; gap: 6px;
    }
    .suggestion-item:hover, .suggestion-item.selected { background: var(--interactive-accent); color: white; }
    
    .metadata-toolbar { display: flex; gap: 8px; padding: 8px 0; border-top: 1px solid var(--background-modifier-border); margin-top: -8px; }
    .metadata-btn { padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 14px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); transition: all 0.1s; display: flex; align-items: center; gap: 4px; color: var(--text-muted); }
    .metadata-btn:hover { background: var(--background-modifier-hover); color: var(--text-normal); transform: translateY(-1px); }
    .metadata-label { font-size: 11px; }

    .task-sidebar { position: absolute; top: 10px; left: 10px; bottom: 10px; width: 240px; background: var(--background-secondary); opacity: 0.95; backdrop-filter: blur(20px); border-radius: 16px; border: 1px solid var(--background-modifier-border); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); z-index: 20; display: flex; flex-direction: column; padding: 16px; pointer-events: all; overflow: hidden; }
    .sidebar-section { margin-bottom: 16px; flex: 1; min-height: 0; display: flex; flex-direction: column; }
    .sidebar-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; }
    .sidebar-list { overflow-y: auto; flex: 1; padding-right: 4px; scrollbar-width: thin; transition: background 0.2s; border-radius: 8px; }
    .sidebar-list.drag-over { background: rgba(var(--interactive-accent-rgb), 0.1); border: 2px dashed var(--interactive-accent); }
    .sidebar-item { font-size: 12px; padding: 8px 10px; margin-bottom: 6px; background: var(--background-primary); border-radius: 8px; cursor: grab; transition: all 0.2s; border-left: 3px solid transparent; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-normal); }
    .sidebar-item:active { cursor: grabbing; }
    .sidebar-item:hover { background: var(--background-modifier-hover); transform: translateX(2px); }
    .item-in-progress { border-left-color: #34c759; } .item-pending { border-left-color: #ff9500; } .item-backlog { border-left-color: #8e8e93; }
    .react-flow__panel > * { pointer-events: all; }
`;

const STATUS_COLORS = { 'in_progress': '#34c759', 'pending': '#ff9500', 'finished': '#af52de', 'blocked': '#ff3b30', 'backlog': '#8e8e93', 'default': 'var(--text-muted)' };
const extractTags = (text: string) => { if (!text) return { tags: [], cleanText: '' }; const tagRegex = /#[\w\u4e00-\u9fa5]+(\/[\w\u4e00-\u9fa5]+)*/g; const tags = text.match(tagRegex) || []; const cleanText = text.replace(tagRegex, '').trim(); return { tags, cleanText }; };

// --- 组件：任务节点 ---
const TaskNode = ({ data, isConnectable }: { data: any, isConnectable: boolean }) => {
  const { tags, cleanText } = extractTags(data.label);
  const statusColor = STATUS_COLORS[data.customStatus as keyof typeof STATUS_COLORS] || STATUS_COLORS['default'];
  
  const handleCheckboxClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      data.onToggleStatus(data.id, data.status);
  };

  return (
    <div className="task-node-wrapper">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="custom-handle" style={{ left: '-12px', top: '50%', transform: 'translateY(-50%)' }} />
      <div style={{ height: '6px', width: '100%', background: statusColor, opacity: 0.8, flexShrink: 0 }}></div>
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: '600', color: statusColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{data.customStatus === 'default' ? 'TASK' : data.customStatus.replace('_', ' ')}</span>
            <div className="edit-btn" onClick={(e) => { e.stopPropagation(); data.onEdit(data); }} title="Edit">✎</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <input 
                type="checkbox" 
                className="custom-checkbox"
                checked={data.status === 'x'} 
                onChange={() => {}} 
                onClick={handleCheckboxClick}
                style={{ marginTop: '3px' }}
            />
            <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-normal)', fontWeight: '500', marginBottom: '10px', wordBreak: 'break-word', whiteSpace: 'pre-wrap', opacity: (data.status === 'x' ? 0.6 : 1), textDecoration: (data.status === 'x' ? 'line-through' : 'none') }}>{cleanText || data.label}</div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>{tags.map((tag, i) => (<span key={i} className="node-tag">{tag}</span>))}</div>
              <span title={data.file} style={{ fontSize: '9px', color: 'var(--text-muted)', maxWidth: '80px', wordBreak: 'break-word', textAlign: 'right', lineHeight: '1.2' }}>{data.file}</span>
          </div>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="custom-handle custom-handle-right" style={{ right: '-12px', top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  );
};

const TextNode = ({ data, isConnectable }: { data: any, isConnectable: boolean }) => {
    const [text, setText] = React.useState(data.label);
    const handleBlur = () => { if (text !== data.label) data.onSave(data.id, text); };
    const rows = Math.max(1, text.split('\n').length);
    
    const stopKeys = (e: React.KeyboardEvent) => e.stopPropagation();

    return (
        <div className="text-node-wrapper">
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="custom-handle" style={{ left: '-12px', top: '50%', transform: 'translateY(-50%)' }} />
            <textarea 
                className="text-node-textarea" 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                onBlur={handleBlur} 
                rows={rows} 
                placeholder="Note..." 
                onMouseDown={(e) => e.stopPropagation()} 
                onKeyDown={stopKeys} 
                onKeyUp={stopKeys}
                style={{ height: 'auto' }} 
            />
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="custom-handle custom-handle-right" style={{ right: '-12px', top: '50%', transform: 'translateY(-50%)' }} />
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="custom-handle" style={{ bottom: '-12px', left: '50%', transform: 'translateX(-50%)' }} />
        </div>
    );
};

const nodeTypes = { task: TaskNode, text: TextNode };

const EditTaskModal = ({ initialText, onClose, onSave, allTags }: { initialText: string, onClose: () => void, onSave: (text: string) => void, allTags: string[] }) => {
    const [text, setText] = React.useState(initialText);
    const [suggestions, setSuggestions] = React.useState<string[]>([]);
    const [suggestionPos, setSuggestionPos] = React.useState({ top: 0, left: 0 });
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value; setText(val);
        const cursorPos = e.target.selectionStart; const textBeforeCursor = val.slice(0, cursorPos); const match = textBeforeCursor.match(/#([\w\u4e00-\u9fa5]*)$/);
        if (match) { const query = match[1].toLowerCase(); const filtered = allTags.filter(t => t.toLowerCase().includes(query)).slice(0, 10); if (filtered.length > 0) { setSuggestions(filtered); setSuggestionPos({ top: 140, left: 30 }); } else { setSuggestions([]); } } else { setSuggestions([]); }
    };
    const insertTag = (tag: string) => { const cursorPos = textareaRef.current?.selectionStart || text.length; const textBeforeCursor = text.slice(0, cursorPos); const textAfterCursor = text.slice(cursorPos); const lastHashIndex = textBeforeCursor.lastIndexOf('#'); const newText = textBeforeCursor.slice(0, lastHashIndex) + '#' + tag + ' ' + textAfterCursor; setText(newText); setSuggestions([]); textareaRef.current?.focus(); };
    const insertMetadata = (symbol: string) => { const newText = text + ` ${symbol} `; setText(newText); textareaRef.current?.focus(); };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation(); 
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(text); }
    };

    return (
        <div className="edit-overlay" onClick={onClose}>
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: 0, fontWeight: 600, color: 'var(--text-normal)' }}>Edit Task</h3>
                <div style={{ position: 'relative' }}>
                    <textarea 
                        ref={textareaRef} 
                        value={text} 
                        onChange={handleInput}
                        onKeyDown={handleKeyDown} 
                        onKeyUp={(e) => e.stopPropagation()} 
                        style={{ width: '100%', height: '120px', resize: 'vertical', padding: '12px', borderRadius: '8px', border: '1px solid var(--background-modifier-border)', fontSize: '14px', lineHeight: '1.5', background: 'var(--background-secondary)', color: 'var(--text-normal)' }} 
                        placeholder="Task description..." 
                        autoFocus
                    />
                    {suggestions.length > 0 && (<div className="suggestion-list" style={{ top: suggestionPos.top, left: suggestionPos.left }}>{suggestions.map(tag => (<div key={tag} className="suggestion-item" onClick={() => insertTag(tag)}><span style={{opacity:0.6}}>#</span> {tag}</div>))}</div>)}
                </div>
                <div className="metadata-toolbar">
                    <div className="metadata-btn" onClick={() => insertMetadata('📅')} title="Due Date">📅 <span className="metadata-label">Due</span></div>
                    <div className="metadata-btn" onClick={() => insertMetadata('🛫')} title="Start Date">🛫 <span className="metadata-label">Start</span></div>
                    <div className="metadata-btn" onClick={() => insertMetadata('⏳')} title="Scheduled">⏳ <span className="metadata-label">Sched</span></div>
                    <div className="metadata-btn" onClick={() => insertMetadata('🔁')} title="Recurring">🔁 <span className="metadata-label">Recur</span></div>
                    <div style={{ width: 1, height: 16, background: 'var(--background-modifier-border)', margin: '0 4px' }}></div>
                    <div className="metadata-btn" onClick={() => insertMetadata('🔺')} title="High Priority">🔺</div>
                    <div className="metadata-btn" onClick={() => insertMetadata('🔼')} title="Medium Priority">🔼</div>
                    <div className="metadata-btn" onClick={() => insertMetadata('🔽')} title="Low Priority">🔽</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto' }}><button onClick={onClose} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--background-modifier-border)', background: 'transparent', color: 'var(--text-normal)' }}>Cancel</button><button onClick={() => onSave(text)} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: 'var(--interactive-accent)', color: 'white', fontWeight: 500 }}>Save</button></div>
            </div>
        </div>
    );
};

const TaskSidebar = ({ nodes, onNodeClick, onStatusChange }: { nodes: Node[], onNodeClick: (nodeId: string) => void, onStatusChange: (id: string, status: string) => void }) => {
    const tasks = nodes.filter(n => n.type === 'task');
    const inProgress = tasks.filter(n => n.data.customStatus === 'in_progress');
    const pending = tasks.filter(n => n.data.customStatus === 'pending');
    const backlog = tasks.filter(n => n.data.customStatus === 'backlog' || n.data.customStatus === 'default' || !n.data.customStatus);
    const stopProp = (e: React.MouseEvent | React.WheelEvent) => e.stopPropagation();

    const handleDragStart = (e: React.DragEvent, nodeId: string) => {
        e.dataTransfer.setData('nodeId', nodeId); e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault(); const nodeId = e.dataTransfer.getData('nodeId'); if (nodeId) onStatusChange(nodeId, targetStatus);
    };

    const renderList = (title: string, items: Node[], color: string, className: string, statusKey: string) => (
        <div className="sidebar-section" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, statusKey)}>
            <div className="sidebar-title" style={{ color: color }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: color }}></div>{title} <span style={{ opacity: 0.5 }}>({items.length})</span></div>
            <div className="sidebar-list">
                {items.map(node => (
                    <div key={node.id} className={`sidebar-item item-${className}`} onClick={() => onNodeClick(node.id)} draggable onDragStart={(e) => handleDragStart(e, node.id)}>{node.data.label.replace(/#\S+/g, '').trim()}</div>
                ))}
                {items.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text-faint)', paddingLeft: '10px' }}>Empty - Drop here</div>}
            </div>
        </div>
    );
    return (<div className="task-sidebar" onMouseDown={stopProp} onWheel={stopProp} onContextMenu={stopProp}><div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-normal)' }}>My Tasks</div>{renderList('In Progress', inProgress, STATUS_COLORS['in_progress'], 'in-progress', 'in_progress')}{renderList('Pending', pending, STATUS_COLORS['pending'], 'pending', 'pending')}{renderList('Backlog', backlog, STATUS_COLORS['backlog'], 'backlog', 'backlog')}</div>);
};

const GraphToolbar = () => {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
    const btnStyle: React.CSSProperties = { width: '32px', height: '32px', background: 'var(--background-secondary)', border: '1px solid var(--background-modifier-border)', color: 'var(--text-normal)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '8px' };
    return (<Panel position="top-right" style={{ margin: '10px', display: 'flex', flexDirection: 'column', pointerEvents: 'all' }} onMouseDown={stopPropagation}><button style={btnStyle} onClick={() => zoomIn()} title="Zoom In"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button><button style={btnStyle} onClick={() => zoomOut()} title="Zoom Out"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button><button style={btnStyle} onClick={() => fitView()} title="Fit View"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg></button></Panel>);
};

const ControlPanel = ({ boards, activeBoardId, onSwitchBoard, onAddBoard, onRenameBoard, onDeleteBoard, onAutoLayout, onResetView, currentBoard, onUpdateFilter }: any) => {
    const [showFilters, setShowFilters] = React.useState(false);
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [tempName, setTempName] = React.useState('');
    React.useEffect(() => { setIsRenaming(false); setTempName(currentBoard?.name || ''); }, [currentBoard]);
    const handleSaveName = () => { if (tempName.trim()) onRenameBoard(tempName); setIsRenaming(false); };
    const handleDelete = () => { if (boards.length <= 1) { new Notice("Cannot delete the only board."); return; } if (window.confirm(`Delete board "${currentBoard.name}"?`)) onDeleteBoard(activeBoardId); };
    const stopPropagation = (e: React.MouseEvent | React.KeyboardEvent) => { e.stopPropagation(); };
    const stopKeys = (e: React.KeyboardEvent) => e.stopPropagation();

    const btnStyle = { background: 'var(--background-secondary)', border: '1px solid var(--background-modifier-border)', color: 'var(--text-normal)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', fontWeight: '500' };
    const activeBtnStyle = { ...btnStyle, background: 'var(--interactive-accent)', color: 'white', border: 'none', boxShadow: '0 2px 8px rgba(var(--interactive-accent-rgb), 0.3)' };
    const inputStyle = { background: 'var(--background-modifier-form-field)', border: 'none', color: 'var(--text-normal)', padding: '8px', borderRadius: '8px', width: '100%', marginBottom: '8px', fontSize: '12px' };
    
    return (<Panel position="bottom-right" style={{ position: 'absolute', bottom: '20px', right: '20px', margin: 0, background: 'var(--background-secondary)', opacity: '0.98', padding: '16px', borderRadius: '20px', border: '1px solid var(--background-modifier-border)', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', cursor: 'default', zIndex: 100 }} onMouseDown={stopPropagation} onClick={stopPropagation}><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>{isRenaming ? (<><input value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={stopKeys} onKeyUp={stopKeys} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} autoFocus /><button style={activeBtnStyle} onClick={handleSaveName}>Save</button></>) : (<><select value={activeBoardId} onChange={(e) => onSwitchBoard(e.target.value)} style={{ ...btnStyle, flex: 1, textOverflow: 'ellipsis', background: 'transparent', border: '1px solid var(--background-modifier-border)' }}>{boards.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><button style={btnStyle} onClick={() => setIsRenaming(true)} title="Rename">✎</button><button style={btnStyle} onClick={onAddBoard} title="New">+</button></>)}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}><button style={btnStyle} onClick={onAutoLayout}>⚡ Layout</button><button style={showFilters ? activeBtnStyle : btnStyle} onClick={() => setShowFilters(!showFilters)}>Filters</button></div><div style={{ display: 'flex', gap: '8px' }}><button style={{...btnStyle, flex:1, color: '#ff3b30'}} onClick={onResetView}>Reset</button><button style={{...btnStyle, flex:1, color: '#ff3b30'}} onClick={handleDelete}>Delete</button></div>{showFilters && currentBoard && (<div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid var(--background-modifier-border)' }}><input style={inputStyle} placeholder="Filter Tags..." value={currentBoard.filters.tags.join(', ')} onChange={(e) => onUpdateFilter('tags', e.target.value)} onKeyDown={stopKeys} onKeyUp={stopKeys} /><input style={inputStyle} placeholder="Filter Path..." value={currentBoard.filters.folders.join(', ')} onChange={(e) => onUpdateFilter('folders', e.target.value)} onKeyDown={stopKeys} onKeyUp={stopKeys} /><div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>{[' ', '/', 'x'].map(status => (<label key={status} style={{fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-normal)'}}><input type="checkbox" className="filter-checkbox" checked={currentBoard.filters.status.includes(status)} onChange={() => onUpdateFilter('status', status)} /> {status === ' ' ? 'Todo' : status === '/' ? 'Doing' : 'Done'}</label>))}</div></div>)}</Panel>);
};

// --- 主图表组件 ---
const TaskGraphComponent = ({ plugin }: { plugin: TaskGraphPlugin }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeBoardId, setActiveBoardId] = React.useState(plugin.settings.lastActiveBoardId);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [editTarget, setEditTarget] = React.useState<{id: string, text: string, path: string, line: number} | null>(null);
  const [createTarget, setCreateTarget] = React.useState<{ sourceNodeId: string, sourcePath: string } | null>(null);
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const reactFlowInstance = useReactFlow();
  const connectionStartRef = React.useRef<{ nodeId: string | null; handleType: string | null }>({ nodeId: null, handleType: null });
  const connectionMadeRef = React.useRef(false);
  
  React.useEffect(() => {
    const styleId = 'task-graph-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = styleId; document.head.appendChild(styleEl); }
    styleEl.innerHTML = REACT_FLOW_CORE_STYLES + CUSTOM_STYLES;
  }, []);

  const activeBoard = plugin.settings.boards.find(b => b.id === activeBoardId) || plugin.settings.boards[0];

  React.useEffect(() => {
      // @ts-ignore
      plugin.viewRefresh = () => setRefreshKey(prev => prev + 1);
  }, []);

  React.useEffect(() => {
    const loadData = async () => {
      // @ts-ignore
      const tags: Record<string, number> = plugin.app.metadataCache.getTags();
      setAllTags(Object.keys(tags).map(t => t.replace('#', '')));
      const tasks = await plugin.getTasks(activeBoardId);
      const boardConfig = plugin.settings.boards.find(b => b.id === activeBoardId);
      const savedLayout = boardConfig?.data.layout || {};
      const savedEdges = boardConfig?.data.edges || [];
      const savedNodeStatus = boardConfig?.data.nodeStatus || {};
      const savedTextNodes = boardConfig?.data.textNodes || [];

      const taskNodes: Node[] = tasks.map((t, index) => {
        let posX = savedLayout[t.id]?.x;
        let posY = savedLayout[t.id]?.y;
        if (typeof posX !== 'number' || isNaN(posX)) { posX = (index % 3) * 320; posY = Math.floor(index / 3) * 200; }
        
        let finalCustomStatus = savedNodeStatus[t.id] || 'default';
        if (t.status === 'x') finalCustomStatus = 'finished';

        return {
            id: t.id, type: 'task', position: { x: posX, y: posY },
            data: { 
                id: t.id, label: t.text, status: t.status, file: t.file, path: t.path, line: t.line, 
                customStatus: finalCustomStatus, 
                onEdit: handleEditTask, onToggleStatus: handleToggleTask 
            }
        };
      });

      const textNodes: Node[] = savedTextNodes.map(tn => ({
          id: tn.id, type: 'text', position: { x: tn.x, y: tn.y },
          data: { id: tn.id, label: tn.text, onSave: handleSaveTextNode }
      }));

      setNodes([...taskNodes, ...textNodes]);
      setEdges(savedEdges);
    };
    loadData();
  }, [plugin, activeBoardId, refreshKey]);

  const onConnectStart = React.useCallback((event: any, params: any) => { connectionStartRef.current = params; connectionMadeRef.current = false; }, []);
  const onConnectEnd = React.useCallback((event: any) => {
      if (connectionMadeRef.current) return;
      const targetIsPane = event.target.classList.contains('react-flow__pane');
      if (targetIsPane && connectionStartRef.current.nodeId) {
          const sourceNodeId = connectionStartRef.current.nodeId;
          const sourceNode = nodes.find(n => n.id === sourceNodeId);
          if (sourceNode && sourceNode.type === 'task' && sourceNode.data.path) {
              setCreateTarget({ sourceNodeId, sourcePath: sourceNode.data.path });
          }
      }
  }, [nodes]);

  const handleToggleTask = async (id: string, currentStatus: string) => {
      const node = nodes.find(n => n.id === id); if (!node) return;
      const newStatus = (currentStatus === ' ' || currentStatus === '/') ? 'x' : ' ';
      const newCustomStatus = newStatus === 'x' ? 'finished' : 'backlog'; 
      setNodes(nds => nds.map(n => { if (n.id === id) { return { ...n, data: { ...n.data, status: newStatus, customStatus: newCustomStatus } }; } return n; }));
      const board = plugin.settings.boards.find(b => b.id === activeBoardId); if (board) { const nodeStatus = board.data.nodeStatus || {}; nodeStatus[id] = newCustomStatus; await plugin.saveBoardData(activeBoardId, { nodeStatus }); }
      const file = plugin.app.vault.getAbstractFileByPath(node.data.path);
      if (file instanceof TFile) {
           const content = await plugin.app.vault.read(file); const lines = content.split('\n');
           if (lines.length > node.data.line) {
               let line = lines[node.data.line]; line = line.replace(/(- \[)(.)(\])/, `$1${newStatus}$3`);
               const today = new Date(); const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
               const completionTag = ` ✅ ${dateStr}`; const completionRegex = / ✅ \d{4}-\d{2}-\d{2}/g;
               if (newStatus === 'x') { if (!completionRegex.test(line)) { line = line.trimEnd() + completionTag; } } else { line = line.replace(completionRegex, ''); }
               lines[node.data.line] = line; await plugin.app.vault.modify(file, lines.join('\n'));
           }
      }
  };

  const updateNodeStatus = async (nodeId: string, status: string) => { setNodes((nds) => nds.map((n) => { if (n.id === nodeId) return { ...n, data: { ...n.data, customStatus: status } }; return n; })); const board = plugin.settings.boards.find(b => b.id === activeBoardId); if (board) { const nodeStatus = (board.data as any).nodeStatus || {}; nodeStatus[nodeId] = status; await plugin.saveBoardData(activeBoardId, { nodeStatus } as any); } };

  // 🌟 核心修复：创建任务时，立即写入位置和连线
  const handleCreateTask = async (text: string) => {
      if (!createTarget) return;
      const newId = await plugin.appendTaskToFile(createTarget.sourcePath, text);
      if (newId) {
          // 1. 获取父节点位置
          const parentNode = nodes.find(n => n.id === createTarget.sourceNodeId);
          let newX = 0, newY = 0;
          if (parentNode) {
              newX = parentNode.position.x + 400; // 放在右侧
              newY = parentNode.position.y;
          }

          // 2. 构造新的连线
          const newEdge = { id: `e${createTarget.sourceNodeId}-${newId}`, source: createTarget.sourceNodeId, target: newId, animated: true, style: { stroke: 'var(--text-accent)', strokeWidth: 2 } };
          
          // 3. 立即保存所有数据 (Edge + Layout)
          const board = plugin.settings.boards.find(b => b.id === activeBoardId);
          if (board) {
              const edges = [...board.data.edges, newEdge];
              const layout = { ...board.data.layout, [newId]: { x: newX, y: newY } };
              
              // 关键：同时保存 edges 和 layout，确保刷新后两者都有
              // 我们需要合并 save 操作或者手动更新 settings
              board.data.edges = edges;
              board.data.layout = layout;
              await plugin.saveSettings(); // 保存整个设置
          }
          
          setCreateTarget(null); new Notice("Creating task...");
          // 触发刷新，loadData 会读到刚才保存的 edge 和 layout
          setRefreshKey(prev => prev + 1);
      }
  };

  const onConnect = React.useCallback((params: Connection) => { connectionMadeRef.current = true; setEdges((eds) => { const newEdges = addEdge({ ...params, animated: true, style: { stroke: 'var(--text-accent)', strokeWidth: 2 } }, eds); plugin.saveBoardData(activeBoardId, { edges: newEdges }); return newEdges; }); }, [plugin, activeBoardId, setEdges]);
  const onNodeDragStop = React.useCallback((event: any, node: Node) => { setNodes((nds) => nds.map(n => n.id === node.id ? node : n)); const board = plugin.settings.boards.find(b => b.id === activeBoardId); if(!board) return; if (node.type === 'task') { const layout = { ...board.data.layout, [node.id]: node.position }; plugin.saveBoardData(activeBoardId, { layout }); } else if (node.type === 'text') { const textNodes = board.data.textNodes.map(tn => tn.id === node.id ? { ...tn, x: node.position.x, y: node.position.y } : tn); plugin.saveBoardData(activeBoardId, { textNodes }); } }, [plugin, activeBoardId, setNodes]);
  const handleSaveTextNode = async (id: string, text: string) => { const board = plugin.settings.boards.find(b => b.id === activeBoardId); if(board) { const textNodes = board.data.textNodes.map(tn => tn.id === id ? { ...tn, text } : tn); await plugin.saveBoardData(activeBoardId, { textNodes }); } };
  const handleEditTask = (taskData: any) => { setEditTarget({ id: taskData.id, text: taskData.label, path: taskData.path, line: taskData.line }); };
  const saveTaskEdit = async (text: string) => { if (!editTarget) return; await plugin.updateTaskContent(editTarget.path, editTarget.line, text); setEditTarget(null); setRefreshKey(prev => prev + 1); };

  const onPaneContextMenu = React.useCallback((event: React.MouseEvent) => {
      event.preventDefault();
      const menu = new Menu();
      menu.addItem((item) => item.setTitle('Add Note').setIcon('sticky-note').onClick(async () => {
          const bounds = (event.target as HTMLElement).getBoundingClientRect();
          const position = reactFlowInstance.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
          const newNode = { id: `text-${Date.now()}`, text: 'New Note', x: position.x, y: position.y };
          const board = plugin.settings.boards.find(b => b.id === activeBoardId);
          if (board) { const textNodes = [...(board.data.textNodes || []), newNode]; await plugin.saveBoardData(activeBoardId, { textNodes }); setRefreshKey(prev => prev + 1); }
      }));
      menu.showAtPosition({ x: event.nativeEvent.clientX, y: event.nativeEvent.clientY });
  }, [plugin, activeBoardId, reactFlowInstance]);

  const onEdgeContextMenu = React.useCallback((event: React.MouseEvent, edge: Edge) => { event.preventDefault(); event.stopPropagation(); setEdges((eds) => { const newEdges = eds.filter((e) => e.id !== edge.id); plugin.saveBoardData(activeBoardId, { edges: newEdges }); return newEdges; }); new Notice("Connection removed"); }, [plugin, activeBoardId, setEdges]);
  const onNodeClick = React.useCallback((event: React.MouseEvent, node: Node) => { if (node.type === 'task' && node.data.path) plugin.app.workspace.openLinkText(node.data.path, '', false); }, [plugin]);
  
  const onNodeContextMenu = React.useCallback((event: React.MouseEvent, node: Node) => {
      event.preventDefault(); event.stopPropagation();
      const menu = new Menu();
      if (node.type === 'task') {
          const setStatus = (status: string) => handleToggleTask(node.id, node.data.status); 
          menu.addItem((item) => item.setTitle('⚪ Backlog').onClick(() => updateNodeStatus(node.id, 'backlog')));
          menu.addItem((item) => item.setTitle('🟡 Pending').onClick(() => updateNodeStatus(node.id, 'pending')));
          menu.addItem((item) => item.setTitle('🟢 In Progress').onClick(() => updateNodeStatus(node.id, 'in_progress')));
          menu.addItem((item) => item.setTitle('🔴 Blocked').onClick(() => updateNodeStatus(node.id, 'blocked')));
          menu.addItem((item) => item.setTitle('🟣 Finished').onClick(() => updateNodeStatus(node.id, 'finished')));
      } else if (node.type === 'text') {
          menu.addItem((item) => item.setTitle('🗑 Delete Note').onClick(async () => {
              const board = plugin.settings.boards.find(b => b.id === activeBoardId);
              if (board) { const textNodes = board.data.textNodes.filter(tn => tn.id !== node.id); await plugin.saveBoardData(activeBoardId, { textNodes }); setRefreshKey(prev => prev + 1); }
          }));
      }
      menu.showAtPosition({ x: event.nativeEvent.clientX, y: event.nativeEvent.clientY });
  }, [plugin, activeBoardId, nodes]);

  const handleSwitchBoard = (id: string) => { setActiveBoardId(id); plugin.settings.lastActiveBoardId = id; plugin.saveSettings(); };
  const handleAddBoard = async () => { const newBoard: GraphBoard = { id: Date.now().toString(), name: `Board ${plugin.settings.boards.length + 1}`, filters: { tags: [], excludeTags: [], folders: [], status: [' ', '/'] }, data: { layout: {}, edges: [], nodeStatus: {}, textNodes: [] } }; plugin.settings.boards.push(newBoard); handleSwitchBoard(newBoard.id); };
  const handleDeleteBoard = async (id: string) => { const newBoards = plugin.settings.boards.filter(b => b.id !== id); plugin.settings.boards = newBoards; const nextBoard = newBoards[0]; setActiveBoardId(nextBoard.id); plugin.settings.lastActiveBoardId = nextBoard.id; await plugin.saveSettings(); };
  const handleRenameBoard = async (newName: string) => { await plugin.updateBoardConfig(activeBoardId, { name: newName }); setRefreshKey(prev => prev + 1); };
  const handleUpdateFilter = async (type: string, value: string) => { const board = plugin.settings.boards.find(b => b.id === activeBoardId); if (!board) return; if (type === 'tags' || type === 'excludeTags' || type === 'folders') board.filters[type as 'tags' | 'excludeTags' | 'folders'] = value.split(',').map(s => s.trim()).filter(s => s); else if (type === 'status') { const statusChar = value; const index = board.filters.status.indexOf(statusChar); if (index > -1) board.filters.status.splice(index, 1); else board.filters.status.push(statusChar); } await plugin.saveSettings(); setRefreshKey(prev => prev + 1); };
  
  const handleAutoLayout = async () => {
      const adjacency: Record<string, string[]> = {}; const parents: Record<string, string[]> = {}; const inDegree: Record<string, number> = {};
      nodes.forEach(n => { adjacency[n.id] = []; parents[n.id] = []; inDegree[n.id] = 0; });
      edges.forEach(e => { if (adjacency[e.source]) { adjacency[e.source].push(e.target); if (!parents[e.target]) parents[e.target] = []; parents[e.target].push(e.source); inDegree[e.target] = (inDegree[e.target] || 0) + 1; } });
      const connectedNodeIds = new Set<string>(); edges.forEach(e => { connectedNodeIds.add(e.source); connectedNodeIds.add(e.target); });
      const mainNodes: string[] = []; const orphanFinishedNodes: string[] = [];
      nodes.forEach(n => { if (n.type !== 'task') { mainNodes.push(n.id); return; } const isFinished = n.data.status === 'x' || n.data.customStatus === 'finished'; const isOrphan = !connectedNodeIds.has(n.id); if (isFinished && isOrphan) { orphanFinishedNodes.push(n.id); } else { mainNodes.push(n.id); } });
      const layout: Record<string, {x: number, y: number}> = {}; const COL_WIDTH = 340; const ROW_HEIGHT = 200;
      if (mainNodes.length > 0) { const queue = mainNodes.filter(id => inDegree[id] === 0); if (queue.length === 0 && mainNodes.length > 0) queue.push(mainNodes[0]); const levels: Record<string, number> = {}; const visited = new Set<string>(); while(queue.length > 0) { const curr = queue.shift()!; if (visited.has(curr)) continue; visited.add(curr); adjacency[curr]?.forEach(next => { if (mainNodes.includes(next)) { levels[next] = Math.max(levels[next] || 0, (levels[curr] || 0) + 1); if(!visited.has(next)) queue.push(next); } }); } const levelGroups: Record<number, string[]> = {}; let maxLevel = 0; mainNodes.forEach(id => { const lvl = levels[id] || 0; maxLevel = Math.max(maxLevel, lvl); if(!levelGroups[lvl]) levelGroups[lvl] = []; levelGroups[lvl].push(id); }); for (let lvl = 0; lvl <= maxLevel; lvl++) { const currentNodes = levelGroups[lvl] || []; const nodeWithY = currentNodes.map(nodeId => { const nodeParents = parents[nodeId] || []; let avgY = 0; let count = 0; if (nodeParents.length > 0) { nodeParents.forEach(p => { if (layout[p]) { avgY += layout[p].y; count++; } }); } const heuristicY = count > 0 ? avgY / count : Infinity; return { id: nodeId, y: heuristicY }; }); nodeWithY.sort((a, b) => { if (a.y === Infinity && b.y === Infinity) return a.id.localeCompare(b.id); if (a.y === Infinity) return 1; if (b.y === Infinity) return -1; return a.y - b.y; }); let currentY = 0; nodeWithY.forEach((item) => { let y = item.y === Infinity ? currentY : item.y; if (y < currentY) y = currentY; layout[item.id] = { x: lvl * COL_WIDTH, y: y }; currentY = y + ROW_HEIGHT; }); } for (let lvl = maxLevel - 1; lvl >= 0; lvl--) { const currentNodes = levelGroups[lvl] || []; const nodeWithY = currentNodes.map(nodeId => { const nodeChildren = adjacency[nodeId] || []; let avgY = 0; let count = 0; if (nodeChildren.length > 0) { nodeChildren.forEach(c => { if (layout[c]) { avgY += layout[c].y; count++; } }); } const heuristicY = count > 0 ? avgY / count : layout[nodeId].y; return { id: nodeId, y: heuristicY }; }); nodeWithY.sort((a, b) => a.y - b.y); let positions: number[] = []; nodeWithY.forEach((item, idx) => { let y = item.y; if (idx > 0) { const prevY = positions[idx - 1]; if (y < prevY + ROW_HEIGHT) y = prevY + ROW_HEIGHT; } positions.push(y); layout[item.id] = { x: lvl * COL_WIDTH, y: y }; }); } }
      let maxY = 0; Object.values(layout).forEach(pos => maxY = Math.max(maxY, pos.y)); const START_Y_FOR_FINISHED = maxY + ROW_HEIGHT * 2; const ORPHAN_COL_COUNT = 4; orphanFinishedNodes.forEach((id, idx) => { const row = Math.floor(idx / ORPHAN_COL_COUNT); const col = idx % ORPHAN_COL_COUNT; layout[id] = { x: col * COL_WIDTH, y: START_Y_FOR_FINISHED + (row * ROW_HEIGHT) }; });
      setNodes(nds => nds.map(n => ({ ...n, position: layout[n.id] || n.position }))); await plugin.saveBoardData(activeBoardId, { layout }); new Notice("Smart layout applied!"); setTimeout(() => reactFlowInstance.fitView({ padding: 0.2, duration: 800 }), 100);
  };

  const handleResetView = async () => { if (!window.confirm("Clear all positions?")) return; await plugin.saveBoardData(activeBoardId, { layout: {} }); setRefreshKey(prev => prev + 1); new Notice("View reset."); };
  const handleSidebarClick = (nodeId: string) => { const node = nodes.find(n => n.id === nodeId); if (node) { reactFlowInstance.setCenter(node.position.x + 120, node.position.y + 60, { zoom: 1.2, duration: 800 }); setNodes(nds => nds.map(n => ({ ...n, selected: n.id === nodeId }))); } };

  return (
    <div className="task-graph-container" onContextMenu={onPaneContextMenu}>
      <TaskSidebar nodes={nodes} onNodeClick={handleSidebarClick} onStatusChange={updateNodeStatus} />
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onConnectStart={onConnectStart} onConnectEnd={onConnectEnd}
        onNodeDragStop={onNodeDragStop}
        onEdgeContextMenu={onEdgeContextMenu} onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes} 
        fitView minZoom={0.1} maxZoom={4}
        nodesDraggable={true} nodesConnectable={true} elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
        panOnScroll={true} zoomOnScroll={true} preventScrolling={false}
        selectionOnDrag={true} selectionMode={SelectionMode.Partial} panOnDrag={[1]} panActivationKeyCode="Space" multiSelectionKeyCode="Shift"
        connectionLineStyle={{ stroke: 'var(--interactive-accent)', strokeWidth: 2, strokeDasharray: '5,5' }}
      >
        <Background gap={24} color="rgba(150,150,150,0.1)" size={1.5} />
        <GraphToolbar />
        <ControlPanel boards={plugin.settings.boards} activeBoardId={activeBoardId} onSwitchBoard={handleSwitchBoard} onAddBoard={handleAddBoard} onRenameBoard={handleRenameBoard} onDeleteBoard={handleDeleteBoard} onAutoLayout={handleAutoLayout} onResetView={handleResetView} currentBoard={activeBoard} onUpdateFilter={handleUpdateFilter} />
      </ReactFlow>

      {editTarget && (
          <EditTaskModal 
              initialText={editTarget.text} 
              onClose={() => setEditTarget(null)} 
              onSave={saveTaskEdit} 
              allTags={allTags}
          />
      )}

      {createTarget && (
          <EditTaskModal
              initialText=""
              onClose={() => setCreateTarget(null)}
              onSave={(text) => handleCreateTask(text)}
              allTags={allTags}
          />
      )}
    </div>
  );
};

const TaskGraphWithProvider = ({ plugin }: { plugin: TaskGraphPlugin }) => { return ( <ReactFlowProvider> <TaskGraphComponent plugin={plugin} /> </ReactFlowProvider> ); };
export class TaskGraphView extends ItemView {
  plugin: TaskGraphPlugin; root: Root | null = null;
  constructor(leaf: WorkspaceLeaf, plugin: TaskGraphPlugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return VIEW_TYPE_TASK_GRAPH; } getDisplayText() { return "Spatial Task Graph"; } getIcon() { return "network"; }
  async onOpen() { const container = this.containerEl.children[1]; container.empty(); container.setAttr('style', 'height: 100%; width: 100%; overflow: hidden;'); this.root = createRoot(container); this.root.render(<React.StrictMode><TaskGraphWithProvider plugin={this.plugin} /></React.StrictMode>); }
  // 🌟 新增：对外暴露刷新方法
  refresh() {
      // @ts-ignore
      if (this.plugin.viewRefresh) this.plugin.viewRefresh();
  }
  async onClose() { this.root?.unmount(); }
}