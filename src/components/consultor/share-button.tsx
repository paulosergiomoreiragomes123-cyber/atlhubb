"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Share2, Copy, Check } from "lucide-react";

import { getOrCreateQrCodeAction, type QrCodeTarget } from "@/src/modules/qrcode/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type ShareResult = { slug: string; scanCount: number; shareUrl: string; dataUrl: string };

export function ShareButton(props: QrCodeTarget) {
  const [result, setResult] = useState<ShareResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function handleToggle() {
    if (result) {
      setResult(null);
      return;
    }
    startTransition(async () => {
      const data = await getOrCreateQrCodeAction(props);
      setResult(data);
    });
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative inline-block">
      <Button type="button" variant="outline" size="sm" onClick={handleToggle} disabled={isPending}>
        <Share2 className="size-4" />
        {isPending ? "Gerando…" : "Compartilhar"}
      </Button>

      {result && (
        <Card className="absolute right-0 top-full z-10 mt-2 w-64">
          <CardContent className="flex flex-col items-center gap-3">
            <Image
              src={result.dataUrl}
              alt="QR Code"
              width={180}
              height={180}
              unoptimized
              className="rounded-md"
            />
            <div className="flex w-full items-center gap-2">
              <Input readOnly value={result.shareUrl} className="text-xs" />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={handleCopy}
                aria-label={copied ? "Link copiado" : "Copiar link"}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {result.scanCount} acesso(s) via esse link/QR Code
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
