import { Metadata } from "next";
import { requireAuth } from "@/lib/auth/session";
import { ProfileEditor } from "@/components/profile/ProfileEditor";

export const metadata: Metadata = {
  title: "My Profile — EventFind",
  description: "Manage your EventFind student or organizer account profile and credentials.",
};

export default async function ProfilePage() {
  const user = await requireAuth("/profile");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <ProfileEditor initialUser={user} />
    </div>
  );
}

