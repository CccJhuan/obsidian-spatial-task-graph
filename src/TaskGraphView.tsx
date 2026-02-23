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
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css'; 

import TaskGraphPlugin, { GraphBoard } from './main';

export const VIEW_TYPE_TASK_GRAPH = 'task-graph-view';

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
    .react-flow__selection { background: rgba(var(--interactive-accent-rgb), 0.1); border: 1px solid var(--interactive-accent); border-radius: 6px; }
`;

const CUSTOM_STYLES = `
    .task-graph-container { width: 100%; height: 100%; position: relative; background: var(--background-primary); font-family: var(--font-interface); color: var(--text-normal); }
    input[type="checkbox"].custom-checkbox { appearance: none; -webkit-appearance: none; width: 18px; height: 18px; border: 1.5px solid var(--text-muted); border-radius: 50%; margin: 0 8px 0 0; padding: 0; cursor: pointer; position: relative; display: inline-flex; align-items: center; justify-content: center; background-color: transparent; flex-shrink: 0; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
    input[type="checkbox"].custom-checkbox:hover { border-color: var(--interactive-accent); background-color: rgba(var(--interactive-accent-rgb), 0.1); }
    input[type="checkbox"].custom-checkbox:checked { background-color: var(--interactive-accent); border-color: var(--interactive-accent); }
    input[type="checkbox"].custom-checkbox:checked::after { content: ''; width: 100%; height: 100%; background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'); background-size: 12px; background-position: center; background-repeat: no-repeat; }
    input[type="checkbox"].filter-checkbox { appearance: none; -webkit-appearance: none; width: 14px; height: 14px; border: 1px solid var(--text-muted); border-radius: 4px; margin-right: 6px; cursor: pointer; position: relative; }
    input[type="checkbox"].filter-checkbox:checked { background-color: var(--text-normal); border-color: var(--text-normal); }
    input[type="checkbox"].filter-checkbox:checked::after { content: ''; position: absolute; top: 1px; left: 4px; width: 4px; height: 8px; border: solid var(--background-primary); border-width: 0 2px 2px 0; transform: rotate(45deg); }
    .custom-handle { width: 24px !important; height: 24px !important; background: transparent !important; border: none !important; display: flex; align-items: center; justify-content: center; z-index: 20 !important; }
    .custom-handle::after { content: ""; display: block; width: 10px; height: 10px; border-radius: 50%; background: var(--text-muted); border: 2px solid var(--background-primary); transition: transform 0.2s, background 0.2s; }
    .custom-handle:hover::after { transform: scale(1.2); background: var(--interactive-accent); }
    .custom-handle-right::after { background: var(--interactive-accent); }
    .task-node-wrapper { position: relative; width: 240px; height: auto; min-height: 80px; background: var(--background-secondary); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s; border: 1px solid var(--background-modifier-border); overflow: hidden; display: flex; flex-direction: column; }
    .task-node-wrapper:hover { transform: translateY(-2px) scale(1.01); box-shadow: 0 12px 24px rgba(0,0,0,0.12); z-index: 10; }
    .react-flow__node.selected .task-node-wrapper { border: 1px solid var(--interactive-accent); box-shadow: 0 0 0 3px rgba(var(--interactive-accent-rgb), 0.2); }
    .text-node-wrapper { min-width: 150px; max-width: 300px; background: var(--background-primary-alt); color: var(--text-normal); border-radius: 8px; padding: 12px; font-family: var(--font-text); box-shadow: 0 4px 10px rgba(0,0,0,0.1); text-align: center; position: relative; height: auto; border: 1px dashed var(--text-accent); transition: all 0.2s; }
    .react-flow__node.selected .text-node-wrapper { border-style: solid; border-color: var(--interactive-accent); }
    .text-node-textarea { background: transparent; border: none; color: inherit; width: 100%; text-align: center; resize: none; font-size: 14px; outline: none; overflow: hidden; }
    .node-tag { font-size: 10px; padding: 3px 8px; border-radius: 12px; font-weight: 600; background-color: var(--background-modifier-active-hover); color: var(--text-muted); }
    .edit-btn { opacity: 0; transition: all 0.2s; cursor: pointer; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--background-modifier-hover); color: var(--text-normal); flex-shrink: 0; font-size: 12px;}
    .task-node-wrapper:hover .edit-btn { opacity: 1; }
    .edit-btn:hover { background: var(--interactive-accent); color: white; }
    .open-file-btn { font-size: 9px; color: var(--text-muted); cursor: pointer; padding: 2px 6px; border-radius: 4px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); transition: all 0.2s; display: flex; align-items: center; gap: 4px; max-width: 80px; }
    .open-file-btn:hover { background: var(--interactive-accent); color: white; border-color: var(--interactive-accent); }
    .open-file-btn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .edit-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; pointer-events: all; }
    .edit-modal { background: var(--background-primary); padding: 24px; border-radius: 16px; width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 16px; border: 1px solid var(--background-modifier-border); position: relative; }
    .suggestion-list { position: absolute; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 8px; box-shadow: 0 8px 16px rgba(0,0,0,0.2); max-height: 150px; overflow-y: auto; z-index: 200; width: 200px; }
    .suggestion-item { padding: 6px 12px; font-size: 13px; cursor: pointer; color: var(--text-normal); display: flex; align-items: center; gap: 6px; }
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

const TaskNode = React.memo(({ data, isConnectable }: { data: any, isConnectable: boolean }) => {
  const { tags, cleanText } = extractTags(data.label);
  const statusColor = STATUS_COLORS[data.customStatus as keyof typeof STATUS_COLORS] || STATUS_COLORS['default'];
  
  const handleCheckboxClick = (e: React.MouseEvent) => { e.stopPropagation(); data.onToggleStatus(data.id, data.status); };
  const handleOpenFile = (e: React.MouseEvent) => { e.stopPropagation(); data.onOpenFile(data.path); };

  return (
    <div className="task-node-wrapper">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="custom-handle" style={{ left: '-12px', top: '50%', transform: 'translateY(-50%)' }} />
      <div style={{ height: '6px', width: '100%', background: statusColor, opacity: 0.8, flexShrink: 0 }}></div>
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: '600', color: statusColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{data.customStatus === 'default' ? 'TASK' : data.customStatus.replace('_', ' ')}</span>
            <div className="edit-btn" onClick={(e) => { e.stopPropagation(); data.onEdit(data); }} title="Edit Task">✎</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <input type="checkbox" className="custom-checkbox" checked={data.status === 'x'} onChange={() => {}} onClick={handleCheckboxClick} style={{ marginTop: '3px' }} />
            <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-normal)', fontWeight: '500', marginBottom: '10px', wordBreak: 'break-word', whiteSpace: 'pre-wrap', opacity: (data.status === 'x' ? 0.6 : 1), textDecoration: (data.status === 'x' ? 'line-through' : 'none') }}>{cleanText || data.label}</div>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>{tags.map((tag, i) => (<span key={i} className="node-tag">{tag}</span>))}</div>
              <div className="open-file-btn" onClick={handleOpenFile} title="Open File">↗ <span>{data.file}</span></div>
          </div>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="custom-handle custom-handle-right" style={{ right: '-12px', top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  );
});

const TextNode = React.memo(({ data, isConnectable }: { data: any, isConnectable: boolean }) => {
    const [text, setText] = React.useState(data.label);
    const handleBlur = () => { if (text !== data.label) data.onSave(data.id, text); };
    const rows = Math.max(1, text.split('\n').length);
    const stopKeys = (e: React.KeyboardEvent) => e.stopPropagation();

    return (
        <div className="text-node-wrapper">
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="custom-handle" style={{ left: '-12px', top: '50%', transform: 'translateY(-50%)' }} />
            <textarea className="text-node-textarea" value={text} onChange={(e) => setText(e.target.value)} onBlur={handleBlur} rows={rows} placeholder="Note..." onMouseDown={(e) => e.stopPropagation()} onKeyDown={stopKeys} onKeyUp={stopKeys} style={{ height: 'auto' }} />
            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="custom-handle custom-handle-right" style={{ right: '-12px', top: '50%', transform: 'translateY(-50%)' }} />
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="custom-handle" style={{ bottom: '-12px', left: '50%', transform: 'translateX(-50%)' }} />
        </div>
    );
});

const nodeTypes = { task: TaskNode, text: TextNode };

const EditTaskModal = ({ initialText, onClose, onSave, allTags }: { initialText: string, onClose: () => void, onSave: (text: string) => void, allTags: string[] }) => {
    const [text, setText] = React.useState(initialText);
    const [suggestions, setSuggestions] = React.useState<string[]>([]);
    const [suggestionPos, setSuggestionPos] = React.useState({ top: 0, left: 0 });
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value; setText(val);
        const cursorPos = e.target.selectionStart; const textBeforeCursor = val.slice(0, cursorPos); const match = textBeforeCursor.match(/#([\w\u4e00-\u9fa5]*)$/);
        if (match) { const query = (match[1] || '').toLowerCase(); const filtered = allTags.filter(t => t.toLowerCase().includes(query)).slice(0, 10); if (filtered.length > 0) { setSuggestions(filtered); setSuggestionPos({ top: 140, left: 30 }); } else { setSuggestions([]); } } else { setSuggestions([]); }
    };
    const insertTag = (tag: string) => { const cursorPos = textareaRef.current?.selectionStart || text.length; const textBeforeCursor = text.slice(0, cursorPos); const textAfterCursor = text.slice(cursorPos); const lastHashIndex = textBeforeCursor.lastIndexOf('#'); const newText = textBeforeCursor.slice(0, lastHashIndex) + '#' + tag + ' ' + textAfterCursor; setText(newText); setSuggestions([]); textareaRef.current?.focus(); };
    const insertMetadata = (symbol: string) => { const newText = text + ` ${symbol} `; setText(newText); textareaRef.current?.focus(); };
    const handleKeyDown = (e: React.KeyboardEvent) => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(text); } };

    return (
        <div className="edit-overlay" onClick={onClose}>
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: 0, fontWeight: 600, color: 'var(--text-normal)' }}>Edit Task</h3>
                <div style={{ position: 'relative' }}>
                    <textarea ref={textareaRef} value={text} onChange={handleInput} onKeyDown={handleKeyDown} onKeyUp={(e) => e.stopPropagation()} style={{ width: '100%', height: '120px', resize: 'vertical', padding: '12px', borderRadius: '8px', border: '1px solid var(--background-modifier-border)', fontSize: '14px', lineHeight: '1.5', background: 'var(--background-secondary)', color: 'var(--text-normal)' }} placeholder="Task description..." autoFocus />
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

const TaskSidebar = ({ nodes, onNodeCenter, onStatusChange }: { nodes: Node[], onNodeCenter: (nodeId: string) => void, onStatusChange: (id: string, status: string) => void }) => {
    const tasks = nodes.filter(n => n.type === 'task');
    const inProgress = tasks.filter(n => n.data.customStatus === 'in_progress');
    const pending = tasks.filter(n => n.data.customStatus === 'pending');
    const backlog = tasks.filter(n => n.data.customStatus === 'backlog' || n.data.customStatus === 'default' || !n.data.customStatus);
    const stopProp = (e: React.MouseEvent | React.WheelEvent) => e.stopPropagation();

    const handleDragStart = (e: React.DragEvent, nodeId: string) => { e.dataTransfer.setData('nodeId', nodeId); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const handleDrop = (e: React.DragEvent, targetStatus: string) => { e.preventDefault(); const nodeId = e.dataTransfer.getData('nodeId'); if (nodeId) onStatusChange(nodeId, targetStatus); };

    const renderList = (title: string, items: Node[], color: string, className: string, statusKey: string) => (
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
    return (<div className="task-sidebar" onMouseDown={stopProp} onWheel={stopProp} onContextMenu={stopProp}><div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-normal)' }}>My Tasks</div>{renderList('In Progress', inProgress, STATUS_COLORS['in_progress'], 'in-progress', 'in_progress')}{renderList('Pending', pending, STATUS_COLORS['pending'], 'pending', 'pending')}{renderList('Backlog', backlog, STATUS_COLORS['backlog'], 'backlog', 'backlog')}</div>);
};

const GraphToolbar = () => {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
    const btnStyle: React.CSSProperties = { width: '32px', height: '32px', background: 'var(--background-secondary)', border: '1px solid var(--background-modifier-border)', color: 'var(--text-normal)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '8px' };
    return (<Panel position="top-right" style={{ margin: '10px', display: 'flex', flexDirection: 'column', pointerEvents: 'all' }} onMouseDown={stopPropagation}><button style={btnStyle} onClick={() => zoomIn()} title="Zoom In"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button><button style={btnStyle} onClick={() => zoomOut()} title="Zoom Out"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button><button style={btnStyle} onClick={() => fitView({duration: 800})} title="Fit View"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg></button></Panel>);
};

const ControlPanel = ({ boards, activeBoardId, onSwitchBoard, onAddBoard, onRenameBoard, onDeleteBoard, onAutoLayout, onResetView, currentBoard, onUpdateFilter }: any) => {
    const [showFilters, setShowFilters] = React.useState(false);
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [tempName, setTempName] = React.useState('');
    React.useEffect(() => { setIsRenaming(false); setTempName(currentBoard?.name || ''); }, [currentBoard]);
    const handleSaveName = () => { if (tempName.trim()) onRenameBoard(tempName); setIsRenaming(false); };
    const handleDelete = () => { if (boards.length <= 1) { new Notice("Cannot delete the only board."); return; } if (window.confirm(`Delete board "${currentBoard?.name || 'Board'}"?`)) onDeleteBoard(activeBoardId); };
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
        let posX = savedLayout[t.id]?.x ?? ((index % 3) * 320);
        let posY = savedLayout[t.id]?.y ?? (Math.floor(index / 3) * 200);
        let finalCustomStatus = savedNodeStatus[t.id] || 'default';
        if (t.status === 'x') finalCustomStatus = 'finished';

        return {
            id: t.id, type: 'task', position: { x: posX, y: posY },
            data: { 
                id: t.id, label: t.text, status: t.status, file: t.file, path: t.path, line: t.line, 
                customStatus: finalCustomStatus, 
                onEdit: handleEditTask, onToggleStatus: handleToggleTask,
                onOpenFile: (path: string) => plugin.app.workspace.openLinkText(path, '', false)
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
          if (sourceNode && sourceNode.type === 'task' && sourceNode.data.path) { setCreateTarget({ sourceNodeId, sourcePath: sourceNode.data.path }); }
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
           let line = lines[node.data.line]; 
           if (line === undefined) return;
           line = line.replace(/(- \[)(.)(\])/, `$1${newStatus}$3`);
           const today = new Date(); const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
           const completionTag = ` ✅ ${dateStr}`; const completionRegex = / ✅ \d{4}-\d{2}-\d{2}/g;
           if (newStatus === 'x') { if (!completionRegex.test(line)) { line = line.trimEnd() + completionTag; } } else { line = line.replace(completionRegex, ''); }
           lines[node.data.line] = line; await plugin.app.vault.modify(file, lines.join('\n'));
      }
  };

  const updateNodeStatus = async (nodeId: string, status: string) => { setNodes((nds) => nds.map((n) => { if (n.id === nodeId) return { ...n, data: { ...n.data, customStatus: status } }; return n; })); const board = plugin.settings.boards.find(b => b.id === activeBoardId); if (board) { const nodeStatus = (board.data as any).nodeStatus || {}; nodeStatus[nodeId] = status; await plugin.saveBoardData(activeBoardId, { nodeStatus } as any); } };

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

  const onConnect = React.useCallback(async (params: Connection) => { 
      connectionMadeRef.current = true; 
      if (!params.source || !params.target) return;

      const newSourceId = await plugin.ensureBlockId(activeBoardId, params.source);
      const newTargetId = await plugin.ensureBlockId(activeBoardId, params.target);

      const newEdge = { id: `e${newSourceId}-${newTargetId}`, source: newSourceId, target: newTargetId, animated: true };

      setNodes(nds => nds.map(n => {
          if (n.id === params.source) return { ...n, id: newSourceId };
          if (n.id === params.target) return { ...n, id: newTargetId };
          return n;
      }));

      setEdges((eds) => {
          const updatedEds = eds.map(e => {
              let eSource = e.source === params.source ? newSourceId : (e.source === params.target ? newTargetId : e.source);
              let eTarget = e.target === params.source ? newSourceId : (e.target === params.target ? newTargetId : e.target);
              return { ...e, source: eSource, target: eTarget, id: `e${eSource}-${eTarget}` };
          });
          return addEdge(newEdge, updatedEds);
      }); 
      
      const board = plugin.settings.boards.find(b => b.id === activeBoardId);
      if (board) { 
          if (!board.data.edges.some((e:any) => e.id === newEdge.id)) {
              board.data.edges.push(newEdge);
          }
          await plugin.saveSettings(); 
      }
      setRefreshKey(prev => prev + 1);
  }, [plugin, activeBoardId, setEdges, setNodes]);

  const onNodeDragStop = React.useCallback((event: any, node: Node) => { 
      setNodes((nds) => nds.map(n => n.id === node.id ? node : n)); 
      const board = plugin.settings.boards.find(b => b.id === activeBoardId); 
      if(!board) return; 
      
      if (node.type === 'task') { 
          const layout = { ...board.data.layout, [node.id]: node.position }; 
          plugin.saveBoardData(activeBoardId, { layout }); 
      } else if (node.type === 'text') { 
          const textNodes = board.data.textNodes.map(tn => tn.id === node.id ? { ...tn, x: node.position.x, y: node.position.y } : tn); 
          plugin.saveBoardData(activeBoardId, { textNodes }); 
      } 
  }, [plugin, activeBoardId, setNodes]);
  
  const handleSaveTextNode = async (id: string, text: string) => { const board = plugin.settings.boards.find(b => b.id === activeBoardId); if(board) { const textNodes = board.data.textNodes.map(tn => tn.id === id ? { ...tn, text } : tn); await plugin.saveBoardData(activeBoardId, { textNodes }); } };
  const handleEditTask = (taskData: any) => { setEditTarget({ id: taskData.id, text: taskData.label, path: taskData.path, line: taskData.line }); };
  const saveTaskEdit = async (text: string) => { if (!editTarget) return; await plugin.updateTaskContent(editTarget.path, editTarget.line, text); setEditTarget(null); };

  const onPaneContextMenu = React.useCallback((event: React.MouseEvent) => {
      event.preventDefault(); const menu = new Menu();
      menu.addItem((item) => item.setTitle('Add Note').setIcon('sticky-note').onClick(async () => {
          const bounds = (event.target as HTMLElement).getBoundingClientRect(); const position = reactFlowInstance.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
          const newNode = { id: `text-${Date.now()}`, text: 'New Note', x: position.x, y: position.y };
          const board = plugin.settings.boards.find(b => b.id === activeBoardId); if (board) { const textNodes = [...(board.data.textNodes || []), newNode]; await plugin.saveBoardData(activeBoardId, { textNodes }); setRefreshKey(prev => prev + 1); }
      }));
      menu.showAtPosition({ x: event.nativeEvent.clientX, y: event.nativeEvent.clientY });
  }, [plugin, activeBoardId, reactFlowInstance]);

  const onEdgeContextMenu = React.useCallback((event: React.MouseEvent, edge: Edge) => { event.preventDefault(); event.stopPropagation(); setEdges((eds) => { const newEdges = eds.filter((e) => e.id !== edge.id); plugin.saveBoardData(activeBoardId, { edges: newEdges }); return newEdges; }); new Notice("Connection removed"); }, [plugin, activeBoardId, setEdges]);
  
  const onNodeContextMenu = React.useCallback((event: React.MouseEvent, node: Node) => {
      event.preventDefault(); event.stopPropagation(); const menu = new Menu();
      if (node.type === 'task') {
          menu.addItem((item) => item.setTitle('⚪ Backlog').onClick(() => updateNodeStatus(node.id, 'backlog')));
          menu.addItem((item) => item.setTitle('🟡 Pending').onClick(() => updateNodeStatus(node.id, 'pending')));
          menu.addItem((item) => item.setTitle('🟢 In Progress').onClick(() => updateNodeStatus(node.id, 'in_progress')));
          menu.addItem((item) => item.setTitle('🔴 Blocked').onClick(() => updateNodeStatus(node.id, 'blocked')));
          menu.addItem((item) => item.setTitle('🟣 Finished').onClick(() => updateNodeStatus(node.id, 'finished')));
      } else if (node.type === 'text') {
          menu.addItem((item) => item.setTitle('🗑 Delete Note').onClick(async () => { const board = plugin.settings.boards.find(b => b.id === activeBoardId); if (board) { const textNodes = board.data.textNodes.filter(tn => tn.id !== node.id); await plugin.saveBoardData(activeBoardId, { textNodes }); setRefreshKey(prev => prev + 1); } }));
      }
      menu.showAtPosition({ x: event.nativeEvent.clientX, y: event.nativeEvent.clientY });
  }, [plugin, activeBoardId, nodes]);

  const handleSwitchBoard = (id: string) => { setActiveBoardId(id); plugin.settings.lastActiveBoardId = id; plugin.saveSettings(); };
  const handleAddBoard = async () => { const newBoard: GraphBoard = { id: Date.now().toString(), name: `Board ${plugin.settings.boards.length + 1}`, filters: { tags: [], excludeTags: [], folders: [], status: [' ', '/'] }, data: { layout: {}, edges: [], nodeStatus: {}, textNodes: [] } }; plugin.settings.boards.push(newBoard); handleSwitchBoard(newBoard.id); };
  
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
  const handleUpdateFilter = async (type: string, value: string) => { const board = plugin.settings.boards.find(b => b.id === activeBoardId); if (!board) return; if (type === 'tags' || type === 'excludeTags' || type === 'folders') board.filters[type as 'tags' | 'excludeTags' | 'folders'] = value.split(',').map(s => s.trim()).filter(s => s); else if (type === 'status') { const statusChar = value; const index = board.filters.status.indexOf(statusChar); if (index > -1) board.filters.status.splice(index, 1); else board.filters.status.push(statusChar); } await plugin.saveSettings(); setRefreshKey(prev => prev + 1); };
  
  // 🌟 幂等布局引擎：父子中心对齐 + 保留用户排序 + 防重叠
  const handleAutoLayout = async () => {
      // --- 1. 构建图结构 ---
      const undirectedAdj: Record<string, string[]> = {};
      const directedAdj: Record<string, string[]> = {};
      const inDegree: Record<string, number> = {};

      nodes.forEach(n => {
          undirectedAdj[n.id] = [];
          directedAdj[n.id] = [];
          inDegree[n.id] = 0;
      });

      edges.forEach(e => {
          const sourceDir = directedAdj[e.source];
          const sourceUndir = undirectedAdj[e.source];
          const targetUndir = undirectedAdj[e.target];

          if (sourceDir) sourceDir.push(e.target);
          inDegree[e.target] = (inDegree[e.target] ?? 0) + 1;
          if (sourceUndir) sourceUndir.push(e.target);
          if (targetUndir) targetUndir.push(e.source);
      });

      // --- 2. 分类节点 ---
      const connectedNodeIds = new Set<string>();
      const isolatedActiveIds: string[] = [];
      const isolatedFinishedIds: string[] = [];

      nodes.forEach(n => {
          const isFinishedTask = n.type === 'task' && (n.data.status === 'x' || n.data.customStatus === 'finished');
          const isConnected = (undirectedAdj[n.id]?.length ?? 0) > 0;
          if (isConnected) {
              connectedNodeIds.add(n.id);
          } else if (isFinishedTask) {
              isolatedFinishedIds.push(n.id);
          } else {
              isolatedActiveIds.push(n.id);
          }
      });

      // --- 3. 找连通分量 ---
      const components: string[][] = [];
      const visited = new Set<string>();

      connectedNodeIds.forEach(id => {
          if (!visited.has(id)) {
              const comp: string[] = [];
              const queue = [id];
              visited.add(id);
              while (queue.length > 0) {
                  const curr = queue.shift()!;
                  comp.push(curr);
                  undirectedAdj[curr]?.forEach(neighbor => {
                      if (!visited.has(neighbor)) {
                          visited.add(neighbor);
                          queue.push(neighbor);
                      }
                  });
              }
              components.push(comp);
          }
      });

      const layout: Record<string, { x: number; y: number }> = {};
      const COL_WIDTH = 320;
      const COMPONENT_GAP = 60;
      const NODE_HEIGHT = 100;

      // --- 4. 🌟 动态计算行间距：基于节点实际高度 ---
      // 测量每个节点的 DOM 高度，取最大值作为基准
      const measuredHeights: number[] = [];
      nodes.forEach(n => {
          const el = document.querySelector(`[data-id="${n.id}"]`);
          if (el) {
              const rect = el.getBoundingClientRect();
              measuredHeights.push(rect.height);
          }
      });
      const maxNodeHeight = measuredHeights.length > 0
          ? Math.max(...measuredHeights)
          : 80; // 默认估计高度
      // 行间距 = 最大节点高度 + 固定间隙（至少 160px）
      const ROW_GAP = Math.max(160, maxNodeHeight + 40);

      // --- 5. 记录用户排序（仅取顺序，不取绝对值） ---
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      const getUserOrderRank = (ids: string[]): string[] => {
          return [...ids].sort((a, b) => {
              const yA = nodeMap.get(a)?.position?.y ?? 0;
              const yB = nodeMap.get(b)?.position?.y ?? 0;
              return yA - yB;
          });
      };

      // --- 6. 为每个连通分量做层级布局 ---
      const componentResults: { comp: string[]; height: number }[] = [];

      components.forEach(comp => {
          // 6a. 计算层级
          const level: Record<string, number> = {};
          comp.forEach(id => { level[id] = 0; });

          let changed = true;
          let iter = 0;
          while (changed && iter < 200) {
              changed = false;
              iter++;
              edges.forEach(e => {
                  if (level[e.source] !== undefined && level[e.target] !== undefined) {
                      if (level[e.target]! <= level[e.source]!) {
                          level[e.target] = level[e.source]! + 1;
                          changed = true;
                      }
                  }
              });
          }

          // 6b. 按层级分组
          const levelGroups: Record<number, string[]> = {};
          let maxLevel = 0;
          comp.forEach(id => {
              const lvl = level[id] ?? 0;
              maxLevel = Math.max(maxLevel, lvl);
              if (!levelGroups[lvl]) levelGroups[lvl] = [];
              levelGroups[lvl]!.push(id);
          });

          // 6c. 同层节点按用户Y排序
          for (const lvl of Object.keys(levelGroups)) {
              levelGroups[Number(lvl)] = getUserOrderRank(levelGroups[Number(lvl)]!);
          }

          // 6d. 🌟 子树 slot 分配（纯函数式，完全幂等）
          const slotY: Record<string, number> = {};
          const assignedNodes = new Set<string>();

          // 计算每个节点在本分量内的直接子节点
          const compChildren = (id: string): string[] => {
              return (directedAdj[id] || []).filter(cid => comp.includes(cid));
          };

          // 递归分配 slot 区间：节点 id 从 startSlot 开始，返回占用的 slot 数
          const assignSlots = (id: string, startSlot: number): number => {
              if (assignedNodes.has(id)) {
                  // 已经被其他父节点分配过（多父节点/菱形），不再重复分配
                  return 0;
              }
              assignedNodes.add(id);

              const children = compChildren(id);
              // 过滤掉已被分配的子节点（共享子节点情况）
              const unassignedChildren = children.filter(cid => !assignedNodes.has(cid));
              const assignedChildren = children.filter(cid => assignedNodes.has(cid));

              if (children.length === 0) {
                  // 叶子节点
                  slotY[id] = startSlot;
                  return 1;
              }

              // 子节点按用户排序
              const sortedUnassigned = getUserOrderRank(unassignedChildren);

              // 递归分配未被分配的子节点
              let currentSlot = startSlot;
              let totalUsed = 0;
              sortedUnassigned.forEach(childId => {
                  const used = assignSlots(childId, currentSlot);
                  currentSlot += used;
                  totalUsed += used;
              });

              // 父节点 slot = 所有子节点（含已分配的）的 slot 中心
              const allChildSlots = children
                  .map(cid => slotY[cid])
                  .filter((s): s is number => s !== undefined);

              if (allChildSlots.length > 0) {
                  const minSlot = Math.min(...allChildSlots);
                  const maxSlot = Math.max(...allChildSlots);
                  slotY[id] = (minSlot + maxSlot) / 2;
              } else {
                  slotY[id] = startSlot;
                  totalUsed = Math.max(totalUsed, 1);
              }

              return Math.max(totalUsed, 1);
          };

          // 找根节点（本分量内入度为0）
          const compInDegree: Record<string, number> = {};
          comp.forEach(id => { compInDegree[id] = 0; });
          edges.forEach(e => {
              if (compInDegree[e.target] !== undefined && comp.includes(e.source)) {
                  compInDegree[e.target] = (compInDegree[e.target] ?? 0) + 1;
              }
          });

          const roots = comp.filter(id => (compInDegree[id] ?? 0) === 0);
          const sortedRoots = getUserOrderRank(roots);

          let globalSlot = 0;
          sortedRoots.forEach(rootId => {
              const used = assignSlots(rootId, globalSlot);
              globalSlot += used;
          });

          // 处理未被分配到的节点（环或孤立在分量中的）
          comp.forEach(id => {
              if (slotY[id] === undefined) {
                  slotY[id] = globalSlot;
                  globalSlot += 1;
              }
          });

          // 6e. 🌟 防重叠后处理：同层节点按 slot 排序后强制最小间距
          for (let lvl = 0; lvl <= maxLevel; lvl++) {
              const group = levelGroups[lvl] || [];
              // 按已分配的 slot 排序
              const sorted = [...group].sort((a, b) => (slotY[a] ?? 0) - (slotY[b] ?? 0));
              for (let i = 1; i < sorted.length; i++) {
                  const prevSlot = slotY[sorted[i - 1]!] ?? 0;
                  const currSlot = slotY[sorted[i]!] ?? 0;
                  if (currSlot < prevSlot + 1) {
                      // 推开重叠的节点
                      slotY[sorted[i]!] = prevSlot + 1;
                  }
              }
          }

          // 6f. slot → 坐标
          const compLayout: Record<string, { x: number; y: number }> = {};
          comp.forEach(id => {
              compLayout[id] = {
                  x: (level[id] ?? 0) * COL_WIDTH,
                  y: (slotY[id] ?? 0) * ROW_GAP,
              };
          });

          // 归一化
          const allYs = Object.values(compLayout).map(p => p.y);
          const minY = Math.min(...allYs);
          const maxY = Math.max(...allYs);
          Object.values(compLayout).forEach(p => { p.y -= minY; });

          comp.forEach(id => {
              layout[id] = { ...compLayout[id]! };
          });

          componentResults.push({ comp, height: maxY - minY });
      });

      // --- 7. 分量堆叠 ---
      componentResults.sort((a, b) => b.comp.length - a.comp.length);

      let globalY = 0;
      componentResults.forEach(cr => {
          cr.comp.forEach(id => {
              if (layout[id]) {
                  layout[id]!.y += globalY;
              }
          });
          globalY += cr.height + NODE_HEIGHT + COMPONENT_GAP;
      });

      // --- 8. 孤立活跃节点 ---
      if (isolatedActiveIds.length > 0) {
          const sorted = getUserOrderRank(isolatedActiveIds);
          const COLS = 3;
          const startY = globalY;
          sorted.forEach((id, idx) => {
              const row = Math.floor(idx / COLS);
              const col = idx % COLS;
              layout[id] = { x: col * COL_WIDTH, y: startY + row * ROW_GAP };
          });
          const maxRow = Math.floor((sorted.length - 1) / COLS);
          globalY = startY + (maxRow + 1) * ROW_GAP + COMPONENT_GAP;
      }

      // --- 9. 孤立已完成节点 ---
      if (isolatedFinishedIds.length > 0) {
          const COLS = 4;
          const COMPACT_GAP = ROW_GAP * 0.75;
          const startY = globalY;
          isolatedFinishedIds.forEach((id, idx) => {
              const row = Math.floor(idx / COLS);
              const col = idx % COLS;
              layout[id] = { x: col * COL_WIDTH, y: startY + row * COMPACT_GAP };
          });
      }

      // --- 10. 应用布局（不改变视口） ---
      setNodes(nds => nds.map(n => ({ ...n, position: layout[n.id] ?? n.position })));

      const board = plugin.settings.boards.find(b => b.id === activeBoardId);
      if (board) {
          const mergedLayout = { ...board.data.layout };
          const updatedTextNodes = board.data.textNodes.map(tn => ({ ...tn }));

          Object.keys(layout).forEach(nodeId => {
              const node = nodes.find(n => n.id === nodeId);
              const newPos = layout[nodeId];
              if (newPos !== undefined) {
                  if (node?.type === 'task') {
                      mergedLayout[nodeId] = newPos;
                  } else if (node?.type === 'text') {
                      const tnIndex = updatedTextNodes.findIndex(tn => tn.id === nodeId);
                      if (tnIndex > -1) {
                          const textNodeToUpdate = updatedTextNodes[tnIndex];
                          if (textNodeToUpdate !== undefined) {
                              textNodeToUpdate.x = newPos.x;
                              textNodeToUpdate.y = newPos.y;
                          }
                      }
                  }
              }
          });

          await plugin.saveBoardData(activeBoardId, { layout: mergedLayout, textNodes: updatedTextNodes });
      }

      new Notice("Smart layout applied!");
  };

  const handleResetView = async () => { 
      if (!window.confirm("Clear all positions?")) return; 
      
      const board = plugin.settings.boards.find(b => b.id === activeBoardId);
      if (board) {
          const newLayout = {};
          const newTextNodes = board.data.textNodes.map((tn, index) => ({
              ...tn,
              x: (index % 3) * 320,
              y: Math.floor(index / 3) * 200
          }));
          await plugin.saveBoardData(activeBoardId, { layout: newLayout, textNodes: newTextNodes }); 
          setRefreshKey(prev => prev + 1); 
          new Notice("View reset."); 
      }
  };
  
  const handleSidebarClick = (nodeId: string) => { const node = nodes.find(n => n.id === nodeId); if (node) { reactFlowInstance.setCenter(node.position.x + 120, node.position.y + 60, { zoom: 1.2, duration: 800 }); setNodes(nds => nds.map(n => ({ ...n, selected: n.id === nodeId }))); } };

  return (
    <div className="task-graph-container" onContextMenu={onPaneContextMenu}>
      <TaskSidebar nodes={nodes} onNodeCenter={handleSidebarClick} onStatusChange={updateNodeStatus} />
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onConnectStart={onConnectStart} onConnectEnd={onConnectEnd}
        onNodeDragStop={onNodeDragStop}
        onEdgeContextMenu={onEdgeContextMenu} 
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes} 
        // 🌟 核心修改：恢复贝塞尔曲线连线，完美契合发散型思维导图
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
        <GraphToolbar />
        <ControlPanel boards={plugin.settings.boards} activeBoardId={activeBoardId} onSwitchBoard={handleSwitchBoard} onAddBoard={handleAddBoard} onRenameBoard={handleRenameBoard} onDeleteBoard={handleDeleteBoard} onAutoLayout={handleAutoLayout} onResetView={handleResetView} currentBoard={activeBoard} onUpdateFilter={handleUpdateFilter} />
      </ReactFlow>

      {editTarget && (
          <EditTaskModal initialText={editTarget.text} onClose={() => setEditTarget(null)} onSave={saveTaskEdit} allTags={allTags} />
      )}

      {createTarget && (
          <EditTaskModal initialText="" onClose={() => setCreateTarget(null)} onSave={(text) => handleCreateTask(text)} allTags={allTags} />
      )}
    </div>
  );
};

const TaskGraphWithProvider = ({ plugin }: { plugin: TaskGraphPlugin }) => { return ( <ReactFlowProvider> <TaskGraphComponent plugin={plugin} /> </ReactFlowProvider> ); };
export class TaskGraphView extends ItemView {
  plugin: TaskGraphPlugin; root: Root | null = null;
  constructor(leaf: WorkspaceLeaf, plugin: TaskGraphPlugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return VIEW_TYPE_TASK_GRAPH; } getDisplayText() { return "Spatial Task Graph"; } getIcon() { return "network"; }
  async onOpen() { 
      const container = this.containerEl.children[1] as HTMLElement; 
      if (!container) return;
      container.empty(); 
      container.setAttr('style', 'height: 100%; width: 100%; overflow: hidden;'); 
      this.root = createRoot(container); 
      this.root.render(<React.StrictMode><TaskGraphWithProvider plugin={this.plugin} /></React.StrictMode>); 
  }
  refresh() { if (this.plugin.viewRefresh) this.plugin.viewRefresh(); }
  async onClose() { this.root?.unmount(); }
}