# Spatial Task Graph for Obsidian <img src="icon.png" alt="Logo" height="24" style="vertical-align: middle;"/>

**Spatial Task Graph** transforms your linear Obsidian tasks into a dynamic, interactive infinite canvas. Visualize dependencies, manage workflows with a Kanban-style sidebar, and organize your thoughts spatially—all with a premium Apple-style aesthetic.

## ✨ Key Features

### 1. Intuitive Graph Interactions

Manage your tasks spatially with fluid mouse gestures.

- **Connect & Organize**: Drag from one node handles to another to create dependencies. Right-click an edge to delete it.
    
- **Smart Selection**: Hold `Left Click` to box-select multiple nodes and move them as a group.
    
- **Mind Mapping**: Right-click anywhere on the canvas to add **Text Notes** (Sticky Notes) for headers or context.
    

|   |   |   |
|---|---|---|
|**Connections**|**Box Selection**|**Text Notes**|
||||

### 2. Seamless Creation Flow

Don't break your flow. Create new tasks directly from the canvas.

- **Drag-to-Create**: Drag a connection line to an empty space to instantly open the creation modal. The new task is automatically appended to the parent file and linked.
    

### 3. Powerful Workflow Management

Manage task status directly without opening files.

- **Interactive Sidebar**: Drag and drop tasks between **In Progress**, **Pending**, and **Backlog** in the left sidebar to switch their status instantly.
    
- **Real-time Sync**: Click the checkbox circle on a node to complete it. The change is immediately written to your markdown file with a timestamp (Tasks plugin format).
    
- **Quick Navigation**: Click any task text to jump directly to the source file.
    

|   |   |
|---|---|
|**Sidebar Drag & Drop**|**Click to Toggle**|
|||

### 4. Smart Layout & Context Menu

- **Auto Layout**: One click on the `⚡ Layout` button automatically arranges your graph. It intelligently centers parent nodes and sinks completed tasks to the bottom.
    
- **Context Menu**: Right-click any task node to quickly change its priority or status color.
    

## 🚀 Installation

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [Latest Release](https://www.google.com/search?q=https://github.com/TriumphC/obsidian-spatial-task-graph/releases "null").
    
2. Create a folder `obsidian-spatial-task-graph` in your vault's `.obsidian/plugins/` directory.
    
3. Move the files into that folder.
    
4. Reload Obsidian and enable the plugin.
    

## 🎮 Usage Guide

### The Interface

- **Left Sidebar (HUD)**: Your cockpit. Shows all tasks categorized by status. Click to center the view; Drag to change status.
    
- **Bottom Right (Control Panel)**: Switch between different **Boards**, apply filters (Tags/Paths), and trigger Auto Layout.
    
- **Top Left (Toolbar)**: Zoom and Fit View controls.
    

### Editing Tasks

- Click the **Pencil Icon** on a node to edit.
    
- Type `#` to autocomplete tags.
    
- Use the metadata toolbar to insert Dates (`📅`), Priorities (`🔺`), and more.
    

## 🤝 Contributing

Contributions are welcome! Please create an issue or submit a Pull Request.

## 📄 License

MIT License