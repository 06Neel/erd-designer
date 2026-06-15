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
import { useReactFlow } from '@xyflow/react';
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
    const nodes = getNodes();
    if (nodes.length === 0) {
      addToast('No tables to export', 'warning');
      return;
    }

    try {
      setIsExporting(true);
      addToast('Generating PNG…', 'info');

      // ── Capture the outer React Flow container ────────────────────────────
      // We capture .react-flow (the visible canvas window) directly, at its
      // natural size. This gives exactly what the user sees — same as the
      // white rectangle in the minimap. No transform math needed.
      const canvasEl = document.querySelector('.react-flow');
      if (!canvasEl) {
        addToast('Cannot find canvas element', 'error');
        return;
      }

      const bgColor =
        getComputedStyle(document.documentElement)
          .getPropertyValue('--color-canvas')
          .trim() || '#0f1117';

      // ── Strip backdrop-filter & decorative blur before capture ────────────
      // html-to-image cannot render CSS backdrop-filter or filter:blur().
      // We disable them temporarily, then restore after capture.
      const affected = [];
      canvasEl.querySelectorAll('*').forEach((el) => {
        const cs = getComputedStyle(el);

        const bf = cs.backdropFilter || cs.webkitBackdropFilter;
        if (bf && bf !== 'none' && bf !== '') {
          affected.push({ el, backdropFilter: el.style.backdropFilter, webkitBackdropFilter: el.style.webkitBackdropFilter });
          el.style.backdropFilter = 'none';
          el.style.webkitBackdropFilter = 'none';
        }

        const f = cs.filter;
        if (f && f.includes('blur') && el.tagName !== 'feGaussianBlur') {
          affected.push({ el, filter: el.style.filter, _isFilter: true });
          el.style.filter = 'none';
        }
      });

      const { width, height } = canvasEl.getBoundingClientRect();

      const exportOptions = {
        backgroundColor: bgColor,
        width,
        height,
        pixelRatio: 3, // 3× retina-quality
        filter: (node) => {
          if (node?.classList?.contains('react-flow__minimap')) return false;
          if (node?.classList?.contains('react-flow__panel')) return false;
          if (node?.classList?.contains('canvas-controls')) return false;
          // Skip decorative glow orbs — they bleed outside overflow:hidden in html-to-image
          if (
            node?.classList?.contains('rounded-full') &&
            (node?.classList?.contains('blur-xl') || node?.classList?.contains('blur-2xl'))
          ) return false;
          return true;
        },
      };

      const { toPng } = await import('html-to-image');
      // Warmup pass ensures fonts & images are embedded
      await toPng(canvasEl, exportOptions);
      const dataUrl = await toPng(canvasEl, exportOptions);

      // ── Restore all modified styles ───────────────────────────────────────
      affected.forEach(({ el, backdropFilter, webkitBackdropFilter, filter, _isFilter }) => {
        if (_isFilter) {
          el.style.filter = filter || '';
        } else {
          el.style.backdropFilter = backdropFilter || '';
          el.style.webkitBackdropFilter = webkitBackdropFilter || '';
        }
      });

      if (!dataUrl) throw new Error('Failed to capture canvas image');
      if (exportImage) URL.revokeObjectURL(exportImage);
      setExportImage(dataUrl);
      addToast('PNG ready! Click "Download Image" to save.', 'success');

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
              <li>Click <strong>"Download Image"</strong> below to save a crisp, high-resolution PNG.</li>
              <li>You can also <strong>right-click the image</strong> and choose <strong>"Save image as..."</strong> for a direct save.</li>
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

