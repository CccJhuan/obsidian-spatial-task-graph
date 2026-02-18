# Spatial Task Graph for Obsidian <img src="icon.png" alt="Logo" height="24" style="vertical-align: middle;"/>

**Spatial Task Graph** is an advanced Obsidian plugin that transforms your linear task lists into an interactive, infinite canvas. It combines the power of **Dataview** indexing with the flexibility of **Mind Mapping**.

Visualize dependencies, manage project status with a HUD sidebar, and organize your thoughts spatially—all without leaving your markdown files.

_(Place your screenshot `image_e51aba.png` or `image_e53884.jpg` here)_

## ✨ Features

### 🧠 Spatial Project Management

- **Infinite Canvas**: Powered by React Flow, offering a smooth, zoomable workspace to organize tasks visually.
    
- **Hybrid Nodes**: Mix real **Markdown Tasks** with purely visual **Text Notes** (Sticky Notes) to brainstorm and structure projects.
    
- **Drag-to-Create**: Drag a connection line to an empty space to instantly create a new sub-task linked to the parent file.
    

### 🧭 Task HUD & Navigation

- **Status at a Glance**: A dedicated "Heads-Up Display" sidebar on the left automatically categorizes your tasks into **In Progress**, **Pending**, and **Backlog**.
    
- **Quick Navigation**: Clicking on any task in the sidebar instantly **centers the graph** on that specific node, helping you locate tasks in complex maps without scrolling.
    

### 🎛️ Multi-Project Control Panel

- **Multiple Boards**: The metadata toolbar in the bottom-right allows you to create and switch between different **Boards** (e.g., "Work", "Personal", "Learning"). Each board preserves its own layout and nodes.
    
- **Smart Filtering**: Apply real-time filters to your graph based on **Tags** (e.g., `#urgent`) or **File Paths**. This allows you to focus on specific projects and hide unrelated noise.
    

### 📝 Seamless Editing

- **Two-Way Sync**: Changes made in the graph (checkboxes, text edits) are instantly written back to your Markdown files.
    
- **Smart Editor**:
    
    - **Tag Autocomplete**: Type `#` to get suggestions from your vault's existing tags.
        
    - **Metadata Toolbar**: One-click insertion for Tasks plugin formats (📅 Due, 🛫 Start, ⏳ Scheduled, 🔁 Recur, 🔺 Priority).
        

## 🚀 Installation

### Manual Installation

1. Download the `main.js`, `manifest.json`, and `styles.css` from the latest Release.
    
2. Create a folder named `obsidian-spatial-task-graph` in your vault's `.obsidian/plugins/` directory.
    
3. Move the downloaded files into that folder.
    
4. Reload Obsidian and enable the plugin in Settings.
    

### Development

1. Clone this repository.
    
2. Run `npm install` to install dependencies.
    
3. Run `npm run dev` to start compilation in watch mode.
    

## 🎮 Usage

1. **Open the View**: Click the "Network" icon in the ribbon or use the command `Spatial Task Graph: Open Task Graph`.
    
2. **Manage Boards**: Use the bottom-right panel to create new boards for different contexts.
    
3. **Connect Tasks**: Drag from a node's right handle to another node's left handle to create a dependency.
    
4. **Edit Tasks**:
    
    - Click the **Pencil Icon** on a node to edit text, add dates, or change priority.
        
    - **Right-click** on the canvas to add a Sticky Note.
        
5. **Navigate**: Use the left sidebar to quickly jump to active tasks.
    

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License