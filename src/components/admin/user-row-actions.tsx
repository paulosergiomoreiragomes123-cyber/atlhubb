import { Button } from "@/components/ui/button";
import {
  approveUserAction,
  rejectUserAction,
  suspendUserAction,
  reactivateUserAction,
} from "@/src/modules/users/actions";
import type { Role, UserStatus } from "@/src/generated/prisma/enums";

export function UserRowActions({
  user,
  isSelf,
}: {
  user: { id: string; status: UserStatus; role: Role };
  isSelf: boolean;
}) {
  if (user.status === "AGUARDANDO") {
    return (
      <div className="flex justify-end gap-2">
        <form action={approveUserAction.bind(null, user.id)}>
          <Button type="submit" size="sm">
            Aprovar
          </Button>
        </form>
        <form action={rejectUserAction.bind(null, user.id)}>
          <Button type="submit" size="sm" variant="outline">
            Reprovar
          </Button>
        </form>
      </div>
    );
  }

  if (user.status === "APROVADO") {
    if (isSelf) return null;
    return (
      <div className="flex justify-end">
        <form action={suspendUserAction.bind(null, user.id)}>
          <Button type="submit" size="sm" variant="destructive">
            Suspender
          </Button>
        </form>
      </div>
    );
  }

  if (user.status === "REPROVADO" || user.status === "SUSPENSO") {
    return (
      <div className="flex justify-end">
        <form action={reactivateUserAction.bind(null, user.id)}>
          <Button type="submit" size="sm">
            Reativar
          </Button>
        </form>
      </div>
    );
  }

  return null;
}
