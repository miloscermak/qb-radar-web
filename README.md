# QB Radar – webové rozhraní

Statické rozhraní redakčního nástroje QueenBallers, hostované na GitHub Pages.

Tento repozitář obsahuje pouze HTML, CSS a JavaScript. Neobsahuje nasbírané články, redakční konfiguraci ani API klíče. Data se po přihlášení načítají přímo ze soukromého repozitáře přes GitHub API.

Pro vstup je potřeba vlastní GitHub účet s přístupem k redakčnímu repozitáři a fine-grained token. Podrobný postup najdete na přihlašovací obrazovce. Token se neposkytuje provozovateli webového serveru; prohlížeč ho používá přímo vůči GitHubu a po odhlášení ho odstraní z místního úložiště.

Sběr a AI výběr běží v soukromém repozitáři na GitHub Actions. Rozhraní se publikuje ze složky `site/`; backend nepotřebuje otevřený prohlížeč ani zapnutý počítač uživatele.

Zdrojová verze rozhraní se udržuje ve složce `dashboard/` aplikačního repozitáře. Změny se sem kopírují řízeným publikačním skriptem s výslovným seznamem povolených souborů.
