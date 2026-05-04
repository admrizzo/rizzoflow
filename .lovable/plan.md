1.  **Presence System**:
    *   Update `ChatProvider.tsx` to handle Supabase Realtime Presence.
    *   Track online users and their metadata (full_name, avatar_url, online_at).
    *   Export `onlineUserIds` from the chat context.

2.  **Unread Messages Refinement**:
    *   Update `ConversationList.tsx` visual styling for unread conversations:
        *   Bold name (`font-semibold`).
        *   Stronger color for the last message preview.
        *   Pink badge (`bg-pink-500` or similar) for the unread count.
    *   Ensure opening a conversation only marks that one as read and updates the global `unreadTotal` correctly.

3.  **Date Separators**:
    *   Modify `MessageThread.tsx` to group messages by date.
    *   Insert a separator when the day changes.
    *   Format dates as "Hoje", "Ontem", or "dd/MM/yyyy".

4.  **UI Indicators for Online Status**:
    *   Add the online status dot to avatars in `ConversationList.tsx`.
    *   Display "Online" / "Offline" status in the `MessageThread.tsx` header.

5.  **Validation**:
    *   Run build and lint checks.
    *   Verify the visual changes in the UI.

Technical Details:
- Use `supabase.channel('presence-chat').subscribe(...)` for presence.
- Use `date-fns` for date comparisons and formatting.
- Ensure `last_read_at` updates are handled correctly without race conditions.
