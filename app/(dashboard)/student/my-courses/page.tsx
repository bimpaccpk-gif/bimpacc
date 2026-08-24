import { redirect } from "next/navigation";

export default function MyCoursesPage() {
  redirect("/student#enrolled-courses");
}
