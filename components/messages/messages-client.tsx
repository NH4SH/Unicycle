"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Loader2, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatCurrency } from "@/lib/utils";

type ConversationPayload = {
  id: string;
  listing: {
    id: string;
    title: string;
    priceCents: number;
    images: string[];
  };
  otherUser: {
    id: string;
    name: string | null;
    image: string | null;
    username: string;
  };
  messages: {
    id: string;
    senderId: string;
    body: string;
    createdAt: string;
    readAt: string | null;
  }[];
};

export function MessagesClient({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const selectedFromQuery = searchParams.get("conversation");

  const [conversations, setConversations] = useState<ConversationPayload[]>([]);
  const [activeId, setActiveId] = useState<string | null>(selectedFromQuery);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(
    async (markReadId?: string) => {
      const query = markReadId ? `?conversationId=${markReadId}` : "";
      const response = await fetch(`/api/conversations${query}`);

      if (!response.ok) {
        toast.error("Could not load your messages.");
        setLoading(false);
        return;
      }

      const data = (await response.json()) as ConversationPayload[];
      setConversations(data);

      if (!activeId && data.length) {
        setActiveId(selectedFromQuery || data[0].id);
      }

      setLoading(false);
    },
    [activeId, selectedFromQuery]
  );

  useEffect(() => {
    void loadConversations(selectedFromQuery || undefined);
  }, [selectedFromQuery, loadConversations]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId]
  );

  async function sendMessage() {
    if (!draft.trim() || !activeConversation || sending) return;

    setSending(true);
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeConversation.id,
        body: draft.trim()
      })
    });

    setSending(false);

    if (!response.ok) {
      toast.error("Message failed to send.");
      return;
    }

    const payload = await response.json();
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              messages: [
                ...conversation.messages,
                {
                  id: payload.id,
                  senderId: userId,
                  body: draft.trim(),
                  createdAt: payload.createdAt,
                  readAt: null
                }
              ]
            }
          : conversation
      )
    );
    setDraft("");
  }

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center rounded-3xl border border-border bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <EmptyState
        title="No messages yet"
        description="When you message a seller from a listing, your conversation shows up here."
        ctaHref="/market"
        ctaLabel="Browse Drops"
      />
    );
  }

  return (
    <div className="grid min-h-[70vh] gap-4 md:grid-cols-[320px_1fr]">
      <Card className="overflow-hidden border-white bg-white">
        <ScrollArea className="h-[35vh] md:h-[70vh]">
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => {
              const lastMessage = conversation.messages.at(-1);
              const active = conversation.id === activeId;

              return (
                <button
                  key={conversation.id}
                  onClick={() => {
                    setActiveId(conversation.id);
                    void loadConversations(conversation.id);
                  }}
                  className={cn(
                    "grid w-full grid-cols-[56px_1fr] gap-3 rounded-2xl p-2 text-left transition",
                    active ? "bg-secondary" : "hover:bg-secondary/70"
                  )}
                >
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-border">
                    <Image
                      src={conversation.listing.images[0] || "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=900&q=80"}
                      alt={conversation.listing.title}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{conversation.otherUser.name || conversation.otherUser.username}</p>
                    <p className="truncate text-xs text-muted-foreground">{conversation.listing.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{lastMessage?.body ?? "No messages yet"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      <Card className="flex h-[70vh] flex-col overflow-hidden border-white bg-white">
        {activeConversation ? (
          <>
            <div className="flex items-center gap-3 border-b border-border p-4">
              <Avatar>
                <AvatarImage src={activeConversation.otherUser.image ?? undefined} alt={activeConversation.otherUser.username} />
                <AvatarFallback>{activeConversation.otherUser.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{activeConversation.otherUser.name || activeConversation.otherUser.username}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {activeConversation.listing.title} - {formatCurrency(activeConversation.listing.priceCents / 100)}
                </p>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {activeConversation.messages.map((message) => {
                  const own = message.senderId === userId;

                  return (
                    <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-3 py-2 text-sm",
                          own ? "bg-uva-orange text-white" : "bg-secondary text-foreground"
                        )}
                      >
                        <p>{message.body}</p>
                        <p className={cn("mt-1 text-[10px]", own ? "text-white/80" : "text-muted-foreground")}>
                          {format(new Date(message.createdAt), "MMM d, h:mm a")}
                          {own && message.readAt ? " · Seen" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-t border-border p-3">
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
              >
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Send a message"
                  aria-label="Message body"
                />
                <Button type="submit" disabled={sending || !draft.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="m-auto text-center text-sm text-muted-foreground">Select a conversation to start chatting.</div>
        )}
      </Card>
    </div>
  );
}
