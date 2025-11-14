# slide-pdf.js

Presentation tools for pdf file.

Show PDF slide using [pdf.js](https://github.com/mozilla/pdf.js "pdf.js").

Example : [Deckset](http://decksetapp.com/ "Deckset for Mac: Turn your notes into beautiful presentations"), Power Point and Keynote.

## Usage

`https://azu.github.io/slide-pdf.js/?slide=<PDF URL>`

e.g.) https://zonuexe.github.io/slide-pdf.js/?slide=test/fixtures/sourcemap.pdf


Please be careful for [Cross-origin resource sharing (CORS)](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing "Cross-origin resource sharing (CORS)").

## Quick start

```
git clone https://github.com/zonuexe/slide-pdf.js
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

This repository bundles multiple works (code and artwork) under different licenses. When redistributing the full project—including the Rabbit/Elephpant imagery—you must comply with the GNU General Public License version 2.0 or later for those assets in addition to the software licenses noted below.

### azu/slide-pdf.js

[azu/slide-pdf.js](https://github.com/azu/slide-pdf.js) is MIT licensed.

```
Copyright (c) 2014 azu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Artwork

All bundled artwork (Rabbit sprites, Elephpant variants, etc.) lives under [`images/`](./images) and is licensed under the GNU GPL version 2.0 or (at your option) any later version. See [`images/README.md`](./images/README.md) for attribution sources and reuse requirements; the full license text ships in [`images/GPL`](./images/GPL).

## Development

- `npm install`
- `npm run build` (bundles ESM to `build/app.js` and stages worker/cmaps)
- `npm run watch` for incremental builds during development
- `npm run start` to build and serve via `static-server` on port 9080

## Browser Usage

When embedding the bundle, define an import map for `pdfjs-dist` (the ESM controller is bundled inside `build/app.js`).

```html
<link rel="stylesheet" href="./css/vendor-pdf-slide.css" />
<link rel="stylesheet" href="./css/pdf-slide.css" />
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
