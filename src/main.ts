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


let speakerWindowRef: Window | null = null;
let speakerHandshakeToken: string | null = null;
let speakerChannelRegistered = false;
let pendingSpeakerWindow: Window | null = null;
let pendingSpeakerReadyTimeout: number | null = null;

window.addEventListener(
  'pagehide',
  () => {
    eventRegistry.abort();
  },
  { once: true }
);

eventSignal.addEventListener('abort', () => {
  closeSpeakerWindow();
});

window.addEventListener(
  'beforeunload',
  () => {
    closeSpeakerWindow();
  },
  { signal: eventSignal }
);

window.addEventListener(
  'message',
  (event) => {
    handleSpeakerWindowMessage(event);
  },
  { signal: eventSignal }
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
  wireSpeakerViewControl();
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
    postNavigationUpdate();
    return;
  }
  const pageNum = Number.parseInt(hash.substring(3), 10);
  if (!Number.isFinite(pageNum) || pageNum <= 0) {
    postNavigationUpdate();
    return;
  }
  const totalPages: number = controller.pageCount ?? controller.pdfDoc?.numPages ?? 0;
  const targetPage = Math.min(pageNum, Math.max(totalPages, 1));
  if (targetPage !== controller.pageNum) {
    await controller.renderPage(targetPage);
    controller.pageNum = targetPage;
  }
  postNavigationUpdate();
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

function wireSpeakerViewControl() {
  const button = document.getElementById('js-speaker');
  if (!(button instanceof HTMLElement)) {
    return;
  }
  button.addEventListener(
    'click',
    () => {
      showControls();
      openSpeakerView();
    },
    { signal: eventSignal }
  );
}

function wireKeyboardShortcuts() {
  document.addEventListener(
    'keydown',
    (event) => {
      if (handleNavigationKey(event)) {
        event.preventDefault();
        showControls();
      }
    },
    { signal: eventSignal }
  );
}

function handleNavigationKey(event: KeyboardEvent): boolean {
  if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
    case 'k':
    case 'a':
    case 'K':
    case 'A':
    case 'PageUp':
      void prevPage();
      return true;
    case 'ArrowRight':
    case 'ArrowUp':
    case 'j':
    case 's':
    case 'J':
    case 'S':
    case 'PageDown':
      void nextPage();
      return true;
    default:
      return false;
  }
}

function openSpeakerView(): void {
  if (speakerWindowRef && !speakerWindowRef.closed) {
    speakerWindowRef.focus();
    scheduleSpeakerViewUpdate();
    sendSpeakerPing('refocus');
    return;
  }
  if (!pdfUrlParam) {
    console.error('Cannot open speaker view: PDF URL parameter is missing.');
    return;
  }
  const handshake = generateSpeakerHandshake();
  speakerHandshakeToken = handshake;
  const speakerUrl = new URL('./speaker.html', window.location.href);
  speakerUrl.searchParams.set('speaker', '1');
  speakerUrl.searchParams.set('slide', pdfUrlParam);
  speakerUrl.searchParams.set('handshake', handshake);
  const speakerWin = window.open(speakerUrl.toString(), 'pdf-speaker-view', 'width=1200,height=800');
  if (!speakerWin) {
    speakerHandshakeToken = null;
    alert('ポップアップがブロックされているため、スピーカービューを開けません。');
    return;
  }
  pendingSpeakerWindow = speakerWin;
  if (pendingSpeakerReadyTimeout !== null) {
    window.clearTimeout(pendingSpeakerReadyTimeout);
  }
  pendingSpeakerReadyTimeout = window.setTimeout(() => {
    if (pendingSpeakerWindow === speakerWin) {
      console.error('Speaker view did not respond in time.');
      pendingSpeakerWindow = null;
      speakerHandshakeToken = null;
      resetSpeakerState();
      try {
        speakerWin.close();
      } catch {
        /* ignore close errors */
      }
    }
  }, 10000);
  try {
    speakerWin.focus();
  } catch {
    /* ignore focus errors */
  }
}

function generateSpeakerHandshake(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function handleSpeakerReady(source: MessageEventSource | null, handshake: string | undefined) {
  if (!source || typeof (source as Window).postMessage !== 'function') {
    return;
  }
  const normalizedHandshake = typeof handshake === 'string' ? handshake : undefined;
  if (!speakerHandshakeToken && normalizedHandshake) {
    speakerHandshakeToken = normalizedHandshake;
  }
  if (speakerHandshakeToken && normalizedHandshake && normalizedHandshake !== speakerHandshakeToken) {
    console.warn('Ignoring speaker-ready with unexpected handshake value.');
    return;
  }
  const win = source as Window;
  if (pendingSpeakerWindow && win !== pendingSpeakerWindow) {
    console.warn('Received speaker-ready from unexpected window instance. Ignoring.');
    return;
  }
  if (speakerWindowRef === win && speakerChannelRegistered) {
    sendSpeakerAck(win);
    sendNavigationUpdate();
    return;
  }
  if (pendingSpeakerReadyTimeout !== null) {
    window.clearTimeout(pendingSpeakerReadyTimeout);
    pendingSpeakerReadyTimeout = null;
  }
  pendingSpeakerWindow = null;
  speakerWindowRef = win;

  registerSpeakerCommunicationChannel();
  try {
    win.focus();
  } catch {
    /* ignore focus errors */
  }
  sendSpeakerAck(win);
  sendSpeakerPing('startup');
  sendNavigationUpdate();
}

function sendSpeakerAck(target: Window) {
  if (!speakerHandshakeToken) {
    return;
  }
  try {
    target.postMessage({ type: 'speaker-ack', handshake: speakerHandshakeToken }, window.location.origin);
  } catch (error) {
    console.error('Failed to send speaker ack', error);
  }
}

function registerSpeakerCommunicationChannel() {
  if (speakerChannelRegistered) {
    return;
  }
  speakerChannelRegistered = true;
  sendSpeakerPing('channel-registered');
}

function handleSpeakerWindowMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) {
    return;
  }
  const payload = event.data;
  if (!payload || typeof payload !== 'object') {
    return;
  }
  const data = payload as {
    type?: string;
    handshake?: string;
    label?: string;
    timestamp?: number;
    message?: string;
    key?: string;
  };

  if (data.type === 'speaker-ready') {
    handleSpeakerReady(event.source ?? null, data.handshake);
    return;
  }

  if (!speakerWindowRef || event.source !== speakerWindowRef) {
    return;
  }

  if (speakerHandshakeToken && data.handshake && data.handshake !== speakerHandshakeToken) {
    return;
  }

  switch (data.type) {
    case 'speaker-pong':
      console.debug('Speaker view pong:', data.label ?? '', data.timestamp ? new Date(data.timestamp).toISOString() : '');
      break;
    case 'speaker-log':
      console.debug('Speaker view log:', data.message ?? '');
      break;
    case 'speaker-ack':
      console.debug('Speaker view acknowledged handshake.');
      break;
    case 'speaker-keydown':
      // スピーカーウィンドウからのキーボードイベントをメインウィンドウに転送
      if (data.key) {
        const syntheticEvent = new KeyboardEvent('keydown', {
          key: data.key,
          bubbles: true,
          cancelable: true
        });
        if (handleNavigationKey(syntheticEvent)) {
          syntheticEvent.preventDefault();
        }
      }
      break;
    default:
      break;
  }
}

function sendSpeakerPing(label: string) {
  if (!speakerWindowRef || speakerWindowRef.closed || !speakerHandshakeToken) {
    return;
  }
  const message = {
    type: 'speaker-ping',
    handshake: speakerHandshakeToken,
    label,
    timestamp: Date.now()
  } as const;
  try {
    const origin = getSpeakerOrigin();
    speakerWindowRef.postMessage(message, origin);
  } catch (error) {
    console.warn('Failed to ping speaker window', error);
  }
}

function getSpeakerOrigin(): string {
  if (!speakerWindowRef) {
    return window.location.origin;
  }
  try {
    const href = speakerWindowRef.location?.href;
    if (href) {
      return new URL(href).origin;
    }
  } catch {
    // fall back to current origin if cross-origin access fails
  }
  return window.location.origin;
}

function sendNavigationUpdate() {
  if (!speakerWindowRef || speakerWindowRef.closed || !speakerHandshakeToken) {
    return;
  }
  const pdfDoc = controller.pdfDoc;
  if (!pdfDoc) {
    return;
  }
  const totalPages = controller.pageCount ?? pdfDoc.numPages ?? 0;
  const currentPage = controller.pageNum ?? 1;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  const message = {
    type: 'speaker-navigation-update',
    handshake: speakerHandshakeToken,
    currentPage,
    nextPage,
    totalPages,
    pdfUrl: pdfUrlParam
  } as const;

  try {
    const origin = getSpeakerOrigin();
    speakerWindowRef.postMessage(message, origin);
  } catch (error) {
    console.warn('Failed to send navigation update to speaker window', error);
  }
}


function scheduleSpeakerViewUpdate() {
  sendNavigationUpdate();
}


function closeSpeakerWindow() {
  if (speakerWindowRef && !speakerWindowRef.closed) {
    try {
      speakerWindowRef.close();
    } catch {
      /* ignore close errors */
    }
  }
  resetSpeakerState();
  speakerWindowRef = null;
}

function resetSpeakerState(options?: { keepHandshake?: boolean }) {
  if (pendingSpeakerReadyTimeout !== null) {
    window.clearTimeout(pendingSpeakerReadyTimeout);
    pendingSpeakerReadyTimeout = null;
  }
  if (!options?.keepHandshake) {
    pendingSpeakerWindow = null;
    speakerHandshakeToken = null;
  }
  speakerChannelRegistered = false;
}

function wireResizeHandler() {
  window.addEventListener(
    'resize',
    throttle(() => {
      void controller.fitItSize();
      scheduleSpeakerViewUpdate();
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
  scheduleSpeakerViewUpdate();
  sendSpeakerPing('navigation-update');
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
