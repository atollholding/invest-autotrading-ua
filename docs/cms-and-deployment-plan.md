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
- перевірити redirects зі старих URL;
- перевірити `/admin/` на preview URL;
- перевірити, що draft-документи не потрапляють у публічний архів.

## CMS-доступ

Проєкт використовує один GitHub-репозиторій для production-коду, CMS-контенту і публічних документів емітента.

Це свідоме рішення для простого лендінгу з одним основним адміністратором. Обґрунтування і межі застосування описані в `docs/adr-001-single-repository-cms.md`.

Для CMS-доступу використовувати окремий GitHub-акаунт або службовий акаунт компанії з fine-grained token, обмеженим конкретним репозиторієм і мінімально потрібними permissions:

- `Contents: Read and write`;
- `Metadata: Read`.

Не надавати CMS-токену permissions для administration, secrets, actions, workflows або інших можливостей, які не потрібні для редагування контенту.

Важливо: GitHub token з `Contents: Read and write` не обмежує запис окремими шляхами всередині репозиторію. Обмеження на рівні CMS UI не є повноцінною path-level permission моделлю. Для поточного масштабу проєкту цей компроміс прийнято свідомо.

Водночас CMS UI зменшує ризик випадкових помилок: адміністратор працює тільки з підготовленими формами для контенту, контактів і документів, а не з файловим деревом коду.

## Рекомендовані GitHub-налаштування

Поточна CMS-модель використовує прямий запис у `main`. Тому branch protection не має вимагати Pull Request для кожної зміни в `main`, інакше CMS не зможе зберігати контент, документи й файли.

Для `main` рекомендовано:

- увімкнути branch protection без правила, яке блокує прямі CMS-записи в `main`;
- додати GitHub CI для `npm run check` і `npm run build` до увімкнення required status checks;
- використовувати Pull Request і review для змін у коді, стилях, build-скриптах, CMS-конфігурації та залежностях;
- не вимагати PR/review для стандартних CMS-змін у `src/content/**`, `public/documents/uploads/**` і `public/images/uploads/**`;
- регулярно перевіряти Git history і Cloudflare build logs після CMS-публікацій.

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

CODEOWNERS не має містити глобальне правило `* @OWNER`, бо воно накриє CMS-контент і може заблокувати нетехнічну публікацію документів.

Контентні файли, які CMS може змінювати:

- `src/content/site/**`;
- `src/content/pages/**`;
- `src/content/documents/groups/**`;
- `public/documents/uploads/**`;
- `public/images/uploads/**`.

## Наявна конфігурація

- `/admin/` з Sveltia CMS;
- `public/admin/config.yml`;
- `src/content/site/company.json`;
- `src/content/site/navigation.json`;
- `src/content/pages/home.json`, `about.json`, `documents.json`, `contacts.json`;
- `src/content/documents/groups/*.json` для всіх документів архіву;
- `public/documents/uploads/` для нових файлів;
- `src/content/documents/redirects.json` для старих URL файлів;
- `scripts/build-manifest.mjs`, який генерує public manifest, checksum, size і redirects;
- `scripts/check-document-orphans.mjs`, який перевіряє завантажені файли без прив'язки до публікацій;
- перевірка, що `draft` не потрапляє в публічний архів.

CMS працює в режимі прямого запису в GitHub-репозиторій. Draft-стан документів контролюється полем `status` у metadata публікації, а не окремим workflow у CMS.

Draft-записи також коммітяться в GitHub разом із завантаженими файлами. Вони не показуються в публічному архіві, доки `status` не змінено на `published`, але файли вже є частиною репозиторію і можуть потрапити у build Cloudflare Pages. У цій моделі draft означає "приховано з інтерфейсу сайту", а не "приватно".

`/admin/` завантажує pinned Sveltia CMS bundle з `unpkg.com`. Це свідомий операційний компроміс для простої адмінки: публічний сайт і build не залежать від CDN, але сама CMS потребує доступності стороннього CDN під час адміністрування. Якщо з'явиться вимога зменшити supply-chain або availability ризик адмінки, CMS bundle треба self-host у `public/admin/` після окремої перевірки ліцензії й процедури оновлень.

## Налаштування перед запуском

- замінити `OWNER/REPO` у `public/admin/config.yml` на реальний GitHub repo;
- після створення Cloudflare Pages прописати production URL у CMS config, якщо це потрібно для CMS;
- додати GitHub CI для `npm run check` і `npm run build`, а вже після цього налаштовувати required status checks;
- додати інструкцію для адміністратора: як додати новий документ з підписами.

## Документи через CMS

Публікація документа має залишатися пакетом:

- metadata у `src/content/documents/groups/<slug>.json`;
- файли у `public/documents/uploads/` або організованій підпапці;
- `status: draft` до перевірки;
- `status: published` після production-перевірки.

Оригінальні назви файлів не перейменовувати, особливо якщо є `.p7s`. Охайним має бути slug публікації, а не назва підписаного файлу.

CMS-форма для документів навмисно спрощена. Адміністратор обирає тип публікації, дату, звітний рік або дату станом на, додає файли пакета і перемикає статус. `id`, назви для архіву, ролі файлів, зв'язки `.p7s`, checksum і розмір файлів генерує build-скрипт.

Список документів у CMS за замовчуванням сортується за прихованим полем `createdAt`, щоб нові записи були зверху. Для нових публікацій це поле створює CMS, а для мігрованого архіву воно заповнене датою `publishedAt`.

Старий мігрований архів приведений до тієї самої схеми `src/content/documents/groups/*.json`, тому архівні записи можна редагувати через CMS. Для старих записів службовий блок `advanced` може містити стабільний `id` і назви, які не варто змінювати без потреби.

## Локальна робота з CMS

У production Cloudflare Pages запускає `npm run build`, а build автоматично генерує manifest архіву.

Локально dev-сервер Astro не перегенеровує `src/content/documents/manifest.json` після кожного збереження в CMS. Після додавання, зміни статусу або видалення документа через `/admin/` у локальному репозиторії виконати:

```bash
npm run manifest
```

Після цього оновити сторінку `/documents/`.

Для повної перевірки перед commit:

```bash
npm run check
```

`npm run check` перевіряє manifest у verify-режимі, шукає orphan-файли в `public/documents/uploads/` і запускає Astro diagnostics. `npm run build` також перевіряє orphan-файли перед Astro build, щоб випадкові зайві файли не поїхали на Cloudflare Pages.

## Видалення і orphan-файли

Sveltia CMS видаляє JSON-запис публікації, але не гарантує автоматичного видалення завантажених файлів з `public/documents/uploads/`.

Після видалення публікації або помилкового завантаження виконати:

```bash
npm run documents:orphans
```

Якщо команда показала файли, які більше не прив'язані до жодної публікації або чернетки, їх можна прибрати:

```bash
npm run documents:clean-orphans
```

Цю команду виконувати тільки після ручної перевірки списку. Вона є навмисно окремою від `npm run build`, щоб build не робив destructive cleanup.

## Безпека файлів

Сайт і репозиторій не є приватним сховищем документів. В CMS можна завантажувати тільки файли, які дозволено публікувати.

Якщо файл потрапив у GitHub або Cloudflare Pages, його треба вважати опублікованим. Видалення запису з архіву або видалення файлу з поточного commit не гарантує, що файл зник з Git history, CDN або кешів.

Для справді чутливого помилкового файлу може знадобитися окрема процедура:

- видалення поточного посилання і файлу;
- очищення Git history;
- force-push після узгодження з власником репозиторію;
- purge кешу Cloudflare;
- перевірка, що URL більше не віддає файл.

## Портативність

Сайт залишається переносимим:

- стандартний Astro static build;
- build output `dist`;
- без Cloudflare-only runtime API;
- документи і контент у GitHub;
- Google Maps через iframe без API key.

За потреби сайт можна перенести на Netlify, Vercel або інший статичний хостинг з тією ж командою `npm run build`.
