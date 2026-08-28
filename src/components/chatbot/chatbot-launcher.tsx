"use client";

import { useState, useRef, useEffect } from "react";
import type { Business, MenuWithContent } from "@/lib/types";
import { answerQuery } from "@/lib/chatbot/engine";
import { formatPrice } from "@/lib/menu/format";
import { track, type TrackContext } from "@/lib/analytics/client";

interface Message {
  role: "user" | "bot";
  text: string;
  products?: { id: string; name: string; price: number; currency: string }[];
}

const SUGGESTIONS = [
  "Que tenéis vegetariano?",
  "Algo por menos de 15€",
  "Que recomendais?",
  "Tenéis algo sin gluten?",
];

export function ChatbotLauncher({
  business,
  menu,
  trackCtx,
}: {
  business: Business;
  menu: MenuWithContent | null;
  trackCtx: TrackContext;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function openChat() {
    if (!open) {
      track(trackCtx, "chat_opened");
      if (messages.length === 0) {
        setMessages([
          {
            role: "bot",
            text: `Hola, soy el asistente de ${business.name}. Solo respondo con la informacion publicada en la carta. Preguntame por precios, alergenos, dietas o recomendaciones.`,
          },
        ]);
      }
    }
    setOpen((v) => !v);
  }

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    track(trackCtx, "chat_query", { metadata: { query: q } });
    const answer = answerQuery(menu, q);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      {
        role: "bot",
        text: answer.text,
        products: answer.products.slice(0, 5).map((p) => ({ id: p.id, name: p.name, price: p.price, currency: p.currency })),
      },
    ]);
    setInput("");
  }

  return (
    <>
      <button
        type="button"
        onClick={openChat}
        aria-label="Abrir chat"
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-tenant-primary text-white shadow-lg"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      {open ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex max-h-[75vh] flex-col rounded-t-2xl border-t border-tenant-secondary/20 bg-tenant-bg shadow-2xl sm:inset-auto sm:bottom-20 sm:right-4 sm:h-[520px] sm:w-96 sm:rounded-2xl sm:border">
          <div className="flex items-center justify-between border-b border-tenant-secondary/15 px-4 py-3">
            <span className="font-tenant-heading text-sm font-semibold">Pregunta a la carta</span>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
            <ul className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <li key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-tenant bg-tenant-primary px-3 py-2 text-sm text-white"
                        : "max-w-[85%] rounded-tenant bg-tenant-surface px-3 py-2 text-sm text-tenant-text"
                    }
                  >
                    <p>{m.text}</p>
                    {m.products && m.products.length > 0 ? (
                      <ul className="mt-1.5 flex flex-col gap-0.5 text-xs opacity-90">
                        {m.products.map((p) => (
                          <li key={p.id}>
                            {p.name} — {formatPrice(p.price, p.currency)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {messages.length <= 1 ? (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-tenant-secondary/30 px-2.5 py-1 text-xs text-tenant-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-tenant-secondary/15 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
              className="flex-1 rounded-tenant border border-tenant-secondary/25 bg-tenant-bg px-3 py-2 text-sm text-tenant-text outline-none"
            />
            <button type="submit" className="rounded-tenant bg-tenant-primary px-3 py-2 text-sm font-medium text-white">
              Enviar
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
