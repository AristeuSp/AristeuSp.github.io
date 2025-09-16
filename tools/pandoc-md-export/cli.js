#!/usr/bin/env node
/**
 * pandoc-md — Exporta Markdown -> HTML5 usando Pandoc.
 *
 * Uso:
 *   pandoc-md --in caminho/arquivo.md [--out caminho/arquivo.html]
 *   pandoc-md --in caminho/arquivo.md --out-dir dist [--title "Título"] [--lang pt-BR]
 *   pandoc-md --in caminho/arquivo.md --css <url|path> [--github]
 *   pandoc-md --in caminho/arquivo.md --highlight kate
 *   pandoc-md --in caminho/arquivo.md --no-highlight
 *   pandoc-md --breaks
 *   pandoc-md --help
 *
 * Requisitos:
 * - Pandoc instalado e no PATH: https://pandoc.org/installing.html
 */

import { spawnSync } from 'node:child_process';
import { basename, dirname, extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const HELP = `
pandoc-md — Exporta Markdown -> HTML5 via Pandoc

Uso:
  pandoc-md --in <arquivo.md> [--out <arquivo.html>] [opções]
  pandoc-md --in <arquivo.md> --out-dir <pasta> [opções]

Opções:
  --title "Título"          Define <title> do documento
  --lang pt-BR              Define lang do <html> (padrão: pt-BR)
  --css <url|path>          Adiciona <link rel="stylesheet"> ao HTML
  --github                  Envolve conteúdo com <article class="markdown-body">
  --highlight <tema>        Define tema de highlight (kate, pygments, tango, espresso, zenburn, haddock, monochrome)
  --no-highlight            Desativa highlight (HTML mais “cru”)
  --breaks                  Converte quebras simples em <br> (estilo GFM)
  --out-dir <pasta>         Pasta de saída; o nome do HTML será <arquivo>.html
  --out <arquivo.html>      Caminho de saída específico (precede --out-dir)
  --help                    Mostra esta ajuda

Exemplos:
  pandoc-md --in README.md --out README.html --title "Docs" --lang pt-BR
  pandoc-md --in src/page.md --out-dir dist --css https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown.css --github
  pandoc-md --in src/page.md --out-dir dist --highlight kate
  pandoc-md --in src/page.md --out-dir dist --no-highlight
`.trim();

function parseArgs(argv) {
    const out = {};
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') {
            out.help = true;
            continue;
        }
        if (a.startsWith('--')) {
            const key = a.slice(2);
            const next = argv[i + 1];
            if (['no-highlight', 'github', 'breaks'].includes(key)) {
                out[key] = true;
            } else if (next && !next.startsWith('--')) {
                out[key] = next;
                i++;
            } else {
                out[key] = true;
            }
        }
    }
    return out;
}

function ensurePandoc() {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'pandoc.exe' : 'pandoc';
    const which = isWin ? 'where' : 'which';
    const check = spawnSync(which, [cmd], { encoding: 'utf8' });
    if (check.status !== 0) {
        console.error('Erro: Pandoc não encontrado no PATH. Instale e/ou adicione ao PATH: https://pandoc.org/installing.html');
        process.exit(1);
    }
}

function deriveOutPath(inPath, out, outDir) {
    if (out) return out;
    const base = basename(inPath, extname(inPath)) + '.html';
    if (outDir) return join(outDir, base);
    return base;
}

function run() {
    const args = parseArgs(process.argv);
    if (args.help) {
        console.log(HELP);
        process.exit(0);
    }
    if (!args.in) {
        console.error('Erro: --in <arquivo.md> é obrigatório.\n\n' + HELP);
        process.exit(2);
    }

    ensurePandoc();

    const outPath = deriveOutPath(args.in, args.out, args['out-dir']);
    const outDir = dirname(outPath);
    if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
    }

    const pandocArgs = [];
    // Formatos
    pandocArgs.push('-f', 'gfm');
    pandocArgs.push('-t', 'html5');
    // Standalone
    pandocArgs.push('-s');

    // Idioma e título
    const lang = args.lang || 'pt-BR';
    pandocArgs.push('-V', `lang=${lang}`);
    if (args.title) {
        pandocArgs.push('-V', `pagetitle=${args.title}`);
    }

    // Quebras simples como <br> (GFM)
    if (args.breaks) {
        const idx = pandocArgs.indexOf('gfm');
        if (idx !== -1 && pandocArgs[idx - 1] === '-f') {
            pandocArgs[idx] = 'gfm+hard_line_breaks';
        }
    }

    // CSS externo
    if (args.css) {
        pandocArgs.push('--css', args.css);
    }

    // Highlight
    if (args['no-highlight']) {
        pandocArgs.push('--no-highlight');
    } else if (args.highlight) {
        pandocArgs.push('--highlight-style', args.highlight);
    }

    // Wrapper GitHub-like
    if (args.github) {
        pandocArgs.push('--include-before-body', "<article class='markdown-body'>");
        pandocArgs.push('--include-after-body', '</article>');
    }

    // Entrada e saída
    pandocArgs.push(args.in, '-o', outPath);

    const proc = spawnSync('pandoc', pandocArgs, { stdio: 'inherit' });
    if (proc.status !== 0) {
        process.exit(proc.status ?? 1);
    }
}

run();