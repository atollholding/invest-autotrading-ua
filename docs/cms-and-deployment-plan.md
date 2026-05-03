# CMS і deployment

Дата: 2026-05-03

## Ціль

Сайт має працювати в режимі контрольованого адміністрування:

- нетехнічний адміністратор редагує тексти, контакти, SEO та документи через Sveltia CMS;
- файли емітента зберігаються в репозиторії як статичні файли;
- build-скрипт рахує розміри й SHA-256, а не адміністратор;
- код, стилі, build-скрипти й залежності не експонуються в CMS;
- сайт можна попередньо перевірити на preview URL перед перемиканням основного DNS.

## Preview перед production

Рекомендована модель:

1. У GitHub створити публічний репозиторій.
2. У Cloudflare Pages створити project з цього репозиторію.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Перевірити сайт на preview URL.
6. Після production-перевірки перемкнути основний домен на Cloudflare Pages через DNS.

Ця схема дозволяє перевірити реліз без зміни поточного production-домену.

## Production Checklist

Перед перемиканням основного DNS:

- провести фінальну юридичну перевірку публічного репозиторію;
- звірити archive manifest з фактичними файлами;
- перевірити legacy redirects;
- перевірити `/admin/` на preview URL;
- перевірити, що draft-документи не потрапляють у публічний архів.

## CMS-доступ

Sveltia CMS технічно працює поверх GitHub. Тому обмеження ризику складається з двох шарів:

1. CMS UI показує тільки дозволені collection-и: `src/content/**`, `public/documents/**`, `public/images/**`.
2. GitHub захищає `main` через branch protection, review і CODEOWNERS.

Важливо: якщо користувач має прямий write-доступ до GitHub-репозиторію, CMS не є повноцінною системою path-level permissions. Для цього потрібні правила GitHub. Рекомендована модель: адміністратор працює через CMS, а репозиторій і branch protection зменшують ризик випадкових змін коду.

## Рекомендовані GitHub-налаштування

Для `main`:

- увімкнути branch protection;
- вимагати Pull Request перед merge;
- вимагати проходження `npm run check` / build у CI;
- вимагати review для змін у коді, стилях, build-скриптах і конфігурації;
- дозволити контентні PR-и від CMS через editorial workflow.

CODEOWNERS має захищати:

- `src/components/**`;
- `src/pages/**`;
- `src/layouts/**`;
- `src/styles/**`;
- `scripts/**`;
- `package.json`;
- `package-lock.json`;
- `astro.config.mjs`;
- `public/admin/**`.

У репозиторії підготовлено шаблон `.github/CODEOWNERS.example`. Після створення GitHub-репозиторію його потрібно скопіювати в `.github/CODEOWNERS` і замінити `@OWNER` на реального користувача або команду.

Контентні файли, які CMS може змінювати:

- `src/content/site/**`;
- `src/content/pages/**` після винесення текстів сторінок у CMS;
- `src/content/documents/groups/**`;
- `public/documents/uploads/**`;
- `public/images/uploads/**`.

## Наявна конфігурація

- `/admin/` з Sveltia CMS;
- `public/admin/config.yml`;
- `publish_mode: editorial_workflow`;
- `src/content/site/company.json`;
- `src/content/site/navigation.json`;
- `src/content/pages/home.json`, `about.json`, `documents.json`, `contacts.json`;
- `src/content/documents/groups/*.json` для нових документів;
- `public/documents/uploads/` для нових файлів;
- `scripts/build-manifest.mjs`, який генерує public manifest, checksum і size;
- перевірка, що `draft` не потрапляє в публічний архів.

## Налаштування перед запуском

- замінити `OWNER/REPO` у `public/admin/config.yml` на реальний GitHub repo;
- після створення Cloudflare Pages прописати production URL у CMS config, якщо це потрібно для CMS;
- додати GitHub CI для `npm run check` і `npm run build`;
- додати інструкцію для адміністратора: як додати новий документ з підписами.

## Документи через CMS

Публікація документа має залишатися пакетом:

- metadata у `src/content/documents/groups/<slug>.json`;
- файли у `public/documents/uploads/` або організованій підпапці;
- `status: draft` до перевірки;
- `status: published` після production-перевірки.

Оригінальні назви файлів не перейменовувати, особливо якщо є `.p7s`. Охайним має бути slug публікації, а не назва підписаного файлу.

## Портативність

Сайт залишається переносимим:

- стандартний Astro static build;
- build output `dist`;
- без Cloudflare-only runtime API;
- документи і контент у GitHub;
- Google Maps через iframe без API key.

За потреби сайт можна перенести на Netlify, Vercel або інший статичний хостинг з тією ж командою `npm run build`.
