import { useEffect } from 'react';

type VisualElement = {
  id: string;
  type: 'heading' | 'text' | 'button' | 'image' | 'shape';
  text?: string;
  imageUrl?: string;
  x?: number;
  y?: number;
  width?: number;
  fontSize?: number;
  weight?: number;
  color?: string;
};

type VisualSection = {
  id: string;
  name: string;
  label?: string;
  visible?: boolean;
  height?: number;
  background?: string;
  padding?: number;
  align?: 'left' | 'center' | 'right';
  elements?: VisualElement[];
};

type SyncPayload = {
  pageId: string;
  sections: VisualSection[];
  brand?: any;
  typography?: any;
};

const EDITOR_ORIGIN = window.location.origin;

const selectors: Record<VisualElement['type'], string> = {
  heading: 'h1,h2,h3,h4',
  text: 'p,li,blockquote',
  button: 'button,a[role="button"],a[href]',
  image: 'img',
  shape: '[data-visual-shape]'
};

function candidates(root: Element, type: VisualElement['type']) {
  return Array.from(root.querySelectorAll(selectors[type])).filter((node) => {
    const el = node as HTMLElement;
    return !el.closest('[data-visual-editor-ui="true"]');
  }) as HTMLElement[];
}

function applyElement(root: Element, element: VisualElement, index: number) {
  const node = root.querySelector('[data-visual-editor-id="' + CSS.escape(element.id) + '"]') as HTMLElement | null;
  const fallback = node || candidates(root, element.type)[index] || null;
  if (!fallback) return;
  fallback.dataset.visualEditorId = element.id;
  fallback.style.outline = 'none';
  fallback.style.boxSizing = 'border-box';
  if (element.text && element.type !== 'image' && element.type !== 'shape') {
    if (element.type === 'button' || fallback.children.length === 0) fallback.textContent = element.text;
  }
  if (element.imageUrl && element.type === 'image' && fallback instanceof HTMLImageElement) {
    fallback.src = element.imageUrl;
  }
  if (element.fontSize) fallback.style.fontSize = element.fontSize + 'px';
  if (element.weight) fallback.style.fontWeight = String(element.weight);
  if (element.color) fallback.style.color = element.color;
  if (element.width) {
    fallback.style.maxWidth = element.width + '%';
  }
  if (typeof element.x === 'number' && Math.abs(element.x - 50) > 0.1) {
    fallback.style.position = fallback.style.position === 'static' ? 'relative' : fallback.style.position;
    fallback.style.left = (element.x - 50) + '%';
  } else {
    fallback.style.left = '';
  }
  if (typeof element.y === 'number' && Math.abs(element.y - 50) > 0.1) {
    fallback.style.position = fallback.style.position === 'static' ? 'relative' : fallback.style.position;
    fallback.style.top = (element.y - 50) + '%';
  } else {
    fallback.style.top = '';
  }
}

function applyDraft(payload: SyncPayload, selectedId?: string) {
  const pageRoot =
    document.querySelector('[data-visual-page="' + CSS.escape(payload.pageId) + '"]') ||
    document.querySelector('main') ||
    document.body;

  const sectionNodes = Array.from(pageRoot.querySelectorAll('[data-visual-section]')) as HTMLElement[];
  const genericSections = Array.from(pageRoot.querySelectorAll('section')) as HTMLElement[];

  payload.sections.forEach((section, sectionIndex) => {
    const sectionNode =
      (sectionNodes.find((node) => node.dataset.visualSection === section.name) || genericSections[sectionIndex] || pageRoot) as HTMLElement;
    if (!sectionNode) return;
    sectionNode.dataset.visualSection = section.name;
    if (section.background) sectionNode.style.background = section.background;
    if (section.height) sectionNode.style.minHeight = section.height + 'px';
    if (typeof section.padding === 'number') sectionNode.style.padding = section.padding + 'px';
    if (section.align) sectionNode.style.textAlign = section.align;
    sectionNode.style.display = section.visible === false ? 'none' : '';
    const counters: Record<string, number> = {};
    (section.elements || []).forEach((element) => {
      const index = counters[element.type] || 0;
      counters[element.type] = index + 1;
      applyElement(sectionNode, element, index);
    });
  });

  pageRoot.querySelectorAll('[data-visual-editor-selected]').forEach((node) => {
    node.removeAttribute('data-visual-editor-selected');
    (node as HTMLElement).style.outline = '';
    (node as HTMLElement).style.outlineOffset = '';
  });
  if (selectedId) {
    const selected = pageRoot.querySelector('[data-visual-editor-id="' + CSS.escape(selectedId) + '"]') as HTMLElement | null;
    if (selected) {
      selected.dataset.visualEditorSelected = 'true';
      selected.style.outline = '2px solid #c4ad7b';
      selected.style.outlineOffset = '4px';
    }
  }
}

export function VisualEditorRuntime() {
  useEffect(() => {
    if (window.parent === window) return;

    let current: SyncPayload | null = null;
    let selectedId = '';

    const send = (message: any) => {
      if (window.parent === window) return;
      window.parent.postMessage(message, EDITOR_ORIGIN);
    };

    const ready = () => send({ type: 'agentdesk-visual-editor-ready' });

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== EDITOR_ORIGIN || event.source !== window.parent) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'agentdesk-visual-editor-sync') {
        current = event.data.payload as SyncPayload;
        selectedId = String(event.data.selectedId || '');
        applyDraft(current, selectedId);
      }
      if (event.data.type === 'agentdesk-visual-editor-selection') {
        selectedId = String(event.data.selectedId || '');
        if (current) applyDraft(current, selectedId);
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!current) return;
      const target = event.target as HTMLElement | null;
      const node = target?.closest?.('[data-visual-editor-id]') as HTMLElement | null;
      if (!node) return;
      const id = node.dataset.visualEditorId;
      if (!id) return;
      event.preventDefault();
      event.stopPropagation();
      send({ type: 'agentdesk-visual-editor-select', selectedId: id });
    };

    let drag: { node: HTMLElement; id: string; startX: number; startY: number; originLeft: number; originTop: number; parentWidth: number; parentHeight: number } | null = null;

    const handlePointerDown = (event: PointerEvent) => {
      if (!current || event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      const node = target?.closest?.('[data-visual-editor-id]') as HTMLElement | null;
      if (!node || node.closest('input,textarea,select')) return;
      const id = node.dataset.visualEditorId;
      if (!id) return;
      const parent = node.parentElement;
      const rect = node.getBoundingClientRect();
      const parentRect = parent?.getBoundingClientRect();
      if (!parentRect) return;
      const originLeft = ((rect.left - parentRect.left) / Math.max(1, parentRect.width)) * 100;
      const originTop = ((rect.top - parentRect.top) / Math.max(1, parentRect.height)) * 100;
      drag = { node, id, startX: event.clientX, startY: event.clientY, originLeft, originTop, parentWidth: parentRect.width, parentHeight: parentRect.height };
      node.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
      send({ type: 'agentdesk-visual-editor-select', selectedId: id });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!drag) return;
      const nextX = Math.max(2, Math.min(98, drag.originLeft + ((event.clientX - drag.startX) / drag.parentWidth) * 100));
      const nextY = Math.max(2, Math.min(98, drag.originTop + ((event.clientY - drag.startY) / drag.parentHeight) * 100));
      drag.node.style.position = drag.node.style.position === 'static' ? 'relative' : drag.node.style.position;
      drag.node.style.left = (nextX - 50) + '%';
      drag.node.style.top = (nextY - 50) + '%';
      send({ type: 'agentdesk-visual-editor-drag', selectedId: drag.id, x: Number(nextX.toFixed(2)), y: Number(nextY.toFixed(2)) });
    };

    const handlePointerUp = () => { if (drag) send({ type: 'agentdesk-visual-editor-drag-end', selectedId: drag.id }); drag = null; };

    window.addEventListener('message', handleMessage);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('load', ready);
    ready();

    const observer = new MutationObserver(() => { if (current) applyDraft(current, selectedId); });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('load', ready);
      observer.disconnect();
    };
  }, []);

  return null;
}
