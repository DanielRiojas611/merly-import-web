import { redirect } from "next/navigation";

// Preserve the legacy administration URL while enforcing the existing admin authentication.
export default function ControlPage() {
  redirect("/admin");
}
