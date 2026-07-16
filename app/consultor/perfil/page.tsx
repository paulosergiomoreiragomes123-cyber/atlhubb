import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireApprovedUser } from "@/src/modules/auth/dal";
import { getMyProfile } from "@/src/modules/profile/queries";
import { ProfileForm } from "@/src/components/consultor/profile-form";

export const metadata: Metadata = { title: "Meu perfil — AtlHub" };

export default async function PerfilPage() {
  const user = await requireApprovedUser();
  const profile = await getMyProfile(user.id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Meu perfil</h1>
        <p className="text-muted-foreground">
          Esses dados aparecem na revista digital que você compartilha com
          seus clientes — no rodapé de cada página e na última página, com o
          link/QR Code do seu WhatsApp.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contato</CardTitle>
          <CardDescription>Deixe em branco o que não quiser mostrar.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            profile={{
              whatsapp: profile?.whatsapp ?? null,
              instagram: profile?.instagram ?? null,
              photoUrl: profile?.photoUrl ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
