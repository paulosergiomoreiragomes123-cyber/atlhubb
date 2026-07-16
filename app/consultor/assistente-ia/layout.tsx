import Link from "next/link";

import { requireApprovedUser } from "@/src/modules/auth/dal";
import { listConversationsForUser } from "@/src/modules/ai/conversations";
import { createConversationAction } from "@/src/modules/ai/actions";
import { Button } from "@/components/ui/button";

export default async function AssistenteIaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireApprovedUser();
  const conversations = await listConversationsForUser(user.id);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-5xl gap-4">
      <aside className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto">
        <form action={createConversationAction}>
          <Button type="submit" className="w-full" size="sm">
            Nova conversa
          </Button>
        </form>

        <nav className="flex flex-col gap-1">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/consultor/assistente-ia/${conversation.id}`}
              className="truncate rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {conversation.title || "Nova conversa"}
            </Link>
          ))}
          {conversations.length === 0 && (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              Nenhuma conversa ainda.
            </p>
          )}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
