# slide-pdf.js [![Build Status](https://travis-ci.org/azu/slide-pdf.js.svg?branch=master)](https://travis-ci.org/azu/slide-pdf.js)

Presentation tools for pdf file.

Show PDF slide using [pdf.js](https://github.com/mozilla/pdf.js "pdf.js").

Example : [Deckset](http://decksetapp.com/ "Deckset for Mac: Turn your notes into beautiful presentations"), Power Point and Keynote.

## Usage

`https://azu.github.io/slide-pdf.js/?slide=<PDF URL>`

e.g.) https://azu.github.io/slide-pdf.js/?slide=test/fixtures/sourcemap.pdf


Please be careful for [Cross-origin resource sharing (CORS)](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing "Cross-origin resource sharing (CORS)").

## Quick start

```
git clone https://github.com/azu/slide-pdf.js.git
git push your_repo 
```

Use generator : [azu/pdf-slide-html](https://github.com/azu/pdf-slide-html "azu/pdf-slide-html")

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## License

MIT

## Development

- `npm install`
- `npm run build` (bundles ESM to `build/app.js` and stages worker/cmaps)
- `npm run watch` for incremental builds during development
- `npm run start` to build and serve via `static-server` on port 9080

## Browser Usage

When embedding the bundle, define an import map for `pdfjs-dist` (the ESM controller is bundled inside `build/app.js`).

```html
<script type="importmap">
{
  "imports": {
    "pdfjs-dist": "./node_modules/pdfjs-dist/build/pdf.mjs",
    "pdfjs-dist/web/pdf_viewer.mjs": "./node_modules/pdfjs-dist/web/pdf_viewer.mjs"
  }
}
</script>
<script type="module" src="./build/app.js" defer></script>
```

Within the module you can import the controller directly:

```js
import PDFController from '@zonuexe/pdf.js-controller/build/PDFJSController.js';
```
