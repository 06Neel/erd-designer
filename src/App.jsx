import React, { useEffect, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Toolbar from './components/toolbar/Toolbar.jsx';
import ProjectSidebar from './components/sidebar/ProjectSidebar.jsx';
import ERDCanvas from './components/canvas/ERDCanvas.jsx';
import SidePanel from './components/panels/SidePanel.jsx';
import StatusBar from './components/ui/StatusBar.jsx';
import { ToastContainer } from './components/ui/Toast.jsx';
import useERDStore from './store/useERDStore.js';

export default function App() {
  const loadProjects = useERDStore((s) => s.loadProjects);
  const newProject = useERDStore((s) => s.newProject);
  const projectId = useERDStore((s) => s.projectId);
  const undo = useERDStore((s) => s.undo);
  const redo = useERDStore((s) => s.redo);
  const saveProject = useERDStore((s) => s.saveProject);
  const addEntity = useERDStore((s) => s.addEntity);
  const autoLayout = useERDStore((s) => s.autoLayout);
  const deselect = useERDStore((s) => s.deselect);
  const setSearchQuery = useERDStore((s) => s.setSearchQuery);

  // Load projects on mount
  useEffect(() => {
    const init = async () => {
      await loadProjects();
      // If no projects exist, create a default one
      const state = useERDStore.getState();
      if (!state.projectId) {
        newProject('My First Schema', 'postgresql');
      }
    };
    init();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Ignore if inside input/textarea
      const tag = e.target.tagName.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          redo();
        } else if (e.key === 's') {
          e.preventDefault();
          saveProject();
        } else if (e.key === 'n' && !isInput) {
          e.preventDefault();
          addEntity();
        } else if (e.key === 'l' && !isInput) {
          e.preventDefault();
          autoLayout();
        } else if (e.key === 'f' && !e.shiftKey && !isInput) {
          e.preventDefault();
          // Focus search input
          const searchInput = document.querySelector('input[placeholder="Search tables..."]');
          if (searchInput) searchInput.focus();
        } else if (e.key === 'F' && e.shiftKey) {
          e.preventDefault();
          // Fit view - handled by React Flow
        }
      }

      if (e.key === 'Escape') {
        deselect();
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, saveProject, addEntity, autoLayout, deselect, setSearchQuery]);

  return (
    <ReactFlowProvider>
      <div className="app-wrapper h-screen w-screen flex flex-col bg-canvas overflow-hidden">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <ProjectSidebar />
          <ERDCanvas />
          <SidePanel />
        </div>
        <StatusBar />
        <ToastContainer />
      </div>
    </ReactFlowProvider>
  );
}
