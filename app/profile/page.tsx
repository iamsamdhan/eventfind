import { Metadata } from "next";
import { requireAuth } from "@/lib/auth/session";
import { getUserRegistrations } from "@/lib/registrations/service";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { UserRegistrationsList } from "@/components/profile/UserRegistrationsList";

export const metadata: Metadata = {
  title: "My Profile — EventFind",
  description: "Manage your EventFind student or organizer account profile, credentials, and event registrations.",
};

export default async function ProfilePage() {
  const user = await requireAuth("/profile");
  const registrations = await getUserRegistrations(user.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <ProfileEditor initialUser={user} />
      <UserRegistrationsList initialRegistrations={registrations} />
    </div>
  );
}

