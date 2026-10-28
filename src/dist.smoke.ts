/**
 * Smoke test for the built extension in dist/, run by `yarn test:dist` after
 * `yarn build`. The unit specs import components from src/ directly, so they
 * cannot notice a bundler update that drops a file the manifest or an HTML
 * page points at, or a bundle that throws before React mounts.
 */
import fs from 'fs';
import { DOMWindow, JSDOM, VirtualConsole } from 'jsdom';
import path from 'path';

const DIST = path.resolve(__dirname, '..', 'dist');

const distFile = (relative: string) => path.join(DIST, relative);

const readManifest = () =>
  JSON.parse(fs.readFileSync(distFile('manifest.json'), 'utf8'));

/** Paths of the local scripts an HTML page loads. */
const scriptSources = (page: string): string[] => {
  // Parsed rather than pattern-matched: the build may minify the HTML.
  const { document } = new JSDOM(fs.readFileSync(distFile(page), 'utf8'))
    .window;
  return Array.from(document.querySelectorAll('script[src]'), (script) =>
    script.getAttribute('src')
  ).filter((src): src is string => !!src);
};

/**
 * Browser APIs the bundle touches at startup that jsdom lacks. A non-GitHub
 * tab and empty storage keep the popup from making any network request.
 */
const installBrowserApis = (window: DOMWindow) => {
  Object.assign(window, {
    chrome: {
      tabs: {
        query: (_: unknown, cb: (tabs: { url: string }[]) => void) =>
          cb([{ url: 'chrome://newtab/' }]),
        create: () => undefined,
      },
      runtime: { openOptionsPage: () => undefined },
      storage: {
        local: {
          get: async () => ({}),
          set: async () => undefined,
          remove: async () => undefined,
        },
      },
    },
    matchMedia: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
};

/** Loads a built page with its scripts and waits until `text` is rendered. */
const renderPage = async (page: string, text: string) => {
  const errors: unknown[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => errors.push(error));

  const dom = await JSDOM.fromFile(distFile(page), {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse: installBrowserApis,
  });

  try {
    const deadline = Date.now() + 10_000;
    while (!dom.window.document.body.textContent?.includes(text)) {
      if (errors.length > 0 || Date.now() > deadline) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(errors).toStrictEqual([]);
    expect(dom.window.document.body.textContent).toContain(text);
  } finally {
    dom.window.close();
  }
};

describe('built extension', () => {
  test('ships every file the manifest refers to', () => {
    const manifest = readManifest();

    expect(manifest.manifest_version).toBe(3);
    const referenced = [
      manifest.action.default_icon,
      manifest.action.default_popup,
      manifest.options_ui.page,
    ];
    referenced.forEach((file: string) => {
      expect(fs.existsSync(distFile(file))).toBe(true);
    });
  });

  test.each(['popup.html', 'options.html'])(
    '%s loads only scripts that exist',
    (page) => {
      const sources = scriptSources(page);

      expect(sources.length).toBeGreaterThan(0);
      sources.forEach((source) => {
        expect(fs.existsSync(distFile(source))).toBe(true);
      });
    }
  );

  test('the popup bundle mounts', async () => {
    await renderPage(readManifest().action.default_popup, 'GitHub username');
  });

  test('the options bundle mounts', async () => {
    await renderPage(readManifest().options_ui.page, 'GitHub Language Stats');
  });
});
