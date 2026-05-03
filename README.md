# ПрАТ "АВТОТРЕЙДІНГ ІНВЕСТ"

Статичний лендінг для `invest.autotrading.ua`: Astro + React island + Sveltia CMS + GitHub + Cloudflare Pages.

Сайт виключно українською мовою і містить:

- головну сторінку;
- інформацію про компанію;
- офіційний архів документів емітента;
- контакти й Google Maps embed;
- адмінку Sveltia CMS за адресою `/admin/`.

## Стек

- Astro static build;
- React для інтерактивної оболонки сайту;
- Sveltia CMS для редагування контенту;
- GitHub як репозиторій коду й контенту;
- Cloudflare Pages для хостингу.

Сайт не залежить від runtime API Cloudflare. Його можна перенести на Netlify, Vercel або інший статичний хостинг, який може виконати `npm run build` і віддавати `dist/`.

## Команди

```sh
npm install
npm run dev
npm run check
npm run build
npm run preview
```

## Структура Проєкту

```text
src/
  components/
    SiteApp.jsx
  content/
    pages/
      home.json
      about.json
      documents.json
      contacts.json
    site/
      company.json
      navigation.json
    documents/
      groups/
      manifest.json
  layouts/
  pages/
  styles/
public/
  admin/
    config.yml
  documents/
    2011/
    ...
    uploads/
scripts/
  build-manifest.mjs
docs/
```

## Контент І CMS

Адмінка:

- `/admin/`

Конфіг CMS:

- `public/admin/config.yml`

Контент, доступний для редагування через CMS:

- навігація/footer: `src/content/site/navigation.json`;
- дані компанії та контактів: `src/content/site/company.json`;
- контент сторінок і SEO: `src/content/pages/*.json`;
- метадані нових документів емітента: `src/content/documents/groups/*.json`;
- завантаження нових документів емітента: `public/documents/uploads/`.

Згенерований контент:

- публічний manifest архіву: `src/content/documents/manifest.json`;
- legacy redirects: `public/_redirects`.

Не редагувати вручну згенеровані значення `sizeBytes` або `checksumSha256`. `scripts/build-manifest.mjs` рахує їх за файлами в `public/documents/**`.

## Документи

Production-файли емітента лежать у `public/documents/**` і коммітяться у репозиторій. Сюди входить мігрований архів зі старого сайту.

Нові документи, додані через CMS, зберігаються у:

```text
public/documents/uploads/
```

Кожна нова публікація має мати метадані у:

```text
src/content/documents/groups/<slug>.json
```

Правила архіву документів описані в `docs/document-archive-model.md`.

## Деплой

Cloudflare Pages:

- build command: `npm run build`;
- output directory: `dist`.

Рекомендований preview-flow:

1. Залишити старий сайт на `invest.autotrading.ua`.
2. Опублікувати новий сайт на Cloudflare Pages.
3. Підключити `invest-new.autotrading.ua` для погодження із замовником.
4. Перемикати DNS для `invest.autotrading.ua` тільки після погодження.

CMS і staging deployment описані в `docs/cms-and-deployment-plan.md`.

## Робота З Репозиторієм

Правила conventional commits і межі production-файлів описані в `docs/contributing.md`.

## Ліцензія

Код, дизайн, структура сайту, контент і матеріали цього репозиторію є власністю ПрАТ "АВТОТРЕЙДІНГ ІНВЕСТ", якщо інше прямо не зазначено.

Публічний доступ до репозиторію або сайту не надає дозволу на копіювання, модифікацію, поширення або повторне використання матеріалів без письмового дозволу правовласника.

Офіційні документи емітента публікуються для виконання вимог щодо розкриття інформації. Така публікація не надає додаткової ліцензії на повторне використання понад обсяг, дозволений законом.

Треті залежності залишаються під умовами їхніх власних ліцензій. Повний текст див. у `LICENSE`.

## Перевірка

Перед публікацією або merge суттєвих змін:

```sh
npm run check
npm run build
```
