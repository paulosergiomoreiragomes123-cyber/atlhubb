"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { upload } from "@vercel/blob/client";
import { Loader2 } from "lucide-react";

import { profileSchema, type ProfileInput } from "@/src/modules/profile/schemas";
import { updateProfileAction } from "@/src/modules/profile/actions";
import { COVER_COLOR_LABELS, COVER_COLOR_VALUES } from "@/src/modules/magazine/cover-colors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export type ProfileFormData = {
  name: string;
  jobTitle: string | null;
  whatsapp: string | null;
  instagram: string | null;
  city: string | null;
  state: string | null;
  photoUrl: string | null;
  magazineMessage: string | null;
  coverColor: (typeof COVER_COLOR_VALUES)[number];
  showQrCode: boolean;
  showPhoto: boolean;
  showInstagram: boolean;
  showCity: boolean;
};

export function ProfileForm({ profile }: { profile: ProfileFormData }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name,
      jobTitle: profile.jobTitle ?? "",
      whatsapp: profile.whatsapp ?? "",
      instagram: profile.instagram ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      photoUrl: profile.photoUrl ?? "",
      magazineMessage: profile.magazineMessage ?? "",
      coverColor: profile.coverColor,
      showQrCode: profile.showQrCode,
      showPhoto: profile.showPhoto,
      showInstagram: profile.showInstagram,
      showCity: profile.showCity,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do consultor</CardTitle>
            <CardDescription>Deixe em branco o que não quiser preencher.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Foto</FormLabel>
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

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Seu nome completo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormLabel>Instagram</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="@seu.instagram" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ex.: Belo Horizonte" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ex.: MG" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ex.: Consultora de Beleza" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personalização da revista</CardTitle>
            <CardDescription>
              Usados no botão de WhatsApp e na capa da sua revista digital.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="magazineMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem automática</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder='Ex.: "Olá! Vi sua revista e gostaria de saber mais."'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="coverColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor da capa</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COVER_COLOR_VALUES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {COVER_COLOR_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opções de exibição</CardTitle>
            <CardDescription>Controla só a revista — o dado em si continua salvo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormField
              control={form.control}
              name="showQrCode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <Label className="font-normal">Mostrar QR Code</Label>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="showPhoto"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <Label className="font-normal">Mostrar Foto</Label>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="showInstagram"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <Label className="font-normal">Mostrar Instagram</Label>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="showCity"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <Label className="font-normal">Mostrar Cidade</Label>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar perfil"}
        </Button>
      </form>
    </Form>
  );
}
