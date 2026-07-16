"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { upload } from "@vercel/blob/client";
import { Loader2 } from "lucide-react";

import { profileSchema, type ProfileInput } from "@/src/modules/profile/schemas";
import { updateProfileAction } from "@/src/modules/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function ProfileForm({
  profile,
}: {
  profile: { whatsapp: string | null; instagram: string | null; photoUrl: string | null };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      whatsapp: profile.whatsapp ?? "",
      instagram: profile.instagram ?? "",
      photoUrl: profile.photoUrl ?? "",
    },
  });

  async function handlePhotoFile(file: File) {
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: "consultantPhoto",
      });
      form.setValue("photoUrl", result.url);
    } catch (error) {
      setUploadError(
        `Upload falhou (${(error as Error).message}). Use o campo de URL manual abaixo.`
      );
    } finally {
      setIsUploading(false);
    }
  }

  function onSubmit(values: ProfileInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (result?.message) {
        setServerError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="whatsapp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp</FormLabel>
              <FormControl>
                <Input {...field} placeholder="ex.: 11999998888" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instagram"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instagram (opcional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="@seu.instagram" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Foto (opcional)</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoFile(file);
                  }}
                  className="max-w-xs"
                />
                {isUploading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              </div>
              {uploadError && (
                <Alert variant="destructive">
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
              <FormControl>
                <Input {...field} placeholder="Ou cole a URL de uma foto já hospedada" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar perfil"}
        </Button>
      </form>
    </Form>
  );
}
