import { redirect } from "next/navigation";

export default function Home() {
  // When user visits "/", redirect to /app/dashboard
  redirect("/dashboard");
}
