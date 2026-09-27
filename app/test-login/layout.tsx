import { notFound } from "next/navigation";
export default function TestOnlyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
