<script lang="ts">
  import { chatSessionManager, type SessionSummary } from '@core/chat-session-manager';

  interface Props {
    onSelectSession: (sessionId: string) => void;
    onNewSession: () => void;
    activeSessionId?: string;
  }

  let { onSelectSession, onNewSession, activeSessionId }: Props = $props();

  let sessions = $state<SessionSummary[]>([]);
  let isLoading = $state(true);

  function refresh() {
    sessions = chatSessionManager.listSessions();
    isLoading = false;
  }

  // Load sessions on mount
  $effect(() => {
    refresh();
  });

  async function handleDelete(e: MouseEvent, sessionId: string) {
    e.stopPropagation();

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      content: 'Delete this chat session? This cannot be undone.',
      window: { title: 'Delete Session' },
    });

    if (!confirmed) return;

    try {
      await chatSessionManager.deleteSession(sessionId);
      refresh();
      ui.notifications.info('Session deleted.');
    } catch (err: any) {
      ui.notifications.error(`Failed to delete: ${err.message}`);
    }
  }

  function formatDate(ts: number): string {
    if (!ts) return 'Unknown';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return `Today ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="session-list">
  <div class="session-list-header">
    <h3>Chat Sessions</h3>
    <button class="new-session-btn" onclick={onNewSession} title="New Chat">
      <i class="fas fa-plus"></i> New Chat
    </button>
  </div>

  {#if isLoading}
    <div class="loading">
      <i class="fas fa-spinner fa-spin"></i> Loading...
    </div>
  {:else if sessions.length === 0}
    <div class="empty-state">
      <i class="fas fa-comments"></i>
      <p>No sessions yet. Start a new chat!</p>
    </div>
  {:else}
    <div class="session-entries">
      {#each sessions as session (session.id)}
        <div
          class="session-entry"
          class:active={session.id === activeSessionId}
          role="button"
          tabindex="0"
          onclick={() => onSelectSession(session.id)}
          onkeydown={(e) => { if (e.key === 'Enter') onSelectSession(session.id); }}
        >
          <div class="session-info">
            <span class="session-name" title={session.name}>
              {#if session.actorId}
                <i class="fas fa-theater-masks actor-badge" title="Actor Roleplay: {session.actorName}"></i>
              {:else if session.actorIds?.length}
                <i class="fas fa-users actor-badge" title="Party Chat: {session.actorNames?.join(', ')}"></i>
              {/if}
              {session.name}
            </span>
            <span class="session-meta">
              {formatDate(session.updatedAt)} · {session.messageCount} msgs
            </span>
          </div>
          <button
            class="delete-btn"
            onclick={(e) => handleDelete(e, session.id)}
            title="Delete session"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .session-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: rgba(0, 0, 0, 0.1);
  }

  .session-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .session-list-header h3 {
    margin: 0;
    font-size: 0.9em;
    font-weight: 600;
    color: #e0c080;
  }

  .new-session-btn {
    background: rgba(139, 92, 246, 0.3);
    border: 1px solid rgba(139, 92, 246, 0.5);
    color: #c4b5fd;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8em;
    transition: all 0.2s;
  }

  .new-session-btn:hover {
    background: rgba(139, 92, 246, 0.5);
    color: #fff;
  }

  .session-entries {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
  }

  .session-entry {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 10px;
    margin: 2px 0;
    border: 1px solid transparent;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    color: inherit;
  }

  .session-entry:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .session-entry.active {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.4);
  }

  .session-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .session-name {
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .session-meta {
    font-size: 0.72em;
    opacity: 0.5;
  }

  .delete-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 0.75em;
    opacity: 0;
    transition: all 0.15s;
  }

  .session-entry:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.15);
  }

  .actor-badge {
    color: #f59e0b;
    font-size: 0.8em;
    margin-right: 3px;
  }

  .loading,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: rgba(255, 255, 255, 0.4);
    gap: 8px;
    font-size: 0.85em;
  }

  .empty-state i {
    font-size: 2em;
    opacity: 0.3;
  }
</style>
