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

function copyDir(source, target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  fs.cpSync(source, target, { recursive: true });
}

const workerSource = require.resolve('pdfjs-dist/build/pdf.worker.mjs');
const workerTarget = path.join(buildDir, 'pdf.worker.mjs');
copyFile(workerSource, workerTarget);
copyIfExists(`${workerSource}.map`, `${workerTarget}.map`);
const workerTargetRoot = path.join(projectRoot, 'pdf.worker.mjs');
copyFile(workerSource, workerTargetRoot);
copyIfExists(`${workerSource}.map`, `${workerTargetRoot}.map`);

const pdfjsPackageDir = path.dirname(require.resolve('pdfjs-dist/package.json'));
const cmapsSource = path.join(pdfjsPackageDir, 'cmaps');
const cmapsTarget = path.join(buildDir, 'cmaps');
copyDir(cmapsSource, cmapsTarget);
const cmapsRootTarget = path.join(projectRoot, 'cmaps');
copyDir(cmapsSource, cmapsRootTarget);

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
// 空のsource mapファイルを作成して404エラーを防ぐ
const emptySourceMap = JSON.stringify({ version: 3, sources: [], names: [], mappings: '' });
fs.writeFileSync(path.join(cssDir, 'pdf-slide.css.map'), emptySourceMap);

const bundleSource = path.join(projectRoot, 'app.js');
const bundleTarget = path.join(buildDir, 'app.js');
copyIfExists(bundleSource, bundleTarget);
copyIfExists(`${bundleSource}.map`, `${bundleTarget}.map`);

const imagesSource = path.join(projectRoot, 'images');
const imagesTarget = path.join(buildDir, 'images');
if (fs.existsSync(imagesSource)) {
  copyDir(imagesSource, imagesTarget);
}
