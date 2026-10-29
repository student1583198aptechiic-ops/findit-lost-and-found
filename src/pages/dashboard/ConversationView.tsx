import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Message, Conversation, PublicProfile, Item } from "@/types";
import { EmptyState, FullPageSpinner } from "@/components/ui/State";
import { classNames, getInitials, formatDateTime, timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

export function ConversationView() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherProfile, setOtherProfile] = useState<PublicProfile | null>(null);
  const [relatedItem, setRelatedItem] = useState<Pick<Item, "id" | "title" | "item_type"> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!id || !session?.user) return;
    async function load() {
      const { data: conv, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !conv) {
        toast.error("Conversation not found.");
        navigate("/dashboard/messages");
        return;
      }
      const convData = conv as Conversation;
      const uid = session!.user.id;
      if (convData.participant_a !== uid && convData.participant_b !== uid) {
        toast.error("You don't have access to this conversation.");
        navigate("/dashboard/messages");
        return;
      }
      setConversation(convData);
      const otherId = convData.participant_a === uid ? convData.participant_b : convData.participant_a;
      const [{ data: prof }, { data: item }] = await Promise.all([
        supabase.from("public_profiles").select("id, full_name, avatar_url").eq("id", otherId).maybeSingle(),
        convData.related_item_id
          ? supabase.from("items").select("id, title, item_type").eq("id", convData.related_item_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setOtherProfile((prof as PublicProfile) ?? null);
      setRelatedItem((item as Pick<Item, "id" | "title" | "item_type"> | null) ?? null);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      setMessages((msgs as Message[]) ?? []);
      setLoading(false);

      // Mark messages from the other user as read
      if (msgs) {
        const unread = (msgs as Message[]).filter(
          (m) => m.sender_id !== uid && !m.read_at
        );
        for (const m of unread) {
          await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", m.id);
        }
      }
    }
    load();
  }, [id, session?.user, navigate]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as read if from the other user
          if (newMsg.sender_id !== session?.user?.id) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, session?.user?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !session?.user || !id) return;
    setSending(true);
    const content = text.trim();
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: id,
        sender_id: session.user.id,
        content,
      })
      .select()
      .single();
    setSending(false);
    if (error) {
      toast.error("Could not send message.");
      setText(content);
      return;
    }
    // Update conversation last_message_at
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", id);
    // Realtime will add it, but in case it's not received yet
    setMessages((prev) => {
      if (prev.some((m) => m.id === (data as Message).id)) return prev;
      return [...prev, data as Message];
    });
  }

  if (loading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200 bg-white rounded-t-xl">
        <Link
          to="/dashboard/messages"
          className="p-2 rounded-lg text-navy-500 hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-navy-600 overflow-hidden flex-shrink-0">
          {otherProfile?.avatar_url ? (
            <img src={otherProfile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-semibold text-sm">
              {getInitials(otherProfile?.full_name ?? "?")}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy-900 truncate">
            {otherProfile?.full_name ?? "Unknown user"}
          </p>
          {relatedItem && (
            <Link
              to={`/items/${relatedItem.id}`}
              className="text-xs text-navy-400 hover:text-navy-600 truncate block"
            >
              Re: {relatedItem.title}
            </Link>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-navy-400">
                No messages yet. Say hello!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender_id === session?.user?.id;
            const showTime =
              idx === 0 ||
              new Date(messages[idx - 1].created_at).getTime() + 60000 <
                new Date(msg.created_at).getTime();
            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="flex items-center justify-center my-3">
                    <span className="text-xs text-navy-400 bg-white px-3 py-1 rounded-full border border-slate-100">
                      {formatDateTime(msg.created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={classNames(
                    "flex",
                    isMine ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={classNames(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                      isMine
                        ? "bg-navy-700 text-white rounded-br-sm"
                        : "bg-white text-navy-800 border border-slate-200 rounded-bl-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="input flex-1"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="btn-primary px-4"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
