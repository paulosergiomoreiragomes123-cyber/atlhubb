import { redirect } from "next/navigation";

import { getCurrentUser } from "@/src/modules/auth/dal";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.status !== "APROVADO") redirect("/aguardando-aprovacao");
  if (user.role === "ADMIN") redirect("/admin/painel");
  redirect("/consultor/painel");
}
