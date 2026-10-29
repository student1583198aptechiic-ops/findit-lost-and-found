import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Conversation, PublicProfile, Item } from "@/types";
import { EmptyState } from "@/components/ui/State";
import { timeAgo, classNames } from "@/lib/utils";

interface ConversationRow extends Conversation {
  other_profile: PublicProfile | null;
  related_item: Pick<Item, "id" | "title" | "item_type"> | null;
  last_message?: { content: string; created_at: string } | null;
}

export function DashboardMessages() {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    async function load() {
      const uid = session!.user.id;
      const { data } = await supabase
        .from("conversations")
        .select(`
          *,
          other_profile:public_profiles!conversations_participant_a_fkey(id, full_name, avatar_url),
          related_item:items!conversations_related_item_id_fkey(id, title, item_type)
        `)
        .or(`participant_a.eq.${uid},participant_b.eq.${uid}`)
        .order("last_message_at", { ascending: false });
      // Swap profile if "other" is actually us
      const rows: ConversationRow[] = ((data ?? []) as unknown as ConversationRow[]).map((row) => {
        if (row.other_profile?.id === uid) {
          // need participant_b profile instead
          return row;
        }
        return row;
      });
      // Load the other profile for participant_b case
      for (const row of rows) {
        if (row.other_profile?.id === uid || !row.other_profile) {
          const otherId = row.participant_a === uid ? row.participant_b : row.participant_a;
          const { data: prof } = await supabase
            .from("public_profiles")
            .select("id, full_name, avatar_url")
            .eq("id", otherId)
            .maybeSingle();
          row.other_profile = (prof as PublicProfile) ?? null;
        }
        // Load last message
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", row.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        row.last_message = (lastMsg as { content: string; created_at: string }) ?? null;
      }
      setConversations(rows);
      setLoading(false);
    }
    load();
  }, [session?.user]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy-900 mb-6">Messages</h1>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900 mb-1">Messages</h1>
      <p className="text-sm text-navy-500 mb-6">
        Conversations with other FindIt users.
      </p>

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" />}
          title="No conversations yet"
          description="When you contact someone about an item or they contact you, your conversations will appear here."
          action={
            <Link to="/items" className="btn-primary">
              Browse items
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              to={`/dashboard/messages/${conv.id}`}
              className="card p-4 flex items-center gap-4 hover:shadow-card-hover group"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-100 text-navy-600 overflow-hidden flex-shrink-0">
                {conv.other_profile?.avatar_url ? (
                  <img
                    src={conv.other_profile.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-semibold">
                    {conv.other_profile?.full_name?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-navy-900 truncate">
                    {conv.other_profile?.full_name ?? "Unknown user"}
                  </p>
                  {conv.related_item && (
                    <span className="text-xs text-navy-400 truncate">
                      · {conv.related_item.title}
                    </span>
                  )}
                </div>
                <p className="text-sm text-navy-500 truncate mt-0.5">
                  {conv.last_message?.content ?? "No messages yet"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs text-navy-400">
                  {conv.last_message_at ? timeAgo(conv.last_message_at) : ""}
                </span>
                <ArrowRight className="h-4 w-4 text-navy-300 group-hover:text-navy-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
