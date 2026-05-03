# Розробка і комміти

## Conventional commits

У проєкті використовуємо conventional commits:

```text
type(scope): short summary

Detailed body with the reason, changed behavior, and verification.
```

Рекомендовані типи:

- `feat` - нова функціональність;
- `fix` - виправлення дефекту;
- `docs` - документація;
- `style` - зміни стилів без зміни поведінки;
- `refactor` - внутрішня зміна без нового функціоналу;
- `chore` - інфраструктура, залежності, налаштування;
- `cms` - зміни структури контенту або CMS;
- `content` - зміни текстів або документів емітента.

Приклади:

```text
cms(content): move page copy into editable JSON files

- add JSON sources for home, about, documents, contacts, and navigation
- wire Astro page metadata to CMS content
- expose page fields in Sveltia CMS config

Verification:
- npm run check
- npm run build
```

```text
content(documents): publish annual report package for 2025

- add unpacked DOCX, XML, and P7S files
- add CMS metadata with periodEnd and reportingYear
- keep original signed filenames unchanged

Verification:
- npm run check
```

## Що не коммітити

Не коммітимо:

- робочі дослідницькі матеріали;
- дизайн-handoff і макети, якщо вони не є production-артефактами;
- `dist/`;
- `node_modules/`;
- `.astro/`;
- локальні `.env*`;
- системні та тимчасові файли.

Коммітимо:

- production-код;
- `src/content/**`;
- `public/documents/**`;
- `public/admin/config.yml`;
- production-документацію в `docs/`.
