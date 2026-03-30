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

    const payload = (await response.json()) as { id: string; createdAt: string };
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
      <div className="surface-panel-strong flex min-h-[58dvh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading your conversations on Grounds...</p>
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <EmptyState
        title="No messages yet"
        description="Message a seller from any listing to ask about fit, condition, or pickup timing. Every thread will show up here."
        ctaHref="/market"
        ctaLabel="Browse HoosFinds"
      />
    );
  }

  return (
    <div className="grid gap-4 xl:min-h-[72dvh] xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="surface-panel-strong overflow-hidden">
        <div className="border-b border-border/80 px-4 py-4">
          <p className="editorial-eyebrow">Conversations</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Ask questions, settle the details, and keep the handoff simple.</p>
        </div>
        <ScrollArea className="min-h-[16rem] max-h-[38dvh] xl:h-[72dvh] xl:max-h-none">
          <div className="space-y-2 p-3">
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
                    "grid min-h-[88px] w-full grid-cols-[64px_1fr] gap-3 rounded-[1.35rem] border px-3 py-3 text-left transition",
                    active
                      ? "border-uva-blue/20 bg-uva-blue/6"
                      : "border-transparent bg-white/50 hover:border-border hover:bg-white/75"
                  )}
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-[1rem] border border-border">
                    <Image
                      src={
                        conversation.listing.images[0] ||
                        "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=900&q=80"
                      }
                      alt={conversation.listing.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold tracking-tight">
                      {conversation.otherUser.name || conversation.otherUser.username}
                    </p>
                    <p className="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {conversation.listing.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {lastMessage?.body ?? "Start the thread to work out pickup details."}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      <Card className="surface-panel-strong flex min-h-[54dvh] flex-col overflow-hidden xl:h-[72dvh]">
        {activeConversation ? (
          <>
            <div className="grid gap-4 border-b border-border/80 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={activeConversation.otherUser.image ?? undefined} alt={activeConversation.otherUser.username} />
                  <AvatarFallback>{activeConversation.otherUser.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold tracking-tight">
                    {activeConversation.otherUser.name || activeConversation.otherUser.username}
                  </p>
                  <p className="text-xs text-muted-foreground">@{activeConversation.otherUser.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-[56px_1fr] items-center gap-3 rounded-[1.2rem] border border-border bg-background/70 p-2">
                <div className="relative h-14 w-14 overflow-hidden rounded-[0.9rem] border border-border">
                  <Image
                    src={
                      activeConversation.listing.images[0] ||
                      "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=900&q=80"
                    }
                    alt={activeConversation.listing.title}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{activeConversation.listing.title}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(activeConversation.listing.priceCents / 100)}</p>
                </div>
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
                          "max-w-[78%] rounded-[1.35rem] px-4 py-3 text-sm leading-6",
                          own ? "bg-uva-orange text-white" : "border border-border bg-background/80 text-foreground"
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

            <div className="border-t border-border/80 p-3">
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
                  placeholder="Ask about fit, condition, or the easiest pickup spot on Grounds"
                  aria-label="Message body"
                />
                <Button type="submit" disabled={sending || !draft.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="m-auto max-w-sm px-6 text-center text-sm leading-6 text-muted-foreground">
            Pick a conversation to see the thread, review the listing, and lock in the handoff.
          </div>
        )}
      </Card>
    </div>
  );
}
