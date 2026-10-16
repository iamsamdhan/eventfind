"use server";

import { redirect } from "next/navigation";
import { loginSchema, signupSchema, profileUpdateSchema } from "./validation";
import { 
  findUserByIdentifier, 
  findUserByEmail, 
  findUserByUsername, 
  createUser, 
  updateUserProfile 
} from "./store";
import { hashPassword, verifyPassword } from "./password";
import { createAndSetUserSession, invalidateSession, getCurrentUser, getRoleDashboardUrl } from "./session";
import { SafeUser } from "@/types/auth";

export interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
  redirectTo?: string;
  message?: string;
}

/**
 * Shared Login Action
 * Authenticates user and securely establishes session cookie.
 * Obtains role from trusted database record and redirects accordingly.
 */
export async function loginAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ user: SafeUser }>> {
  const rawIdentifier = formData.get("identifier") as string;
  const rawPassword = formData.get("password") as string;
  const returnUrl = (formData.get("returnUrl") as string) || "";

  const validation = loginSchema.safeParse({
    identifier: rawIdentifier,
    password: rawPassword,
  });

  if (!validation.success) {
    const fieldErrors: Record<string, string> = {};
    validation.error.issues.forEach((issue) => {
      if (issue.path[0]) fieldErrors[issue.path[0] as string] = issue.message;
    });
    return {
      success: false,
      error: "Please provide valid credentials.",
      fieldErrors,
    };
  }

  const { identifier, password } = validation.data;

  // Find user by normalized email or username
  const user = await findUserByIdentifier(identifier);
  if (!user) {
    return {
      success: false,
      error: "Invalid email/username or password.",
    };
  }

  // Verify bcrypt password hash
  const isMatch = await verifyPassword(password, user.passwordHash);
  if (!isMatch) {
    return {
      success: false,
      error: "Invalid email/username or password.",
    };
  }

  // Establish HTTP-only session cookie
  await createAndSetUserSession(user.id);

  // Validate returnUrl to prevent open redirects
  let destination = getRoleDashboardUrl(user.role);
  if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
    // Only allow safe internal relative paths
    destination = returnUrl;
  }

  return {
    success: true,
    data: { user },
    redirectTo: destination,
  };
}

/**
 * Public Signup Action
 * Registers new STUDENT or ORGANIZER. Disallows ADMIN registration.
 */
export async function signupAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ user: SafeUser }>> {
  const rawData = {
    name: formData.get("name") as string,
    username: formData.get("username") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
    college: (formData.get("college") as string) || "",
    organization: (formData.get("organization") as string) || "",
  };

  const validation = signupSchema.safeParse(rawData);
  if (!validation.success) {
    const fieldErrors: Record<string, string> = {};
    validation.error.issues.forEach((issue) => {
      if (issue.path[0]) fieldErrors[issue.path[0] as string] = issue.message;
    });
    return {
      success: false,
      error: "Please correct the errors in the form.",
      fieldErrors,
    };
  }

  const { name, username, email, password, role, college, organization } = validation.data;

  // Check duplicate email
  const existingEmail = await findUserByEmail(email);
  if (existingEmail) {
    return {
      success: false,
      error: "An account with this email address already exists.",
      fieldErrors: { email: "Email is already registered" },
    };
  }

  // Check duplicate username
  const existingUsername = await findUserByUsername(username);
  if (existingUsername) {
    return {
      success: false,
      error: "This username is already taken. Please choose another.",
      fieldErrors: { username: "Username is already taken" },
    };
  }

  // Hash password with bcrypt
  const passwordHash = await hashPassword(password);

  // Persist user record
  const newUser = await createUser({
    username,
    email,
    passwordHash,
    name,
    role,
    college,
    organization,
  });

  // Automatically establish session upon successful registration
  await createAndSetUserSession(newUser.id);

  const destination = getRoleDashboardUrl(newUser.role);

  return {
    success: true,
    data: { user: newUser },
    redirectTo: destination,
  };
}

/**
 * Logout Action
 * Deletes session and clears cookie
 */
export async function logoutAction(): Promise<void> {
  await invalidateSession();
  redirect("/login");
}

/**
 * Profile Update Action
 * Updates permitted profile fields with server-side validation.
 * Strictly prevents role escalation.
 */
export async function updateProfileAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ user: SafeUser }>> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      error: "You must be signed in to update your profile.",
    };
  }

  const rawData = {
    name: formData.get("name") as string,
    username: formData.get("username") as string,
    bio: formData.get("bio") as string,
    college: (formData.get("college") as string) || "",
    organization: (formData.get("organization") as string) || "",
  };

  const validation = profileUpdateSchema.safeParse(rawData);
  if (!validation.success) {
    const fieldErrors: Record<string, string> = {};
    validation.error.issues.forEach((issue) => {
      if (issue.path[0]) fieldErrors[issue.path[0] as string] = issue.message;
    });
    return {
      success: false,
      error: "Please correct the errors in the form.",
      fieldErrors,
    };
  }

  const updates = validation.data;

  // If changing username, check uniqueness
  if (updates.username && updates.username !== currentUser.username) {
    const existing = await findUserByUsername(updates.username);
    if (existing && existing.id !== currentUser.id) {
      return {
        success: false,
        error: "This username is already taken. Please choose another.",
        fieldErrors: { username: "Username is already taken" },
      };
    }
  }

  // Persist updates
  const updatedUser = await updateUserProfile(currentUser.id, updates);
  if (!updatedUser) {
    return {
      success: false,
      error: "Failed to update profile. User not found.",
    };
  }

  return {
    success: true,
    data: { user: updatedUser },
    message: "Profile updated successfully!",
  };
}

