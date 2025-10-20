#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const buildDir = path.join(projectRoot, 'build');
fs.mkdirSync(buildDir, { recursive: true });

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
