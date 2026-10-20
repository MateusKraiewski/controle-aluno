import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileSettings } from "@/components/profile-settings";
import { getProfileTimeZone } from "@/features/profile/repository";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");
  return <ProfileSettings name={session.user.name} timeZone={await getProfileTimeZone(session.user.id)} />;
}
