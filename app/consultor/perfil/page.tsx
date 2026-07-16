import type { Metadata } from "next";

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
          Esses dados personalizam a revista digital que você compartilha com
          seus clientes — capa, rodapé de cada página e a última página, com
          o link/QR Code do seu WhatsApp.
        </p>
      </div>

      <ProfileForm
        profile={{
          name: profile?.name ?? user.name,
          jobTitle: profile?.jobTitle ?? null,
          whatsapp: profile?.whatsapp ?? null,
          instagram: profile?.instagram ?? null,
          city: profile?.city ?? null,
          state: profile?.state ?? null,
          photoUrl: profile?.photoUrl ?? null,
          magazineMessage: profile?.magazineMessage ?? null,
          coverColor: profile?.coverColor ?? "VERDE",
          showQrCode: profile?.showQrCode ?? true,
          showPhoto: profile?.showPhoto ?? true,
          showInstagram: profile?.showInstagram ?? true,
          showCity: profile?.showCity ?? true,
        }}
      />
    </div>
  );
}
