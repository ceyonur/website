/* A small, local website navigator. No eval, shell execution, fetch, storage, or dependencies. */
(() => {
  const script = document.currentScript;
  const siteRoot = new URL('./', script.src);
  const consoleElement = document.getElementById('typed-console');
  const form = document.getElementById('terminal-form');
  const input = document.getElementById('terminal-input');
  const output = document.getElementById('terminal-output');
  if (!consoleElement || !form || !input || !output) return;

  const directories = {
    '/': { page: 'index.html', hash: '#home', entries: ['projects/', 'papers/', 'writing/', 'links.txt'] },
    '/projects': { page: 'projects/index.html', hash: '#projects', entries: ['avalanchego/', 'subnet-evm/', 'electanon/', 'precompile-evm/', 'smart-energy/', 'bal/'] },
    '/projects/avalanchego': { page: 'projects/index.html', hash: '#project-avalanchego', entries: ['README.md'] },
    '/projects/subnet-evm': { page: 'projects/index.html', hash: '#project-subnet-evm', entries: ['README.md'] },
    '/projects/precompile-evm': { page: 'projects/index.html', hash: '#project-precompile-evm', entries: ['README.md'] },
    '/projects/electanon': { page: 'projects/index.html', hash: '#project-electanon', entries: ['README.md'] },
    '/projects/smart-energy': { page: 'projects/index.html', hash: '#project-smart-energy', entries: ['README.md'] },
    '/projects/bal': { page: 'projects/index.html', hash: '#project-bal', entries: ['README.md'] },
    '/papers': { page: 'papers/index.html', hash: '#papers', entries: ['bibliography.txt', 'electanon.txt'] },
    '/writing': { page: 'writing/index.html', hash: '#writing', entries: ['precompile-evm.txt', 'subnet-evm-durango.txt', 'acp-224.md', 'acp-131.md'] }
  };
  const files = {
    '/links.txt': { page: 'index.html', hash: '#links', selector: '#links' },
    '/projects/avalanchego/README.md': { page: 'projects/index.html', hash: '#project-avalanchego', selector: '#project-avalanchego .command-output' },
    '/projects/subnet-evm/README.md': { page: 'projects/index.html', hash: '#project-subnet-evm', selector: '#project-subnet-evm .command-output' },
    '/projects/precompile-evm/README.md': { page: 'projects/index.html', hash: '#project-precompile-evm', selector: '#project-precompile-evm .command-output' },
    '/projects/electanon/README.md': { page: 'projects/index.html', hash: '#project-electanon', selector: '#project-electanon .command-output' },
    '/projects/smart-energy/README.md': { page: 'projects/index.html', hash: '#project-smart-energy', selector: '#project-smart-energy .command-output' },
    '/projects/bal/README.md': { page: 'projects/index.html', hash: '#project-bal', selector: '#project-bal .command-output' },
    '/papers/bibliography.txt': { page: 'papers/index.html', hash: '#papers', selector: '#paper-one .command-output' },
    '/papers/electanon.txt': { page: 'papers/index.html', hash: '#paper-one', selector: '#paper-one .abstract p' },
    '/writing/precompile-evm.txt': { page: 'writing/index.html', hash: '#precompile-evm-post', selector: '#precompile-evm-post .command-output' },
    '/writing/subnet-evm-durango.txt': { page: 'writing/index.html', hash: '#subnet-evm-durango-post', selector: '#subnet-evm-durango-post .command-output' },
    '/writing/acp-224.md': { page: 'writing/index.html', hash: '#acp-224', selector: '#acp-224 .command-output' },
    '/writing/acp-131.md': { page: 'writing/index.html', hash: '#acp-131', selector: '#acp-131 .command-output' }
  };
  files['/papers/abstract-01.txt'] = files['/papers/electanon.txt'];
  const panel = document.getElementById('terminal-panel');
  const toggle = document.getElementById('terminal-toggle');
  const pageDirectory = document.body.dataset.shellDirectory;
  const login = document.querySelector('.typed-prompt .prompt-user').textContent;
  const user = login.split('@')[0];
  const userHome = `/home/${user}`;
  const parameters = new URLSearchParams(location.search);
  const requestedDirectory = parameters.get('cwd');
  let cwd = Object.hasOwn(directories, requestedDirectory) ? requestedDirectory : directoryAtHash() || pageDirectory;
  if (!Object.hasOwn(directories, cwd)) cwd = '/';
  const history = [];
  let historyIndex = 0;
  let draft = '';
  const displayPath = path => path === '/' ? '~' : '~' + path;

  function resolvePath(argument = '') {
    let value = argument.replace(/\\/g, '/');
    if (value === '~') value = '/';
    else if (value.startsWith('~/')) value = value.slice(1);
    for (const homePath of [userHome, '/home/user']) {
      if (value === homePath || value.startsWith(homePath + '/')) {
        value = value.slice(homePath.length) || '/';
        break;
      }
    }
    const parts = value.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
    for (const part of value.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop(); else parts.push(part);
    }
    return '/' + parts.join('/');
  }
  function print(text, className = '', reveal = true) {
    const line = document.createElement('pre');
    line.className = 'terminal-result' + (className ? ' ' + className : '');
    line.textContent = text;
    output.append(line);
    while (output.children.length > 50) output.firstElementChild.remove();
    if (reveal) setOutputOpen(true);
    requestAnimationFrame(() => { output.scrollTop = output.scrollHeight; });
  }
  function focusPrompt() {
    input.focus({ preventScroll: true });

  }
  function echo(command) { print(`${login}:${displayPath(cwd)}$ ${command}`, 'terminal-echo'); }
  function visitEntry(hash) {
    const entry = document.getElementById(hash.slice(1));
    if (!entry?.matches('.directory-entry')) return;
    entry.scrollIntoView({ block: 'start', behavior: 'instant' });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return entry;

    const command = entry.querySelector('.prompt-command');
    const result = entry.querySelector('.command-output');
    const characters = command.textContent.length;
    for (const animation of [...command.getAnimations(), ...result.getAnimations()]) animation.cancel();
    command.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
      duration: characters * 18,
      easing: 'steps(' + characters + ', end)'
    });
    result.animate([
      { backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)' },
      { backgroundColor: 'transparent' }
    ], { duration: 900, easing: 'ease-out' });
    return entry;
  }

  document.querySelector('.directory-index')?.addEventListener('click', event => {
    const link = event.target.closest('a.file-row');
    if (!link || !link.hash || link.hash !== location.hash) return;
    if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    visitEntry(link.hash);
  });

  function go(record, nextDirectory, pendingCommand = '') {
    if (samePage(record)) {
      cwd = nextDirectory;
      refreshContext();
      const hash = record.hash || '#home';
      if (location.hash === hash) {
        if (!visitEntry(hash)) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
      }
      else location.hash = hash;
      return;
    }
    const url = new URL(record.page, siteRoot);
    url.searchParams.set('shell', '1');
    url.searchParams.set('cwd', nextDirectory);
    if (pendingCommand) url.searchParams.set('run', pendingCommand);
    if (record.hash) url.hash = record.hash;
    location.assign(url.href);
  }
  function samePage(record) {
    const page = new URL(record.page, siteRoot);
    return page.pathname === location.pathname ||
      (page.pathname.endsWith('/index.html') && new URL('./', page).pathname === location.pathname);
  }
  function directoryAtHash() {
    return Object.keys(directories).find(path => directories[path].hash === location.hash && samePage(directories[path]));
  }
  function list(path, long = false) {
    if (!Object.hasOwn(directories, path)) return print(`ls: ${displayPath(path)}: no such directory`, 'terminal-error');
    const entries = directories[path].entries;
    print(long ? entries.map(name => `${name.endsWith('/') ? 'drwxr-xr-x' : '-rw-r--r--'}  ceyonur  ${name}`).join('\n') : entries.join('  '));
  }
  function tree(path, prefix = '') {
    const entries = directories[path].entries;
    return entries.map((entry, index) => {
      const last = index === entries.length - 1;
      const line = prefix + (last ? '└── ' : '├── ') + entry;
      const child = (path === '/' ? '' : path) + '/' + entry.replace(/\/$/, '');
      return entry.endsWith('/') && Object.hasOwn(directories, child) ? line + '\n' + tree(child, prefix + (last ? '    ' : '│   ')) : line;
    }).join('\n');
  }
  function run(command) {
    const text = command.trim();
    if (!text) return;
    if (text.length > 200) { print('Keep commands under 200 characters.', 'terminal-error'); return; }
    history.push(text); historyIndex = history.length;
    const [verb, ...args] = text.split(/\s+/);
    if (verb === 'clear' && args.length === 0) { output.replaceChildren(); setOutputOpen(false); return; }
    echo(text);
    switch (verb) {
      case 'help':
        print('cd projects       enter a directory (also: papers, writing)\ncd .. / cd ~       parent / home directory\nls / ls -la        list files; accepts a directory path\ncat links.txt      read a file; use ls to find filenames\npwd                show the working directory\nwhoami             show the user identity\ntree               show the directory tree\nhistory            commands from this page visit\nclear              clear this command output\n\nEnter runs a command · Tab completes · ↑/↓ recalls commands');
        break;
      case 'pwd': print(userHome + (cwd === '/' ? '' : cwd)); break;
      case 'whoami': print(user); break;
      case 'history': print(history.map((entry, index) => `${index + 1}  ${entry}`).join('\n')); break;
      case 'ls': {
        const flags = args.filter(arg => arg.startsWith('-'));
        const paths = args.filter(arg => !arg.startsWith('-'));
        if (paths.length > 1 || flags.some(flag => !['-l', '-a', '-la', '-al', '-lt'].includes(flag))) { print('Usage: ls [-la] [directory]', 'terminal-error'); break; }
        list(paths.length ? resolvePath(paths[0]) : cwd, flags.some(flag => flag.includes('l')));
        break;
      }
      case 'cd': {
        if (args.length > 1) { print('Usage: cd [directory]', 'terminal-error'); break; }
        const target = args.length ? resolvePath(args[0]) : '/';
        if (!Object.hasOwn(directories, target)) { print(`cd: ${args[0]}: no such directory. Try ls.`, 'terminal-error'); break; }
        go(directories[target], target);
        break;
      }
      case 'cat': {
        if (args.length !== 1) { print('Usage: cat filename. Try ls to see the available files.', 'terminal-error'); break; }
        const target = resolvePath(args[0]);
        if (!Object.hasOwn(files, target)) { print(`cat: ${args[0]}: ${Object.hasOwn(directories, target) ? 'is a directory; use cd' : 'no such file. Try ls.'}`, 'terminal-error'); break; }
        const file = files[target];
        if (!samePage(file)) { go(file, cwd, `cat ${displayPath(target)}`); break; }
        const content = file.text || [...document.querySelectorAll(file.selector)].map(element =>
          element.innerText.trim().replace(/\n\s*\n\s*\n/g, '\n\n')
        ).join('\n\n');
        print(content || 'This file has no content yet.');
        if (file.hash) visitEntry(file.hash);
        break;
      }
      case 'tree': {
        const target = args.length ? resolvePath(args[0]) : cwd;
        if (args.length > 1 || !Object.hasOwn(directories, target)) { print('Usage: tree [directory]', 'terminal-error'); break; }
        print(displayPath(target) + '\n' + tree(target));
        break;
      }
      default: print(`${verb}: command not found. Type help for available commands.`, 'terminal-error');
    }
  }


  function refreshContext() {
    document.getElementById('typed-path').textContent = displayPath(cwd);
    document.querySelector('.window-title').textContent = `${displayPath(cwd)} — bash`;
    document.querySelector('.status-bar > span:not(.status-right)').textContent = displayPath(cwd);
    input.placeholder = cwd === '/' ? 'Type help, ls, or cd projects' : 'Type help, ls, or cd ..';
    for (const link of document.querySelectorAll('.session-tabs a[data-directory]')) {
      const active = link.dataset.directory === pageDirectory;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }
  function setOutputOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'hide output' : 'show output';
    document.body.classList.toggle('terminal-output-open', open);
  }

  toggle.addEventListener('click', () => setOutputOpen(panel.hidden));
  window.addEventListener('hashchange', () => {
    const directory = directoryAtHash();
    if (directory) { cwd = directory; refreshContext(); }
    visitEntry(location.hash);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const command = input.value;
    input.value = '';
    run(command);
    focusPrompt();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex === history.length) draft = input.value;
      historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
      input.value = historyIndex === history.length ? draft : history[historyIndex];
      input.setSelectionRange(input.value.length, input.value.length);
    }
    if (event.key === 'Tab' && !event.shiftKey && input.value.trim()) {
      event.preventDefault();
      const text = input.value;
      const cut = text.lastIndexOf(' ');
      if (cut === -1) {
        const matches = ['help','ls','cd','cat','pwd','whoami','tree','history','clear'].filter(verb => verb.startsWith(text));
        if (matches.length === 1) input.value = matches[0] + ' ';
        else if (matches.length > 1) print(matches.join('  '));
        return;
      }
      const verb = text.slice(0, text.indexOf(' '));
      if (!['cd','cat','ls','tree'].includes(verb)) return;
      const token = text.slice(cut + 1);
      const slash = token.lastIndexOf('/');
      const parent = slash < 0 ? cwd : resolvePath(token.slice(0, slash + 1));
      const start = slash < 0 ? token : token.slice(slash + 1);
      if (!Object.hasOwn(directories, parent)) return;
      const matches = directories[parent].entries.filter(entry => entry.startsWith(start) && (!['cd','tree'].includes(verb) || entry.endsWith('/')));
      if (matches.length === 1) input.value = text.slice(0, cut + 1) + (slash < 0 ? '' : token.slice(0, slash + 1)) + matches[0];
      else if (matches.length > 1) print(matches.join('  '));
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
      // Leave the browser's address-bar shortcut intact.
      return;
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input,textarea,[contenteditable="true"]')) {
      event.preventDefault(); focusPrompt();
    }
  });
  document.getElementById('terminal-open').addEventListener('click', event => {
    event.preventDefault(); focusPrompt();
  });
  document.querySelector('.help-jump').addEventListener('click', event => {
    event.preventDefault(); run('help'); focusPrompt();
  });
  // Fold navigation into the existing opening command.
  let previousDirectory = null;
  if (document.referrer) {
    const referrer = new URL(document.referrer);
    if (referrer.origin === location.origin) {
      previousDirectory = Object.keys(directories).find(path => {
        const page = new URL(directories[path].page, siteRoot);
        return referrer.pathname === page.pathname ||
          (page.pathname.endsWith('/index.html') && referrer.pathname === new URL('./', page).pathname);
      }) ?? null;
    }
  }
  const changeCommand = `cd ${displayPath(pageDirectory)}`;
  if (changeCommand) {
    const prompt = document.querySelector('#main .prompt');
    const command = prompt?.querySelector('.prompt-command');
    const path = prompt?.querySelector('.prompt-path');
    if (command && path) {
      command.textContent = `${changeCommand} && ${command.textContent}`;
      path.textContent = displayPath(previousDirectory ?? '/');
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const text = command.textContent;
        const reserve = document.createElement('span');
        reserve.className = 'opening-command-reserve';
        reserve.textContent = text;
        const typed = document.createElement('span');
        typed.className = 'opening-command-typing';
        typed.setAttribute('aria-hidden', 'true');
        command.classList.add('opening-command');
        command.replaceChildren(reserve, typed);
        let position = 0;
        function typeNext() {
          typed.textContent = text.slice(0, ++position);
          if (position < text.length) setTimeout(typeNext, 35);
          else {
            command.textContent = text;
            command.classList.remove('opening-command');
          }
        }
        setTimeout(typeNext, 120);
      }
    }
  }
  refreshContext();
  consoleElement.hidden = false;
  document.body.classList.add('has-command-reader');
  print(cwd === '/' ? 'Type help to see commands. Try ls, cd projects, or cat links.txt.' : 'Type help to see commands. Try ls, cd .., or cat a filename from the listing.', 'terminal-welcome', false);
  const pending = parameters.get('run');
  if (pending && /^cat\s+/.test(pending) && Object.hasOwn(files, resolvePath(pending.slice(4).trim())) && samePage(files[resolvePath(pending.slice(4).trim())])) run(pending);
  else visitEntry(location.hash);
  if (changeCommand && (!location.hash || location.hash === directories[pageDirectory].hash)) {
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }
  if (parameters.has('shell')) focusPrompt();
})();
