import { redirect } from "next/navigation";
import { currentUser } from "@/server/authorization/session";
export default async function IndexPage() {
  redirect((await currentUser()) ? "/home" : "/login");
}
