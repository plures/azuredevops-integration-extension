/**
 * Automatic Message Interception
 *
 * Intercepts all webview ↔ extension host message passing automatically.
 */

import { standardizedLogger } from './StandardizedAutomaticLogger.js';

/**
 * Intercept webview messages (extension host side)
 * VS Code webview API: webview.postMessage() and webview.onDidReceiveMessage()
 *
 * Note: VS Code webview properties may be read-only, so we wrap the calls instead
 */
export function interceptWebviewMessages(
  webview: {
    postMessage: (message: any) => Thenable<boolean>;
    onDidReceiveMessage: (callback: (message: any) => void) => { dispose(): void };
  },
  component: string = 'webview'
): {
  postMessage: (message: any) => Thenable<boolean>;
  onDidReceiveMessage: (callback: (message: any) => void) => { dispose(): void };
} {
  const originalPostMessage = webview.postMessage.bind(webview);
  const originalOnDidReceiveMessage = webview.onDidReceiveMessage.bind(webview);

  // Interception setup (no logging needed - automatic logging will capture this)

  // Create intercepted versions
  const intercepted = {
    postMessage: (message: any) => {
      try {
        standardizedLogger.info(
          'message',
          component,
          'postMessage',
          `host->webview: ${message?.type || 'unknown'}`,
          { message }
        );
      } catch (err) {
        // Silent fail - logging should never break functionality
      }
      return originalPostMessage(message);
    },

    onDidReceiveMessage: (callback: (message: any) => void) => {
      return originalOnDidReceiveMessage((message: any) => {
        try {
          standardizedLogger.info(
            'message',
            component,
            'onDidReceiveMessage',
            `webview->host: ${message?.type || 'unknown'}`,
            { message }
          );
        } catch (err) {
          // Silent fail - logging should never break functionality
        }
        callback(message);
      });
    },
  };

  return intercepted;
}

/**
 * Intercept postMessage calls (webview side)
 */
export function interceptPostMessage(
  vscodeApi: { postMessage: (message: any) => void },
  component: string = 'webview'
): { postMessage: (message: any) => void } {
  const originalPostMessage = vscodeApi.postMessage.bind(vscodeApi);

  return {
    postMessage: (message: any) => {
      try {
        standardizedLogger.info(
          'message',
          component,
          'postMessage',
          `webview->host: ${message?.type || 'unknown'}`,
          { message }
        );
      } catch (err) {
        // Silent fail - logging should never break functionality
      }
      return originalPostMessage(message);
    },
  };
}

/**
 * Intercept window.addEventListener('message') (webview side)
 */
export function interceptWindowMessages(component: string = 'webview'): void {
  // Check if already intercepted
  if ((window.addEventListener as any).__intercepted) {
    standardizedLogger.debug(
      'message',
      component,
      'interceptWindowMessages',
      'Already intercepted, skipping'
    );
    return;
  }

  const originalAddEventListener = window.addEventListener.bind(window);

  const interceptedAddEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (type === 'message') {
      standardizedLogger.debug(
        'message',
        component,
        'addEventListener',
        `Intercepting 'message' listener registration`
      );
      const wrappedListener = (event: Event) => {
        const messageEvent = event as MessageEvent;
        try {
          standardizedLogger.info(
            'message',
            component,
            'addEventListener',
            `host->webview: ${messageEvent.data?.type || 'unknown'}`,
            { message: messageEvent.data }
          );
        } catch (err) {
          // Silent fail - logging should never break functionality
        }

        // Always call the original listener
        if (listener instanceof Function) {
          listener(event);
        } else if (listener && 'handleEvent' in listener) {
          listener.handleEvent(event);
        }
      };

      return originalAddEventListener(type, wrappedListener, options);
    }

    return originalAddEventListener(type, listener, options);
  };

  // Mark as intercepted
  (interceptedAddEventListener as any).__intercepted = true;

  // Replace window.addEventListener
  window.addEventListener = interceptedAddEventListener;

  standardizedLogger.info(
    'message',
    component,
    'interceptWindowMessages',
    'window.addEventListener intercepted'
  );
}
