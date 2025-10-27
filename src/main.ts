import PDFController from '@zonuexe/pdf.js-controller/build/PDFJSController.js';
import { throttle } from 'es-toolkit';

const params = new URLSearchParams(window.location.search);
const pdfUrlParam = params.get('slide');

if (!pdfUrlParam) {
  alert('Please open this page with ?slide=<PDF URL>');
  throw new Error('Missing slide query parameter');
}

const container = document.getElementById('pdf-container');
if (!(container instanceof HTMLElement)) {
  throw new Error('Element with id "pdf-container" was not found');
}

let controlsElement: HTMLElement | null = null;

const eventRegistry = new AbortController();
const { signal: eventSignal } = eventRegistry;

window.addEventListener(
  'pagehide',
  () => {
    eventRegistry.abort();
  },
  { once: true }
);

const controller = new PDFController({
  container,
  workerSrc: new URL('./pdf.worker.mjs', import.meta.url).toString(),
  cMapUrl: new URL('./cmaps/', import.meta.url).toString(),
  cMapPacked: true
}) as any;

bootstrap().catch((error) => {
  console.error(error);
  alert('Failed to load the PDF document. Check the console for details.');
});

async function bootstrap() {
  await controller.loadDocument(pdfUrlParam);
  await initializeNavigation();
}

async function initializeNavigation() {
  attachColourSync();
  await goToPageFromAnchor();
  wireNavigationControls();
  wireClickNavigationZones();
  wireKeyboardShortcuts();
  wireResizeHandler();
  wireSwipeGestures();
  setupControlsVisibility();
}

function attachColourSync() {
  const beforeEvent = PDFController.Events.before_pdf_rendering;
  const afterEvent = PDFController.Events.after_pdf_rendering;

  container.addEventListener(beforeEvent, () => {
    updateColours();
    controller.domMapObject.canvas.style.visibility = 'hidden';
  }, { signal: eventSignal });

  container.addEventListener(afterEvent, () => {
    updateColours();
    controller.domMapObject.canvas.style.visibility = 'visible';
  }, { signal: eventSignal });
}

function updateColours() {
  const context: CanvasRenderingContext2D | null = controller.canvasContext ?? null;
  if (!context) {
    return;
  }
  const cornerColor = getCornerColor(context);
  container.style.backgroundColor = cornerColor;
  document.body.style.backgroundColor = cornerColor;
}

function getCornerColor(context: CanvasRenderingContext2D): string {
  const canvasColor = context.getImageData(0, 0, 1, 1);
  const [r, g, b] = canvasColor.data;
  return `rgb(${r},${g},${b})`;
}

async function goToPageFromAnchor() {
  const hash = window.location.hash;
  if (!hash.startsWith('#p=')) {
    updatePageAttribute();
    return;
  }
  const pageNum = Number.parseInt(hash.substring(3), 10);
  if (!Number.isFinite(pageNum) || pageNum <= 0) {
    updatePageAttribute();
    return;
  }
  const totalPages: number = controller.pageCount ?? controller.pdfDoc?.numPages ?? 0;
  const targetPage = Math.min(pageNum, Math.max(totalPages, 1));
  if (targetPage !== controller.pageNum) {
    await controller.renderPage(targetPage);
    controller.pageNum = targetPage;
  }
  updatePageAttribute();
}

function wireNavigationControls() {
  const prevButton = document.getElementById('js-prev');
  const nextButton = document.getElementById('js-next');

  prevButton?.addEventListener(
    'click',
    () => {
      showControls();
      void prevPage(false);
    },
    { signal: eventSignal }
  );
  nextButton?.addEventListener(
    'click',
    () => {
      showControls();
      void nextPage(false);
    },
    { signal: eventSignal }
  );

  window.addEventListener(
    'hashchange',
    () => {
      void goToPageFromAnchor();
    },
    { signal: eventSignal }
  );
}

function wireClickNavigationZones() {
  const zoneThreshold = 0.15;
  container.addEventListener(
    'click',
    (event) => {
      if (event.defaultPrevented) {
        return;
      }
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      const xRatio = (event.clientX - rect.left) / rect.width;
      if (xRatio <= zoneThreshold) {
        event.preventDefault();
        void prevPage();
      } else if (xRatio >= 1 - zoneThreshold) {
        event.preventDefault();
        void nextPage();
      }
    },
    { signal: eventSignal }
  );
}

function wireKeyboardShortcuts() {
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        return;
      }
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
        case 'k':
        case 'a':
        case 'K':
        case 'A':
          event.preventDefault();
          void prevPage();
          break;
        case 'ArrowRight':
        case 'ArrowUp':
        case 'j':
        case 's':
        case 'J':
        case 'S':
          event.preventDefault();
          void nextPage();
          break;
        default:
          break;
      }
    },
    { signal: eventSignal }
  );
}

function wireResizeHandler() {
  window.addEventListener(
    'resize',
    throttle(() => {
      void controller.fitItSize();
    }, 100),
    { signal: eventSignal }
  );
}

function wireSwipeGestures() {
  if (!('PointerEvent' in window)) {
    return;
  }

  container.style.touchAction = 'pan-y';
  if (controller.domMapObject?.canvas instanceof HTMLCanvasElement) {
    controller.domMapObject.canvas.style.touchAction = 'pan-y';
  }

  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  const swipeThreshold = 45;

  const reset = () => {
    activePointerId = null;
  };

  container.addEventListener(
    'pointerdown',
    (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
        return;
      }
      if (activePointerId !== null) {
        return;
      }
      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      if (typeof container.setPointerCapture === 'function') {
        container.setPointerCapture(event.pointerId);
      }
    },
    { signal: eventSignal }
  );

  container.addEventListener(
    'pointerup',
    (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) {
        return;
      }
      if (typeof container.hasPointerCapture === 'function' && container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      reset();
      if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return;
      }
      if (deltaX < 0) {
        void nextPage();
      } else {
        void prevPage();
      }
    },
    { signal: eventSignal }
  );

  const cancelHandler = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) {
      return;
    }
    if (typeof container.hasPointerCapture === 'function' && container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
    reset();
  };

  container.addEventListener('pointercancel', cancelHandler, { signal: eventSignal });
  container.addEventListener('lostpointercapture', cancelHandler, { signal: eventSignal });
}

function setupControlsVisibility() {
  const candidate = document.querySelector('.controls');
  if (!(candidate instanceof HTMLElement)) {
    return;
  }
  controlsElement = candidate;
  controlsElement.addEventListener(
    'click',
    () => {
      showControls();
    },
    { signal: eventSignal }
  );
}

function fadeControls() {
  setControlsOpacity('0.2');
}

function showControls() {
  setControlsOpacity('1');
}

function setControlsOpacity(value: string) {
  if (!controlsElement) {
    const candidate = document.querySelector('.controls');
    if (candidate instanceof HTMLElement) {
      controlsElement = candidate;
    } else {
      return;
    }
  }
  controlsElement.style.opacity = value;
}

async function prevPage(shouldFade = true) {
  await controller.prevPage();
  postNavigationUpdate();
  if (shouldFade) {
    fadeControls();
  }
}

async function nextPage(shouldFade = true) {
  await controller.nextPage();
  postNavigationUpdate();
  if (shouldFade) {
    fadeControls();
  }
}

function postNavigationUpdate() {
  updatePageAttribute();
  updateURL();
}

function updatePageAttribute() {
  container.setAttribute('data-page', String(controller.pageNum ?? ''));
}

function updateURL() {
  const newHash = `#p=${controller.pageNum}`;
  if (window.location.hash !== newHash) {
    window.history.replaceState(null, document.title, newHash);
  }
}
