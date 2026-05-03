# Модель архіву документів емітента

Дата: 2026-05-03

## Принцип

Одна публікація в архіві = один пакет розкриття інформації.

Пакет може містити:

- основний документ: `main`;
- підпис основного документа: `signature`;
- XML-звіт: `xml`;
- підпис XML-звіту: `xml-signature`;
- інший допоміжний файл, якщо він юридично належить до цієї публікації.

Оригінальні назви файлів після підписання не перейменовувати. Охайним і стабільним має бути slug папки публікації, а не назва самого файлу.

## Поля публікації

- `id` - стабільний slug публікації.
- `title` - повна офіційна назва.
- `displayTitle` - коротка назва для UI. Якщо не задана, build-скрипт сформує автоматично.
- `type` - точний тип документа.
- `displayType` - короткий тип для фільтрів. Якщо не заданий, build-скрипт сформує автоматично.
- `year` - рік архівної групи.
- `publishedAt` - дата публікації на сайті.
- `periodEnd` - дата станом на / кінець звітного періоду, наприклад `2025-12-31`.
- `reportingYear` - звітний рік, наприклад `2025`.
- `status` - `draft` або `published`.

`publishedAt` і `periodEnd` не змішувати. Для документа "станом на 31.12.2025", який буде опубліковано пізніше, `periodEnd` буде `2025-12-31`, а `publishedAt` - фактична дата публікації на сайті.

## Поля файлу

- `id` - стабільний ID файлу в межах публікації, наприклад `main`, `xml`.
- `role` - `main`, `signature`, `xml`, `xml-signature`.
- `signsFileId` - для `.p7s`: ID файлу, який цей підпис підписує.
- `label` - людська назва для UI; можна не заповнювати, якщо роль достатньо очевидна.
- `filename` - оригінальна назва файлу.
- `publicPath` - шлях на сайті.
- `sizeBytes` - генерується build-скриптом.
- `checksumSha256` - генерується build-скриптом.

## Приклад: річний звіт

```json
{
  "id": "2026-richna-informatsiia-za-2025-rik",
  "title": "Річна інформація емітента цінних паперів за 2025 рік",
  "displayTitle": "Річна інформація за 2025 рік",
  "type": "Річна інформація",
  "displayType": "Річна інформація",
  "year": 2026,
  "publishedAt": "2026-05-03",
  "periodEnd": "2025-12-31",
  "reportingYear": 2025,
  "status": "published",
  "files": [
    {
      "id": "main",
      "role": "main",
      "publicPath": "/documents/uploads/31106821_2025.docx"
    },
    {
      "id": "main-signature",
      "role": "signature",
      "signsFileId": "main",
      "publicPath": "/documents/uploads/31106821_2025.docx.p7s"
    },
    {
      "id": "xml",
      "role": "xml",
      "publicPath": "/documents/uploads/ReportNoRNOKPP.xml"
    },
    {
      "id": "xml-signature",
      "role": "xml-signature",
      "signsFileId": "xml",
      "publicPath": "/documents/uploads/ReportNoRNOKPP.xml.p7s"
    }
  ]
}
```

## Build-скрипт

`scripts/build-manifest.mjs`:

- перевіряє наявність файлів;
- рахує `sizeBytes`;
- рахує `checksumSha256`;
- додає `displayTitle`, `displayType`, `periodEnd`, `reportingYear`, якщо їх можна визначити;
- додає file `id`, якщо його не задано;
- визначає `signsFileId` за назвою `.p7s` або за роллю;
- зупиняє build, якщо підпис не має цільового файлу;
- не включає `draft` у публічний `src/content/documents/manifest.json`;
- генерує redirects для legacy-файлів.

## CMS

Sveltia CMS має редагувати тільки вихідні записи нових публікацій у `src/content/documents/groups/*.json` і файли в `public/documents/uploads/**`.

Згенерований `src/content/documents/manifest.json` не редагувати вручну.
