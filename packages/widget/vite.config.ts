import { defineConfig } from 'vite';
import { resolve } from 'path';

const widgetName = process.env.WIDGET_NAME || 'iframe';

const entries = {
  iframe: {
    entry: resolve(__dirname, 'src/iframe-widget.ts'),
    fileName: 'menucraft-widget',
    name: 'MenuCraftWidget',
  },
  shadow: {
    entry: resolve(__dirname, 'src/shadow-widget.ts'),
    fileName: 'menucraft-widget-shadow',
    name: 'MenuCraftWidgetShadow',
  },
};

const widget = entries[widgetName as keyof typeof entries];

export default defineConfig({
  build: {
    lib: {
      entry: widget.entry,
      formats: ['iife'],
      name: widget.name,
      fileName: () => `${widget.fileName}.js`,
    },
    minify: true,
    outDir: 'dist',
    emptyOutDir: widgetName === 'iframe', // Only empty on first build
  },
});
