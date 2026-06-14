import React, { useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layout,
  Camera,
  Map,
  Download,
} from 'lucide-react';
import { useReactFlow, getNodesBounds } from '@xyflow/react';
import { toBlob } from 'html-to-image';
import useERDStore from '../../store/useERDStore.js';
import Tooltip from '../ui/Tooltip.jsx';
import { addToast } from '../ui/Toast.jsx';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';

export default function CanvasControls({ showMinimap, onToggleMinimap }) {
  const { zoomIn, zoomOut, fitView, getNodes } = useReactFlow();
  const autoLayout = useERDStore((s) => s.autoLayout);
  const isAutoLayoutRunning = useERDStore((s) => s.isAutoLayoutRunning);
  const projectName = useERDStore((s) => s.projectName);
  const [isExporting, setIsExporting] = useState(false);
  const [exportImage, setExportImage] = useState(null);

  const handleCloseModal = useCallback(() => {
    if (exportImage) {
      URL.revokeObjectURL(exportImage);
      setExportImage(null);
    }
  }, [exportImage]);

  const handleDownloadImage = useCallback(() => {
    if (!exportImage) return;
    const link = document.createElement('a');
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'project';
    link.download = `${safeName}_diagram.png`;
    link.href = exportImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Attempted automatic download!', 'info');
  }, [exportImage, projectName]);

  const handleExportPng = useCallback(async () => {
    const viewport = document.querySelector('.react-flow__viewport');
    if (!viewport) {
      addToast('Cannot find canvas viewport', 'error');
      return;
    }

    const nodes = getNodes();
    if (nodes.length === 0) {
      addToast('No tables to export', 'warning');
      return;
    }

    try {
      setIsExporting(true);
      addToast('Generating PNG diagram…', 'info');

      // Calculate bounding box of all nodes
      const bounds = getNodesBounds(nodes);
      const padding = 80;
      const imageWidth = bounds.width + padding * 2;
      const imageHeight = bounds.height + padding * 2;

      const blob = await toBlob(viewport, {
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue('--color-canvas')
          .trim(),
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${-bounds.x + padding}px, ${-bounds.y + padding}px) scale(1)`,
        },
        pixelRatio: 2, // 2x is highly crisp (Retina quality) and keeps memory usage stable
        filter: (node) => {
          if (node?.classList?.contains('react-flow__minimap')) return false;
          if (node?.classList?.contains('react-flow__panel')) return false;
          if (node?.classList?.contains('canvas-controls')) return false;
          return true;
        },
      });

      if (!blob) {
        throw new Error('Failed to capture canvas image data');
      }

      // If there was a previous object URL, revoke it
      if (exportImage) {
        URL.revokeObjectURL(exportImage);
      }

      const url = URL.createObjectURL(blob);
      setExportImage(url);

      const link = document.createElement('a');
      const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'project';
      link.download = `${safeName}_diagram.png`;
      link.href = url;
      
      // Append to DOM to satisfy browser security rules for programmatic downloads
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast('PNG generated! Preview modal opened.', 'success');
    } catch (err) {
      console.error('PNG export failed:', err);
      addToast(`PNG export failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  }, [projectName, getNodes, exportImage]);

  const buttons = [
    { icon: ZoomIn, tip: 'Zoom in', action: () => zoomIn() },
    { icon: ZoomOut, tip: 'Zoom out', action: () => zoomOut() },
    { icon: Maximize2, tip: 'Fit view', action: () => fitView({ padding: 0.15 }) },
    { divider: true },
    { icon: Layout, tip: 'Auto layout (Ctrl+L)', action: autoLayout, disabled: isAutoLayoutRunning, spin: isAutoLayoutRunning },
    { divider: true },
    { icon: Camera, tip: 'Export as PNG', action: handleExportPng, disabled: isExporting },
    { icon: Map, tip: showMinimap ? 'Hide minimap' : 'Show minimap', action: onToggleMinimap, active: showMinimap },
  ];

  return (
    <>
      <div className="canvas-controls absolute bottom-4 right-4 flex flex-col gap-0.5 rounded-xl p-1 z-10">
        {buttons.map((btn, i) =>
          btn.divider ? (
            <div key={i} className="border-t border-border/20 my-0.5" />
          ) : (
            <Tooltip key={i} content={btn.tip} position="left">
              <button
                onClick={btn.action}
                disabled={btn.disabled}
                className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-30 ${
                  btn.active
                    ? 'text-accent bg-accent/10'
                    : 'text-muted hover:text-accent hover:bg-accent/10'
                }`}
              >
                <btn.icon size={16} className={btn.spin ? 'animate-spin' : ''} />
              </button>
            </Tooltip>
          )
        )}
      </div>

      <Modal
        isOpen={!!exportImage}
        onClose={handleCloseModal}
        title="Export PNG Diagram"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-accent/5 rounded-xl border border-accent/10 text-xs text-textSecondary leading-relaxed">
            <span className="font-semibold text-accent">💡 Tips for saving:</span>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>An automatic download was triggered. Look in your browser downloads or check if it completed.</li>
              <li>If the file downloaded without an extension (like a random ID), or did not start at all, simply <strong>right-click (or tap and hold) the image below</strong> and choose <strong>"Save image as..."</strong> to save it directly as a PNG.</li>
            </ul>
          </div>

          <div className="flex justify-center bg-surface2 border border-border/50 rounded-xl p-4 max-h-[50vh] overflow-auto select-all">
            <img
              src={exportImage || ''}
              alt={`${projectName}_diagram`}
              className="max-w-full h-auto rounded-lg shadow-xl border border-border/20 object-contain cursor-zoom-in"
              title="Right click -> Save image as..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={handleCloseModal}>
              Close
            </Button>
            <Button variant="primary" icon={Download} onClick={handleDownloadImage}>
              Download Image
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

