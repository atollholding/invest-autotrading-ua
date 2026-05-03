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
npm run manifest
npm run documents:orphans
npm run documents:clean-orphans
npm run check
npm run build
npm run preview
```

Для щоденної розробки зазвичай достатньо `npm run dev`, `npm run check` і `npm run build`. Команди `manifest` та `documents:*` потрібні переважно після локальної роботи з документами через CMS.

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
      redirects.json
  data/
  layouts/
  pages/
    admin/
  styles/
public/
  admin/
    config.yml
  documents/
    2011/
    ...
    uploads/
  images/
scripts/
  build-manifest.mjs
  check-document-orphans.mjs
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
- метадані документів емітента: `src/content/documents/groups/*.json`;
- завантаження нових документів емітента: `public/documents/uploads/`.

Згенерований контент:

- публічний manifest архіву: `src/content/documents/manifest.json`;
- redirects для старих URL файлів: `public/_redirects`.

Не редагувати вручну `src/content/documents/manifest.json`, `sizeBytes` або `checksumSha256`. `scripts/build-manifest.mjs` рахує їх за файлами в `public/documents/**`.

Корисні команди для документів:

- `npm run manifest` - перегенерувати `src/content/documents/manifest.json` після локальної роботи в CMS;
- `npm run documents:orphans` - перевірити, чи немає завантажених файлів без прив'язки до публікації;
- `npm run documents:clean-orphans` - видалити такі файли після ручної перевірки списку.

## Документи

Production-файли емітента лежать у `public/documents/**` і коммітяться у репозиторій. Сюди входить чинний публічний архів документів.

Старий архів і нові публікації використовують одну схему metadata:

```text
src/content/documents/groups/<slug>.json
```

Нові документи, додані через CMS, зберігаються у:

```text
public/documents/uploads/
```

Чернетки документів також зберігаються в GitHub і потрапляють у build як файли, але не показуються в публічному архіві, доки запис має `status: draft`.

Видалення публікації в CMS не гарантує видалення завантажених файлів. Після видалення запису треба запускати `npm run documents:orphans` і очищати зайві файли окремо.

Цей сайт і репозиторій призначені тільки для матеріалів, які можна публікувати. Якщо файл потрапив у GitHub або Cloudflare Pages, його треба вважати опублікованим. Для справді чутливих файлів може знадобитися окреме очищення Git history і purge кешу Cloudflare.

Правила архіву документів описані в `docs/document-archive-model.md`.

## Деплой

Cloudflare Pages:

- build command: `npm run build`;
- output directory: `dist`.

Рекомендований порядок публікації:

1. Опублікувати сайт на Cloudflare Pages.
2. Перевірити сайт на preview URL.
3. Перемикати основний DNS тільки після production-перевірки.

CMS і deployment описані в `docs/cms-and-deployment-plan.md`.

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
