import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupForm } from "@/src/components/auth/signup-form";

export const metadata: Metadata = { title: "Criar conta — AtlHub" };

export default function CadastroPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Criar conta de consultor</CardTitle>
        <CardDescription>
          Seu cadastro passa por aprovação manual de um administrador antes de
          liberar o acesso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
