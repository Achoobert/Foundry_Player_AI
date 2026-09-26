# FoundryAI

AI-powered player character companion module for [Foundry VTT](https://foundryvtt.com/) v13.

FoundryAI lets an LLM play a party member's character in your Foundry game — it can read your journals and actors, answer questions about your world in character, generate session recaps, roleplay as NPCs, manage combat, control audio, and more — all powered by [OpenRouter](https://openrouter.ai/).

## Features

- **AI Chat** — Sidebar tab and popout window with streaming responses
- **AI Player Agents** — Auto-reply in chat, in character, whenever a message @mentions a player character (e.g. "@ed") — no manual button click needed
- **RAG (Retrieval-Augmented Generation)** — Indexes your journals, actors, and scenes into a local vector store so the AI can search and reference your world content
- **40+ Tools** — The AI can search content, manage tokens, run combat, play audio, place spell templates, and much more (see [Tools](#tools) below)
- **Actor Roleplay** — Start a dedicated chat session where the AI roleplays as a specific actor, using their biography, personality traits, abilities, and equipment
- **Session Chat History** — Conversations are saved as journal entries in the organized `FoundryAI/` folder hierarchy
- **Session Recaps** — Generate polished narrative summaries of your sessions with AI
- **Text-to-Speech** — Click to hear NPC dialogue read aloud via OpenRouter TTS
- **Organized Journal Folders** — Automatic `FoundryAI/` folder structure: Notes, Chat History, Sessions, Actors
- **Per-Category Tool Toggles** — Enable or disable tool categories (scene, dice, token, combat, audio, chat, compendium, spatial) individually
- **OpenRouter Integration** — Access any model available on OpenRouter (GPT-4o, Claude, Llama, Mistral, etc.)
- **Fully Client-Side** — Vector store uses IndexedDB; no external database needed

## Requirements

- Foundry VTT v13
- An [OpenRouter](https://openrouter.ai/) API key

## Installation

1. In Foundry VTT, go to **Settings → Add-on Modules → Install Module**
2. Paste the manifest URL:
   ```
   https://github.com/Achoobert/Foundry_Player_AI/releases/latest/download/module.json
   ```
3. Click **Install**
4. Enable **FoundryAI** in your world's Module Management
5. Open module settings and enter your OpenRouter API key

## Configuration

After enabling the module, open **Settings → Module Settings → FoundryAI**:

| Setting                    | Description                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| **API Key**                | Your OpenRouter API key                                                                            |
| **Chat Model**             | Model for chat responses (e.g. `openai/gpt-4o`)                                                    |
| **Embedding Model**        | Model for RAG embeddings                                                                           |
| **Journal Folders**        | Which journal folders to index for RAG                                                             |
| **Actor Folders**          | Which actor folders to index for RAG                                                               |
| **Temperature**            | Response creativity (0.0–2.0)                                                                      |
| **Max Tokens**             | Maximum response length                                                                            |
| **Stream Responses**       | Enable/disable streaming                                                                           |
| **Auto-Index on Startup**  | Automatically index content when the world loads                                                   |
| **Enable Tool Calling**    | Allow the AI to use Foundry tools                                                                  |
| **Tool Category Toggles**  | Enable/disable scene, dice, token, combat, audio, chat, compendium, and spatial tools individually |
| **Enable TTS**             | Enable text-to-speech for NPC dialogue                                                             |
| **TTS Voice**              | Voice to use for TTS playback                                                                      |
| **System Prompt Override** | Custom instructions for the AI                                                                     |

## Usage

### Chat

Click the **FoundryAI** tab in the sidebar, or use the scene controls brain icon / hotbar macro to open a popout window. Type a message and the AI will respond with context from your world.

### Actor Roleplay

Click the **theater masks** button (🎭) in the toolbar to open the actor picker. Select any actor and the AI will start a dedicated roleplay session, staying in character using the actor's biography, personality traits, abilities, and equipment. Actor roleplay sessions are saved in the `FoundryAI/Actors` folder.

### RAG Indexing

Use the **Reindex** button in the chat window to index your journals and actors. The AI will then be able to search and reference that content when answering questions.

### Session Recaps

Click **Generate Recap** to create a polished narrative summary from your chat sessions. Recaps are saved as journal entries in the `FoundryAI/Sessions` folder.

### Text-to-Speech

When TTS is enabled, NPC dialogue in AI responses will show a speaker button. Click it to hear the line read aloud.

## Tools

FoundryAI provides **40+ tools** across 9 categories that the AI can call autonomously during conversation. Each category can be toggled on/off in settings.

### Core Tools (always on when tools enabled)

| Tool                      | Description                                                            |
| ------------------------- | ---------------------------------------------------------------------- |
| `search_journals`         | Semantically search indexed journal entries (sourcebooks, notes, lore) |
| `search_actors`           | Semantically search indexed actors (NPCs, monsters, characters)        |
| `get_journal`             | Get the full content of a journal entry by ID                          |
| `get_actor`               | Get details about a specific actor by ID                               |
| `create_journal`          | Create a new journal entry in a specified folder                       |
| `update_journal`          | Update an existing journal entry's content                             |
| `list_journals_in_folder` | List all journal entries in a folder                                   |
| `list_folders`            | List all journal and actor folders                                     |
| `get_scene_info`          | Get active scene details (tokens, lights, notes, combat)               |
| `roll_table`              | Roll on a roll table and return the result                             |

### Scene Tools

| Tool             | Description                                            |
| ---------------- | ------------------------------------------------------ |
| `list_scenes`    | List all scenes with IDs, names, and active status     |
| `view_scene`     | View detailed info about a scene without activating it |
| `activate_scene` | Switch all players to a different scene                |

### Dice Tools

| Tool         | Description                                                |
| ------------ | ---------------------------------------------------------- |
| `roll_dice`  | Roll any dice expression (e.g. `2d6+4`, `4d6kh3`)          |
| `roll_check` | Roll an ability check or saving throw for a specific actor |

### Token Tools

| Tool           | Description                                            |
| -------------- | ------------------------------------------------------ |
| `place_token`  | Place a token on the active scene (hidden by default)  |
| `move_token`   | Move a token to new coordinates                        |
| `hide_token`   | Hide a token from player view                          |
| `reveal_token` | Reveal a hidden token to players                       |
| `remove_token` | Remove a token from the scene                          |
| `update_token` | Update token properties (name, size, elevation, light) |

### Combat Tools

| Tool                 | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `start_combat`       | Create a new combat encounter, optionally adding tokens  |
| `end_combat`         | End the current combat                                   |
| `add_to_combat`      | Add tokens to an active combat                           |
| `remove_from_combat` | Remove combatants from combat                            |
| `next_turn`          | Advance to the next turn                                 |
| `roll_initiative`    | Roll initiative for combatants (all unrolled by default) |
| `apply_damage`       | Deal damage or heal a token's actor                      |
| `apply_condition`    | Apply a status effect (poisoned, stunned, prone, etc.)   |
| `remove_condition`   | Remove a status effect                                   |

### Audio Tools

| Tool             | Description                           |
| ---------------- | ------------------------------------- |
| `list_playlists` | List all playlists and their tracks   |
| `play_playlist`  | Start playing a playlist              |
| `stop_playlist`  | Stop a playlist (or all playlists)    |
| `play_track`     | Play a specific track from a playlist |

### Chat Tools

| Tool                | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `post_chat_message` | Post to the Foundry chat log (narration, NPC dialogue, whispers) |

### Compendium Tools

| Tool                     | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| `search_compendium`      | Search compendium packs by name (monsters, items, spells, etc.) |
| `get_compendium_entry`   | Read full details of a compendium entry                         |
| `import_from_compendium` | Import a compendium entry into the world                        |

### Spatial Tools

| Tool                       | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| `measure_distance`         | Measure distance between two tokens or points              |
| `tokens_in_range`          | Find all tokens within a given range of a point or token   |
| `create_measured_template` | Place an area-of-effect template (circle, cone, ray, rect) |

## Folder Structure

FoundryAI automatically creates and manages a journal folder hierarchy:

```
FoundryAI/
├── Notes/          — AI-created notes, quest logs, reminders
├── Chat History/   — Saved chat session conversations
├── Sessions/       — AI-generated session recaps
└── Actors/         — Actor roleplay session logs
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)

### Setup

```bash
git clone https://github.com/Achoobert/Foundry_Player_AI.git
cd FoundryAI
bun install
```

### Scripts

| Command             | Description                                       |
| ------------------- | ------------------------------------------------- |
| `bun run build`     | Production build → `dist/`                        |
| `bun run dev`       | Watch mode (rebuilds `dist/` on changes)          |
| `bun run watch`     | Watch mode, builds straight into your Foundry userdata `modules/` folder (see below) |
| `bun run package`   | Build + create `foundry-ai.zip` for release       |
| `bun run link`      | Symlink `dist/` into local Foundry modules folder |
| `bun run test`      | Run unit tests (Vitest)                           |
| `bun run test:e2e`  | Open Cypress interactively against a running Foundry world |
| `bun run test:ci`   | Run Cypress headless — logs in, opens Quench, runs all batches, fails on any failed test (or zero tests run) |
| `bun run typecheck` | TypeScript type checking                          |

`bun run watch` reads `fvtt.config.js` (gitignored — copy `fvtt.config.example.js` and set `userDataPath` to the folder that *contains* your Foundry `Data/` directory) and rebuilds directly into `<userDataPath>/Data/modules/foundry-ai` on every save, so Foundry picks up changes with just a refresh — no separate `link` step needed.

### Testing

Quench batches live under `src/quench/` and register themselves via a `quenchReady` hook — they're bundled into the module but only activate in a world with [Quench](https://github.com/Ethaks/FVTT-Quench) installed. `cypress/` drives Foundry end-to-end: log in, launch the test world, open Quench, run everything, and fail the run if any batch fails or if zero tests ran.

To run locally, point `fvtt.config.js` (`baseURL`, `testWorldName`) at a running Foundry instance with Quench and this module already enabled in that world, then `bun run test:ci`. CI (see `.github/workflows/ci.yml`) only runs the build; the Foundry+Quench e2e run isn't wired up there yet.

### Project Structure

```
src/
├── module.ts                 # Entry point (Hooks, settings, init)
├── settings.ts               # Foundry settings registration
├── core/
│   ├── openrouter-service.ts # OpenRouter API client (streaming, embeddings, TTS)
│   ├── vector-store.ts       # IndexedDB vector store with cosine similarity
│   ├── embedding-service.ts  # Document chunking + embedding pipeline
│   ├── collection-reader.ts  # Reads journals, actors, scenes from Foundry
│   ├── tool-system.ts        # 40+ function-calling tool definitions + executor
│   ├── chat-session-manager.ts   # Persists chat sessions as journal entries
│   ├── session-recap-manager.ts  # AI-generated session recaps
│   ├── folder-manager.ts     # FoundryAI journal folder hierarchy manager
│   ├── tts-service.ts        # Text-to-speech audio playback
│   ├── player-agent.ts       # Auto-replies to @mentions as the matching player character
│   └── system-prompt.ts      # Dynamic system prompt builder (general + actor roleplay)
├── ui/
│   ├── svelte-application.ts # Foundry ApplicationV2 ↔ Svelte 5 bridge
│   └── components/
│       ├── ChatWindow.svelte    # Main chat interface
│       ├── MessageBubble.svelte # Message rendering (markdown, TTS buttons)
│       ├── SettingsPanel.svelte # Settings UI
│       └── SessionList.svelte   # Session browser
├── styles/
│   └── foundry-ai.scss       # Module styles
└── types/
    └── foundry-types.d.ts    # Foundry VTT type declarations
```

### Releasing

```bash
# Bump version, then:
bun run release <version>
```

Create a GitHub Release for the tag and upload:

- `foundry-ai.zip`
- `dist/module.json`

## Tech Stack

- **Svelte 5** (runes mode) — UI components
- **Vite 6** — Build tooling
- **TypeScript 5** — Type safety
- **OpenRouter API** — LLM chat, embeddings, and TTS
- **IndexedDB** — Client-side vector storage
- **micromark** — Markdown rendering

## License

[MIT](LICENSE)
