# Remember Better

Remember Better is an AI learning prototype that translates study material into a learner's memory language. The current version focuses on the shortest useful loop:

- paste Markdown or plain text
- use one fixed memory profile: Spatial Narrative
- import PDF, PPTX, or legacy PPT files
- generate a spatial map, a first-person recall route, and key concepts
- edit the output and save it to local browser history

## MVP Scope

- landing page plus workspace
- `/api/generate` endpoint
- editable generated output
- browser-local history for recent generations
- file extraction endpoint for PDF / PPTX / PPT
- automatic fallback to a built-in sample when `OPENAI_API_KEY` is missing

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

```bash
copy .env.example .env.local
```

Add:

```env
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4.1-mini
```

3. Start the dev server

```bash
npm run dev
```

## File Upload Notes

- `PDF`: parsed directly on the server
- `PPTX`: parsed directly from slide XML
- `PPT`: first converted through `LibreOffice / soffice`, then parsed as `PPTX`

If your machine or deployment environment does not have `soffice`, legacy `.ppt` uploads will return a clear error message asking you to install LibreOffice or convert the file manually.

## Project Structure

- `app/page.tsx`: landing page and workspace shell
- `app/api/generate/route.ts`: AI generation endpoint
- `components/workspace.tsx`: input, editable output, and local history
- `lib/prompt.ts`: prompt assembly for the Spatial Narrative profile
- `lib/ai.ts`: OpenAI request logic and mock fallback
- `project-skill.md`: product and architecture context for AI assistants

## Next Steps

- add memory profile assessment
- add Prisma and PostgreSQL persistence
- convert `spatialMapMarkdown` into a structured graph for React Flow
