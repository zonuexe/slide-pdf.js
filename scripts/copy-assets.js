#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const buildDir = path.join(projectRoot, 'build');
const cssDir = path.join(buildDir, 'css');
const rootCssDir = path.join(projectRoot, 'css');
fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(cssDir, { recursive: true });

function copyFile(source, target) {
  fs.copyFileSync(source, target);
}

function copyIfExists(source, target) {
  if (fs.existsSync(source)) {
    copyFile(source, target);
  }
}

const workerSource = require.resolve('pdfjs-dist/build/pdf.worker.mjs');
const workerTarget = path.join(buildDir, 'pdf.worker.mjs');
copyFile(workerSource, workerTarget);
copyIfExists(`${workerSource}.map`, `${workerTarget}.map`);

const pdfjsPackageDir = path.dirname(require.resolve('pdfjs-dist/package.json'));
const cmapsSource = path.join(pdfjsPackageDir, 'cmaps');
const cmapsTarget = path.join(buildDir, 'cmaps');
if (fs.existsSync(cmapsTarget)) {
  fs.rmSync(cmapsTarget, { recursive: true, force: true });
}
fs.cpSync(cmapsSource, cmapsTarget, { recursive: true });

const controllerPackageDir = path.dirname(require.resolve('@zonuexe/pdf.js-controller/package.json'));
const controllerCssSource = path.join(controllerPackageDir, 'css', 'pdf-slide.css');
const controllerCssTarget = path.join(cssDir, 'vendor-pdf-slide.css');
copyFile(controllerCssSource, controllerCssTarget);
copyIfExists(`${controllerCssSource}.map`, `${controllerCssTarget}.map`);

const controllerCssRootTarget = path.join(rootCssDir, 'vendor-pdf-slide.css');
copyFile(controllerCssSource, controllerCssRootTarget);
copyIfExists(`${controllerCssSource}.map`, `${controllerCssRootTarget}.map`);

const localCssSource = path.join(projectRoot, 'css', 'pdf-slide.css');
const localCssTarget = path.join(cssDir, 'pdf-slide.css');
copyFile(localCssSource, localCssTarget);
copyIfExists(`${localCssSource}.map`, `${localCssTarget}.map`);

const bundleSource = path.join(projectRoot, 'app.js');
const bundleTarget = path.join(buildDir, 'app.js');
copyIfExists(bundleSource, bundleTarget);
copyIfExists(`${bundleSource}.map`, `${bundleTarget}.map`);
