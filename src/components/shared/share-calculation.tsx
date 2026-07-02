"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Copy, Check, MessageCircle, Send, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareCalculation({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  }

  const encoded = encodeURIComponent(message);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={onCopy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        render={
          <a
            href={`https://wa.me/?text=${encoded}`}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
      >
        <MessageCircle className="size-4" /> WhatsApp
      </Button>
      <Button
        variant="outline"
        size="sm"
        render={
          <a
            href={`https://t.me/share/url?url=&text=${encoded}`}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
      >
        <Send className="size-4" /> Telegram
      </Button>
      <Button
        variant="outline"
        size="sm"
        render={
          <a href={`mailto:?subject=Chit%20Auction%20Result&body=${encoded}`} />
        }
      >
        <Mail className="size-4" /> Email
      </Button>
    </div>
  );
}
